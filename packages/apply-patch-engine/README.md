# `@songyang0603/dsh-codex-apply-patch-engine`

Pinned Codex apply-patch semantics exposed as a DeepSeek Harness Cordis
service. The package owns one long-running native sidecar and exports parser,
streaming-parser, invocation-recognition, filesystem-verification, and local
mutation operations.

This package is **not** a model-visible `apply_patch` tool. Installing it does
not add a tool to DSH. In particular, it does not substitute a JSON
`{ "patch": "..." }` function for Codex's freeform custom-tool contract.
Approval, sandbox retry, environment selection, hooks, session events,
TurnDiff, UI, and model-provider freeform transport remain separate components.

## Status

Version `0.1.0` is `parity_verified` for the pinned semantic-engine boundary on
macOS arm64 source builds. All 96 pinned upstream tests pass; the independent
production-path differential matches 23/23 cases; 10 native and 6
TypeScript/native/real-Loader tests pass; and a clean DSH rc.6 profile installs,
boots, mutates through, and removes the packed component using its package-local
native binary. See `conformance/apply-patch-engine/STATUS.md` in the source
repository for the exact scope and exclusions.

## Installation

```sh
dsh plugin --profile <name> add @songyang0603/dsh-codex-apply-patch-engine
```

The package bundle inserts one service row named
`dsh-codex-apply-patch-engine`. Remove it with the matching DSH plugin command.

## Service

The installed service is available as `ctx.codexApplyPatch`. Its public
operations are:

- `parse(...)` and `streamParse(...)` for pinned parser projections;
- `verifyPatch(...)` for filesystem-backed verification and proposed changes;
- `verifyInvocation(...)` for direct/shell invocation recognition;
- `applyPatch(...)` for the pinned unsandboxed local filesystem effect;
- `shutdown()` for explicit, idempotent admission closure and sidecar teardown.

Exact request and response types are exported from the package. Every method
uses the native JSONL wire without renaming or weakening semantic fields.
The adapter adds no default response-size or pending-request limit below the
host runtime's own capacity; deployments may opt into explicit operational
caps through service configuration.

`applyPatch()` is mutation-serialized. Once a mutation reaches the sidecar,
aborting the caller stops that caller from waiting but does not kill or forget
the mutation. The service continues to own it until a terminal engine response;
unload first closes admission and then waits for all accepted work to become
quiescent before requesting sidecar shutdown. A transport failure during a
mutation is reported as an unknown-effect failure and never as success.

## Security boundary

The native apply operation is deliberately unsandboxed, matching only the
pinned semantic/mutation layer. Call it only from a trusted composition that
has already completed exact path policy, approval, sandbox, and retry
choreography. This service performs no approval and cannot be installed as a
safe standalone model tool.

## Provenance and release contents

Startup is fail-closed: the client checks the protocol version, Codex commit,
implemented upstream Git objects, host OS, and architecture before the Cordis
service becomes available. See `UPSTREAMS.md` and `THIRD_PARTY_NOTICES.md`.

The npm archive includes only built JavaScript/types, the checksummed native
runtime, bundle metadata, and license/notice documentation. It excludes
`src/`, `tests/`, mock engines, and conformance fixtures.
