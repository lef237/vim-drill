import type { BufferState, MarkedText } from './types';

export const CURSOR_MARKER = '|';

/** `"const |foo"` のようにカーソル位置を `|` で示したテキストを解析する */
export function parseMarked(src: MarkedText): BufferState {
  const joined = Array.isArray(src) ? src.join('\n') : src;
  const index = joined.indexOf(CURSOR_MARKER);
  if (index < 0 || joined.indexOf(CURSOR_MARKER, index + 1) >= 0) {
    throw new Error(`カーソルマーカー "|" はちょうど1つ必要です: ${JSON.stringify(joined)}`);
  }
  const text = joined.slice(0, index) + joined.slice(index + 1);
  const beforeCursor = joined.slice(0, index).split('\n');
  return {
    text,
    cursor: { line: beforeCursor.length - 1, ch: beforeCursor[beforeCursor.length - 1].length },
  };
}

export function formatMarked(state: BufferState): string {
  const lines = state.text.split('\n');
  const { line, ch } = state.cursor;
  if (lines[line] !== undefined) {
    lines[line] = lines[line].slice(0, ch) + CURSOR_MARKER + lines[line].slice(ch);
  }
  return lines.join('\n');
}
