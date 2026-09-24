import type { Extension } from '@codemirror/state';
import type { ProblemLanguage } from '../problems/types';

/**
 * `it` / `at` などタグのテキストオブジェクトは構文木を使うため、該当する問題だけ言語を読み込む。
 * 言語パッケージは大きいので、必要になったときに動的 import する。
 */
const loaded = new Map<ProblemLanguage, Extension>();
const pending = new Map<ProblemLanguage, Promise<Extension>>();

export function getLoadedLanguage(lang: ProblemLanguage): Extension | undefined {
  return loaded.get(lang);
}

export function loadLanguage(lang: ProblemLanguage): Promise<Extension> {
  const done = loaded.get(lang);
  if (done) return Promise.resolve(done);
  let promise = pending.get(lang);
  if (!promise) {
    promise = import('@codemirror/lang-html').then(({ html }) => {
      const ext = html({ autoCloseTags: false });
      loaded.set(lang, ext);
      return ext;
    });
    pending.set(lang, promise);
  }
  return promise;
}
