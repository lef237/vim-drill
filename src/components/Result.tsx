import { useEffect } from 'react';
import { problemById } from '../problems';
import { isClean, type QuestionResult, type QuizConfig } from '../engine/session';
import { useI18n } from '../i18n';

interface Props {
  config: QuizConfig;
  results: QuestionResult[];
  onRetry: () => void;
  onRetryWrong: () => void;
  onHome: () => void;
}

export function Result({ config, results, onRetry, onRetryWrong, onHome }: Props) {
  const { t, lang } = useI18n();
  const practice = config.mode === 'practice';
  const cleared = results.filter((r) => !r.skipped);
  const clean = results.filter(isClean);
  const wrongCount = results.length - clean.length;
  const totalMs = results.reduce((s, r) => s + r.timeMs, 0);
  const keys = cleared.reduce((s, r) => s + r.keys, 0);
  const minKeys = cleared.reduce((s, r) => s + r.minKeys, 0);
  const efficiency = keys > 0 ? Math.round((minKeys / keys) * 100) : 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'r') onRetry();
      else if (e.key === 'w' && wrongCount > 0) onRetryWrong();
      else if (e.key === 'Enter' || e.key === 'Escape') onHome();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRetry, onRetryWrong, onHome, wrongCount]);

  return (
    <main className="result">
      <h1>{t.resultTitle(practice)}</h1>
      <section className="scores">
        <Score
          label={practice ? t.clean : t.cleared}
          value={`${practice ? clean.length : cleared.length} / ${results.length}`}
        />
        <Score label={t.totalTime} value={formatTime(totalMs)} />
        <Score
          label={t.averageTime}
          value={t.seconds((totalMs / Math.max(1, results.length) / 1000).toFixed(1))}
        />
        {!practice && <Score label={t.efficiency} value={`${efficiency}%`} note={t.efficiencyNote} />}
      </section>

      <ol className="result-list">
        {results.map((r, i) => {
          const p = problemById.get(r.problemId)!;
          const status = r.skipped ? 'skip' : isClean(r) ? 'ok' : 'retry';
          return (
            <li key={i} className={`result-item ${status}`}>
              <span className="mark">{status === 'ok' ? '✓' : status === 'skip' ? '✗' : '△'}</span>
              <span className="result-prompt">{p.prompt[lang]}</span>
              <code>{p.answers[0]}</code>
              <span className="result-meta">
                {r.skipped ? t.skip : t.keystrokes(r.keys)}
                {r.misses > 0 && ` · ${t.retries(r.misses)}`}
                {r.hinted && ` · ${t.usedHint}`}
              </span>
            </li>
          );
        })}
      </ol>

      <footer className="actions">
        <button onClick={onRetry}>
          <kbd>r</kbd> {t.retrySame}
        </button>
        <button onClick={onRetryWrong} disabled={wrongCount === 0}>
          <kbd>w</kbd> {t.retryWrong(wrongCount)}
        </button>
        <button onClick={onHome}>
          <kbd>Enter</kbd> {t.backHome}
        </button>
      </footer>
    </main>
  );
}

function Score({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="score" title={note}>
      <span className="score-label">{label}</span>
      <span className="score-value">{value}</span>
    </div>
  );
}

function formatTime(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
