import { useEffect, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import type { BufferState } from '../problems/types';
import { createEditorState, resetVimGlobals } from '../editor/setup';
import { keyFromEvent } from '../engine/keys';

export interface VimEditorHandlers {
  /** キーが押された直後（Vim が処理する前）に呼ばれる。false を返すとキーを Vim に渡さない */
  onKey?: (key: string, inPrompt: boolean, view: EditorView) => boolean | void;
  /** ドキュメントやカーソルが変化したとき */
  onUpdate?: (view: EditorView) => void;
  /** IME 入力を検知したとき */
  onComposition?: () => void;
  /**
   * クリックもウィンドウ切り替えもないのにフォーカスが外れたとき。
   * Vimium などの拡張機能が Esc を横取りしてフォーカスを外した可能性が高い。
   */
  onFocusLost?: () => void;
}

interface Props extends VimEditorHandlers {
  initial: BufferState;
  extensions?: Extension[];
  onReady?: (view: EditorView | null) => void;
}

/** 直前のクリックからこの時間内のフォーカス移動はユーザー操作とみなす */
const POINTER_GRACE_MS = 500;

/** 初期状態で一度だけ生成する。やり直すときは key を変えて再マウントする */
export function VimEditor({ initial, extensions = [], onReady, ...handlers }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handlersRef = useRef<VimEditorHandlers>(handlers);
  handlersRef.current = handlers;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    resetVimGlobals();
    const view = new EditorView({
      state: createEditorState(initial, [
        ...extensions,
        EditorView.updateListener.of((u) => {
          if (u.docChanged || u.selectionSet) handlersRef.current.onUpdate?.(u.view);
        }),
      ]),
      parent: hostRef.current!,
    });
    let alive = true;
    let lastPointerAt = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) {
        handlersRef.current.onComposition?.();
        return;
      }
      const key = keyFromEvent(e);
      if (!key) return;
      const target = e.target as HTMLElement | null;
      const inPrompt = target?.tagName === 'INPUT' && !!target.closest('.cm-vim-panel');
      if (handlersRef.current.onKey?.(key, inPrompt, view) === false) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onComposition = () => handlersRef.current.onComposition?.();
    const onPointerDown = () => {
      lastPointerAt = performance.now();
    };
    const onFocusOut = (e: FocusEvent) => {
      // `:` の入力欄などエディタ内部への移動は対象外
      if (e.relatedTarget instanceof Node && view.dom.contains(e.relatedTarget)) return;
      window.setTimeout(() => {
        if (!alive || !view.dom.isConnected) return;
        // ウィンドウやタブの切り替え
        if (!document.hasFocus()) return;
        // クリックによる移動
        if (performance.now() - lastPointerAt < POINTER_GRACE_MS) return;
        // Tab キーなどで別の要素に移った場合や、すでにエディタに戻っている場合
        const active = document.activeElement;
        if (active && active !== document.body && active !== document.documentElement) return;
        handlersRef.current.onFocusLost?.();
      }, 0);
    };

    // capture で登録し、Vim がキーを処理する前に記録する
    view.dom.addEventListener('keydown', onKeyDown, true);
    view.dom.addEventListener('compositionstart', onComposition, true);
    view.dom.addEventListener('focusout', onFocusOut);
    window.addEventListener('pointerdown', onPointerDown, true);
    view.focus();
    onReadyRef.current?.(view);

    return () => {
      alive = false;
      view.dom.removeEventListener('keydown', onKeyDown, true);
      view.dom.removeEventListener('compositionstart', onComposition, true);
      view.dom.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('pointerdown', onPointerDown, true);
      onReadyRef.current?.(null);
      view.destroy();
    };
    // initial / extensions が変わるときは親が key を変えて再マウントする
  }, []);

  return <div className="editor" ref={hostRef} />;
}
