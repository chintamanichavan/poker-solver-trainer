import { describe, expect, it } from 'vitest'
import { BET, JACK, PASS, QUEEN } from '../engine/engine'
import { EMPTY_SESSION, PROFILE_AFTER, profile, recordDecision, recordHand } from './session'
import type { Session } from './session'

const afterHands = (session: Session, hands: number): Session => {
  let s = session
  for (let i = 0; i < hands; i++) s = recordHand(s, 1)
  return s
}

describe('recordHand', () => {
  it('counts hands and adds up chips won', () => {
    const s = recordHand(recordHand(EMPTY_SESSION, 2), -1)
    expect(s.hands).toBe(2)
    expect(s.won).toBe(1)
  })
})

describe('recordDecision', () => {
  it('ignores a decision that cost nothing', () => {
    const s = recordDecision(EMPTY_SESSION, { card: JACK, facingBet: true, action: PASS, cost: 0 })
    expect(s).toBe(EMPTY_SESSION)
  })
  it('ignores a cost too small to show', () => {
    const s = recordDecision(EMPTY_SESSION, { card: JACK, facingBet: true, action: BET, cost: 0.0002 })
    expect(s).toBe(EMPTY_SESSION)
  })
  it('adds the cost to the total and to its kind of mistake', () => {
    const call = { card: JACK, facingBet: true, action: BET, cost: 1 } as const
    const s = recordDecision(recordDecision(EMPTY_SESSION, call), call)
    expect(s.givenUp).toBe(2)
    expect(s.leaks).toEqual({ 'calling with the Jack': 2 })
  })
})

describe('profile', () => {
  it('stays quiet until there are enough hands', () => {
    expect(profile(afterHands(EMPTY_SESSION, PROFILE_AFTER - 1))).toBeNull()
  })
  it('praises a session with nothing given up', () => {
    expect(profile(afterHands(EMPTY_SESSION, PROFILE_AFTER))).toMatch(/perfect play/)
  })
  it('names the most expensive kind of mistake', () => {
    let s = afterHands(EMPTY_SESSION, PROFILE_AFTER)
    s = recordDecision(s, { card: QUEEN, facingBet: false, action: BET, cost: 1 / 6 })
    s = recordDecision(s, { card: JACK, facingBet: true, action: BET, cost: 1 })
    expect(profile(s)).toBe('Most of what you gave up came from calling with the Jack.')
  })
})
