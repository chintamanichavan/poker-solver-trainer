#include "poker/evaluate.hpp"

#include <algorithm>
#include <array>
#include <cstddef>

namespace poker {
namespace {

// For each card the opponent could hold, how likely the betting so far makes
// it. Not normalised: only the proportions matter until the final division.
using Reach = std::array<double, kCards.size()>;

constexpr std::size_t index(Card c) {
  return static_cast<std::size_t>(c);
}

constexpr double total(const Reach& reach) {
  return reach[0] + reach[1] + reach[2];
}

// Every card except the one the hero holds, equally likely.
constexpr Reach other_cards(Card held) {
  Reach reach{1.0, 1.0, 1.0};
  reach[index(held)] = 0.0;
  return reach;
}

constexpr double payoff_to(int player, History h, Card mine, Card theirs) {
  return player == 0 ? payoff_to_first(h, mine, theirs) : -payoff_to_first(h, theirs, mine);
}

// The hero's result from `h` on, summed over the opponent's cards by weight,
// when the hero picks the better action at every decision of their own.
double best_reply(const Strategy& s, int hero, Card card, History h, const Reach& reach) {
  if (is_terminal(h)) {
    double sum = 0.0;
    for (const Card other : kCards) sum += reach[index(other)] * payoff_to(hero, h, card, other);
    return sum;
  }
  if (player_to_act(h) == hero) {
    return std::max(best_reply(s, hero, card, next(h, Action::Pass), reach),
                    best_reply(s, hero, card, next(h, Action::Bet), reach));
  }
  Reach after_pass{};
  Reach after_bet{};
  for (const Card other : kCards) {
    const double bet = s.bet_at(other, h);
    after_bet[index(other)] = reach[index(other)] * bet;
    after_pass[index(other)] = reach[index(other)] * (1.0 - bet);
  }
  return best_reply(s, hero, card, next(h, Action::Pass), after_pass) +
         best_reply(s, hero, card, next(h, Action::Bet), after_bet);
}

// Walks the betting from `from` until it finds `target`, scaling `reach` by the
// opponent's chance of each action taken on the way. False if `target` does
// not lie below `from`.
bool reach_at(const Strategy& s, int hero, History from, History target, Reach& reach) {
  if (from == target) return true;
  if (is_terminal(from)) return false;
  for (const Action a : {Action::Pass, Action::Bet}) {
    Reach scaled = reach;
    if (player_to_act(from) != hero) {
      for (const Card other : kCards) {
        const double bet = s.bet_at(other, from);
        scaled[index(other)] *= a == Action::Bet ? bet : 1.0 - bet;
      }
    }
    if (reach_at(s, hero, next(from, a), target, scaled)) {
      reach = scaled;
      return true;
    }
  }
  return false;
}

double value_to_first(const Strategy& s, History h, Card first, Card second) {
  if (is_terminal(h)) return payoff_to_first(h, first, second);
  const double bet = s.bet_at(player_to_act(h) == 0 ? first : second, h);
  return (1.0 - bet) * value_to_first(s, next(h, Action::Pass), first, second) +
         bet * value_to_first(s, next(h, Action::Bet), first, second);
}

// Six equally likely deals: three cards for one player, two left for the other.
constexpr double kDeals = 6.0;

}  // namespace

double game_value(const Strategy& s) {
  double sum = 0.0;
  for (const Card first : kCards) {
    for (const Card second : kCards) {
      if (first != second) sum += value_to_first(s, History::Start, first, second);
    }
  }
  return sum / kDeals;
}

double best_reply_value(const Strategy& s, int player) {
  double sum = 0.0;
  for (const Card card : kCards) {
    sum += best_reply(s, player, card, History::Start, other_cards(card));
  }
  return sum / kDeals;
}

double exploitability(const Strategy& s) {
  return (best_reply_value(s, 0) + best_reply_value(s, 1)) / 2.0;
}

ActionValues action_values(const Strategy& opponent, Card card, History h) {
  const int hero = player_to_act(h);
  Reach reach = other_cards(card);
  reach_at(opponent, hero, History::Start, h, reach);
  // An opponent who never takes this line gives no evidence about their card.
  if (total(reach) == 0.0) reach = other_cards(card);

  const double weight = total(reach);
  return {
      .pass = best_reply(opponent, hero, card, next(h, Action::Pass), reach) / weight,
      .bet = best_reply(opponent, hero, card, next(h, Action::Bet), reach) / weight,
  };
}

}  // namespace poker
