// Scores a strategy: what it earns, and what a perfect opponent earns from it.

#pragma once

#include "poker/kuhn.hpp"

namespace poker {

// Average chips per hand the first player wins when both players follow `s`.
double game_value(const Strategy& s);

// Average chips per hand `player` wins by replying perfectly to `s`.
double best_reply_value(const Strategy& s, int player);

// Average chips per hand a perfect opponent wins from `s`, over both seats.
// Zero means `s` cannot be beaten.
double exploitability(const Strategy& s);

// Average chips the player to act at `h` ends the hand with, for each action.
struct ActionValues {
  double pass;
  double bet;
};

// The value of each action for a player holding `card` at `h`, against an
// opponent who follows `opponent`. It weighs the cards the opponent could hold
// by how likely the betting so far makes them, and assumes the player then
// plays perfectly for the rest of the hand.
ActionValues action_values(const Strategy& opponent, Card card, History h);

}  // namespace poker
