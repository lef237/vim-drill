import { Vim } from '@replit/codemirror-vim';

/** Vim の Ex コマンドとして提供するアプリ操作（:hint / :skip / :reset / :q） */
export interface AppCommandHandlers {
  hint(): void;
  skip(): void;
  reset(): void;
  quit(): void;
}

/** `:` の後に打てるアプリ用コマンド名（`:q` と `:quit` の両方を含む） */
export const APP_COMMAND_NAMES = ['hint', 'skip', 'reset', 'q', 'quit'] as const;

let current: AppCommandHandlers | null = null;
let registered = false;

export function setAppCommandHandlers(handlers: AppCommandHandlers | null): void {
  current = handlers;
}

export function registerAppCommands(): void {
  if (registered) return;
  registered = true;
  // Vim.defineEx はグローバル登録なので、実行時に現在のハンドラへ委譲する
  Vim.defineEx('hint', 'hint', () => current?.hint());
  Vim.defineEx('skip', 'skip', () => current?.skip());
  Vim.defineEx('reset', 'reset', () => current?.reset());
  Vim.defineEx('quit', 'q', () => current?.quit());
}
