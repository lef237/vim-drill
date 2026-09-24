import type { QuizConfig, QuestionResult } from './engine/session';

export interface ProblemStat {
  seen: number;
  cleared: number;
  /** 苦手度。ミスやスキップで増え、ノーミス正解で減る */
  weak: number;
  bestKeys?: number;
}

export type Stats = Record<string, ProblemStat>;

const STATS_KEY = 'vimdrill:stats:v1';
const CONFIG_KEY = 'vimdrill:config:v1';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // プライベートブラウズなどで保存できなくても動作は続ける
  }
}

export function loadStats(): Stats {
  return read<Stats>(STATS_KEY) ?? {};
}

export function recordResults(results: QuestionResult[]): Stats {
  const stats = loadStats();
  for (const r of results) {
    const s = stats[r.problemId] ?? { seen: 0, cleared: 0, weak: 0 };
    s.seen++;
    if (r.skipped) {
      s.weak += 2;
    } else {
      s.cleared++;
      if (r.misses > 0 || r.hinted) s.weak += 1;
      else s.weak = Math.max(0, s.weak - 1);
      if (s.bestKeys === undefined || r.keys < s.bestKeys) s.bestKeys = r.keys;
    }
    stats[r.problemId] = s;
  }
  write(STATS_KEY, stats);
  return stats;
}

export function loadConfig(): QuizConfig | null {
  return read<QuizConfig>(CONFIG_KEY);
}

export function saveConfig(config: QuizConfig): void {
  write(CONFIG_KEY, config);
}
