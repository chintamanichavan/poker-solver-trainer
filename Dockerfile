# One build, four steps: test and run the solver, compile the engine for the
# browser, build the page, serve it.

# 1. Build the C++, run its tests, and let the solver write what it learned.
FROM gcc:15 AS solver
RUN apt-get update && apt-get install -y --no-install-recommends cmake ninja-build git \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY CMakeLists.txt ./
COPY include include
COPY src src
COPY tests tests
COPY tools tools
RUN cmake -S . -B build -G Ninja && cmake --build build && ctest --test-dir build --output-on-failure
RUN ./build/solve 1000000 > kuhn.json

# 2. Compile the trainer to WebAssembly.
FROM emscripten/emsdk:4.0.10 AS engine
WORKDIR /src
COPY include include
COPY src src
COPY wasm wasm
RUN wasm/build.sh /out

# 3. Test and build the page around both.
FROM node:24-alpine AS web
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web .
COPY --from=solver /src/kuhn.json src/engine/wasm/kuhn.json
COPY --from=engine /out/engine.js /out/engine.wasm src/engine/wasm/
RUN npm test && npm run build

# 4. Serve it.
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
