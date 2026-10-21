import { BET, PASS } from '../engine/engine'
import type { Action } from '../engine/engine'
import type { Judged } from '../game/useGame'
import { NEGLIGIBLE, actionNoun, formatChips, verdict } from '../game/words'
import './Verdicts.css'

/** The engine's verdict on each decision of the current hand, newest last. */
export function Verdicts({ judged }: { judged: Judged[] }) {
  if (judged.length === 0) {
    return (
      <section className="verdicts verdicts--empty" aria-label="Verdict">
        <p className="label">Verdict</p>
        <p className="verdicts__hint">Make a play. The best one, and what yours cost, shows here.</p>
      </section>
    )
  }
  return (
    <section className="verdicts" aria-label="Verdict" aria-live="polite">
      {judged.map((decision, i) => (
        <VerdictCard key={i} decision={decision} />
      ))}
    </section>
  )
}

// A hand is worth between −2 and +2 chips, so every bar fits this scale.
const MOST_CHIPS = 2

function VerdictCard({ decision }: { decision: Judged }) {
  const { feedback, action, facingBet } = decision
  const v = verdict(feedback, action, facingBet)
  const best = Math.max(feedback.passValue, feedback.betValue)
  const rows: { action: Action; value: number }[] = [
    { action: PASS, value: feedback.passValue },
    { action: BET, value: feedback.betValue },
  ]

  return (
    <article className={`verdict verdict--${v.tone}`}>
      <p className="label verdict__label">{v.label}</p>
      <dl className="verdict__rows">
        {rows.map((row) => (
          <div className="verdict__row" key={row.action}>
            <dt>
              {actionNoun(row.action, facingBet)}
              {row.action === action && <span className="verdict__yours">your play</span>}
            </dt>
            <dd>
              <Bar value={row.value} strong={best - row.value < NEGLIGIBLE} />
              <span className="verdict__value">{formatChips(row.value)}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="verdict__summary">
        {v.summary} <span className="verdict__note">Numbers are average chips for the hand.</span>
      </p>
      <p className="verdict__solved">{v.solved}</p>
    </article>
  )
}

/** A bar that grows left of the centre line for a loss and right for a win. */
function Bar({ value, strong }: { value: number; strong: boolean }) {
  const half = (Math.min(Math.abs(value), MOST_CHIPS) / MOST_CHIPS) * 50
  const style = value < 0 ? { right: '50%', width: `${half}%` } : { left: '50%', width: `${half}%` }
  return (
    <span className="bar" aria-hidden="true">
      <span className={`bar__fill ${strong ? 'bar__fill--strong' : ''} ${value < 0 ? 'bar__fill--loss' : ''}`} style={style} />
    </span>
  )
}
