import { BET, PASS } from '../engine/engine'
import type { Action, View } from '../engine/engine'
import { actionLabels, cardName, story } from '../game/words'
import { PlayingCard } from './PlayingCard'
import { Pot } from './Pot'
import './TableCard.css'

interface Props {
  /** Null before the first hand: the opening is shown. */
  view: View | null
  /** Counts hands, so each deal animates in fresh. */
  hand: number
  onDeal: () => void
  onAct: (action: Action) => void
}

/** The table: the engine's seat, the pot, your seat and the two buttons. */
export function TableCard({ view, hand, onDeal, onAct }: Props) {
  if (view === null) return <Opening onDeal={onDeal} />

  const [passLabel, betLabel] = actionLabels(view.facingBet)
  const lines = story(view)
  const engineLabel = view.showdown
    ? `The engine's card: ${cardName(view.engineCard)}`
    : "The engine's card, face down"

  return (
    <section className="table" aria-label="Table">
      <div className="table__seat" key={`engine-${hand}`}>
        <p className="label">Engine</p>
        <PlayingCard card={view.showdown ? view.engineCard : null} faceUp={view.showdown} size="small" label={engineLabel} />
      </div>

      <Pot count={view.pot} />

      <div className="table__seat table__seat--hero" key={`hero-${hand}`}>
        <PlayingCard card={view.heroCard} faceUp size="large" label={`Your card: ${cardName(view.heroCard)}`} />
        <p className="label">You</p>
      </div>

      <p className="table__story" aria-live="polite">
        {lines.map((line, i) => (
          <span key={i} className={i === lines.length - 1 ? 'table__latest' : undefined}>
            {line}{' '}
          </span>
        ))}
      </p>

      {view.handOver ? (
        <div className="table__actions">
          <button className="button button--primary button--wide" onClick={onDeal}>
            Next hand <kbd>Enter</kbd>
          </button>
        </div>
      ) : (
        <div className="table__actions">
          <button className="button" onClick={() => onAct(PASS)}>
            {passLabel} <kbd>←</kbd>
          </button>
          <button className="button button--primary" onClick={() => onAct(BET)}>
            {betLabel} <kbd>→</kbd>
          </button>
        </div>
      )}
    </section>
  )
}

// The film's last frame is its poster, so a visitor who has asked for less
// motion sees where it ends without watching it move.
const wantsLessMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Opening({ onDeal }: { onDeal: () => void }) {
  return (
    <section className="table table--opening" aria-label="Table">
      <video
        className="table__film"
        src="/art/opening.mp4"
        poster="/art/opening.jpg"
        autoPlay={!wantsLessMotion()}
        muted
        playsInline
        aria-hidden="true"
      />
      <h1 className="table__title">Play the engine.</h1>
      <p className="table__lead">
        Three cards, one bet. The engine taught itself this game. After every decision you see the best play and what
        yours cost.
      </p>
      <div className="table__actions">
        <button className="button button--primary button--wide" onClick={onDeal}>
          Deal the first hand <kbd>Enter</kbd>
        </button>
      </div>
    </section>
  )
}
