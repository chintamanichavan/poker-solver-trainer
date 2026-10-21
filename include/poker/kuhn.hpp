// The rules of Kuhn poker.
//
// Three cards, two players, one card each. Both put in 1 chip, then there is
// one round of betting with a single bet of 1 chip. If nobody folds, the
// higher card wins.
//
// Everything here is a pure function of small values, so the solver, the
// scorer and the trainer all share one statement of the rules.

#pragma once

#include <array>
#include <cstddef>
#include <cstdint>

namespace poker {

enum class Card : std::uint8_t { Jack, Queen, King };
inline constexpr std::array<Card, 3> kCards{Card::Jack, Card::Queen, Card::King};

// Pass means check when there is no bet, and fold when there is one.
// Bet means bet when there is no bet, and call when there is one.
enum class Action : std::uint8_t { Pass, Bet };

// The betting so far. The first four are decision points, in the order the
// strategy table uses; the rest end the hand.
enum class History : std::uint8_t {
  Start,        // first player to act
  Pass,         // second player, after a check
  Bet,          // second player, facing a bet
  PassBet,      // first player, facing a bet after checking
  PassPass,     // showdown for the antes
  BetPass,      // second player folded
  BetBet,       // bet and call: showdown
  PassBetPass,  // first player folded
  PassBetBet,   // check, bet, call: showdown
};

inline constexpr std::size_t kDecisionHistories = 4;
inline constexpr std::size_t kInfoSets = kCards.size() * kDecisionHistories;

constexpr bool is_terminal(History h) {
  return static_cast<std::size_t>(h) >= kDecisionHistories;
}

// 0 for the player who acts first in the hand, 1 for the other.
constexpr int player_to_act(History h) {
  return (h == History::Pass || h == History::Bet) ? 1 : 0;
}

constexpr bool facing_bet(History h) {
  return h == History::Bet || h == History::PassBet;
}

constexpr History next(History h, Action a) {
  const bool bet = a == Action::Bet;
  switch (h) {
    case History::Start:
      return bet ? History::Bet : History::Pass;
    case History::Pass:
      return bet ? History::PassBet : History::PassPass;
    case History::Bet:
      return bet ? History::BetBet : History::BetPass;
    case History::PassBet:
      return bet ? History::PassBetBet : History::PassBetPass;
    default:
      return h;  // the hand is over
  }
}

// Chips the first player wins (negative: loses) once the hand is over.
constexpr int payoff_to_first(History h, Card first, Card second) {
  const int showdown = first > second ? 1 : -1;
  switch (h) {
    case History::PassPass:
      return showdown;
    case History::BetPass:
      return 1;
    case History::PassBetPass:
      return -1;
    case History::BetBet:
    case History::PassBetBet:
      return 2 * showdown;
    default:
      return 0;  // the hand is not over
  }
}

// Chips in the middle, antes included.
constexpr int pot(History h) {
  switch (h) {
    case History::Bet:
    case History::PassBet:
    case History::BetPass:
    case History::PassBetPass:
      return 3;
    case History::BetBet:
    case History::PassBetBet:
      return 4;
    default:
      return 2;
  }
}

// What a player knows when deciding: their own card and the betting so far.
// Returns the row of the strategy table for that knowledge.
constexpr std::size_t info_set(Card card, History h) {
  return static_cast<std::size_t>(card) * kDecisionHistories + static_cast<std::size_t>(h);
}

// A strategy: for each of the 12 info sets, the chance of choosing Bet.
struct Strategy {
  std::array<double, kInfoSets> bet{};

  constexpr double bet_at(Card card, History h) const {
    return bet[info_set(card, h)];
  }
};

}  // namespace poker
