import { useEffect } from 'react'
import { Proof } from './components/Proof'
import { Rules } from './components/Rules'
import { SessionPanel } from './components/SessionPanel'
import { TableCard } from './components/TableCard'
import { Verdicts } from './components/Verdicts'
import { BET, PASS } from './engine/engine'
import type { Solution, Table } from './engine/engine'
import { useGame } from './game/useGame'
import './App.css'

interface Props {
  table: Table
  solution: Solution
}

export function App({ table, solution }: Props) {
  const { view, judged, session, deal, act } = useGame(table)
  const canDeal = view === null || view.handOver

  // Arrow keys play the two buttons; Enter or space deals the next hand.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'ArrowLeft' && !canDeal) act(PASS)
      else if (event.key === 'ArrowRight' && !canDeal) act(BET)
      else if ((event.key === 'Enter' || event.key === ' ') && canDeal) deal()
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [act, deal, canDeal])

  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <p className="topbar__name">Poker Trainer</p>
          <p className="topbar__game">Kuhn poker</p>
        </div>
      </header>

      <main className="page">
        <div className="page__play">
          <TableCard view={view} hand={session.hands + (canDeal ? 0 : 1)} onDeal={deal} onAct={act} />
          <div className="page__side">
            <Verdicts judged={judged} />
            <SessionPanel session={session} />
          </div>
        </div>
        <Proof solution={solution} />
        <Rules />
      </main>
    </>
  )
}
