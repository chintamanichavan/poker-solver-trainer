#include "poker/table.hpp"

#include "poker/evaluate.hpp"

#include <algorithm>
#include <array>

namespace poker {

Table::Table(const Strategy& engine, std::uint64_t seed) : engine_(engine), rng_(seed) {
  view_.hand_over = true;  // nothing to act on until the first deal
}

void Table::deal() {
  std::array<Card, 3> deck = kCards;
  std::shuffle(deck.begin(), deck.end(), rng_);

  view_ = View{.hero_card = deck[0], .hero_seat = hands_dealt_ % 2};
  engine_card_ = deck[1];
  ++hands_dealt_;
  let_engine_act();
}

Feedback Table::act(Action a) {
  if (view_.hand_over || player_to_act(view_.history) != view_.hero_seat) return {};

  const ActionValues values = action_values(engine_, view_.hero_card, view_.history);
  const double taken = a == Action::Bet ? values.bet : values.pass;
  const Feedback feedback{
      .pass_value = values.pass,
      .bet_value = values.bet,
      .cost = std::max(values.pass, values.bet) - taken,
      .solved_bet = engine_.bet_at(view_.hero_card, view_.history),
  };

  advance(a);
  let_engine_act();
  return feedback;
}

void Table::advance(Action a) {
  view_.history = next(view_.history, a);
  if (!is_terminal(view_.history)) return;

  const History h = view_.history;
  const bool hero_first = view_.hero_seat == 0;
  const int to_first = hero_first ? payoff_to_first(h, view_.hero_card, engine_card_)
                                  : payoff_to_first(h, engine_card_, view_.hero_card);
  view_.hand_over = true;
  view_.result = hero_first ? to_first : -to_first;
  view_.showdown = h == History::PassPass || h == History::BetBet || h == History::PassBetBet;
  if (view_.showdown) view_.engine_card = engine_card_;
}

void Table::let_engine_act() {
  if (view_.hand_over || player_to_act(view_.history) == view_.hero_seat) return;

  const double bet = engine_.bet_at(engine_card_, view_.history);
  const bool bets = std::uniform_real_distribution<double>(0.0, 1.0)(rng_) < bet;
  advance(bets ? Action::Bet : Action::Pass);
}

}  // namespace poker
