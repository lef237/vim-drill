import { useEffect } from 'react';
import { CATEGORIES, type Category, type Level } from '../problems/types';
import { allProblems } from '../problems';
import { COUNT_OPTIONS, filterProblems, type QuizConfig } from '../engine/session';
import type { Stats } from '../storage';
import { useI18n } from '../i18n';

interface Props {
  config: QuizConfig;
  stats: Stats;
  onChange: (config: QuizConfig) => void;
  onStart: () => void;
}

const CATEGORY_CYCLE: (Category | 'all')[] = ['all', ...CATEGORIES];
const LEVEL_CYCLE: (Level | 0)[] = [0, 1, 2, 3];

function cycle<T>(list: T[], current: T, dir: 1 | -1): T {
  const i = list.indexOf(current);
  return list[(i + dir + list.length) % list.length];
}

export function Home({ config, stats, onChange, onStart }: Props) {
  const { t, lang, setLang, toggleLang } = useI18n();
  const available = filterProblems(allProblems, config).length;
  const weakCount = allProblems.filter((p) => (stats[p.id]?.weak ?? 0) > 0).length;
  const seenCount = allProblems.filter((p) => stats[p.id]).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const dir = e.shiftKey ? -1 : 1;
      switch (e.key.toLowerCase()) {
        case '1':
          onChange({ ...config, mode: 'practice' });
          break;
        case '2':
          onChange({ ...config, mode: 'test' });
          break;
        case 'c':
          onChange({ ...config, category: cycle(CATEGORY_CYCLE, config.category, dir) });
          break;
        case 'l':
          onChange({ ...config, level: cycle(LEVEL_CYCLE, config.level, dir) });
          break;
        case 'n':
          onChange({ ...config, count: cycle(COUNT_OPTIONS, config.count, dir) });
          break;
        case 't':
          toggleLang();
          break;
        case 'enter':
          if (available > 0) onStart();
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [config, onChange, onStart, available, toggleLang]);

  return (
    <main className="home">
      <div className="lang-switch" role="group" aria-label={t.helpLanguage}>
        <kbd>t</kbd>
        <button className={lang === 'ja' ? 'active' : ''} aria-pressed={lang === 'ja'} onClick={() => setLang('ja')}>
          日本語
        </button>
        <button className={lang === 'en' ? 'active' : ''} aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
          English
        </button>
      </div>

      <header className="hero">
        <h1>
          <span className="logo">:</span>Vim Drill
        </h1>
        <p>{t.appDescription}</p>
      </header>

      <section className="modes">
        <button
          className={`mode-card ${config.mode === 'practice' ? 'active' : ''}`}
          onClick={() => onChange({ ...config, mode: 'practice' })}
        >
          <kbd>1</kbd>
          <strong>{t.practiceMode}</strong>
          <span>{t.practiceModeDesc}</span>
        </button>
        <button
          className={`mode-card ${config.mode === 'test' ? 'active' : ''}`}
          onClick={() => onChange({ ...config, mode: 'test' })}
        >
          <kbd>2</kbd>
          <strong>{t.testMode}</strong>
          <span>{t.testModeDesc}</span>
        </button>
      </section>

      <section className="settings">
        <Setting
          k="c"
          label={t.category}
          value={config.category === 'all' ? t.all : t.categories[config.category]}
          onClick={() => onChange({ ...config, category: cycle(CATEGORY_CYCLE, config.category, 1) })}
        />
        <Setting
          k="l"
          label={t.level}
          value={config.level === 0 ? t.all : `Lv.${config.level}`}
          onClick={() => onChange({ ...config, level: cycle(LEVEL_CYCLE, config.level, 1) })}
        />
        <Setting
          k="n"
          label={t.count}
          value={t.countValue(Math.min(config.count, available))}
          onClick={() => onChange({ ...config, count: cycle(COUNT_OPTIONS, config.count, 1) })}
        />
      </section>

      <button className="start" onClick={onStart} disabled={available === 0}>
        <kbd>Enter</kbd> {t.start}
      </button>
      <p className="meta">{t.homeMeta(available, allProblems.length, seenCount, weakCount)}</p>
      <p className="notice-line">{t.extensionNotice}</p>

      <footer className="help">
        <span>{t.helpReverse}</span>
        <span>
          {t.helpDuringQuiz} <kbd>:hint</kbd> <kbd>:reset</kbd> <kbd>:skip</kbd> <kbd>:q</kbd>
        </span>
        <span>
          <kbd>t</kbd> {t.helpLanguage}
        </span>
      </footer>
    </main>
  );
}

function Setting({ k, label, value, onClick }: { k: string; label: string; value: string; onClick: () => void }) {
  return (
    <button className="setting" onClick={onClick}>
      <kbd>{k}</kbd>
      <span className="setting-label">{label}</span>
      <span className="setting-value">{value}</span>
    </button>
  );
}
