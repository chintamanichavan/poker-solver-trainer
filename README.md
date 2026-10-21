# Poker Strategy Solver and Trainer

A poker engine that teaches itself by playing against itself, and a browser
game where you play against it with play chips. After each decision it shows
the best play and what your choice cost.

Version 1 covers Kuhn poker, the smallest real poker game. Its exact solution
is known, so the engine can be checked against it.

The design, written before the code, is in [docs/DESIGN.md](docs/DESIGN.md).
It also records what was predicted and what was measured.

## What is here

| Path | What it is |
|---|---|
| `include/poker/kuhn.hpp` | The rules |
| `src/cfr.cpp` | The solver: learns a strategy by self-play |
| `src/evaluate.cpp` | Scores a strategy, and values each action in a spot |
| `src/table.cpp` | One seat at the trainer: you against the engine |
| `tools/solve.cpp` | Trains the solver and writes what it learned as JSON |
| `wasm/` | The browser's view of the trainer, and its build script |
| `web/` | The page (React and TypeScript) |
| `blender/art.py` | Renders the cards, the chip and the opening film |
| `tests/` | C++ tests; the page's tests sit beside its code |

## Run it

```sh
docker compose up -d --build     # http://localhost:5178
```

The build runs every test, trains the solver, compiles the engine to
WebAssembly and builds the page. Nothing generated is committed.

## Work on it

The engine:

```sh
cmake -S . -B build -G Ninja && cmake --build build && ctest --test-dir build
./build/solve 1000000 > web/src/engine/wasm/kuhn.json
```

The browser build of the engine (needs Docker, not a local Emscripten):

```sh
docker run --rm -u "$(id -u):$(id -g)" -v "$PWD":/src -w /src \
  emscripten/emsdk:4.0.10 wasm/build.sh web/src/engine/wasm
```

The page, once those two steps have written their files:

```sh
cd web && npm install
npm test
npm run dev
```

The art (needs Blender 4.5):

```sh
blender -b --factory-startup -P blender/art.py -- stills
blender -b --factory-startup -P blender/art.py -- film
```

## Licences

The card letters are set in Newsreader, used under the SIL Open Font Licence
(`blender/fonts/OFL.txt`).
