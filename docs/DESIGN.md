# Design: Poker Strategy Solver and Trainer, version 1

This file was written before any code. It says what the player sees, what the
engine must do, and the numbers we expect. Measured numbers are filled in at
the end as each part is built.

## 1. What version 1 is

One game: Kuhn poker. It is the smallest real poker game, and its exact
solution is known, so the engine can be checked against it.

- Three cards: Jack, Queen, King. Each player gets one. The third is unused.
- Each player puts 1 chip in before the deal.
- The first player checks or bets 1 chip.
- After a check, the second player checks or bets 1. After a bet, the other
  player folds or calls.
- If nobody folds, the higher card wins the pot.

Version 1 has two parts:

1. A solver. It learns the game by playing against itself, then saves its
   strategy to a small file.
2. A trainer. You play hands against that strategy in the browser. After each
   decision it shows the best play and what your choice cost.

Not in version 1: other poker games, saved accounts, a server, real money.

## 2. Who it is for, and the one thing they should feel

A visitor who knows roughly what poker is and has two minutes.

After five hands they should feel: "I can see exactly where I gave chips away,
and it was not luck."

So the screen separates two numbers that poker normally blurs together:

- **Chips won**: what happened. Mostly luck over a few hands.
- **Chips given up**: what your decisions cost against the best play. This is
  the skill number, and it is the one the page puts first.

## 3. The screen

One page, no navigation. Three blocks, top to bottom.

### 3.1 The table

```
┌──────────────────────────────────────────────┐
│  ENGINE                                      │
│  [card back]                                 │
│                                              │
│            pot: ● ● ●   3 chips              │
│                                              │
│  YOU                                         │
│  [ K ]                                       │
│                                              │
│  [   Check   ]        [   Bet 1   ]          │
└──────────────────────────────────────────────┘
```

- Your card is the largest thing on the screen.
- There are always exactly two buttons. Their labels change with the spot:
  "Check / Bet 1" when nobody has bet, "Fold / Call 1" when facing a bet.
- The engine's card stays face down. It turns over only at a showdown, as in
  real poker.
- A one-line log under the pot says what just happened in plain words:
  "The engine bet 1."

### 3.2 The verdict

It appears the moment you act, under the table. It never blocks the next hand.

```
  BEST PLAY                      or      COST 0.17 CHIPS
  Calling earns −1.00 on average.        Betting earns −0.50 on average.
  Folding earns −1.00.                   Checking earns −0.33.
  Either is fine here.                   Checking was better.

  The solved strategy bets here 33% of the time.
```

Rules for the verdict:

- Two bars, one per action, show the average result of each. The better one is
  dark, the other is grey. Your choice is marked.
- The cost is the gap between the two bars. If the gap is zero, it says so:
  many spots in poker have two equally good plays, and that is a lesson too.
- The last line shows how often the solved strategy takes each action. This is
  how a player learns that bluffing is done at a rate, not on a feeling.

### 3.3 The session and the proof

- **Session**: hands played, chips won, chips given up, and chips given up per
  hand. After ten hands it adds a one-line profile, for example "You call too
  often with a Jack."
- **How the engine learned**: one chart. The horizontal axis is the number of
  practice rounds. The vertical axis is how much a perfect opponent could win
  from the engine per hand. A dashed line is the limit theory promises; the
  solid line is what was measured. Under it, the game's known value (the first
  player loses 1/18 of a chip per hand) next to the engine's measured value.
- **Rules**: the five lines from section 1.

### 3.4 Phone

The same three blocks in one column. The two buttons are full width and sit at
the bottom of the table card, where a thumb reaches. Nothing scrolls sideways.

### 3.5 Keys

Left arrow and right arrow press the left and right button. Enter or space
deals the next hand.

## 4. Look

The Apple News look used in Artha and the learning platform: a warm off-white
page, pure white cards with a 14px radius and a soft shadow, Newsreader for
headlines and card letters, Geist for interface text, and one red accent kept
for small uppercase labels.

What is its own:

- The cards. Each is one large serif letter on a thick white card with a thin
  red edge, modelled and rendered in Blender. No suits, no court-card art.
- The chips. Plain discs with one red inlay ring, rendered in Blender.
- The opening. A short Blender film on the white table: three cards slide out
  and one turns over. It plays once.

Version 1 is light only. The film is rendered on white, so a dark table
would need a second render.

Motion in play is done in the page, not in video, so it stays sharp and stays
in step with the game: cards slide in and turn over, chips move to the pot,
the verdict rises into place. All of it is skipped when the visitor has asked
their device for reduced motion.

## 5. Engine design

### 5.1 Size of the problem

- Decision points a player can tell apart: 3 cards × 4 betting histories = 12.
- Each has two actions, so a strategy is 12 numbers (the chance of betting).
- The saved strategy file should be under 2 KB.

### 5.2 Modules

| Module | Job | Interface |
|---|---|---|
| `kuhn` | The rules | cards, actions, betting histories, who acts, who wins |
| `cfr` | Learns a strategy by self-play | `run(iterations)`, `average()` |
| `evaluate` | Scores a strategy | game value, best reply value, exploitability, value of each action in a spot |
| `table` | One seat at the trainer | `deal()`, `act(action)`, `view()` |

`table` is the only thing the browser talks to. The page draws; it makes no
poker decisions.

### 5.3 What "cost of a mistake" means

At your decision, the engine works out the average result of each action,
given the cards the engine could hold after the betting so far, and given that
you play as well as possible for the rest of the hand. The cost of your action
is the best average minus the average of the action you took. It is never
negative.

### 5.4 How it gets to the browser

One container build, four steps:

1. Build the C++ and run its tests.
2. Run the solver. It writes the strategy and the learning curve as JSON.
3. Compile `kuhn`, `evaluate` and `table` to WebAssembly.
4. Build the page and serve it.

Nothing generated is committed.

## 6. Numbers: predicted, then measured

Predictions were written before the code ran.

| Quantity | Predicted | Measured |
|---|---|---|
| Solver speed | 54 tree nodes per round at about 5 ns each: 0.3 µs per round, so 1,000,000 rounds in about 0.3 s | 0.056 µs per round: 1,000,000 rounds in 0.056 s. About five times faster than predicted; a node costs nearer 1 ns than 5 |
| Exploitability after 1,000,000 rounds | Theory's limit is 33.9 / √rounds = 0.034 chips per hand. Self-play usually lands about ten times under its limit: about 0.003 | 0.00015. About 230 times under the limit, so the guess of ten times was far too cautious |
| Game value for the first player | −1/18 = −0.0556 chips per hand (known result) | −0.055555, against −0.055556 |
| Strategy file | under 2 KB | 1.6 KB, with the learning curve included |
| WebAssembly file | 100 to 200 KB | 21 KB, plus 46 KB of loader script. Far smaller than predicted: the engine uses almost none of the C++ library |

Measured on this machine (24 cores, one used), GCC 15, release build, three
runs within 3% of each other. Exploitability does not fall at every single
checkpoint: it rises slightly between 200 and 500 rounds and between 10,000
and 20,000. The average strategy improves overall, not step by step.

The limit in the second row comes from the standard bound for this method:
range of payoffs (4) × decision points per player (6) × √actions (√2), divided
by √rounds.

## 7. How it is built

Small commits. Each one builds and passes its tests before the next starts.
Tests are written with the code, for the page as well as the engine.

1. This document.
2. The rules, with tests.
3. The solver and the scoring, checked against the known solution.
4. The solver program that writes the strategy file. Fill in section 6.
5. The trainer seat, with tests.
6. The WebAssembly build.
7. The page.
8. The Blender art and the opening film.
9. The container.

---

# Version 2: Texas Hold'em, push or fold

Written before the version 2 code. Version 1 proved the method on a game with
a known answer. Version 2 points the same method at a game people play.

## 8. What version 2 is

Real Texas Hold'em hands, two players, short stacks, one decision each.

- A full 52-card deck. Each player gets two cards.
- The small blind posts 0.5, the big blind posts 1. Both start with the same
  stack, chosen from 5, 10, 15 or 20 big blinds.
- The small blind goes all in or folds.
- If the small blind goes all in, the big blind calls or folds.
- After a call, five community cards are dealt and the best five-card hand
  wins the pot.

This is the "push or fold" game tournament players study. It is small enough
to solve properly on one machine, so every verdict is the true best play
against the engine, not an estimate.

Not in version 2: betting after the flop, more than two players, raises
smaller than all in. Full Hold'em cannot be solved honestly on one machine.

## 9. What changes on the screen

The page gets two games behind one switch in the top bar: **Hold'em** (shown
first) and **Kuhn** (the proof game from version 1).

### 9.1 The Hold'em table

```
┌──────────────────────────────────────────────┐
│  ENGINE · BIG BLIND                          │
│  [back] [back]                               │
│                                              │
│  [ ][ ][ ][ ][ ]      the board, after a call│
│                                              │
│  YOU · SMALL BLIND · 10 BB                   │
│  [ A♠ ] [ 7♦ ]                               │
│                                              │
│  [   Fold   ]        [   All in   ]          │
└──────────────────────────────────────────────┘
```

- Above the table, a row of four stack sizes. Changing it starts a new session.
- You alternate seats every hand. As the small blind you choose "Fold" or
  "All in". As the big blind you only act when the engine has gone all in, and
  choose "Fold" or "Call".
- When the engine folds its small blind, the hand is over at once and you win
  0.5. That is real, and it is part of what the big blind earns.
- The five board cards turn over one after another at a showdown.

### 9.2 The verdict and the session

Same shape as version 1, in big blinds. The four kinds of mistake the session
can name: pushing too wide, folding too tight on the small blind, calling too
wide, folding too tight on the big blind.

### 9.3 The proof

- **The range chart.** A 13 × 13 grid of every starting hand: pairs on the
  diagonal, suited hands above it, offsuit hands below. Each cell is shaded by
  how often the solved strategy goes all in (or calls) with that hand at the
  chosen stack. This is the chart poker players already know how to read.
- The learning curve and the "a perfect opponent wins" number, as before.

### 9.4 The cards

Hold'em needs suits. The 52 faces keep the version 1 card: one large serif
rank, with a suit mark under it and in the corners. Spades and clubs are ink,
hearts and diamonds are the accent red.

## 10. Engine design

### 10.1 Size of the problem

- Starting hands a player can tell apart: 169 (13 pairs, 78 suited, 78 offsuit).
- A strategy for one stack is 2 × 169 numbers: how often the small blind goes
  all in with each hand, and how often the big blind calls.
- What the solver needs first: for every pair of starting hands, how often one
  beats the other after five community cards. That is a 169 × 169 table.

### 10.2 The equity table

Worked out exactly, by dealing every possible board, not by sampling.

- One sample hand per class for the first player (suits do not matter, only
  whether they match), against every hand the second player can hold.
- Second-player hands that differ only by renaming unused suits are counted
  once, with a weight.
- Only half the table is computed; the other half is one minus it.

It takes minutes, so it is computed once by `tools/equity.cpp` and committed
as `data/preflop_equity.txt`. A test recomputes sampled entries by an
independent random method and checks they agree.

### 10.3 Modules

| Module | Job |
|---|---|
| `holdem/cards` | Cards, the 169 hand classes and their names |
| `holdem/hand_rank` | Ranks the best five-card hand out of seven |
| `holdem/equity` | Reads the equity table; counts how many ways two classes can be dealt together |
| `holdem/pushfold` | The solver, and the scoring of a strategy |
| `holdem/table` | One seat at the trainer |

### 10.4 Numbers: predicted, then measured

| Quantity | Predicted | Measured |
|---|---|---|
| Hand ranker speed | bit operations on four 13-bit masks: about 20 ns per seven-card hand | |
| Equity table | about 47,000 distinct matchups × 1.7 million boards × 2 hands = 1.6 × 10¹¹ rankings. At 20 ns on 24 cores: about 2.5 minutes | |
| A pair against itself | exactly 0.5 for every class (a check on the whole table) | |
| Solver speed | 2 × 169² = 57,000 multiply-adds per round: about 30 µs | |
| Exploitability, 10 big blinds, 100,000 rounds | payoffs are five times Kuhn's and there are 28 times more decision points: about 0.005 big blinds per hand. If worse than 0.001, switch to the faster variant of the method (CFR+) | |
| Small blind's all-in range at 10 big blinds | published charts say about 58% of hands | |
| Solution file, four stacks | 4 × 4 × 169 numbers: about 20 KB | |
