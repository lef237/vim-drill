import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { EditorView } from '@codemirror/view';
import { allProblems } from '../src/problems';
import { formatMarked, parseMarked } from '../src/problems/parse';
import { tokenizeKeys } from '../src/engine/keys';
import { stateMatches } from '../src/engine/judge';
import { createEditorState, resetVimGlobals, snapshot } from '../src/editor/setup';
import { loadLanguage } from '../src/editor/languages';

const USER_EVENT_KEYS: Record<string, string> = {
  '<Esc>': '{Escape}',
  '<CR>': '{Enter}',
  '<BS>': '{Backspace}',
  '<Tab>': '{Tab}',
  '<Del>': '{Delete}',
  '<Left>': '{ArrowLeft}',
  '<Right>': '{ArrowRight}',
  '<Up>': '{ArrowUp}',
  '<Down>': '{ArrowDown}',
  '{': '{{',
  '[': '[[',
};

function toUserEvent(keys: string[]): string {
  return keys
    .map((k) => {
      const ctrl = /^<C-(.)>$/.exec(k);
      if (ctrl) return `{Control>}${ctrl[1]}{/Control}`;
      return USER_EVENT_KEYS[k] ?? k;
    })
    .join('');
}

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

let view: EditorView | null = null;
afterEach(() => {
  view?.destroy();
  view = null;
});

describe('問題データの整合性', () => {
  test('ID が重複していない', () => {
    const ids = allProblems.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test.each(allProblems.map((p) => [p.id, p] as const))('%s: before/after が解析でき、異なる', (_, p) => {
    const before = parseMarked(p.before);
    const after = parseMarked(p.after);
    expect(stateMatches(before, after, p.checkCursor !== false)).toBe(false);
    expect(p.answers.length).toBeGreaterThan(0);
    // 日本語・英語の両方の問題文とヒントがある
    expect(p.prompt.ja.trim()).not.toBe('');
    expect(p.prompt.en.trim()).not.toBe('');
    if (p.hint) expect([p.hint.ja.trim(), p.hint.en.trim()]).not.toContain('');
  });
});

const cases = allProblems.flatMap((p) => p.answers.map((a) => [p.id, a, p] as const));

describe('模範解答で実際にゴールへ到達できる', () => {
  test.each(cases)('%s: %s', async (_, answer, p) => {
    resetVimGlobals();
    const extensions = p.language ? [await loadLanguage(p.language)] : [];
    view = new EditorView({ state: createEditorState(parseMarked(p.before), extensions), parent: document.body });
    view.focus();
    await tick();
    await userEvent.keyboard(toUserEvent(tokenizeKeys(answer)));
    await tick(80);
    const s = snapshot(view);
    const goal = parseMarked(p.after);
    const actual = formatMarked(s);
    expect({ actual, mode: s.mode, promptOpen: s.promptOpen }).toEqual({
      actual: p.checkCursor === false ? actual : formatMarked(goal),
      mode: 'normal',
      promptOpen: false,
    });
    expect(s.text).toBe(goal.text);
  });
});
