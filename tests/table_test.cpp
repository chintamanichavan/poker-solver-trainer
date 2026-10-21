#include "poker/table.hpp"

#include "poker/evaluate.hpp"
#include "solutions.hpp"

#include <gtest/gtest.h>

#include <array>

namespace poker {
namespace {

using testing::always;
using testing::kuhn_solution;

TEST(Table, NothingToActOnBeforeTheFirstDeal) {
  Table table(always(Action::Pass), 1);
  EXPECT_TRUE(table.view().hand_over);
  EXPECT_EQ(table.act(Action::Bet).cost, 0.0);
  EXPECT_TRUE(table.view().hand_over);
}

TEST(Table, SeatsSwapEveryHand) {
  Table table(always(Action::Pass), 1);
  for (int hand = 0; hand < 6; ++hand) {
    table.deal();
    EXPECT_EQ(table.view().hero_seat, hand % 2);
  }
}

TEST(Table, EngineHasAlreadyActedWhenItIsFirst) {
  Table bettor(always(Action::Bet), 1);
  bettor.deal();  // player first
  EXPECT_EQ(bettor.view().history, History::Start);
  bettor.deal();  // engine first
  EXPECT_EQ(bettor.view().history, History::Bet);

  Table checker(always(Action::Pass), 1);
  checker.deal();
  checker.deal();
  EXPECT_EQ(checker.view().history, History::Pass);
}

TEST(Table, FoldingLosesTheAnteAndKeepsTheEngineCardHidden) {
  Table table(always(Action::Bet), 1);
  table.deal();
  table.deal();  // engine first: it bets
  table.act(Action::Pass);
  EXPECT_TRUE(table.view().hand_over);
  EXPECT_FALSE(table.view().showdown);
  EXPECT_EQ(table.view().result, -1);
}

TEST(Table, EngineFoldingPaysTheAnte) {
  Table table(always(Action::Pass), 1);
  table.deal();  // player first
  table.act(Action::Bet);
  EXPECT_TRUE(table.view().hand_over);
  EXPECT_FALSE(table.view().showdown);
  EXPECT_EQ(table.view().result, 1);
}

TEST(Table, CalledBetGoesToShowdownForTwoChips) {
  Table table(always(Action::Bet), 7);
  for (int hand = 0; hand < 40; ++hand) {
    table.deal();
    table.act(Action::Bet);  // bet or call: the engine always calls back
    const View& view = table.view();
    ASSERT_TRUE(view.hand_over);
    ASSERT_TRUE(view.showdown);
    ASSERT_NE(view.hero_card, view.engine_card);
    EXPECT_EQ(view.result, view.hero_card > view.engine_card ? 2 : -2);
  }
}

TEST(Table, CheckedHandGoesToShowdownForOneChip) {
  Table table(always(Action::Pass), 7);
  for (int hand = 0; hand < 40; ++hand) {
    table.deal();
    table.act(Action::Pass);
    const View& view = table.view();
    ASSERT_TRUE(view.showdown);
    EXPECT_EQ(view.result, view.hero_card > view.engine_card ? 1 : -1);
  }
}

TEST(Table, FeedbackIsTheValueOfEachActionInThatSpot) {
  const Strategy engine = kuhn_solution(0.2);
  Table table(engine, 3);
  for (int hand = 0; hand < 200; ++hand) {
    table.deal();
    while (!table.view().hand_over) {
      const View before = table.view();
      const ActionValues expected = action_values(engine, before.hero_card, before.history);
      const Action choice = hand % 3 == 0 ? Action::Pass : Action::Bet;
      const Feedback feedback = table.act(choice);

      EXPECT_EQ(feedback.pass_value, expected.pass);
      EXPECT_EQ(feedback.bet_value, expected.bet);
      EXPECT_EQ(feedback.solved_bet, engine.bet_at(before.hero_card, before.history));
      EXPECT_GE(feedback.cost, 0.0);
      const double taken = choice == Action::Bet ? expected.bet : expected.pass;
      EXPECT_EQ(feedback.cost, std::max(expected.pass, expected.bet) - taken);
    }
  }
}

TEST(Table, CallingWithTheJackIsAMistakeThatCostsOneChip) {
  Table table(kuhn_solution(1.0 / 3.0), 5);
  for (int hand = 0; hand < 400; ++hand) {
    table.deal();
    const View& view = table.view();
    if (view.hero_card != Card::Jack || view.history != History::Bet) continue;
    const Feedback feedback = table.act(Action::Bet);
    EXPECT_NEAR(feedback.cost, 1.0, 1e-12);
    return;
  }
  FAIL() << "never faced a bet holding the Jack";
}

TEST(Table, DealsEveryCardAboutEquallyOften) {
  Table table(always(Action::Pass), 11);
  std::array<int, 3> seen{};
  const int hands = 3'000;
  for (int hand = 0; hand < hands; ++hand) {
    table.deal();
    ++seen[static_cast<std::size_t>(table.view().hero_card)];
  }
  // 1000 expected each; the spread of a fair deal is about 26.
  for (const int count : seen) EXPECT_NEAR(count, hands / 3, 130);
}

TEST(Table, SameSeedGivesTheSameHands) {
  const Strategy engine = kuhn_solution(0.1);
  Table a(engine, 42);
  Table b(engine, 42);
  for (int hand = 0; hand < 50; ++hand) {
    a.deal();
    b.deal();
    a.act(Action::Bet);
    b.act(Action::Bet);
    EXPECT_EQ(a.view().hero_card, b.view().hero_card);
    EXPECT_EQ(a.view().history, b.view().history);
    EXPECT_EQ(a.view().result, b.view().result);
  }
}

// Playing the best action every time against the solution earns the game's
// value on average: the luck washes out, and nothing is given up.
TEST(Table, BestPlayAgainstTheSolutionGivesUpNothing) {
  Table table(kuhn_solution(0.2), 99);
  double given_up = 0.0;
  double won = 0.0;
  const int hands = 60'000;
  for (int hand = 0; hand < hands; ++hand) {
    table.deal();
    while (!table.view().hand_over) {
      const ActionValues v =
          action_values(kuhn_solution(0.2), table.view().hero_card, table.view().history);
      given_up += table.act(v.bet > v.pass ? Action::Bet : Action::Pass).cost;
    }
    won += table.view().result;
  }
  EXPECT_EQ(given_up, 0.0);
  // Seats alternate, so the first-player loss and second-player gain cancel.
  EXPECT_NEAR(won / hands, 0.0, 0.02);
}

}  // namespace
}  // namespace poker
