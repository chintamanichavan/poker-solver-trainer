import type { Solution } from '../engine/engine'
import { LearningChart } from './LearningChart'
import './Proof.css'

// The first player's result per hand when both sides play perfectly: a known
// result for this game (Kuhn, 1950).
const KNOWN_VALUE = -1 / 18

/** Four decimals, with a real minus sign. */
function signed(value: number): string {
  return (value < 0 ? '−' : '') + Math.abs(value).toFixed(4)
}

function seconds(value: number): string {
  return value < 1 ? `${value.toFixed(2)} s` : `${value.toFixed(1)} s`
}

/** How the engine learned, and how its result compares with the known answer. */
export function Proof({ solution }: { solution: Solution }) {
  return (
    <section className="proof" aria-labelledby="proof-title">
      <p className="label">The engine</p>
      <h2 id="proof-title" className="section-title">
        It taught itself, and it can be checked
      </h2>
      <p className="proof__lead">
        Nobody told the engine how to play. It played {solution.rounds.toLocaleString('en-US')} practice rounds against
        itself and, each round, leaned toward the plays it regretted not making. This game has a known exact answer, so
        its result can be checked.
      </p>

      <dl className="proof__tiles">
        <div>
          <dt>First player's result per hand</dt>
          <dd>{signed(solution.game_value)}</dd>
          <p>The known answer is −1/18, which is {signed(KNOWN_VALUE)}.</p>
        </div>
        <div>
          <dt>A perfect opponent wins</dt>
          <dd>{solution.exploitability.toFixed(5)}</dd>
          <p>chips per hand. Zero would mean it cannot be beaten at all.</p>
        </div>
        <div>
          <dt>Time to train</dt>
          <dd>{seconds(solution.seconds)}</dd>
          <p>on one processor core, when this page was built.</p>
        </div>
      </dl>

      <LearningChart solution={solution} />
    </section>
  )
}
