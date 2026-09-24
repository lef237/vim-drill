import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang } from '../problems/types';
import { messages, type Messages } from './messages';

const LANG_KEY = 'vimdrill:lang:v1';
export const LANGS: Lang[] = ['ja', 'en'];

function isLang(value: unknown): value is Lang {
  return value === 'ja' || value === 'en';
}

/** 優先順位: URL の ?lang= → 保存済みの選択 → ブラウザの言語設定 → 英語 */
export function detectLang(): Lang {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (isLang(fromUrl)) return fromUrl;
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // 保存領域が使えなくても判定は続ける
  }
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  return preferred.some((l) => l?.toLowerCase().startsWith('ja')) ? 'ja' : 'en';
}

interface I18n {
  lang: Lang;
  t: Messages;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      // 保存できなくても切り替えは有効
    }
    // URL に ?lang= があると次回も上書きされるので取り除く
    const url = new URL(location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.delete('lang');
      history.replaceState(null, '', url);
    }
  }, []);

  const value = useMemo<I18n>(
    () => ({
      lang,
      t: messages[lang],
      setLang,
      toggleLang: () => setLang(lang === 'ja' ? 'en' : 'ja'),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
