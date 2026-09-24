import type { Problem } from '../types';

export const searchProblems: Problem[] = [
  {
    id: 'search-slash',
    category: 'search',
    level: 1,
    prompt: { ja: '/ で target を検索して移動', en: 'Search for target with / and jump to it' },
    before: ['|let a = 1;', 'let b = 2;', 'let target = 3;'],
    after: ['let a = 1;', 'let b = 2;', 'let |target = 3;'],
    answers: ['/target<CR>', '/ta<CR>'],
  },
  {
    id: 'search-question',
    category: 'search',
    level: 2,
    prompt: { ja: '? で後方の import を検索して移動', en: 'Search backwards for import with ? and jump to it' },
    before: ['import x', 'code()', '|more()'],
    after: ['|import x', 'code()', 'more()'],
    answers: ['?import<CR>', '?im<CR>'],
  },
  {
    id: 'search-n',
    category: 'search',
    level: 2,
    prompt: { ja: 'x を検索し、n で2つ目の x へ移動', en: 'Search for x, then press n to reach the second x' },
    before: '|a x b x c x',
    after: 'a x b |x c x',
    answers: ['/x<CR>n', '2fx'],
  },
  {
    id: 'search-star',
    category: 'search',
    level: 2,
    prompt: {
      ja: 'カーソル位置の単語の次の出現へジャンプ',
      en: 'Jump to the next occurrence of the word under the cursor',
    },
    before: '|count = count + 1',
    after: 'count = |count + 1',
    answers: ['*'],
  },
  {
    id: 'search-hash',
    category: 'search',
    level: 2,
    prompt: {
      ja: 'カーソル位置の単語の前の出現へジャンプ',
      en: 'Jump to the previous occurrence of the word under the cursor',
    },
    before: 'total = total + |total',
    after: 'total = |total + total',
    answers: ['#'],
  },
  {
    id: 'search-d-slash',
    category: 'search',
    level: 3,
    prompt: {
      ja: '検索をモーションにして、END の手前までを削除',
      en: 'Use a search as the motion to delete everything before END',
    },
    before: '|remove these words END',
    after: '|END',
    answers: ['d/END<CR>', 'dtE'],
    hint: { ja: 'd の後ろに / 検索を続けられます', en: 'You can follow d with a / search' },
  },
];
