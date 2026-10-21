#include "poker/kuhn.hpp"

#include <gtest/gtest.h>

#include <set>

namespace poker {
namespace {

TEST(Kuhn, FirstPlayerOpensAndSecondPlayerReplies) {
  EXPECT_EQ(player_to_act(History::Start), 0);
  EXPECT_EQ(player_to_act(History::Pass), 1);
  EXPECT_EQ(player_to_act(History::Bet), 1);
  EXPECT_EQ(player_to_act(History::PassBet), 0);
}

TEST(Kuhn, EveryLineOfBettingEndsWithinThreeActions) {
  for (const Action a : {Action::Pass, Action::Bet}) {
    for (const Action b : {Action::Pass, Action::Bet}) {
      const History after_two = next(next(History::Start, a), b);
      if (is_terminal(after_two)) continue;
      EXPECT_EQ(after_two, History::PassBet);
      EXPECT_TRUE(is_terminal(next(after_two, Action::Pass)));
      EXPECT_TRUE(is_terminal(next(after_two, Action::Bet)));
    }
  }
}

TEST(Kuhn, OnlyTheTwoPlayersFacingABetCanFold) {
  EXPECT_FALSE(facing_bet(History::Start));
  EXPECT_FALSE(facing_bet(History::Pass));
  EXPECT_TRUE(facing_bet(History::Bet));
  EXPECT_TRUE(facing_bet(History::PassBet));
}

TEST(Kuhn, ShowdownForAntesPaysOneChip) {
  EXPECT_EQ(payoff_to_first(History::PassPass, Card::King, Card::Jack), 1);
  EXPECT_EQ(payoff_to_first(History::PassPass, Card::Jack, Card::Queen), -1);
}

TEST(Kuhn, CalledBetPaysTwoChips) {
  EXPECT_EQ(payoff_to_first(History::BetBet, Card::Queen, Card::Jack), 2);
  EXPECT_EQ(payoff_to_first(History::BetBet, Card::Queen, Card::King), -2);
  EXPECT_EQ(payoff_to_first(History::PassBetBet, Card::King, Card::Queen), 2);
  EXPECT_EQ(payoff_to_first(History::PassBetBet, Card::Jack, Card::Queen), -2);
}

TEST(Kuhn, FoldLosesTheAnteWhateverTheCards) {
  for (const Card first : kCards) {
    for (const Card second : kCards) {
      if (first == second) continue;
      EXPECT_EQ(payoff_to_first(History::BetPass, first, second), 1);
      EXPECT_EQ(payoff_to_first(History::PassBetPass, first, second), -1);
    }
  }
}

TEST(Kuhn, PotCountsAntesAndBets) {
  EXPECT_EQ(pot(History::Start), 2);
  EXPECT_EQ(pot(History::Pass), 2);
  EXPECT_EQ(pot(History::Bet), 3);
  EXPECT_EQ(pot(History::PassBet), 3);
  EXPECT_EQ(pot(History::BetBet), 4);
  EXPECT_EQ(pot(History::PassBetBet), 4);
}

TEST(Kuhn, EachCardAndDecisionPointHasItsOwnStrategyRow) {
  std::set<std::size_t> rows;
  for (const Card card : kCards) {
    for (const History h : {History::Start, History::Pass, History::Bet, History::PassBet}) {
      const std::size_t row = info_set(card, h);
      EXPECT_LT(row, kInfoSets);
      rows.insert(row);
    }
  }
  EXPECT_EQ(rows.size(), kInfoSets);
}

}  // namespace
}  // namespace poker
