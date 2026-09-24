import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import type { Problem } from '../problems/types';
import { parseMarked } from '../problems/parse';
import { displayKey, tokenizeKeys } from '../engine/keys';
import { firstDivergence, isPrefix, stateMatches } from '../engine/judge';
import type { QuestionResult, QuizConfig } from '../engine/session';
import { snapshot, type EditorSnapshot } from '../editor/setup';
import { registerAppCommands, setAppCommandHandlers } from '../editor/appCommands';
import { getLoadedLanguage, loadLanguage } from '../editor/languages';
import { useI18n } from '../i18n';
import { VimEditor } from './VimEditor';
import { GoalView } from './GoalView';
import { KeyChips, KeyStream } from './KeyChips';

interface Props {
  config: QuizConfig;
  problems: Problem[];
  onFinish: (results: QuestionResult[]) => void;
  onQuit: () => void;
}

type Feedback = {
  kind: 'ok' | 'miss' | 'alt' | 'info';
  text: string;
  /** 自動でやり直すまでの時間（残り時間のバーを表示する） */
  resetMs?: number;
};

/** 1問ごとの可変状態。キー入力のたびに更新するので ref で持つ */
interface Attempt {
  log: string[];
  /** `:` `/` `?` を押した時点の log 長。アプリ用 Ex コマンドや入力取り消しでここまで戻す */
  promptStart: number | null;
  locked: boolean;
  misses: number;
  hinted: boolean;
  startedAt: number;
  finalCheck: boolean;
}

const newAttempt = (): Attempt => ({
  log: [],
  promptStart: null,
  locked: false,
  misses: 0,
  hinted: false,
  startedAt: performance.now(),
  finalCheck: false,
});

export function Quiz({ config, problems, onFinish, onQuit }: Props) {
  const { t, lang } = useI18n();
  const [index, setIndex] = useState(0);
  const [editorKey, setEditorKey] = useState(0);
  const [typed, setTyped] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const [imeWarning, setImeWarning] = useState(false);
  const [focusLost, setFocusLost] = useState(false);
  const [, setLanguageLoaded] = useState(0);

  const problem = problems[index];
  const practice = config.mode === 'practice';
  const parsed = useMemo(
    () => ({
      before: parseMarked(problem.before),
      goal: parseMarked(problem.after),
      answer: tokenizeKeys(problem.answers[0]),
      minKeys: Math.min(...problem.answers.map((a) => tokenizeKeys(a).length)),
      checkCursor: problem.checkCursor !== false,
    }),
    [problem],
  );

  // HTML などの言語が必要な問題は、読み込み終わるまでエディタを出さない
  const languageExt = problem.language ? getLoadedLanguage(problem.language) : undefined;
  const editorReady = !problem.language || languageExt !== undefined;
  useEffect(() => {
    if (problem.language && !getLoadedLanguage(problem.language)) {
      loadLanguage(problem.language).then(() => setLanguageLoaded((n) => n + 1));
    }
  }, [problem.language]);
  const extensions = useMemo(() => (languageExt ? [languageExt] : []), [languageExt]);

  const viewRef = useRef<EditorView | null>(null);
  const attempt = useRef<Attempt>(newAttempt());
  const results = useRef<QuestionResult[]>([]);
  const timers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const syncTyped = () => setTyped([...attempt.current.log]);

  /** エディタを初期状態に戻す（同じ問題のまま） */
  const restart = useCallback(() => {
    const a = attempt.current;
    a.log = [];
    a.promptStart = null;
    a.locked = false;
    a.finalCheck = false;
    setTyped([]);
    setFeedback(null);
    setEditorKey((k) => k + 1);
  }, []);

  const goNext = useCallback(() => {
    clearTimers();
    if (index + 1 >= problems.length) {
      onFinish(results.current);
      return;
    }
    attempt.current = newAttempt();
    setIndex(index + 1);
    setTyped([]);
    setFeedback(null);
    setHintShown(false);
    setEditorKey((k) => k + 1);
  }, [index, problems.length, onFinish]);

  const record = (skipped: boolean) => {
    const a = attempt.current;
    results.current.push({
      problemId: problem.id,
      skipped,
      keys: a.log.length,
      minKeys: parsed.minKeys,
      misses: a.misses,
      hinted: a.hinted,
      timeMs: performance.now() - a.startedAt,
    });
  };

  const succeed = () => {
    const a = attempt.current;
    a.locked = true;
    record(false);
    const longer = !practice && a.log.length > parsed.minKeys;
    setFeedback({
      kind: 'ok',
      text: longer ? t.correctLonger(problem.answers[0]) : a.misses === 0 ? t.correct : t.correctWithRetry,
    });
    later(goNext, longer ? 1600 : 650);
  };

  const miss = (s: EditorSnapshot) => {
    const a = attempt.current;
    a.locked = true;
    a.misses++;
    const reached = s.mode === 'normal' && stateMatches(s, parsed.goal, parsed.checkCursor);
    const d = firstDivergence(a.log, parsed.answer);
    const resetMs = reached ? 1500 : 1400;
    setFeedback(
      reached
        ? { kind: 'alt', text: t.altSolution, resetMs }
        : {
            kind: 'miss',
            text:
              d !== -1 && d < parsed.answer.length
                ? t.wrongKey(displayKey(parsed.answer[d]), displayKey(a.log[d]))
                : t.wrongKeyRetry,
            resetMs,
          },
    );
    later(restart, resetMs);
  };

  const evaluate = () => {
    const view = viewRef.current;
    const a = attempt.current;
    if (!view || a.locked) return;
    const s = snapshot(view);
    const atGoal = s.mode === 'normal' && !s.promptOpen && stateMatches(s, parsed.goal, parsed.checkCursor);

    if (!practice) {
      if (atGoal) succeed();
      return;
    }
    if (!isPrefix(a.log, parsed.answer)) {
      // `:hint` などを入力中かもしれないので、入力欄が閉じるまで待つ
      if (!s.promptOpen) miss(s);
      return;
    }
    if (a.log.length === parsed.answer.length) {
      if (atGoal) {
        succeed();
      } else if (!a.finalCheck) {
        // 入力の反映が遅れる場合に備えて少し待ってから再判定する
        a.finalCheck = true;
        later(() => {
          if (attempt.current !== a || a.locked || !viewRef.current) return;
          const s2 = snapshot(viewRef.current);
          if (s2.mode === 'normal' && !s2.promptOpen && stateMatches(s2, parsed.goal, parsed.checkCursor)) succeed();
          else miss(s2);
        }, 300);
      }
    }
  };

  const onKey = (key: string, inPrompt: boolean, view: EditorView) => {
    const a = attempt.current;
    // 判定後〜次の問題・やり直しまでの間は入力を受け付けない
    if (a.locked) return false;
    if (!inPrompt) {
      const s = snapshot(view);
      // 何も入力途中でないノーマルモードの Esc は何もしないので、打鍵にもミスにも数えない
      if (key === '<Esc>' && s.mode === 'normal' && !s.pending) return;
      if ((key === ':' || key === '/' || key === '?') && s.mode !== 'insert') {
        a.promptStart = a.log.length;
      }
    }
    if (inPrompt && key === '<Esc>' && a.promptStart !== null) {
      // コマンドライン入力を取り消したときは、その分のキーを数えない
      a.log = a.log.slice(0, a.promptStart);
      a.promptStart = null;
      syncTyped();
      return;
    }
    a.log.push(key);
    syncTyped();
    window.setTimeout(evaluate, 0);
  };

  /** アプリ用 Ex コマンドのキー（`:hint<CR>` など）を履歴から除く */
  const dropPromptKeys = () => {
    const a = attempt.current;
    if (a.promptStart !== null) {
      a.log = a.log.slice(0, a.promptStart);
      a.promptStart = null;
      syncTyped();
    }
  };

  const skip = () => {
    dropPromptKeys();
    record(true);
    attempt.current.locked = true;
    setFeedback({ kind: 'info', text: t.skipped(problem.answers[0]) });
    later(goNext, practice ? 500 : 1400);
  };

  // Ex コマンドは最新のクロージャを呼ぶ
  const commandsRef = useRef({ skip, onQuit, restart, dropPromptKeys });
  commandsRef.current = { skip, onQuit, restart, dropPromptKeys };
  useEffect(() => {
    registerAppCommands();
    setAppCommandHandlers({
      hint: () => {
        commandsRef.current.dropPromptKeys();
        attempt.current.hinted = true;
        setHintShown(true);
      },
      skip: () => {
        if (!attempt.current.locked) commandsRef.current.skip();
      },
      reset: () => commandsRef.current.restart(),
      quit: () => commandsRef.current.onQuit(),
    });
    return () => setAppCommandHandlers(null);
  }, []);

  // エディタ外にフォーカスが外れても、キーを押せばエディタに戻る
  useEffect(() => {
    const onWindowKey = (e: KeyboardEvent) => {
      const view = viewRef.current;
      if (view && !view.dom.contains(document.activeElement)) {
        e.preventDefault();
        view.focus();
      }
    };
    window.addEventListener('keydown', onWindowKey);
    return () => window.removeEventListener('keydown', onWindowKey);
  }, []);

  const onComposition = () => {
    setImeWarning(true);
    later(() => setImeWarning(false), 4000);
  };

  const hintText = problem.hint?.[lang] ?? (practice ? t.hintPractice : t.hintFirstKey(parsed.answer[0]));

  return (
    <main className="quiz">
      <header className="quiz-head">
        <span className="mode-badge">{practice ? t.practice : t.test}</span>
        <span className="progress-text">
          {index + 1} / {problems.length}
        </span>
        <div className="progress" aria-hidden>
          <div className="progress-bar" style={{ width: `${(index / problems.length) * 100}%` }} />
        </div>
        <span className="tag">{t.categories[problem.category]}</span>
        <span className="tag level">Lv.{problem.level}</span>
      </header>

      {focusLost && (
        <div className="notice warn" role="alert">
          <div>
            <strong>{t.focusLostTitle}</strong>
            <p>{t.focusLostBody}</p>
          </div>
          <button className="notice-close" onClick={() => setFocusLost(false)}>
            {t.dismiss}
          </button>
        </div>
      )}

      <section className="prompt">
        <h1>{problem.prompt[lang]}</h1>
        {practice ? <KeyChips answer={parsed.answer} typed={typed} /> : <KeyStream typed={typed} />}
        {hintShown && (
          <p className="hint">
            {t.hintLabel}: {hintText}
          </p>
        )}
      </section>

      <section className="workspace">
        <div className="pane">
          <div className="pane-label">{t.editor}</div>
          {editorReady ? (
            <VimEditor
              key={`${index}-${editorKey}`}
              initial={parsed.before}
              extensions={extensions}
              onReady={(v) => (viewRef.current = v)}
              onKey={onKey}
              onUpdate={() => window.setTimeout(evaluate, 0)}
              onComposition={onComposition}
              onFocusLost={() => setFocusLost(true)}
            />
          ) : (
            <div className="editor editor-loading">{t.loading}</div>
          )}
        </div>
        <div className="pane">
          <div className="pane-label">{parsed.checkCursor ? t.goal : t.goalNoCursor}</div>
          <GoalView before={parsed.before} goal={parsed.goal} showCursor={parsed.checkCursor} />
        </div>
      </section>

      <div className={`feedback ${feedback ? feedback.kind : 'idle'}`} role="status" aria-live="polite">
        {feedback && <span className="feedback-icon" aria-hidden />}
        <span>{feedback?.text ?? ' '}</span>
        {feedback?.resetMs && (
          <span className="feedback-timer" aria-hidden style={{ animationDuration: `${feedback.resetMs}ms` }} />
        )}
      </div>
      {imeWarning && <div className="ime-warning">{t.imeWarning}</div>}

      <footer className="help">
        <span>
          <kbd>:hint</kbd> {t.cmdHint}
        </span>
        <span>
          <kbd>:reset</kbd> {t.cmdReset}
        </span>
        <span>
          <kbd>:skip</kbd> {t.cmdSkip}
        </span>
        <span>
          <kbd>:q</kbd> {t.cmdQuit}
        </span>
      </footer>
    </main>
  );
}
