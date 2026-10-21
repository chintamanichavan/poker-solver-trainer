#include "poker/evaluate.hpp"

#include "solutions.hpp"

#include <gtest/gtest.h>

namespace poker {
namespace {

using testing::always;
using testing::kGameValue;
using testing::kuhn_solution;

constexpr double kExact = 1e-12;

TEST(Evaluate, KnownSolutionLosesOneEighteenthAsFirstPlayer) {
  for (const double alpha : {0.0, 0.2, 1.0 / 3.0}) {
    EXPECT_NEAR(game_value(kuhn_solution(alpha)), kGameValue, kExact) << "alpha " << alpha;
  }
}

TEST(Evaluate, KnownSolutionCannotBeBeaten) {
  for (const double alpha : {0.0, 0.2, 1.0 / 3.0}) {
    const Strategy s = kuhn_solution(alpha);
    EXPECT_NEAR(best_reply_value(s, 0), kGameValue, kExact) << "alpha " << alpha;
    EXPECT_NEAR(best_reply_value(s, 1), -kGameValue, kExact) << "alpha " << alpha;
    EXPECT_NEAR(exploitability(s), 0.0, kExact) << "alpha " << alpha;
  }
}

TEST(Evaluate, BluffingOutsideTheSolutionCanBeBeaten) {
  EXPECT_GT(exploitability(kuhn_solution(0.6)), 0.01);
}

// Against a player who always checks and folds, betting wins the antes every hand.
TEST(Evaluate, AlwaysFoldingLosesTheAnteEveryHand) {
  const Strategy s = always(Action::Pass);
  EXPECT_NEAR(best_reply_value(s, 0), 1.0, kExact);
  EXPECT_NEAR(best_reply_value(s, 1), 1.0, kExact);
  EXPECT_NEAR(exploitability(s), 1.0, kExact);
}

// Against a player who always bets and calls: win 2 with the King, lose 1 by
// folding the Jack, and break even calling with the Queen.
TEST(Evaluate, AlwaysBettingLosesAThirdOfAChip) {
  const Strategy s = always(Action::Bet);
  EXPECT_NEAR(best_reply_value(s, 0), 1.0 / 3.0, kExact);
  EXPECT_NEAR(best_reply_value(s, 1), 1.0 / 3.0, kExact);
  EXPECT_NEAR(exploitability(s), 1.0 / 3.0, kExact);
}

TEST(Evaluate, OpeningBetWithTheQueenCostsASixth) {
  const ActionValues v = action_values(kuhn_solution(0.0), Card::Queen, History::Start);
  EXPECT_NEAR(v.pass, -1.0 / 3.0, kExact);
  EXPECT_NEAR(v.bet, -1.0 / 2.0, kExact);
}

TEST(Evaluate, CallingABetWithTheJackLosesTwo) {
  const ActionValues v = action_values(kuhn_solution(1.0 / 3.0), Card::Jack, History::Bet);
  EXPECT_NEAR(v.pass, -1.0, kExact);
  EXPECT_NEAR(v.bet, -2.0, kExact);
}

// After a check the first player holds the Jack (weight 2/3) or Queen (weight
// 1). A bet wins 1 from the Jack and 5/3 on average from the Queen.
TEST(Evaluate, BettingTheKingAfterACheckBeatsCheckingBehind) {
  const ActionValues v = action_values(kuhn_solution(1.0 / 3.0), Card::King, History::Pass);
  EXPECT_NEAR(v.pass, 1.0, kExact);
  EXPECT_NEAR(v.bet, 1.4, kExact);
}

// The solution makes a caller with the Queen indifferent: that is what the
// right bluffing rate means.
TEST(Evaluate, QueenFacingABetIsIndifferentAgainstTheSolution) {
  const ActionValues v = action_values(kuhn_solution(0.2), Card::Queen, History::PassBet);
  EXPECT_NEAR(v.pass, -1.0, kExact);
  EXPECT_NEAR(v.bet, -1.0, kExact);
}

// A player who never bets gives no evidence when the impossible happens, so
// both of their possible cards count equally.
TEST(Evaluate, UnreachableSpotAssumesEitherCardIsEquallyLikely) {
  const ActionValues v = action_values(always(Action::Pass), Card::Queen, History::Bet);
  EXPECT_NEAR(v.pass, -1.0, kExact);
  EXPECT_NEAR(v.bet, 0.0, kExact);
}

}  // namespace
}  // namespace poker
