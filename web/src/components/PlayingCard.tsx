import type { Card } from '../engine/engine'
import { CARD_LETTERS } from '../game/words'
import './PlayingCard.css'

interface Props {
  /** The card to show when face up. Null while it is not known. */
  card: Card | null
  faceUp: boolean
  size: 'large' | 'small'
  /** Read out in place of the picture. */
  label: string
}

/** A card that turns over when `faceUp` changes. */
export function PlayingCard({ card, faceUp, size, label }: Props) {
  const front = card === null ? null : `/art/card-${CARD_LETTERS[card].toLowerCase()}.webp`
  return (
    <div className={`card card--${size} ${faceUp ? 'card--up' : ''}`} role="img" aria-label={label}>
      <div className="card__turn">
        <img className="card__side" src="/art/card-back.webp" alt="" draggable={false} />
        {front && <img className="card__side card__side--front" src={front} alt="" draggable={false} />}
      </div>
    </div>
  )
}
