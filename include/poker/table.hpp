// One seat at the trainer: you against the engine.
//
// The page calls deal(), shows view(), and passes each of your choices to
// act(). The table plays the engine's side, keeps its card hidden until a
// showdown, and tells you what each of your choices was worth.

#pragma once

#include "poker/kuhn.hpp"

#include <cstdint>
#include <random>

namespace poker {

// Everything the player is allowed to see.
struct View {
  Card hero_card{};
  int hero_seat = 0;  // 0: the player acts first this hand
  History history = History::Start;
  bool hand_over = false;
  bool showdown = false;  // true once the engine's card is face up
  Card engine_card{};     // only meaningful at a showdown
  int result = 0;         // chips the player won this hand, once it is over
};

// The verdict on one of the player's decisions.
struct Feedback {
  double pass_value = 0.0;  // average result of checking or folding
  double bet_value = 0.0;   // average result of betting or calling
  double cost = 0.0;        // best value minus the value of the action taken
  double solved_bet = 0.0;  // how often the engine's strategy bets in this spot
};

class Table {
public:
  Table(const Strategy& engine, std::uint64_t seed);

  // Starts a new hand. Seats swap every hand. If the engine acts first, it
  // has already acted when this returns.
  void deal();

  // Plays the player's action, then the engine's reply if the hand goes on.
  // Does nothing when it is not the player's turn.
  Feedback act(Action a);

  const View& view() const {
    return view_;
  }

private:
  void advance(Action a);
  void let_engine_act();

  Strategy engine_;
  std::mt19937_64 rng_;
  View view_;
  Card engine_card_{};
  int hands_dealt_ = 0;
};

}  // namespace poker
