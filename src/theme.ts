import { useCallback, useState } from 'react';

const THEME_KEY = 'vimdrill:theme:v1';

export type Theme = 'system' | 'light' | 'dark';
export const THEMES: Theme[] = ['system', 'light', 'dark'];

function isTheme(value: unknown): value is Theme {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** 優先順位: 保存済みの選択 → OS の設定に従う */
export function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (isTheme(saved)) return saved;
  } catch {
    // 保存領域が使えなくても判定は続ける
  }
  return 'system';
}

/** system のときは属性を外し、CSS の prefers-color-scheme に任せる */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function useTheme(): { theme: Theme; setTheme: (next: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(loadTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // 保存できなくても切り替えは有効
    }
  }, []);

  return { theme, setTheme };
}
