// Turns the engine's numbers into plain words. Pure functions, no state.

import { BET, PASS } from '../engine/engine'
import type { Action, Card, Feedback, History, View } from '../engine/engine'

export const CARD_NAMES = ['Jack', 'Queen', 'King'] as const
export const CARD_LETTERS = ['J', 'Q', 'K'] as const

export function cardName(card: Card): string {
  return CARD_NAMES[card]
}

/** The two button labels for a spot: left is pass, right is bet. */
export function actionLabels(facingBet: boolean): [string, string] {
  return facingBet ? ['Fold', 'Call 1'] : ['Check', 'Bet 1']
}

/** "Checking", "Betting", "Folding" or "Calling". */
export function actionNoun(action: Action, facingBet: boolean): string {
  if (action === BET) return facingBet ? 'Calling' : 'Betting'
  return facingBet ? 'Folding' : 'Checking'
}

function actionPast(action: Action, facingBet: boolean): string {
  if (action === BET) return facingBet ? 'called' : 'bet 1'
  return facingBet ? 'folded' : 'checked'
}

/** A signed amount with two decimals and a real minus sign: "+0.50", "−1.00". */
export function formatChips(amount: number): string {
  const rounded = Math.abs(amount) < 0.005 ? 0 : amount
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : ''
  return sign + Math.abs(rounded).toFixed(2)
}

export function chips(count: number): string {
  return count === 1 ? '1 chip' : `${count} chips`
}

// The actions behind each history, in the order they were taken.
const ACTIONS: Record<History, Action[]> = {
  0: [],
  1: [PASS],
  2: [BET],
  3: [PASS, BET],
  4: [PASS, PASS],
  5: [BET, PASS],
  6: [BET, BET],
  7: [PASS, BET, PASS],
  8: [PASS, BET, BET],
}

/** What has happened in the hand so far, one short sentence per event. */
export function story(view: View): string[] {
  const actions = ACTIONS[view.history]
  const lines = actions.map((action, i) => {
    const who = i % 2 === view.heroSeat ? 'You' : 'The engine'
    const facingBet = actions[i - 1] === BET
    return `${who} ${actionPast(action, facingBet)}.`
  })

  if (!view.handOver) {
    if (lines.length === 0) lines.push('You act first.')
    return lines
  }

  const amount = chips(Math.abs(view.result))
  if (view.showdown) {
    const mine = cardName(view.heroCard)
    const theirs = cardName(view.engineCard)
    lines.push(
      view.result > 0
        ? `Your ${mine} beats the engine's ${theirs}. You win ${amount}.`
        : `The engine's ${theirs} beats your ${mine}. You lose ${amount}.`,
    )
  } else {
    lines.push(view.result > 0 ? `You take the pot and win ${amount}.` : `You lose ${amount}.`)
  }
  return lines
}

export type Tone = 'best' | 'even' | 'cost'

export interface Verdict {
  tone: Tone
  /** The short uppercase label. */
  label: string
  /** One sentence on the choice made. */
  summary: string
  /** How often the solved strategy takes the bet action here. */
  solved: string
}

/** A cost this small shows as 0.00 chips, so it is treated as no cost at all. */
export const NEGLIGIBLE = 0.005

export function verdict(feedback: Feedback, action: Action, facingBet: boolean): Verdict {
  const gap = Math.abs(feedback.betValue - feedback.passValue)
  const better: Action = feedback.betValue > feedback.passValue ? BET : PASS

  let tone: Tone
  let label: string
  let summary: string
  if (gap < NEGLIGIBLE) {
    tone = 'even'
    label = 'Either play is fine'
    summary = 'Both plays average the same here.'
  } else if (feedback.cost < NEGLIGIBLE) {
    tone = 'best'
    label = 'Best play'
    summary = `${actionNoun(action, facingBet)} was the better play.`
  } else {
    tone = 'cost'
    label = `Cost ${feedback.cost.toFixed(2)} chips`
    summary = `${actionNoun(better, facingBet)} was better.`
  }

  const verb = facingBet ? 'calls' : 'bets'
  const percent = Math.round(feedback.solvedBet * 100)
  let solved: string
  if (percent === 0) solved = `The solved strategy never ${verb} here.`
  else if (percent === 100) solved = `The solved strategy always ${verb} here.`
  else solved = `The solved strategy ${verb} here ${percent}% of the time.`

  return { tone, label, summary, solved }
}
