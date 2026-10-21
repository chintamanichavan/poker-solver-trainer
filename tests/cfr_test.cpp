#include "poker/cfr.hpp"

#include "poker/evaluate.hpp"
#include "solutions.hpp"

#include <gtest/gtest.h>

namespace poker {
namespace {

using testing::kGameValue;

TEST(Solver, StartsAsACoinFlip) {
  const Solver solver;
  for (const double bet : solver.average().bet) EXPECT_EQ(bet, 0.5);
  EXPECT_EQ(solver.rounds(), 0);
}

TEST(Solver, GetsHarderToBeatAsItTrains) {
  Solver solver;
  double last = exploitability(solver.average());
  for (const std::int64_t rounds : {100, 900, 9'000, 90'000}) {
    solver.run(rounds);
    const double now = exploitability(solver.average());
    EXPECT_LT(now, last) << "after " << solver.rounds() << " rounds";
    last = now;
  }
  EXPECT_LT(last, 0.005);
}

TEST(Solver, ReachesTheKnownGameValue) {
  Solver solver;
  solver.run(100'000);
  EXPECT_NEAR(game_value(solver.average()), kGameValue, 0.002);
}

// The solved game has these features whatever bluffing rate the solver picks.
TEST(Solver, LearnsTheShapeOfTheKnownSolution) {
  Solver solver;
  solver.run(100'000);
  const Strategy s = solver.average();
  const double tolerance = 0.02;

  EXPECT_NEAR(s.bet_at(Card::King, History::Bet), 1.0, tolerance) << "always call with the King";
  EXPECT_NEAR(s.bet_at(Card::King, History::PassBet), 1.0, tolerance);
  EXPECT_NEAR(s.bet_at(Card::Jack, History::Bet), 0.0, tolerance) << "never call with the Jack";
  EXPECT_NEAR(s.bet_at(Card::Jack, History::PassBet), 0.0, tolerance);
  EXPECT_NEAR(s.bet_at(Card::Queen, History::Start), 0.0, tolerance) << "never open the Queen";
  EXPECT_NEAR(s.bet_at(Card::Queen, History::Pass), 0.0, tolerance);
  EXPECT_NEAR(s.bet_at(Card::King, History::Pass), 1.0, tolerance)
      << "bet the King when checked to";
  EXPECT_NEAR(s.bet_at(Card::Jack, History::Pass), 1.0 / 3.0, tolerance) << "bluff a third";
  EXPECT_NEAR(s.bet_at(Card::Queen, History::Bet), 1.0 / 3.0, tolerance) << "call a third";

  const double alpha = s.bet_at(Card::Jack, History::Start);
  EXPECT_GE(alpha, -tolerance);
  EXPECT_LE(alpha, 1.0 / 3.0 + tolerance);
  EXPECT_NEAR(s.bet_at(Card::King, History::Start), 3.0 * alpha, 3.0 * tolerance);
  EXPECT_NEAR(s.bet_at(Card::Queen, History::PassBet), alpha + 1.0 / 3.0, tolerance);
}

TEST(Solver, IsDeterministic) {
  Solver a;
  Solver b;
  a.run(1'000);
  b.run(400);
  b.run(600);
  EXPECT_EQ(a.average().bet, b.average().bet);
  EXPECT_EQ(b.rounds(), 1'000);
}

}  // namespace
}  // namespace poker
