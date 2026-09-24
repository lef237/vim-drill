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
