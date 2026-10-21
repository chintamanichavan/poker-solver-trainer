// Trains the solver and writes what it learned as JSON on standard output:
// the strategy, how good it is, and how it improved along the way.
//
//   solve [rounds] > kuhn.json

#include "poker/cfr.hpp"
#include "poker/evaluate.hpp"

#include <chrono>
#include <cstdint>
#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <vector>

namespace {

using Clock = std::chrono::steady_clock;

// 1, 2, 5, 10, 20, 50, ... up to and including `last`: even steps on a log axis.
std::vector<std::int64_t> checkpoints(std::int64_t last) {
  std::vector<std::int64_t> points;
  for (std::int64_t decade = 1; decade <= last; decade *= 10) {
    for (const std::int64_t step : {1, 2, 5}) {
      if (decade * step < last) points.push_back(decade * step);
    }
  }
  points.push_back(last);
  return points;
}

}  // namespace

int main(int argc, char** argv) {
  const std::int64_t rounds = argc > 1 ? std::atoll(argv[1]) : 1'000'000;
  if (rounds < 1) {
    std::cerr << "usage: solve [rounds]\n";
    return 1;
  }

  poker::Solver solver;
  Clock::duration training{};
  std::cout << std::setprecision(17) << "{\n  \"game\": \"kuhn\",\n  \"curve\": [";

  const char* separator = "\n";
  for (const std::int64_t point : checkpoints(rounds)) {
    const auto start = Clock::now();
    solver.run(point - solver.rounds());
    training += Clock::now() - start;  // scoring the checkpoint is not training

    std::cout << separator << "    {\"rounds\": " << point
              << ", \"exploitability\": " << poker::exploitability(solver.average()) << "}";
    separator = ",\n";
  }

  const poker::Strategy strategy = solver.average();
  const double seconds = std::chrono::duration<double>(training).count();
  std::cout << "\n  ],\n  \"rounds\": " << rounds << ",\n  \"seconds\": " << seconds
            << ",\n  \"game_value\": " << poker::game_value(strategy)
            << ",\n  \"exploitability\": " << poker::exploitability(strategy) << ",\n  \"bet\": [";
  separator = "";
  for (const double bet : strategy.bet) {
    std::cout << separator << bet;
    separator = ", ";
  }
  std::cout << "]\n}\n";

  std::cerr << rounds << " rounds in " << seconds << " s ("
            << seconds / static_cast<double>(rounds) * 1e6 << " us per round)\n";
  return 0;
}
