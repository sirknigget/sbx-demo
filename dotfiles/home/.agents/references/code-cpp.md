# C++ code rules

Comments are mandatory for new or changed C++ code. Do not return C++ that omits the required file
header and construct/section comments.

Use this shape for new C++ files:

```cpp
/*
 * Groups events in memory by key.
 * Copies each input event. Callers continue to own the input events.
 * Keeps each copy until the caller calls Drain.
 * Does not read or write external data, use locks, or save data.
 * Requires callers to prevent simultaneous use of one shared instance.
 */
#include <algorithm>
#include <cctype>
#include <functional>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

struct Event {
  std::string id;
  std::string name;
};

// Stores one event queue for each key. Returns batches in arrival order.
// Copies each input event. Later changes to the input event do not change the copy.
class EventBatcher {
 public:
  using KeyFn = std::function<std::string(const Event&)>;

  // Stores one key function for all events.
  explicit EventBatcher(KeyFn key_of) : key_of_(std::move(key_of)) {}

  // Adds the event to its key queue. Returns the number of events in that queue.
  std::size_t Add(Event event) {
    auto& batch = batches_[key_of_(event)];
    batch.push_back(std::move(event));
    return batch.size();
  }

  // Returns the batch for a key and removes the stored batch.
  // Returns an empty batch if no batch exists for the key.
  std::vector<Event> Drain(const std::string& key) {
    auto node = batches_.extract(key);
    return node.empty() ? std::vector<Event>{} : std::move(node.mapped());
  }

 private:
  KeyFn key_of_;
  std::unordered_map<std::string, std::vector<Event>> batches_;
};

// Converts a name to lowercase for comparison.
// Does not create a separate form of the name for display.
std::string NormalizeName(std::string name) {
  // Changes only ASCII letters.
  // Requires input code to convert all Unicode characters to a standard form.
  std::transform(name.begin(), name.end(), name.begin(), [](unsigned char ch) {
    return static_cast<char>(std::tolower(ch));
  });
  return name;
}

// Keeps the first event for each normalized name.
// Preserves input order.
std::vector<Event> DedupeRecords(const std::vector<Event>& records) {
  std::unordered_set<std::string> seen;
  std::vector<Event> unique;
  unique.reserve(records.size());

  // Uses a set to track names and a vector to preserve the first event in input order.
  for (const Event& record : records) {
    if (seen.insert(NormalizeName(record.name)).second) unique.push_back(record);
  }
  return unique;
}
```

Test-case comments use this shape:

```cpp
// Verifies that an expired session stops account loading before a store query.
// Expects LoadAccount to return SessionExpired and leave the store unchanged.
TEST(LoadAccountWithExpiredSession, ReturnsSessionExpiredWithoutQueryingStore) {
  // ...
}
```

Rules:

- New source/header files start with a 2-10 line `/* ... */` header before includes.
- Add a separate 1-3 line `//` comment above each class, function, method, constructor, destructor,
  and non-trivial implementation section. For simple intent, use one line. Use up to three lines
  when a comment must explain complex reasoning or a reason that the code does not show.
- Add a detailed 1-3 line `//` comment immediately above every test case and each parameterized
  case. State the input or initial state, the action, and the expected result or side effect.
- Give each test suite, test case, and parameterized case a specific name that identifies the
  condition and expected behavior. Never use vague names such as `HappyPath` or `ErrorHandling`.
- File headers do not replace the first class or function comment.
- Explain behavior that callers can observe, ownership, mutation, returns, errors, invariants,
  limits, and choices that the code does not show.
- Do not describe syntax or repeat names and signatures.
- Write every comment in Simplified Technical English (ASD-STE100). Use short, direct sentences with
  a clear subject and verb. Use the same word for the same meaning. Do not use jargon, idioms, or
  vague words.
- When a comment directly describes the code below it, omit the obvious subject and start with a
  present-tense verb. Use `it` in a following sentence when the reference is clear.
