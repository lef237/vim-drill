import { displayKey } from '../engine/keys';
import { firstDivergence } from '../engine/judge';
import { useI18n } from '../i18n';

interface Props {
  answer: string[];
  typed: string[];
}

/** 模範解答のキー列を表示し、入力済み・次のキー・間違いを色分けする */
export function KeyChips({ answer, typed }: Props) {
  const { t } = useI18n();
  const diverge = firstDivergence(typed, answer);
  const progress = diverge === -1 ? typed.length : diverge;
  return (
    <div className="chips" aria-label={t.answerAria}>
      {answer.map((k, i) => {
        let state = 'pending';
        if (i < progress) state = 'done';
        else if (i === diverge) state = 'error';
        else if (i === progress) state = 'next';
        return (
          <kbd key={i} className={`chip ${state}`}>
            {displayKey(k)}
          </kbd>
        );
      })}
      {diverge !== -1 && diverge >= answer.length && (
        <kbd className="chip error extra">{displayKey(typed[diverge])}</kbd>
      )}
    </div>
  );
}

/** テストモード用: 入力したキーの履歴 */
export function KeyStream({ typed }: { typed: string[] }) {
  const { t } = useI18n();
  const recent = typed.slice(-24);
  return (
    <div className="stream" aria-label={t.typedAria}>
      {typed.length > recent.length && <span className="stream-more">…</span>}
      {recent.map((k, i) => (
        <kbd key={i} className="chip small">
          {displayKey(k)}
        </kbd>
      ))}
      <span className="stream-count">{t.keystrokes(typed.length)}</span>
    </div>
  );
}
