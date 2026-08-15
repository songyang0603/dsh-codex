# Pinned approval component

Status: implemented

## Problem

DSH's stock one-shot approval surface cannot losslessly express the pinned
Codex app-server request/response wire, wide Rust integers, ordered rich
decisions, live-session grants, supersession, or execpolicy-amendment
persistence ordering. Calling an external Codex process would leave the agent
state outside DSH and would not produce an independently composable component.

## Decision

`@songyang0603/dsh-codex-approval@0.1.0` owns one bounded subsystem:

- a Rust JSONL sidecar directly links the exact pinned
  `codex-app-server-protocol` crate and performs Serde validation before
  JavaScript parses the subject;
- the TypeScript client validates the sidecar identity and restores accepted
  wide integer lexemes as `bigint`;
- a Cordis service owns rich pending requests, cancellation, generic
  live-session approval caches, and persistence-before-release coordination;
- `[threadId, approvalId ?? itemId]` is an internal supersession owner key,
  while every prompt receives a fresh opaque correlation token;
- tool, shell, UI, sandbox, and network effects remain consumers or separate
  components rather than being duplicated inside approval.

The verified tuple is component version `0.1.0`, upstream Codex commit
`086396f7f60347b74c82784d5dfaf4fb2d3bda12`, DSH CLI/profile
`0.1.0-rc.6`, and macOS arm64. Linux, Windows, full app-server turn transport,
rich UI, and shell/sandbox/network composition are not inferred.

## Alternatives considered

- Reimplementing the wire entirely in TypeScript was rejected because JSON
  numbers cannot distinguish accepted `i64::MAX`/64-bit `usize::MAX` from
  overflow neighbors after parsing, and hand-maintained validators had already
  drifted from pinned Serde aliases and unknown-field behavior.
- Wrapping the native Codex executable was rejected because its agent loop,
  context, approval state, and session would remain external to DSH.
- Mapping everything to stock DSH `allowed-once` was rejected because it cannot
  represent the rich decisions, session cache, amendments, or exact failure
  semantics owned by this component.

## Consequences

The component requires a checksummed native binary per supported platform and
has a heavier Rust build because it directly pins the upstream protocol crate.
In return, wire acceptance and canonicalization stay upstream-owned, while DSH
owns the service lifecycle and composition seam. Package archives contain the
compiled runtime, native binary, bundle patch, instructions, and attribution;
source tests and conformance instrumentation remain in GitHub and are excluded
from consumer archives.

## Testing / Verification

Executed on macOS arm64:

- fixed upstream/source instrumentation versus the built component: `43/43`;
- separately classified DSH adapter contracts: `10/10`;
- approval package suite: 5 files, 49 tests;
- native protocol engine: 1 unit and 9 process black-box tests;
- locked Rust workspace: 26 tests;
- real compiled Cordis Loader lifecycle, including quiescent amendment
  persistence on unload;
- clean DSH rc.6 packed-profile add, activation, package-local native SHA-256,
  lossless wide integer, same-owner supersession with stale-token rejection,
  and removal;
- TypeScript build/typecheck, Rust fmt/clippy/build, publint, package-content,
  source-pin, artifact-pin, and notice checks.

The exact commands and evidence hashes are maintained in
[`conformance/approval/STATUS.md`](../../../../conformance/approval/STATUS.md).
