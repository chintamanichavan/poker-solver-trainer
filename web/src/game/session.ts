// Running totals for one visit: what happened, and what the decisions cost.

import type { Action, Card } from '../engine/engine'
import { NEGLIGIBLE, actionNoun, cardName } from './words'

export interface Session {
  hands: number
  /** Chips won. Over a few hands this is mostly luck. */
  won: number
  /** Chips given up against the best play. This is the skill number. */
  givenUp: number
  /** Chips given up by kind of mistake, such as "calling with the Jack". */
  leaks: Record<string, number>
}

export const EMPTY_SESSION: Session = { hands: 0, won: 0, givenUp: 0, leaks: {} }

export interface Decision {
  card: Card
  facingBet: boolean
  action: Action
  cost: number
}

export function recordDecision(session: Session, decision: Decision): Session {
  if (decision.cost < NEGLIGIBLE) return session
  const leak = `${actionNoun(decision.action, decision.facingBet).toLowerCase()} with the ${cardName(decision.card)}`
  return {
    ...session,
    givenUp: session.givenUp + decision.cost,
    leaks: { ...session.leaks, [leak]: (session.leaks[leak] ?? 0) + decision.cost },
  }
}

export function recordHand(session: Session, result: number): Session {
  return { ...session, hands: session.hands + 1, won: session.won + result }
}

/** Hands needed before the profile says anything: fewer is noise. */
export const PROFILE_AFTER = 10

/** One line on the player's biggest leak, or null while there are too few hands. */
export function profile(session: Session): string | null {
  if (session.hands < PROFILE_AFTER) return null

  let worst: string | null = null
  for (const [leak, cost] of Object.entries(session.leaks)) {
    if (worst === null || cost > (session.leaks[worst] ?? 0)) worst = leak
  }
  if (worst === null) return 'You have not given up a single chip. That is perfect play.'
  return `Most of what you gave up came from ${worst}.`
}
