import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { BET, JACK, KING, PASS, QUEEN } from './engine/engine'
import type { Action, Feedback, Solution, Table, View } from './engine/engine'

const solution: Solution = {
  rounds: 100,
  seconds: 0.01,
  game_value: -0.0556,
  exploitability: 0.02,
  bet: Array<number>(12).fill(0.5),
  curve: [
    { rounds: 1, exploitability: 0.33 },
    { rounds: 10, exploitability: 0.09 },
    { rounds: 100, exploitability: 0.02 },
  ],
}

const blank: View = {
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
}

/** A table that plays a fixed script: each step is the view after one call. */
function scriptedTable(deals: View[], replies: { feedback: Feedback; view: View }[]): Table & { actions: Action[] } {
  let current: View = { ...blank, handOver: true }
  const actions: Action[] = []
  return {
    actions,
    deal: () => {
      current = deals.shift() ?? current
    },
    act: (action) => {
      actions.push(action)
      const reply = replies.shift()!
      current = reply.view
      return reply.feedback
    },
    view: () => current,
  }
}

const wonShowdown: View = { ...blank, history: 6, pot: 4, heroToAct: false, handOver: true, showdown: true, result: 2 }

describe('App', () => {
  it('opens with the invitation and no hand in play', () => {
    render(<App table={scriptedTable([], [])} solution={solution} />)
    expect(screen.getByRole('heading', { name: 'Play the engine.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Deal the first hand/ })).toBeInTheDocument()
  })

  it('deals a hand and offers check or bet', async () => {
    const user = userEvent.setup()
    render(<App table={scriptedTable([blank], [])} solution={solution} />)
    await user.click(screen.getByRole('button', { name: /Deal the first hand/ }))

    expect(screen.getByRole('img', { name: 'Your card: King' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: "The engine's card, face down" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Check/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bet 1/ })).toBeInTheDocument()
    expect(screen.getByText('You act first.')).toBeInTheDocument()
  })

  it('offers fold or call when the engine has bet', async () => {
    const user = userEvent.setup()
    const facing: View = { ...blank, heroCard: QUEEN, heroSeat: 1, history: 2, facingBet: true, pot: 3 }
    render(<App table={scriptedTable([facing], [])} solution={solution} />)
    await user.click(screen.getByRole('button', { name: /Deal the first hand/ }))

    expect(screen.getByRole('button', { name: /Fold/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Call 1/ })).toBeInTheDocument()
    expect(screen.getByText('The engine bet 1.')).toBeInTheDocument()
  })

  it('shows the verdict, the result and the session after a bet that wins', async () => {
    const user = userEvent.setup()
    const table = scriptedTable([blank], [{ feedback: { passValue: 1, betValue: 1.4, cost: 0, solvedBet: 1 }, view: wonShowdown }])
    render(<App table={table} solution={solution} />)
    await user.click(screen.getByRole('button', { name: /Deal the first hand/ }))
    await user.click(screen.getByRole('button', { name: /Bet 1/ }))

    expect(table.actions).toEqual([BET])
    const verdict = within(screen.getByRole('region', { name: 'Verdict' }))
    expect(verdict.getByText('Best play')).toBeInTheDocument()
    expect(verdict.getByText('+1.40')).toBeInTheDocument()
    expect(verdict.getByText('The solved strategy always bets here.')).toBeInTheDocument()

    expect(screen.getByRole('img', { name: "The engine's card: Jack" })).toBeInTheDocument()
    expect(screen.getByText("Your King beats the engine's Jack. You win 2 chips.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Next hand/ })).toBeInTheDocument()

    const session = within(screen.getByRole('region', { name: 'Session' }))
    expect(session.getByText('+2.00')).toBeInTheDocument()
    expect(session.getByText('Play 9 more hands to see where your chips go.')).toBeInTheDocument()
  })

  it('adds the cost of a mistake to chips given up', async () => {
    const user = userEvent.setup()
    const lost: View = { ...blank, heroCard: JACK, engineCard: KING, history: 6, heroToAct: false, handOver: true, showdown: true, result: -2 }
    const table = scriptedTable([{ ...blank, heroCard: JACK }], [{ feedback: { passValue: -1, betValue: -1.5, cost: 0.5, solvedBet: 0 }, view: lost }])
    render(<App table={table} solution={solution} />)
    await user.click(screen.getByRole('button', { name: /Deal the first hand/ }))
    await user.click(screen.getByRole('button', { name: /Bet 1/ }))

    expect(within(screen.getByRole('region', { name: 'Verdict' })).getByText('Cost 0.50 chips')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Session' })).getAllByText('0.50')).toHaveLength(2) // total and per hand
  })

  it('plays from the keyboard', async () => {
    const user = userEvent.setup()
    const checked: View = { ...blank, history: 1, heroToAct: false }
    const table = scriptedTable([blank, blank], [{ feedback: { passValue: 1, betValue: 1, cost: 0, solvedBet: 0.5 }, view: { ...checked, history: 4, handOver: true, showdown: true, result: 1 } }])
    render(<App table={table} solution={solution} />)

    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: /Check/ })).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(table.actions).toEqual([PASS])
    expect(screen.getByText('Either play is fine')).toBeInTheDocument()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: /Check/ })).toBeInTheDocument()
  })

  it('lists every training checkpoint in the table behind the chart', () => {
    render(<App table={scriptedTable([], [])} solution={solution} />)
    const table = screen.getByRole('table', { hidden: true })
    expect(within(table).getAllByRole('row', { hidden: true })).toHaveLength(1 + solution.curve.length)
  })
})
