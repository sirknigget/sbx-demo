# CMakeLists.txt code rules

Comments are mandatory for new or changed `CMakeLists.txt` files. Do not return CMake that omits the
required bracket header and target/section comments.

Use this shape for new `CMakeLists.txt` files:

```cmake
#[[
Builds the event_tools static library and a small demo executable.
Uses the demo for local testing.
Lets callers select the C++ standard with CMAKE_CXX_STANDARD.
Lets callers enable tests with BUILD_TESTING.
Expects headers in include/ and source files in src/.
Keeps generated files in the build directory.
]]

cmake_minimum_required(VERSION 3.24)
project(event_tools LANGUAGES CXX)

# Keeps shared code in one library that applications and tests can link.
add_library(event_tools STATIC
  src/event_tools.cpp
)

# Makes headers in include/ available to projects that use the library.
# Keeps source files in src/ private to the library.
target_include_directories(event_tools
  PUBLIC
    include
)

# Requires C++20 for the library and projects that use it.
target_compile_features(event_tools PUBLIC cxx_std_20)

# Builds the demo when event_tools is the main project.
# Omits the demo when another project includes event_tools.
# Keeps demo-only packages out of the library.
if(CMAKE_SOURCE_DIR STREQUAL PROJECT_SOURCE_DIR)
  add_executable(event_tools_demo examples/demo.cpp)
  target_link_libraries(event_tools_demo PRIVATE event_tools)
endif()
```

Rules:

- New files start with a 2-10 line `#[[ ... ]]` header before `cmake_minimum_required`.
- Comment non-trivial options, dependency discovery, targets, include/export settings, compile
  features, generated files, install rules, demo/test sections, and platform branches.
- Use 1-3 `#` lines for each target or section comment. Use one line for a simple purpose. Use up to
  three lines when the CMake command does not show why the code is needed.
- Write every comment in Simplified Technical English (ASD-STE100). Use short, direct sentences with
  a clear subject and verb. Use the same word for the same meaning. Do not use jargon, idioms, or
  vague words.
- When a comment directly describes the code below it, omit the obvious subject and start with a
  present-tense verb. Use `it` in a following sentence when the reference is clear.
- Explain why targets depend on each other, which variables the caller sets, dependencies, build
  outputs, and platform limits.
- Do not narrate CMake command syntax.
