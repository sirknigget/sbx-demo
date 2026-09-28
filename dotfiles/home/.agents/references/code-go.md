# Go code rules

## Interfaces

- **Add compile-time interface assertions for intentional implementations** - When a concrete type
  is meant to satisfy an interface, add a package-scope assertion next to the type definition using
  the idiomatic form `var _ Interface = (*Type)(nil)`. This catches interface drift, receiver
  mismatches, and signature mistakes at compile time.

## Comment style

Comments are mandatory for new or changed Go code. Do not return Go that omits the required file
header and construct or section comments.

Use this shape for new Go files:

```go
// Package batch stores events in memory by key.
// Preserves event arrival order. Callers continue to own the input events.
// Does not save state when the process stops.
package batch

// EventBatcher stores event queues by key. It returns batches in the order that events arrive.
// Copies each event into a queue. Later changes to the input event do not change the copy.
type EventBatcher struct {
	batches map[string][]Event
}

// Len returns the number of queued events for key.
func (b *EventBatcher) Len(key string) int {
	return len(b.batches[key])
}
```

Test-case comments use this shape:

```go
// Verifies that LoadAccount rejects invalid sessions before it queries the store.
func TestLoadAccountRejectsInvalidSessionBeforeStoreQuery(t *testing.T) {
	tests := []struct {
		name string
		session Session
	}{
		// Verifies that an expired session returns ErrSessionExpired without a store query.
		{name: "expired session returns ErrSessionExpired without querying the store", session: expiredSession},
		// Verifies that a revoked session returns ErrSessionRevoked without a store query.
		{name: "revoked session returns ErrSessionRevoked without querying the store", session: revokedSession},
	}

	// ...
}
```

Rules:

- New files start with a 2-10 line `//` package header immediately before the package declaration.
- Add a separate 1-3 line `//` comment above each type, function, method, initializer, and
  non-trivial implementation section. For simple intent, use one line. Use up to three lines when a
  comment must explain complex reasoning or a reason that the code does not show.
- Add a detailed 1-3 line `//` comment immediately above every test function and each table-driven
  or subtest case. State the input or initial state, the action, and the expected result or side
  effect.
- Give each test function, table-case name, and `t.Run` name a specific name that identifies the
  condition and expected behavior. Never use vague names such as `happy path` or `error handling`.
- File headers do not replace the first type or function comment.
- Explain behavior that callers can observe, ownership, mutation, returns, errors, invariants,
  limits, and choices that the code does not show.
- Do not describe syntax or repeat names and signatures.
- Write every comment in Simplified Technical English (ASD-STE100). Use short, direct sentences with
  a clear subject and verb. Use the same word for the same meaning. Do not use jargon, idioms, or
  vague words.
- When a comment directly describes the code below it, omit the obvious subject and start with a
  present-tense verb. Use `it` in a following sentence when the reference is clear.
- Keep required Go documentation prefixes such as `Package batch`, `EventBatcher`, and `Len`. After
  the prefix, use direct present-tense verbs.
