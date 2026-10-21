import { PROFILE_AFTER, profile } from '../game/session'
import type { Session } from '../game/session'
import { formatChips } from '../game/words'
import './SessionPanel.css'

/** The visit so far: the skill number first, the luck number second. */
export function SessionPanel({ session }: { session: Session }) {
  const perHand = session.hands > 0 ? session.givenUp / session.hands : 0
  const line = profile(session)
  const handsLeft = PROFILE_AFTER - session.hands

  return (
    <section className="session" aria-label="Session">
      <p className="label">Session</p>

      <div className="session__hero">
        <p className="session__number">{session.givenUp.toFixed(2)}</p>
        <p className="session__caption">
          chips given up
          <span className="session__sub">Your decisions against the best play. This is skill.</span>
        </p>
      </div>

      <dl className="session__stats">
        <div>
          <dt>Hands</dt>
          <dd>{session.hands}</dd>
        </div>
        <div>
          <dt>Given up per hand</dt>
          <dd>{perHand.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Chips won</dt>
          <dd>{formatChips(session.won)}</dd>
        </div>
      </dl>
      <p className="session__luck">Chips won is mostly luck over a few hands.</p>

      <p className="session__profile">
        {line ?? `Play ${handsLeft} more ${handsLeft === 1 ? 'hand' : 'hands'} to see where your chips go.`}
      </p>
    </section>
  )
}
