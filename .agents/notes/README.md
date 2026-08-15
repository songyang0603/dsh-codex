# Decision note contract

Decision notes preserve why a behavior, architecture boundary, test strategy,
or release rule exists. Current topology remains in `docs/`; public behavior
remains in package source, types, and package README files.

## Lifecycle and classes

Use one owning note at:

```text
.agents/notes/<proposed|implemented|rejected|archived>/<class>/yyyy-mm-dd-topic.md
```

The closed class set is `feature`, `bug-fix`, `simplification`, `architecture`,
`process`, and `testing`. The path and status line must agree. Keep the date on
the first proposal when moving a note. Use relative Markdown links.

Proposed notes use `Status: proposed` and own `Problem`, `Proposal`, genuine
`Alternatives considered`, observable `Acceptance criteria`, and `Risks`.
Implemented notes use `Status: implemented` and present-tense `Problem`,
`Decision`, `Alternatives considered`, `Consequences`, and actual
`Testing / Verification`; they must not retain proposal-only headings.
Rejected notes keep the evaluated proposal and put the concise verdict on the
status line.

## Changes and supersession

Create or update a note when a change alters behavior, architecture, a
cross-package contract, tooling/process, test strategy, a durable or wire
format, or rationale maintainers may revisit. Purely mechanical local edits do
not need a note.

Do not edit an implemented decision into its opposite. Create a new owner and
cross-link both. Archive only an implemented note whose rationale no longer
owns an active boundary, negative guarantee, compatibility semantic, or named
coverage gap; archive immutability is review-enforced until a checksum gate is
introduced.

## Completion

Evidence must address the real failure surface: unit logic, native protocol,
Loader/package composition, persistence ordering, and clean DSH profile
behavior are separate claims. Record commands actually run and explicit
platform boundaries. Moving a note never proves implementation by itself.
