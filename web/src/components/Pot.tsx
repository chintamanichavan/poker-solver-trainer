import { chips } from '../game/words'
import './Pot.css'

/** The chips in the middle, drawn as a short row of overlapping chips. */
export function Pot({ count }: { count: number }) {
  return (
    <div className="pot">
      <div className="pot__chips" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <img key={i} className="pot__chip" src="/art/chip.webp" alt="" draggable={false} />
        ))}
      </div>
      <p className="pot__count">
        <span className="label">Pot</span> {chips(count)}
      </p>
    </div>
  )
}
