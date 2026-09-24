import { EditorSelection, EditorState, type Extension } from '@codemirror/state';
import { EditorView, drawSelection, highlightSpecialChars, lineNumbers } from '@codemirror/view';
import { history } from '@codemirror/commands';
import { indentUnit } from '@codemirror/language';
import { Vim, getCM, vim } from '@replit/codemirror-vim';
import type { BufferState, Cursor } from '../problems/types';

export type VimMode = 'normal' | 'insert' | 'visual' | 'replace';

export interface EditorSnapshot extends BufferState {
  mode: VimMode;
  /** `:` や `/` の入力欄が開いているか */
  promptOpen: boolean;
  /** オペレータや回数など、入力途中のコマンドがあるか */
  pending: boolean;
}

const theme = EditorView.theme({
  '&': {
    fontSize: '18px',
    backgroundColor: 'var(--editor-bg)',
    color: 'var(--text)',
    borderRadius: '8px',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.6' },
  '.cm-content': { padding: '12px 0', caretColor: 'var(--accent)' },
  '.cm-gutters': {
    backgroundColor: 'var(--editor-bg)',
    color: 'var(--muted)',
    border: 'none',
  },
  '.cm-fat-cursor': { background: 'var(--accent) !important', color: 'var(--accent-ink) !important' },
  '&:not(.cm-focused) .cm-fat-cursor': { background: 'none !important', outline: '1px solid var(--accent)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--selection) !important',
  },
  '.cm-panels': { backgroundColor: 'var(--panel)', color: 'var(--text)', borderTop: '1px solid var(--border)' },
  '.cm-vim-panel': { fontFamily: 'var(--mono)', padding: '4px 12px', fontSize: '15px' },
  '.cm-vim-panel input': { color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: '15px' },
});

export function toOffset(text: string, cursor: Cursor): number {
  const lines = text.split('\n');
  let offset = 0;
  for (let i = 0; i < cursor.line; i++) offset += lines[i].length + 1;
  return offset + cursor.ch;
}

export function createEditorState(initial: BufferState, extra: Extension[] = []): EditorState {
  return EditorState.create({
    doc: initial.text,
    selection: EditorSelection.cursor(toOffset(initial.text, initial.cursor)),
    extensions: [
      // vim() は他のキーマップより先に置く
      vim({ status: true }),
      // 矩形選択からの I / A は複数カーソルで実現されている
      EditorState.allowMultipleSelections.of(true),
      lineNumbers(),
      history(),
      drawSelection(),
      highlightSpecialChars(),
      indentUnit.of('  '),
      EditorState.tabSize.of(2),
      theme,
      ...extra,
    ],
  });
}

export function snapshot(view: EditorView): EditorSnapshot {
  const cm = getCM(view);
  const text = view.state.doc.toString();
  if (!cm) {
    const head = view.state.selection.main.head;
    const line = view.state.doc.lineAt(head);
    return {
      text,
      cursor: { line: line.number - 1, ch: head - line.from },
      mode: 'normal',
      promptOpen: false,
      pending: false,
    };
  }
  const vimState = cm.state.vim;
  const pos = cm.getCursor();
  let mode: VimMode = 'normal';
  if (vimState?.insertMode) mode = cm.state.overwrite ? 'replace' : 'insert';
  else if (vimState?.visualMode) mode = 'visual';
  const input = vimState?.inputState;
  const pending =
    !!input &&
    (input.keyBuffer.length > 0 ||
      input.prefixRepeat.length > 0 ||
      input.motionRepeat.length > 0 ||
      !!input.operator ||
      input.registerName !== undefined);
  return {
    text,
    cursor: { line: pos.line, ch: pos.ch },
    mode,
    promptOpen: view.dom.querySelector('.cm-vim-panel input') !== null,
    pending,
  };
}

/** レジスタ・検索履歴・直前の f/t などをリセットし、問題同士が影響しないようにする */
export function resetVimGlobals(): void {
  Vim.resetVimGlobalState_();
}
