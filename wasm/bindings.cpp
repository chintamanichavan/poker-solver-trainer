// The browser's view of the trainer: poker::Table, with plain numbers in place
// of enums so the page needs no generated types.
//
// Cards are 0 (Jack), 1 (Queen), 2 (King). Actions are 0 (check or fold) and
// 1 (bet or call). Histories follow poker::History.

#include "poker/kuhn.hpp"
#include "poker/table.hpp"

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <cstddef>
#include <cstdint>
#include <vector>

namespace {

struct JsView {
  int heroCard;
  int heroSeat;
  int history;
  bool heroToAct;
  bool facingBet;
  int pot;
  bool handOver;
  bool showdown;
  int engineCard;
  int result;
};

poker::Strategy strategy_from(const emscripten::val& bet) {
  const std::vector<double> values = emscripten::vecFromJSArray<double>(bet);
  poker::Strategy s;
  for (std::size_t row = 0; row < s.bet.size() && row < values.size(); ++row)
    s.bet[row] = values[row];
  return s;
}

class JsTable {
public:
  // `seed` is a JavaScript number, so it carries at most 53 bits.
  JsTable(const emscripten::val& bet, double seed)
      : table_(strategy_from(bet), static_cast<std::uint64_t>(seed)) {}

  void deal() {
    table_.deal();
  }

  poker::Feedback act(int action) {
    return table_.act(action == 1 ? poker::Action::Bet : poker::Action::Pass);
  }

  JsView view() const {
    const poker::View& v = table_.view();
    return {
        .heroCard = static_cast<int>(v.hero_card),
        .heroSeat = v.hero_seat,
        .history = static_cast<int>(v.history),
        .heroToAct = !v.hand_over && poker::player_to_act(v.history) == v.hero_seat,
        .facingBet = poker::facing_bet(v.history),
        .pot = poker::pot(v.history),
        .handOver = v.hand_over,
        .showdown = v.showdown,
        .engineCard = static_cast<int>(v.engine_card),
        .result = v.result,
    };
  }

private:
  poker::Table table_;
};

}  // namespace

EMSCRIPTEN_BINDINGS(poker) {
  using namespace emscripten;

  value_object<JsView>("View")
      .field("heroCard", &JsView::heroCard)
      .field("heroSeat", &JsView::heroSeat)
      .field("history", &JsView::history)
      .field("heroToAct", &JsView::heroToAct)
      .field("facingBet", &JsView::facingBet)
      .field("pot", &JsView::pot)
      .field("handOver", &JsView::handOver)
      .field("showdown", &JsView::showdown)
      .field("engineCard", &JsView::engineCard)
      .field("result", &JsView::result);

  value_object<poker::Feedback>("Feedback")
      .field("passValue", &poker::Feedback::pass_value)
      .field("betValue", &poker::Feedback::bet_value)
      .field("cost", &poker::Feedback::cost)
      .field("solvedBet", &poker::Feedback::solved_bet);

  class_<JsTable>("Table")
      .constructor<val, double>()
      .function("deal", &JsTable::deal)
      .function("act", &JsTable::act)
      .function("view", &JsTable::view);
}
