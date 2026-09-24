/**
 * キーは Vim 記法の文字列で扱う: 通常文字はそのまま（スペースは " "）、
 * 特殊キーは "<Esc>" "<CR>" "<BS>" "<Tab>" "<C-r>" など。
 */

const NAMED_KEYS = new Set([
  'Esc', 'CR', 'BS', 'Tab', 'Del', 'Left', 'Right', 'Up', 'Down', 'Home', 'End',
]);

/** "ciwfoo<Esc>" → ["c","i","w","f","o","o","<Esc>"] */
export function tokenizeKeys(src: string): string[] {
  const keys: string[] = [];
  let i = 0;
  while (i < src.length) {
    if (src[i] === '<') {
      const end = src.indexOf('>', i);
      if (end > i) {
        const name = src.slice(i + 1, end);
        if (NAMED_KEYS.has(name) || /^C-.$/.test(name)) {
          keys.push(`<${name}>`);
          i = end + 1;
          continue;
        }
        if (name === 'lt' || name === 'Space') {
          keys.push(name === 'lt' ? '<' : ' ');
          i = end + 1;
          continue;
        }
      }
    }
    keys.push(src[i]);
    i++;
  }
  return keys;
}

const IGNORED = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'AltGraph', 'Dead', 'Unidentified', 'Process']);

const SPECIAL: Record<string, string> = {
  Escape: '<Esc>',
  Enter: '<CR>',
  Backspace: '<BS>',
  Tab: '<Tab>',
  Delete: '<Del>',
  ArrowLeft: '<Left>',
  ArrowRight: '<Right>',
  ArrowUp: '<Up>',
  ArrowDown: '<Down>',
  Home: '<Home>',
  End: '<End>',
};

/** KeyboardEvent を Vim 記法に変換する。記録対象外のキーは null */
export function keyFromEvent(e: KeyboardEvent): string | null {
  if (e.isComposing || e.keyCode === 229) return null;
  const key = e.key;
  if (IGNORED.has(key) || e.metaKey) return null;
  if (e.ctrlKey) {
    if (key === '[') return '<Esc>';
    if (key.length === 1) return `<C-${key.toLowerCase()}>`;
  }
  if (SPECIAL[key]) return SPECIAL[key];
  if (key.length === 1) return key;
  return null;
}

export function displayKey(key: string): string {
  if (key === ' ') return '␣';
  const ctrl = /^<C-(.)>$/.exec(key);
  if (ctrl) return `Ctrl-${ctrl[1]}`;
  switch (key) {
    case '<Esc>': return 'Esc';
    case '<CR>': return 'Enter';
    case '<BS>': return 'BS';
    default: return key.length > 1 ? key.slice(1, -1) : key;
  }
}
