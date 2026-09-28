# Python code rules

## Code Style

- **Follow PEP 8** - Use 4 spaces for indentation, limit lines to 88 characters (Black formatter
  default)
- **Use type hints** - Improve code readability and enable static analysis
- **Prefer f-strings** over `.format()` and string concatenation
- **Use list/dict/set comprehensions** when appropriate for readability

## Functions

- **Keep functions small** - Single responsibility principle, typically under 30 lines
- **Use keyword-only arguments** for complex function signatures
- **Prefer returning named tuples or dataclasses** over tuples for clarity
- **Document with docstrings** - Use Google or NumPy style for complex functions

## Classes

- **Use dataclasses** for simple data containers (Python 3.7+)
- **Prefer composition over inheritance** when possible
- **Use `@property` for computed attributes**
- **Implement `__str__` for readable string representation only when it's necessary**

## Error Handling

- **Use specific exceptions** - Avoid bare `except:`, but only when it's necessary and relevant for
  the error handling flow
- **Prefer EAFP** (Easier to Ask for Forgiveness than Permission) pattern
- **Clean up resources** with `finally` blocks or context managers
- **Reraise exceptions** with context using `raise ... from e`

## Imports

- **Use absolute imports** with `from x import y` pattern
- **Group imports**: standard library, third-party, local
- **Avoid `import *`** - Be explicit about imports
- **Use `__init__.py` files only in library projects, not in applications**
- **Use `__all__ =` exporting pattern only in library projects, not in applications**

## Performance

- **Prefer generators** over lists for large datasets
- **Use `itertools` and `functools`** for efficient operations
- **Profile before optimizing** - Use `cProfile` or `line_profiler`

## Testing

- **Write unit tests** with `pytest`
- **Use fixtures** for setup/teardown
- **Test edge cases and failures**, not just happy paths
- **Use `pytest.mark.parametrize`** for multiple test cases
- **Do not write tests just to verify that imports or data classes work**
- **Assert exact outputs** - always use `assert result == expected`. Never use
  `assert value in result` or substring/membership checks. Partial checks let silent mutations
  through and are not meaningful regression guards.

## Project Structure

```
project/
├── src/
│   └── pkg/
├── tests/
├── pyproject.toml
└── README.md
```

## Configuration

- **Use `pyproject.toml`** for all project configuration
- **Define dependencies** with version constraints in `[project.dependencies]`
- **Use `pyproject.toml` scripts** over `setup.py`

## Async

- **Use `async/await`** for I/O-bound operations
- **Prefer `asyncio.gather`** over sequential awaits
- **Set reasonable timeouts** on async operations
- **Use `aiohttp` or `httpx`** for async HTTP requests

## File IO

- **Never use relative paths for referencing any file or folder inside the project. Always use a
  path that starts from the project root folder.**

## Comment style

Comments are mandatory for new or changed Python code. Do not return Python that omits the required
file header and construct/section comments.

Use this shape for new Python files:

```python
# Groups events in memory by key.
# Uses a caller-provided key function and keeps caller ownership of each event object.
# Preserves arrival order and deletes events when the process ends.

from collections import defaultdict
from collections.abc import Callable, Iterable
from typing import Any, Hashable


# Stores one event batch for each key and preserves arrival order.
# Keeps original event objects. It lets callers change an event before they call drain.
class EventBatcher:
    # Starts with no batches. Requires key_of to return the same key for the same event.
    def __init__(self, key_of: Callable[[dict[str, Any]], Hashable]):
        self.key_of = key_of
        self._batches: dict[Hashable, list[dict[str, Any]]] = defaultdict(list)

    # Adds the original event object to its key batch.
    # Returns the number of events in that batch.
    def add(self, event: dict[str, Any]) -> int:
        batch = self._batches[self.key_of(event)]
        batch.append(event)
        return len(batch)

    # Returns the events for one key and removes the stored batch.
    def drain(self, key: Hashable) -> list[dict[str, Any]]:
        return self._batches.pop(key, [])


# Creates text for name comparisons, not text for display.
def normalize_name(name: object) -> str:
    return " ".join(str(name or "").strip().casefold().split())


# Keeps the first record for each normalized name.
# Preserves input order.
def dedupe_records(records: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []

    # Uses a set to detect names that appeared before.
    # Keeps the first record for each name in input order.
    for record in records:
        key = normalize_name(record.get("name"))
        if key and key not in seen:
            seen.add(key)
            unique.append(record)

    return unique
```

Test-case comments use this shape:

```python
# Verifies that an expired session stops account loading before a store query.
# Expects load_account to raise SessionExpired and leave the store unchanged.
def test_load_account_rejects_expired_session_without_querying_store():
    ...
```

Rules:

- Write every comment in Simplified Technical English (ASD-STE100). Use short, direct sentences with
  a clear subject and verb. Use the same word for the same meaning. Do not use jargon, idioms, or
  vague words.
- When a comment directly describes the code below it, omit the obvious subject and start with a
  present-tense verb. Use `it` in a following sentence when the reference is clear.
- New files start with 2-10 readable `#` lines; Python has no block comment syntax.
- Add a separate 1-3 line `#` comment above each class, function, method, initializer, and
  non-trivial implementation section. Keep simple intent to one line. Use up to three lines when the
  comment must explain a complex reason or a choice that is not clear from the code.
- Add a detailed 1-3 line `#` comment immediately above every test function and each parametrized
  test case. State the input or initial state, the action, and the expected result or side effect.
- Give each test function and parametrized case ID a specific name that identifies the condition and
  expected behavior. Never use vague names such as `test_happy_path` or `test_error_handling`.
- File headers do not replace the first class or function comment.
- Explain behavior that the caller can observe, ownership, data changes, return values, errors,
  required conditions, limits, and choices that need an explanation.
- Do not narrate syntax or repeat names/signatures.
- Docstrings are only for surrounding code that already expects public API docs; they do not replace
  these comments.
