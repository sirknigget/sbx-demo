# TypeScript code rules

Comments are mandatory for new or changed TypeScript code. Do not return TypeScript that omits the
required file header and construct/section comments.

Use this shape for new TypeScript files:

```ts
/*
 * Groups events in memory by key.
 * Uses a caller-provided key function and keeps caller ownership of each event object.
 * Preserves arrival order and deletes events when the process ends.
 */

type EventRecord = Record<string, unknown>;

// Stores one event batch for each key and preserves arrival order.
// Keeps original event objects. It lets callers change an event before they call drain.
class EventBatcher {
  private readonly batches = new Map<string, EventRecord[]>();

  // Stores the keyOf function.
  // Requires it to return the same key for the same event.
  constructor(private readonly keyOf: (event: EventRecord) => string) {}

  // Adds the original event object to its key batch.
  // Returns the number of events in that batch.
  add(event: EventRecord): number {
    const key = this.keyOf(event);
    const batch = this.batches.get(key) ?? [];
    batch.push(event);
    this.batches.set(key, batch);
    return batch.length;
  }

  // Returns the events for one key and deletes the stored batch.
  drain(key: string): EventRecord[] {
    const batch = this.batches.get(key) ?? [];
    this.batches.delete(key);
    return batch;
  }
}

// Creates text for name comparisons, not text for display.
function normalizeName(name: unknown): string {
  return String(name ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/gu, " ");
}

// Keeps the first record for each normalized name.
// Preserves input order.
function dedupeRecords(records: EventRecord[]): EventRecord[] {
  const seen = new Set<string>();

  // Uses a set to detect names that appeared before.
  // Keeps the first record for each name in input order.
  return records.filter((record) => {
    const key = normalizeName(record.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
```

Test-case comments use this shape:

```ts
describe("loadAccount when the caller session is expired", () => {
  // Verifies that an expired session stops account loading before a store query.
  // Expects loadAccount to reject with SessionExpired and leave the store unchanged.
  it("rejects with SessionExpired without querying the account store", async () => {
    // ...
  });
});
```

Rules:

- Write every comment in Simplified Technical English (ASD-STE100). Use short, direct sentences with
  a clear subject and verb. Use the same word for the same meaning. Do not use jargon, idioms, or
  vague words.
- When a comment directly describes the code below it, omit the obvious subject and start with a
  present-tense verb. Use `it` in a following sentence when the reference is clear.
- New files start with a 2-10 line `/* ... */` header.
- Add a separate 1-3 line `//` comment above each class, function, method, constructor, and
  non-trivial implementation section. Keep simple intent to one line. Use up to three lines when the
  comment must explain a complex reason or a choice that is not clear from the code.
- Add a detailed 1-3 line `//` comment immediately above every `it` or `test` case and each row that
  generates a separate case. State the input or initial state, the action, and the expected result
  or side effect.
- Make every `describe`, `it`, and `test` description literal specific enough to identify the
  subject, condition, and expected behavior. Never use vague descriptions such as `happy path` or
  `handles errors`.
- File headers do not replace the first class or function comment.
- Explain behavior that the caller can observe, ownership, data changes, return values, errors,
  required conditions, limits, and choices that need an explanation.
- Do not narrate syntax or repeat names/signatures.
- TSDoc/JSDoc is only for surrounding code that already expects public API docs; it does not replace
  these comments.
