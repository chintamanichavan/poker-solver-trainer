import './Rules.css'

const RULES = [
  'There are three cards: Jack, Queen and King. You and the engine get one each.',
  'You both put in 1 chip before the deal.',
  'The first player checks or bets 1 chip.',
  'After a check, the other player may check or bet 1. After a bet, the other player folds or calls.',
  'If nobody folds, the higher card wins the pot.',
]

export function Rules() {
  return (
    <section className="rules" aria-labelledby="rules-title">
      <p className="label">The game</p>
      <h2 id="rules-title" className="section-title">
        Kuhn poker, in five lines
      </h2>
      <ol className="rules__list">
        {RULES.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ol>
      <p className="rules__note">Play chips only. Nothing here is real money.</p>
    </section>
  )
}
