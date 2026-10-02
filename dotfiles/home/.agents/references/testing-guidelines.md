## Testing Guidelines

Test the contract the system exposes — not the easiest internal detail to assert.

- Every new test must defend one **concrete, externally observable contract**: behavior, output
  shape, state transition, error mapping, or a regression-prone parsing boundary. If you cannot name
  the contract, do not add the test.

### Test coverage requirements

Coverage reports identify code that tests do not execute; they do not prove that a required contract
lacks a test.

- For each uncovered path, first determine whether it implements a necessary observable contract.
- If the contract is necessary, add the smallest test that proves it.
- If the path is unnecessary, speculative, or irrelevant to the contract, delete the code instead of
  adding a test only to increase coverage.
- NEVER add meaningless scenarios, implementation-detail assertions, or unreachable-input tests only
  to satisfy a coverage percentage.
- A coverage target MUST NOT override the contract-focused test rules in this document.

### Good vs. bad test filter

The following use TypeScript example snippets but are relevant to any language or framework.

- **Name the failure mode.** Every test MUST state what a consumer observes if it regresses. Cannot
  name one? NEVER add it.
- **Good: transformation.** One fixture MAY prove parse/render/normalize/encode/resolve behavior
  when output is computed, not echoed.
- **Good: branch or boundary.** Distinct inputs, empty values, malformed input, version/provider
  routing, and state transitions MUST exercise a distinct branch or boundary, or prove a distinct
  observable outcome.
- **Good: external contract.** Exact bytes/shape MAY be asserted when a provider, parser, protocol,
  or persisted consumer reads them.
- **Good: precedence or negative contract.** Keep explicit `false`/override-wins assertions and
  required absence only when they prevent a documented leak, downgrade, 400, or incompatible wire
  field.
- **Good: regression.** A repro MUST trigger the prior real failure path and assert the corrected
  observable result.
- **Bad: static echo.** NEVER test a constructor/builder merely copied a fixture or baked constant
  into an in-memory config/metadata field.
- **Bad: success passthrough.** NEVER assert `fn(x) === x` when `x` was already supplied/declared
  valid; assert a transform, rejection, or downstream effect instead.
- **Bad: wording/defaults.** NEVER assert prompt/UI boilerplate, a default literal, object
  existence, non-empty output, or length growth without a consumer contract.
- **Bad: duplicate rows.** Parameterized/loop rows MUST each cover a distinct branch, provider/model
  path, or consumer contract; delete same-path duplicates.
- When test logic repeats for multiple values or scenarios, use the test framework's parameterized
  test feature instead of duplicating the test body.
- **Metadata exception.** Exact metadata, identity, ordering, or `undefined` MAY remain only when a
  downstream consumer depends on it and the test establishes branch, precedence, negative-contract,
  wire, or regression evidence.
- **Termination exception.** For cyclic/large inputs, assert a bounded output, surfaced error, or
  state change; bare `not.toThrow()` is insufficient.
- No placeholder tests, tautologies, or "the code ran" assertions (`expect(true).toBe(true)`, bare
  `not.toThrow()`, non-empty string checks, length-grew checks, "prompt exists" checks without
  semantic assertion).
- Prefer contract-level tests over implementation details. Avoid asserting internal helper wiring,
  field assignment, singleton identity, incidental ordering, prompt boilerplate, or passthrough
  option forwarding unless another component depends on that exact detail.
- Don't duplicate coverage across abstraction levels. If an integration test already proves the
  behavior, drop the narrower unit test that restates it through mocks.
- Tests **must be full-suite safe**, not just file-local safe. A test that passes alone but poisons
  later files is broken.
- For lifecycle/stateful code, prefer one test per invariant or transition over several tiny tests
  asserting one field each from the same transition.
- For error handling, trigger the real failure path and assert the surfaced contract — don't
  instantiate error classes directly or inspect internal metadata.
- Smoke tests are acceptable only when they catch a failure mode narrower tests would miss. "Package
  boots" or "command starts" alone is not enough.
- Assert exact strings, ordering, and formatting only when downstream code parses or depends on the
  exact bytes. Otherwise assert semantic content.
- Compile-time guarantees → type checks/type tests, not runtime placeholders.
- **Never source-grep.** A test that reads an implementation file (`.ts`/`.rs`/build script) and
  asserts on its _text_ — `expect(src).toContain("someCall()")`, `.toMatch(/import .../)`,
  `.not.toContain("oldName")`, or "comment must say X" — is banned. It tests how code _looks_, not
  what it _does_: it breaks on harmless refactors (comment reflow, rename, import reorder) and
  passes while the behavior is broken. Assert the observable contract instead (run the code, check
  output/state/error), use the runtime smoke probe for wiring you cannot exercise in-process, and
  enforce structural invariants (no value-import of X, no self-import) with a type test or an oxlint
  rule — never a string scan of the source. (Reading a file your code _wrote_ — apply-patch result,
  generated bundle, temp fixture — and asserting on that output is fine; that is behavior, not a
  source grep.)
- Don't add tests for tiny low-risk changes unless they protect a real contract or fix a
  regression-prone edge case.
- Prefer focused package-local verification for the changed area.

#### Test rules - non-negotiable

- Test files must not create, start, stop, or remove containers or infrastructure. Use one external
  project-owned infrastructure definition and lifecycle, such as Docker Compose, and connect tests
  to that infrastructure.
