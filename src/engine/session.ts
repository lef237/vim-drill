import type { Category, Level, Problem } from '../problems/types';
import type { Stats } from '../storage';

export type QuizMode = 'practice' | 'test';

export interface QuizConfig {
  mode: QuizMode;
  category: Category | 'all';
  level: Level | 0;
  count: number;
}

export const DEFAULT_CONFIG: QuizConfig = { mode: 'practice', category: 'all', level: 0, count: 20 };
export const COUNT_OPTIONS = [10, 20, 30];

export interface QuestionResult {
  problemId: string;
  skipped: boolean;
  /** 正解時の打鍵数 */
  keys: number;
  minKeys: number;
  /** 練習モードで模範解答から外れた回数 */
  misses: number;
  hinted: boolean;
  timeMs: number;
}

export function filterProblems(pool: Problem[], config: QuizConfig): Problem[] {
  return pool.filter(
    (p) =>
      (config.category === 'all' || p.category === config.category) &&
      (config.level === 0 || p.level === config.level),
  );
}

/** 苦手度が高い問題・未出題の問題ほど出やすい重み付きランダム抽出（重複なし） */
export function pickProblems(
  pool: Problem[],
  count: number,
  stats: Stats,
  random: () => number = Math.random,
): Problem[] {
  const items = pool.map((p) => {
    const s = stats[p.id];
    return { p, w: s ? 1 + s.weak : 1.5 };
  });
  const picked: Problem[] = [];
  while (picked.length < count && items.length > 0) {
    const total = items.reduce((sum, it) => sum + it.w, 0);
    let r = random() * total;
    let index = items.findIndex((it) => (r -= it.w) < 0);
    if (index < 0) index = items.length - 1;
    picked.push(items.splice(index, 1)[0].p);
  }
  return picked;
}

export function isClean(r: QuestionResult): boolean {
  return !r.skipped && r.misses === 0 && !r.hinted;
}
