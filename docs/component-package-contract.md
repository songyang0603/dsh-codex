# Component package contract

`dsh-codex` is a component library. The repository layout follows semantic
ownership, not the shape of the upstream Codex directories and not whichever
file is easiest to port first.

## One component, four possible layers

An independently installable component may contain up to four layers. A layer
exists only when the boundary needs it.

1. **Semantic service** — the public DSH/Cordis capability and its owned state.
2. **Native engine** — lossless or platform-specific pinned Codex semantics
   that TypeScript cannot reproduce exactly.
3. **DSH adapter** — translates DSH events/services into the semantic service
   without weakening or inventing behavior.
4. **Canonical consumer** — owns the real execution effect when several exact
   services must be sequenced together. This may be a later component.

These layers must not be collapsed merely to make installation look complete.
For example, execpolicy owns policy decisions; approval owns rich decisions and
session grants; the future shell consumer will own process launch and consume
both. Execpolicy cannot claim a sandbox bypass that it only serialized.

## Standard repository layout

```text
packages/<component>/
  src/
    index.ts             DSH/Cordis composition entry
    service.ts           semantic service and lifecycle ownership
    client.ts            optional native sidecar client
    types.ts             public vocabulary
  tests/                 source tests; never in the consumer archive
  cordis.patch.yml       independently installable bundle row
  README.md              boundary, use, status, and non-goals
  UPSTREAMS.md            exact source provenance for this component
  THIRD_PARTY_NOTICES.md  package-local attribution
  LICENSE / NOTICE
  package.json

crates/<component>-engine/
  src/                   pinned native/lossless semantics
  tests/                 protocol and direct-upstream differential tests

conformance/<component>/
  corpus                 fixed, reviewable cases
  upstream oracle        independently compiled pinned Codex behavior
  candidate runner       packaged/local component behavior
  strict comparator      fail-closed semantic comparison
  README.md / STATUS.md  commands, hashes, platform and exclusions
```

`index.ts` is intentionally thin. It composes services, registers effects, and
declares injection requirements. Policy parsers, persistence state machines,
and protocol validation do not live in the composition entry.

## State ownership vocabulary

Every stateful component documents each important value as exactly one of:

- **durable source of truth** — reconstructs after process/session restart;
- **derived projection** — replayable from a named durable source;
- **live cache** — disposable optimization or session-only authority;
- **presentation state** — UI-only and never a semantic authority.

A live cache is not written into resume data unless pinned Codex does so. A UI
projection cannot authorize an operation. If two components both appear to own
the same state, the component boundary is wrong and must be resolved before
implementation continues.

## Waterfall and effect ownership

DSH waterfalls can be short-circuited, so each decision seam has one policy
owner. Observers such as checkpointing or telemetry call `next()` and preserve
the downstream decision. Adapters must not create a second prompt or approval
path around the canonical consumer.

All timers, processes, pending requests, watchers, locks, and background work
belong to a Cordis fiber. Unload closes admission and remains owner-visible
until in-flight work reaches its documented terminal state. Returning from
dispose while a background task can still grant authority, persist a rule, or
publish state is a lifecycle bug.

## Native protocol boundary

A native engine uses a versioned, fail-closed JSONL protocol and a strict
identity handshake. Its hello response names the protocol version, pinned
Codex revision/source objects, engine version, OS, architecture, and pointer
width when relevant.

TypeScript may validate and expose the result but does not reinterpret an
upstream integer, parser, rule language, shell AST, or platform decision that
must remain exact. Malformed requests produce request-scoped errors without
poisoning the process; protocol/identity mismatches close the client and deny
the operation.

## Package and archive boundary

Every package must:

- use `@songyang0603/dsh-codex-<component>` and point
  `repository.directory` at its actual package directory;
- ship a unique `cordis.patch.yml` row through `dsh.bundle.patch`;
- publish compiled entries and exact required DSH/Cordis peers;
- include its instructions, license, notice, third-party notices, and
  provenance;
- include the correct current-platform native binary and checksum when needed;
- exclude `src/`, tests, conformance, temporary outputs, and build caches from
  the consumer archive.

GitHub keeps source tests and conformance because contributors need to
reproduce the claim. npm/tarball consumers receive only what is required to
install and run the component.

## Completion and composition

A component becomes `parity_verified` only under
[the parity standard](parity-standard.md). Passing package tests is necessary
but not sufficient: the bounded upstream differential, real built-artifact
Loader, clean-profile package activation, failure semantics, and claimed
platform evidence must all close.

The eventual `dsh-codex` canonical profile is a separate composition artifact.
It will replace conflicting stock consumers and prove the end-to-end sequence.
Installing every semantic package into an arbitrary third-party profile is not
automatically equivalent, because other guards or consumers may further alter
the execution.
