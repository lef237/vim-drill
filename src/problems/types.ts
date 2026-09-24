export type Category =
  | 'motion'
  | 'edit'
  | 'insert'
  | 'textobject'
  | 'visual'
  | 'search'
  | 'ex'
  | 'advanced';

export const CATEGORIES: Category[] = [
  'motion',
  'edit',
  'insert',
  'textobject',
  'visual',
  'search',
  'ex',
  'advanced',
];

export type Level = 1 | 2 | 3;

export type Lang = 'ja' | 'en';

/** 言語ごとの文字列 */
export type Localized = Record<Lang, string>;

/** テキストは複数行を配列で書ける。`|` の直後の文字がカーソル位置。 */
export type MarkedText = string | string[];

/** 構文解析が必要な問題（`it` などのタグのテキストオブジェクト）で使う言語 */
export type ProblemLanguage = 'html';

export interface Problem {
  id: string;
  category: Category;
  level: Level;
  /** 何をすべきかの説明 */
  prompt: Localized;
  before: MarkedText;
  after: MarkedText;
  /** 正解キー列（Vim 記法）。先頭が練習モードで表示する模範解答 */
  answers: string[];
  /** false ならカーソル位置を判定しない（:s など位置が本質でない問題） */
  checkCursor?: boolean;
  hint?: Localized;
  language?: ProblemLanguage;
}

export interface Cursor {
  line: number;
  ch: number;
}

export interface BufferState {
  text: string;
  cursor: Cursor;
}
