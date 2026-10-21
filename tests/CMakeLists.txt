include(FetchContent)

FetchContent_Declare(
  googletest
  GIT_REPOSITORY https://github.com/google/googletest.git
  GIT_TAG        v1.15.2
)
set(BUILD_GMOCK   OFF CACHE BOOL "" FORCE)
set(INSTALL_GTEST OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

add_executable(poker_tests
  cfr_test.cpp
  evaluate_test.cpp
  kuhn_test.cpp
  table_test.cpp
)
target_link_libraries(poker_tests PRIVATE poker GTest::gtest_main)
target_compile_options(poker_tests PRIVATE ${POKER_WARNINGS})

include(GoogleTest)
gtest_discover_tests(poker_tests)
