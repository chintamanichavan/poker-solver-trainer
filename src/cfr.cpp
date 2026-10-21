#include "poker/cfr.hpp"

#include <algorithm>

namespace poker {

void Solver::run(std::int64_t rounds) {
  for (std::int64_t i = 0; i < rounds; ++i) {
    for (const Card first : kCards) {
      for (const Card second : kCards) {
        if (first != second) walk(History::Start, first, second, 1.0, 1.0);
      }
    }
  }
  rounds_ += rounds;
}

Strategy Solver::average() const {
  Strategy s;
  for (std::size_t row = 0; row < kInfoSets; ++row) {
    s.bet[row] = weight_[row] > 0.0 ? weight_bet_[row] / weight_[row] : 0.5;
  }
  return s;
}

// Regret matching: bet in proportion to how much betting is regretted.
double Solver::current_bet(std::size_t row) const {
  const double pass = std::max(regret_pass_[row], 0.0);
  const double bet = std::max(regret_bet_[row], 0.0);
  return pass + bet > 0.0 ? bet / (pass + bet) : 0.5;
}

// Returns the first player's result from `h` under this round's strategy, and
// updates the regrets and the average for the player who acts at `h`.
// `reach_first` and `reach_second` are each player's own chance of playing to
// `h`.
double Solver::walk(History h, Card first, Card second, double reach_first, double reach_second) {
  if (is_terminal(h)) return payoff_to_first(h, first, second);

  const bool first_acts = player_to_act(h) == 0;
  const std::size_t row = info_set(first_acts ? first : second, h);
  const double bet = current_bet(row);
  const double mine = first_acts ? reach_first : reach_second;
  const double theirs = first_acts ? reach_second : reach_first;

  const double pass_value =
      first_acts
          ? walk(next(h, Action::Pass), first, second, reach_first * (1.0 - bet), reach_second)
          : walk(next(h, Action::Pass), first, second, reach_first, reach_second * (1.0 - bet));
  const double bet_value =
      first_acts ? walk(next(h, Action::Bet), first, second, reach_first * bet, reach_second)
                 : walk(next(h, Action::Bet), first, second, reach_first, reach_second * bet);
  const double value = (1.0 - bet) * pass_value + bet * bet_value;

  // Values are from the first player's side; the second player wants the opposite.
  const double side = first_acts ? 1.0 : -1.0;
  regret_pass_[row] += theirs * side * (pass_value - value);
  regret_bet_[row] += theirs * side * (bet_value - value);
  weight_bet_[row] += mine * bet;
  weight_[row] += mine;
  return value;
}

}  // namespace poker
