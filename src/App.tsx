import { useCallback, useState } from 'react';
import type { Problem } from './problems/types';
import { allProblems, problemById } from './problems';
import {
  DEFAULT_CONFIG,
  filterProblems,
  isClean,
  pickProblems,
  type QuestionResult,
  type QuizConfig,
} from './engine/session';
import { loadConfig, loadStats, recordResults, saveConfig, type Stats } from './storage';
import { Home } from './components/Home';
import { Quiz } from './components/Quiz';
import { Result } from './components/Result';

type Screen =
  | { name: 'home' }
  | { name: 'quiz'; problems: Problem[]; round: number }
  | { name: 'result'; results: QuestionResult[] };

export function App() {
  const [config, setConfig] = useState<QuizConfig>(() => ({ ...DEFAULT_CONFIG, ...loadConfig() }));
  const [stats, setStats] = useState<Stats>(loadStats);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  const updateConfig = useCallback((next: QuizConfig) => {
    setConfig(next);
    saveConfig(next);
  }, []);

  const startWith = useCallback((problems: Problem[]) => {
    if (problems.length === 0) return;
    setScreen((s) => ({ name: 'quiz', problems, round: s.name === 'quiz' ? s.round + 1 : Date.now() }));
  }, []);

  const start = useCallback(() => {
    startWith(pickProblems(filterProblems(allProblems, config), config.count, loadStats()));
  }, [config, startWith]);

  const finish = useCallback((results: QuestionResult[]) => {
    setStats(recordResults(results));
    setScreen({ name: 'result', results });
  }, []);

  const home = useCallback(() => setScreen({ name: 'home' }), []);

  if (screen.name === 'quiz') {
    return (
      <Quiz key={screen.round} config={config} problems={screen.problems} onFinish={finish} onQuit={home} />
    );
  }
  if (screen.name === 'result') {
    const wrong = screen.results.filter((r) => !isClean(r)).map((r) => problemById.get(r.problemId)!);
    return (
      <Result
        config={config}
        results={screen.results}
        onRetry={start}
        onRetryWrong={() => startWith(wrong)}
        onHome={home}
      />
    );
  }
  return <Home config={config} stats={stats} onChange={updateConfig} onStart={start} />;
}
