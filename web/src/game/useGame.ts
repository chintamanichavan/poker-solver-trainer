import { useCallback, useState } from 'react'
import type { Action, Card, Feedback, Table, View } from '../engine/engine'
import { EMPTY_SESSION, recordDecision, recordHand } from './session'
import type { Session } from './session'

/** One decision the player made this hand, with the engine's verdict on it. */
export interface Judged {
  card: Card
  facingBet: boolean
  action: Action
  feedback: Feedback
}

interface Game {
  /** Null until the first hand is dealt. */
  view: View | null
  /** The player's decisions in the current hand, oldest first. */
  judged: Judged[]
  session: Session
  deal: () => void
  act: (action: Action) => void
}

/** Plays hands at `table` and keeps what the screen needs to show. */
export function useGame(table: Table): Game {
  const [view, setView] = useState<View | null>(null)
  const [judged, setJudged] = useState<Judged[]>([])
  const [session, setSession] = useState<Session>(EMPTY_SESSION)

  const deal = useCallback(() => {
    table.deal()
    setView(table.view())
    setJudged([])
  }, [table])

  const act = useCallback(
    (action: Action) => {
      const before = table.view()
      if (!before.heroToAct) return

      const feedback = table.act(action)
      const after = table.view()
      const decision = { card: before.heroCard, facingBet: before.facingBet, action, feedback }

      setView(after)
      setJudged((earlier) => [...earlier, decision])
      setSession((s) => {
        const withDecision = recordDecision(s, { ...decision, cost: feedback.cost })
        return after.handOver ? recordHand(withDecision, after.result) : withDecision
      })
    },
    [table],
  )

  return { view, judged, session, deal, act }
}
