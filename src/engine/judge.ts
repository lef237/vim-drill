import type { BufferState } from '../problems/types';

export function stateMatches(actual: BufferState, goal: BufferState, checkCursor = true): boolean {
  if (actual.text !== goal.text) return false;
  if (!checkCursor) return true;
  return actual.cursor.line === goal.cursor.line && actual.cursor.ch === goal.cursor.ch;
}

/** log と answer が最初に食い違う位置。食い違いがなければ -1 */
export function firstDivergence(log: string[], answer: string[]): number {
  for (let i = 0; i < log.length; i++) {
    if (i >= answer.length || log[i] !== answer[i]) return i;
  }
  return -1;
}

export function isPrefix(log: string[], answer: string[]): boolean {
  return firstDivergence(log, answer) === -1;
}

/**
 * `:` の後に打ったキーが、いずれかのコマンド名の入力途中（または全体）になっているか。
 * `<BS>` は1文字消す操作として扱い、それ以外の特殊キーが混ざれば false。
 */
export function isCommandPrefix(keys: string[], names: readonly string[]): boolean {
  let text = '';
  for (const k of keys) {
    if (k === '<BS>') text = text.slice(0, -1);
    else if (k.length === 1) text += k;
    else return false;
  }
  return names.some((name) => name.startsWith(text));
}
