# Pinned apply-patch semantic engine

Status: implemented

## Problem

Pinned Codex exposes `apply_patch` to the model as a freeform custom tool with
an exact Lark grammar. DSH rc.6 exposes only JSON-Schema function tools. A DSH
tool shaped as `{ patch: string }` would therefore change the model-facing
protocol even if its filesystem mutation happened to match Codex.

The public `codex-apply-patch` crate does, however, own a coherent subsystem:
patch and streaming parsers, shell/direct invocation recognition, filesystem
verification, line-ending modes, file mutation, raw output, and ordered
committed deltas including partial and inexact effects.

## Decision

Implement `@songyang0603/dsh-codex-apply-patch-engine` as an independently
installable Cordis semantic service backed by a native JSONL sidecar that
directly links the fixed `codex-apply-patch` Git revision.

The engine boundary includes:

- parse and streaming-parse projections;
- direct and shell invocation recognition;
- filesystem-backed verification and proposed changes;
- unsandboxed local mutation using the pinned `ExecutorFileSystem` behavior;
- exact stdout/stderr and ordered committed delta, including partial success.

It does not register a model-visible DSH tool. The future canonical
`apply_patch` tool adapter remains a separate component and must prove
freeform provider transport, environment selection, safety, rich approval,
platform sandbox and retry, hooks, events, TurnDiff, and model-visible result
ordering before it can be called parity verified.

## Alternatives considered

- A `{ patch: string }` function tool was rejected because it is not Codex's
  freeform model contract.
- A TypeScript parser or mutator was rejected because it would duplicate
  tree-sitter invocation parsing, fuzzy Unicode matching, mixed line endings,
  `PathUri`, symlink behavior, and partial-delta semantics.
- Spawning the standalone upstream binary was rejected because it omits the
  verified preview and structured committed delta required by later policy and
  event consumers.
- Adding rollback or temp-file transactions was rejected because pinned Codex
  intentionally leaves earlier mutations committed when a later operation
  fails.

## Consequences

The service is useful to other DSH components as the exact semantic and
filesystem-effect owner, but installing it alone does not add an `apply_patch`
model tool. Its native mutation surface is explicitly unsandboxed; only a
trusted canonical consumer may call it until the sandbox component supplies
the exact per-attempt filesystem context.

Unload closes admission and waits for an in-flight mutation to reach a
terminal result. Killing the sidecar during a write is forbidden because it
would lose knowledge of the committed prefix.

## Verification

The macOS arm64 source-component boundary is `parity_verified`:

- all 96 pinned `codex-apply-patch` library/CLI/scenario tests pass;
- an independent pinned oracle matches the production client/native path on
  23/23 parse, stream, invocation, verify, mutation, output, snapshot, and
  committed-delta cases;
- 10 native and 6 TypeScript/native/real-Loader tests pass;
- a clean DSH rc.6 profile installs, activates, mutates through, and removes the
  packed component using the archive's checksummed native runtime;
- the archive contains runtime code and attribution but no test or conformance
  sources.

The completed claim remains distinct from the future full-tool claim.
