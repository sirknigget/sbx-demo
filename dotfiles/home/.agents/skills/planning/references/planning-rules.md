# Planning rules

Apply these rules to every mode. The amount of text shown to the user does not change the quality of
the planning work.

1. Explore the relevant code and repository guidance to understand the current behavior. Research
   unknown dependencies and external constraints. Use subagents for broad or noisy research when
   useful. Do not ask the user for facts you can find yourself.
2. Resolve material gaps in requirements, scope, constraints, or approach with the user before
   committing to a plan. Use the `grilling` skill when the decision needs sustained discussion; do
   not ask questions merely because planning is underway. Do not guess about what matters to the
   user.
3. Establish the smallest coherent solution that meets the request. Keep every proposed change
   within the requested scope. Check whether each part already exists or can use an existing
   mechanism; omit speculative validation, error handling, protection, or future work. Prefer reuse
   in this order: working project patterns, the language or framework, installed dependencies,
   trusted new dependencies, then bespoke code only if none fits. Apply this order even to small
   utilities.
4. Define observable completion criteria and proportionate verification from the existing project
   practices. Include important behavior, boundaries, and failures only when they matter to the
   actual use case. Avoid tests of implementation details.
5. Keep the plan readable and precise enough to guide implementation. Do not fill it with small
   decisions that can be made inside a clear scope and contract. Use Simplified Technical English
   (ASD-STE100), short sentences, and clear spacing.

Do this reasoning for internal, quick, and deep plans alike. Only the output format and approval
point depend on the mode.
