import { useEffect, useRef, useState } from 'react'
import type { Solution } from '../engine/engine'
import './LearningChart.css'

// The standard limit for this training method: payoff range (4) × decision
// points per player (6) × √actions (√2), divided by √rounds.
const LIMIT_AT_ONE_ROUND = 4 * 6 * Math.SQRT2

export function theoryLimit(rounds: number): number {
  return LIMIT_AT_ONE_ROUND / Math.sqrt(rounds)
}

// Plot area in CSS pixels, so text stays the same size on every screen. Both
// axes are logarithmic.
const WIDEST = 640
const NARROW = 480 // below this the line labels move inside the plot
const HEIGHT = 320
const LEFT = 58
const TOP = 14
const BOTTOM = 40
const Y_TOP = 2 // 100 chips
const Y_BOTTOM = -4 // 0.0001 chips

const Y_TICKS = [100, 1, 0.01, 0.0001]

function shortCount(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}M`
  if (n >= 1_000) return `${n / 1_000}k`
  return String(n)
}

function precise(value: number): string {
  return value >= 0.01 ? value.toFixed(2) : value.toPrecision(2)
}

/** Follows the width of the element the returned ref is attached to. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(WIDEST)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setWidth(Math.min(element.clientWidth, WIDEST)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/** How hard the engine was to beat as it trained, against what theory promises. */
export function LearningChart({ solution }: { solution: Solution }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [plot, width] = useWidth()
  const narrow = width < NARROW
  // Wide: each line is named at its right end. Narrow: in a key above the plot.
  const right = narrow ? 14 : 112
  const points = solution.curve
  const decades = Math.log10(solution.rounds)

  const x = (rounds: number) => LEFT + (Math.log10(rounds) / decades) * (width - LEFT - right)
  const y = (value: number) => TOP + ((Y_TOP - Math.log10(value)) / (Y_TOP - Y_BOTTOM)) * (HEIGHT - TOP - BOTTOM)
  const path = (value: (rounds: number, measured: number) => number) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.rounds).toFixed(1)},${y(value(p.rounds, p.exploitability)).toFixed(1)}`).join(' ')

  const xTicks: number[] = []
  for (let rounds = 1; rounds <= solution.rounds; rounds *= 100) xTicks.push(rounds)

  const last = points[points.length - 1]
  const shown = hovered === null ? null : points[hovered]

  // The checkpoint whose column the pointer is in.
  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const at = ((event.clientX - box.left) / box.width) * width
    let nearest = 0
    points.forEach((p, i) => {
      if (Math.abs(x(p.rounds) - at) < Math.abs(x(points[nearest]!.rounds) - at)) nearest = i
    })
    setHovered(nearest)
  }

  if (!last) return null

  return (
    <figure className="chart">
      {narrow && (
        <p className="chart__legend">
          <span>
            <span className="chart__key chart__key--measured" /> measured
          </span>
          <span>
            <span className="chart__key chart__key--limit" /> limit from theory
          </span>
        </p>
      )}
      <div className="chart__plot" ref={plot}>
        <svg
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label="The engine gets harder to beat as it trains, and stays far under the limit from theory."
          onPointerMove={onMove}
          onPointerLeave={() => setHovered(null)}
        >
          {Y_TICKS.map((tick) => (
            <g key={tick}>
              <line className="chart__grid" x1={LEFT} x2={width - right} y1={y(tick)} y2={y(tick)} />
              <text className="chart__tick" x={LEFT - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
                {tick}
              </text>
            </g>
          ))}
          {xTicks.map((tick) => (
            <text key={tick} className="chart__tick" x={x(tick)} y={HEIGHT - BOTTOM + 18} textAnchor="middle">
              {shortCount(tick)}
            </text>
          ))}
          <text className="chart__axis" x={(LEFT + width - right) / 2} y={HEIGHT - 4} textAnchor="middle">
            practice rounds
          </text>

          <path className="chart__limit" d={path((rounds) => theoryLimit(rounds))} />
          <path className="chart__measured" d={path((_, measured) => measured)} />

          {!narrow && (
            <>
              <text className="chart__end" x={x(last.rounds) + 8} y={y(theoryLimit(last.rounds))} dominantBaseline="middle">
                limit from theory
              </text>
              <text className="chart__end chart__end--strong" x={x(last.rounds) + 8} y={y(last.exploitability)} dominantBaseline="middle">
                measured
              </text>
            </>
          )}

          {shown && (
            <g>
              <line className="chart__cross" x1={x(shown.rounds)} x2={x(shown.rounds)} y1={TOP} y2={HEIGHT - BOTTOM} />
              <circle className="chart__dot chart__dot--limit" cx={x(shown.rounds)} cy={y(theoryLimit(shown.rounds))} r={4.5} />
              <circle className="chart__dot" cx={x(shown.rounds)} cy={y(shown.exploitability)} r={4.5} />
            </g>
          )}
        </svg>

        {shown && (
          <div
            className={`chart__tip ${x(shown.rounds) > width / 2 ? 'chart__tip--left' : ''}`}
            style={{ left: `${(x(shown.rounds) / width) * 100}%` }}
          >
            <p className="chart__tip-title">{shown.rounds.toLocaleString('en-US')} rounds</p>
            <p>
              <span className="chart__key chart__key--measured" /> measured <b>{precise(shown.exploitability)}</b>
            </p>
            <p>
              <span className="chart__key chart__key--limit" /> limit <b>{precise(theoryLimit(shown.rounds))}</b>
            </p>
          </div>
        )}
      </div>

      <figcaption className="chart__caption">
        Chips per hand a perfect opponent could win from the engine. Lower is better. Both axes are in powers of ten.
      </figcaption>

      <details className="chart__table">
        <summary>Show the numbers</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Rounds</th>
              <th scope="col">Measured</th>
              <th scope="col">Limit from theory</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.rounds}>
                <td>{p.rounds.toLocaleString('en-US')}</td>
                <td>{precise(p.exploitability)}</td>
                <td>{precise(theoryLimit(p.rounds))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
