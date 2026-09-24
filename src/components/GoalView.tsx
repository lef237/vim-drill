import type { BufferState } from '../problems/types';
import { useI18n } from '../i18n';

interface Props {
  before: BufferState;
  goal: BufferState;
  showCursor: boolean;
}

/** ゴール状態をエディタ風に表示する。before から変わった行を強調する */
export function GoalView({ before, goal, showCursor }: Props) {
  const { t } = useI18n();
  const beforeLines = before.text.split('\n');
  const lines = goal.text.split('\n');
  return (
    <pre className="goal" aria-label={t.goalAria}>
      {lines.map((line, i) => {
        const changed = beforeLines[i] !== line || beforeLines.length !== lines.length;
        const cursorHere = showCursor && goal.cursor.line === i;
        return (
          <div key={i} className={changed ? 'goal-line changed' : 'goal-line'}>
            <span className="goal-num">{i + 1}</span>
            <span className="goal-text">
              {cursorHere ? (
                <>
                  {line.slice(0, goal.cursor.ch)}
                  <span className="goal-cursor">{line[goal.cursor.ch] ?? ' '}</span>
                  {line.slice(goal.cursor.ch + 1)}
                </>
              ) : (
                line || ' '
              )}
            </span>
          </div>
        );
      })}
    </pre>
  );
}
