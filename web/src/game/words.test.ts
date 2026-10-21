import { describe, expect, it } from 'vitest'
import { BET, JACK, KING, PASS, QUEEN } from '../engine/engine'
import type { View } from '../engine/engine'
import { actionLabels, chips, formatChips, story, verdict } from './words'

const view = (over: Partial<View>): View => ({
  heroCard: KING,
  heroSeat: 0,
  history: 0,
  heroToAct: true,
  facingBet: false,
  pot: 2,
  handOver: false,
  showdown: false,
  engineCard: JACK,
  result: 0,
  ...over,
})

describe('actionLabels', () => {
  it('offers check or bet when nobody has bet', () => {
    expect(actionLabels(false)).toEqual(['Check', 'Bet 1'])
  })
  it('offers fold or call when facing a bet', () => {
    expect(actionLabels(true)).toEqual(['Fold', 'Call 1'])
  })
})

describe('formatChips', () => {
  it('signs the amount and uses a real minus', () => {
    expect(formatChips(0.5)).toBe('+0.50')
    expect(formatChips(-1 / 3)).toBe('−0.33')
  })
  it('shows zero without a sign, even for a tiny negative', () => {
    expect(formatChips(0)).toBe('0.00')
    expect(formatChips(-0.001)).toBe('0.00')
  })
})

describe('chips', () => {
  it('uses the singular for one', () => {
    expect(chips(1)).toBe('1 chip')
    expect(chips(2)).toBe('2 chips')
  })
})

describe('story', () => {
  it('says who acts first on a fresh hand', () => {
    expect(story(view({}))).toEqual(['You act first.'])
  })
  it('reports the engine betting first', () => {
    expect(story(view({ heroSeat: 1, history: 2, facingBet: true }))).toEqual(['The engine bet 1.'])
  })
  it('reports a check answered by a bet', () => {
    expect(story(view({ history: 3, facingBet: true }))).toEqual(['You checked.', 'The engine bet 1.'])
  })
  it('ends a fold by the player with the loss', () => {
    const lines = story(view({ history: 7, handOver: true, heroToAct: false, result: -1 }))
    expect(lines).toEqual(['You checked.', 'The engine bet 1.', 'You folded.', 'You lose 1 chip.'])
  })
  it('ends a fold by the engine with the win', () => {
    const lines = story(view({ history: 5, handOver: true, heroToAct: false, result: 1 }))
    expect(lines).toEqual(['You bet 1.', 'The engine folded.', 'You take the pot and win 1 chip.'])
  })
  it('names both cards at a showdown the player wins', () => {
    const lines = story(view({ history: 6, handOver: true, showdown: true, result: 2 }))
    expect(lines.at(-2)).toBe('The engine called.')
    expect(lines.at(-1)).toBe("Your King beats the engine's Jack. You win 2 chips.")
  })
  it('names both cards at a showdown the player loses', () => {
    const lines = story(
      view({ heroCard: QUEEN, engineCard: KING, heroSeat: 1, history: 4, handOver: true, showdown: true, result: -1 }),
    )
    expect(lines).toEqual(['The engine checked.', 'You checked.', "The engine's King beats your Queen. You lose 1 chip."])
  })
})

describe('verdict', () => {
  it('names the cost and the better play after a mistake', () => {
    const v = verdict({ passValue: -1 / 3, betValue: -1 / 2, cost: 1 / 6, solvedBet: 0 }, BET, false)
    expect(v.tone).toBe('cost')
    expect(v.label).toBe('Cost 0.17 chips')
    expect(v.summary).toBe('Checking was better.')
    expect(v.solved).toBe('The solved strategy never bets here.')
  })
  it('confirms the better play', () => {
    const v = verdict({ passValue: -1, betValue: -2, cost: 0, solvedBet: 0 }, PASS, true)
    expect(v.tone).toBe('best')
    expect(v.label).toBe('Best play')
    expect(v.summary).toBe('Folding was the better play.')
    expect(v.solved).toBe('The solved strategy never calls here.')
  })
  it('says so when both plays are worth the same', () => {
    const v = verdict({ passValue: -1, betValue: -1, cost: 0, solvedBet: 1 / 3 }, BET, true)
    expect(v.tone).toBe('even')
    expect(v.label).toBe('Either play is fine')
    expect(v.solved).toBe('The solved strategy calls here 33% of the time.')
  })
  it('treats a gap too small to show as no gap', () => {
    const v = verdict({ passValue: -1.0003, betValue: -1.0001, cost: 0.0002, solvedBet: 0.33 }, PASS, true)
    expect(v.tone).toBe('even')
  })
  it('says always when the solved strategy never passes', () => {
    const v = verdict({ passValue: 1, betValue: 1.4, cost: 0, solvedBet: 1 }, BET, false)
    expect(v.solved).toBe('The solved strategy always bets here.')
  })
})
