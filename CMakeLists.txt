cmake_minimum_required(VERSION 3.22)
project(poker
  VERSION 0.1.0
  DESCRIPTION "Poker Strategy Solver and Trainer: Kuhn poker in C++23"
  LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

set(POKER_WARNINGS -Wall -Wextra -Wpedantic -Wshadow -Wconversion -Wsign-conversion -Wold-style-cast -Werror)

add_library(poker STATIC
  src/cfr.cpp
  src/evaluate.cpp
  src/table.cpp
)
target_include_directories(poker PUBLIC include)
target_compile_options(poker PRIVATE ${POKER_WARNINGS})

add_executable(solve tools/solve.cpp)
target_link_libraries(solve PRIVATE poker)
target_compile_options(solve PRIVATE ${POKER_WARNINGS})

enable_testing()
add_subdirectory(tests)
