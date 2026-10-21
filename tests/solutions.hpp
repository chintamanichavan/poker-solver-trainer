// Strategies with known properties, shared by the tests.

#pragma once

#include "poker/kuhn.hpp"

namespace poker::testing {

// Kuhn's own solution (1950). It is a family: the first player may bluff with
// the Jack at any rate `alpha` from 0 to 1/3, as long as the King is bet three
// times as often. Every member loses 1/18 of a chip per hand as first player.
constexpr Strategy kuhn_solution(double alpha) {
  Strategy s;
  s.bet[info_set(Card::Jack, History::Start)] = alpha;
  s.bet[info_set(Card::Queen, History::Start)] = 0.0;
  s.bet[info_set(Card::King, History::Start)] = 3.0 * alpha;

  s.bet[info_set(Card::Jack, History::PassBet)] = 0.0;
  s.bet[info_set(Card::Queen, History::PassBet)] = alpha + 1.0 / 3.0;
  s.bet[info_set(Card::King, History::PassBet)] = 1.0;

  s.bet[info_set(Card::Jack, History::Pass)] = 1.0 / 3.0;
  s.bet[info_set(Card::Queen, History::Pass)] = 0.0;
  s.bet[info_set(Card::King, History::Pass)] = 1.0;

  s.bet[info_set(Card::Jack, History::Bet)] = 0.0;
  s.bet[info_set(Card::Queen, History::Bet)] = 1.0 / 3.0;
  s.bet[info_set(Card::King, History::Bet)] = 1.0;
  return s;
}

constexpr Strategy always(Action a) {
  Strategy s;
  s.bet.fill(a == Action::Bet ? 1.0 : 0.0);
  return s;
}

inline constexpr double kGameValue = -1.0 / 18.0;

}  // namespace poker::testing
