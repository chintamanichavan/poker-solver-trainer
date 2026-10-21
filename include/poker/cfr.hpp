// Learns Kuhn poker by self-play, using counterfactual regret minimisation.
//
// Each round the solver plays every deal against itself. At each decision it
// records how much better each action would have done than what it actually
// did (its regret), then leans toward the actions it regrets not taking. The
// strategy of any one round keeps swinging; the average over all rounds is
// what settles on a strategy that cannot be beaten.

#pragma once

#include "poker/kuhn.hpp"

#include <array>
#include <cstdint>

namespace poker {

class Solver {
public:
  // Plays `rounds` more rounds of self-play.
  void run(std::int64_t rounds);

  // The average strategy over every round so far. Before the first round it
  // is the coin-flip strategy.
  Strategy average() const;

  std::int64_t rounds() const {
    return rounds_;
  }

private:
  double walk(History h, Card first, Card second, double reach_first, double reach_second);
  double current_bet(std::size_t row) const;

  std::array<double, kInfoSets> regret_pass_{};
  std::array<double, kInfoSets> regret_bet_{};
  // The average strategy, kept as two running sums per row.
  std::array<double, kInfoSets> weight_bet_{};
  std::array<double, kInfoSets> weight_{};
  std::int64_t rounds_ = 0;
};

}  // namespace poker
