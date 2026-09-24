import { describe, expect, test } from 'vitest';
import { displayKey, keyFromEvent, tokenizeKeys } from './keys';
import { firstDivergence, isPrefix, stateMatches } from './judge';
import { filterProblems, pickProblems } from './session';
import { formatMarked, parseMarked } from '../problems/parse';
import { allProblems } from '../problems';

describe('tokenizeKeys', () => {
  test('通常文字と特殊キーを分解する', () => {
    expect(tokenizeKeys('ciwfoo<Esc>')).toEqual(['c', 'i', 'w', 'f', 'o', 'o', '<Esc>']);
    expect(tokenizeKeys(':s/a/b/<CR>')).toEqual([':', 's', '/', 'a', '/', 'b', '/', '<CR>']);
    expect(tokenizeKeys('5<C-x>')).toEqual(['5', '<C-x>']);
  });
  test('<lt> と <Space>、未知の <...> は文字として扱う', () => {
    expect(tokenizeKeys('a<lt>b<Space>')).toEqual(['a', '<', 'b', ' ']);
    expect(tokenizeKeys('<b>')).toEqual(['<', 'b', '>']);
  });
});

describe('keyFromEvent', () => {
  const ev = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);
  test('Vim 記法に変換する', () => {
    expect(keyFromEvent(ev({ key: 'a' }))).toBe('a');
    expect(keyFromEvent(ev({ key: 'Escape' }))).toBe('<Esc>');
    expect(keyFromEvent(ev({ key: 'Enter' }))).toBe('<CR>');
    expect(keyFromEvent(ev({ key: 'r', ctrlKey: true }))).toBe('<C-r>');
    expect(keyFromEvent(ev({ key: '[', ctrlKey: true }))).toBe('<Esc>');
  });
  test('修飾キー単体や Cmd ショートカットは記録しない', () => {
    expect(keyFromEvent(ev({ key: 'Shift' }))).toBeNull();
    expect(keyFromEvent(ev({ key: 'c', metaKey: true }))).toBeNull();
  });
  test('表示用の名前', () => {
    expect(displayKey(' ')).toBe('␣');
    expect(displayKey('<C-a>')).toBe('Ctrl-a');
    expect(displayKey('<Esc>')).toBe('Esc');
  });
});

describe('parseMarked / formatMarked', () => {
  test('カーソル位置を解析し、元に戻せる', () => {
    const s = parseMarked(['ab', 'c|d']);
    expect(s).toEqual({ text: 'ab\ncd', cursor: { line: 1, ch: 1 } });
    expect(formatMarked(s)).toBe('ab\nc|d');
  });
  test('マーカーがない・複数あるとエラー', () => {
    expect(() => parseMarked('abc')).toThrow();
    expect(() => parseMarked('a|b|c')).toThrow();
  });
});

describe('judge', () => {
  const goal = parseMarked('fo|o');
  test('テキストとカーソルで判定する', () => {
    expect(stateMatches(parseMarked('fo|o'), goal)).toBe(true);
    expect(stateMatches(parseMarked('|foo'), goal)).toBe(false);
    expect(stateMatches(parseMarked('|foo'), goal, false)).toBe(true);
  });
  test('キー列の前方一致', () => {
    expect(isPrefix(['c', 'i'], ['c', 'i', 'w'])).toBe(true);
    expect(firstDivergence(['c', 'a'], ['c', 'i', 'w'])).toBe(1);
    expect(firstDivergence(['c', 'i', 'w', 'x'], ['c', 'i', 'w'])).toBe(3);
  });
});

describe('pickProblems', () => {
  test('重複なく指定数を選ぶ', () => {
    const picked = pickProblems(allProblems, 20, {});
    expect(picked).toHaveLength(20);
    expect(new Set(picked.map((p) => p.id)).size).toBe(20);
  });
  test('プールより多く要求されたら全問', () => {
    const pool = filterProblems(allProblems, { mode: 'test', category: 'ex', level: 0, count: 30 });
    expect(pickProblems(pool, 30, {})).toHaveLength(pool.length);
  });
  test('苦手度の高い問題が選ばれやすい', () => {
    const [a, b] = allProblems;
    let aCount = 0;
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 1000; i++) {
      if (pickProblems([a, b], 1, { [a.id]: { seen: 1, cleared: 0, weak: 9 }, [b.id]: { seen: 1, cleared: 1, weak: 0 } }, random)[0] === a) aCount++;
    }
    expect(aCount).toBeGreaterThan(850);
  });
});
