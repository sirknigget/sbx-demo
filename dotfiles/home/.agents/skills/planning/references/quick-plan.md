# Quick plan format

Use this format for Mode B. Show the plan first in a direct response of at most 50 lines. Use the
same planning rules as for internal and deep plans; summarize the decisions instead of reducing the
research. Omit a section only if it has no relevant content.

## User need and solution

State the need and the proposed result from the user's perspective, in one or two short sentences.

## Acceptance criteria

List the main observable results that define completion. Include a meaningful failure or boundary
only when required.

## Implementation and reuse

Name the main files or areas and the existing mechanisms to reuse. State only important decisions;
do not list every internal symbol.

## Verification

Describe the relevant behavior to exercise and how to observe the result.

## What's in scope

List the work needed to meet the request. Keep this list short; do not repeat the implementation
details.

## Out of scope

Name only plausible adjacent work that is excluded. Omit this section if there is no likely
confusion.

In the chat response, end by asking for confirmation or adjustments before implementation. Omit that
question from an approved plan saved to a file.

### Example

The paths below belong to an example project; they are not files in this skill repository.

<example>
## User need and solution

Report owners need recurring delivery and a way to see whether it worked. Add schedules and show
their latest delivery status.

## Acceptance criteria

1. An owner can create a valid schedule and read its next run time and latest status. Invalid input
   does not create a schedule.
2. Before the next run time, the scheduler sends nothing. At the next run time, it sends one report
   and saves the result.
3. If delivery fails, the schedule records the failure and moves to its next run without retrying
   that occurrence.

## Implementation and reuse

- Add schedule storage in `src/reports/report-schedule-repository.ts`; keep the recurrence,
  recipients, next run time, and latest result.
- Extend `src/reports/routes.ts` for create and read operations. Reuse its existing request
  validation.
- Call a due-report runner from `src/scheduler.ts`. Reuse `src/scheduler/recurrence.ts` for next run
  times, and the existing report generator and email sender. Do not add another job system.

## Verification

- Add `test/report-schedule-api.e2e.ts` to check valid creation, invalid input, and reads through
  the API.
- Add `test/run-due-reports.e2e.ts` to check execution before and at the due time, one send, saved
  status, and delivery failure.

## What's in scope

- Create and read schedules, execute due deliveries, save outcomes, and cover these behaviors in
  tests.

## Out of scope

- No schedule editing or delivery channels other than email.

Does this scope look right before implementation? </example>
