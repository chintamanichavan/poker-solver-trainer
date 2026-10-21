// The page's view of the C++ trainer. The engine makes every poker decision;
// the page only shows what it reports.

export const PASS = 0 // check, or fold when facing a bet
export const BET = 1 // bet, or call when facing a bet
export type Action = typeof PASS | typeof BET

export const JACK = 0
export const QUEEN = 1
export const KING = 2
export type Card = typeof JACK | typeof QUEEN | typeof KING

/** The betting so far, numbered as in poker::History. */
export type History = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

/** Everything the player is allowed to see. */
export interface View {
  heroCard: Card
  /** 0 when the player acts first this hand. */
  heroSeat: 0 | 1
  history: History
  heroToAct: boolean
  facingBet: boolean
  pot: number
  handOver: boolean
  /** True once the engine's card is face up. */
  showdown: boolean
  engineCard: Card
  /** Chips the player won this hand, once it is over. */
  result: number
}

/** The verdict on one decision. Values are average chips for the hand. */
export interface Feedback {
  passValue: number
  betValue: number
  cost: number
  /** How often the solved strategy bets (or calls) in this spot. */
  solvedBet: number
}

export interface Table {
  deal(): void
  act(action: Action): Feedback
  view(): View
}

/** What the solver wrote after training. */
export interface Solution {
  rounds: number
  seconds: number
  game_value: number
  exploitability: number
  /** Chance of betting at each of the 12 decision points. */
  bet: number[]
  curve: { rounds: number; exploitability: number }[]
}

/** Loads the WebAssembly engine and seats the player against `solution`. */
export async function loadTable(solution: Solution, seed: number): Promise<Table> {
  const { default: createEngine } = await import('./wasm/engine.js')
  const engine = await createEngine()
  return new engine.Table(solution.bet, seed)
}
