# dsh-codex-apply-patch-engine

Pinned Rust JSONL sidecar for the semantic engine of Codex `apply_patch` at commit
`086396f7f60347b74c82784d5dfaf4fb2d3bda12`.

It delegates parsing, streaming parsing, invocation recognition, filesystem
verification, patch application, output formatting, and committed-delta tracking to
the upstream `codex-apply-patch` crate. It uses
`codex_exec_server::LocalFileSystem::unsandboxed()` and passes no filesystem sandbox.

This crate is deliberately **not** the complete Codex tool. Approval, permission
resolution, sandbox orchestration and retry, hooks, lifecycle events, and TurnDiff
belong to Codex core and are outside this engine boundary.

## Wire protocol

The process reads one JSON object per line and writes one response per line. Requests
are handled serially. Semantic parser or patch failures are returned as successful RPC
results containing structured error projections; malformed RPC requests return an
`error` object and do not terminate the process.

```json
{ "protocolVersion": 1, "id": 1, "method": "hello", "params": {} }
```

Methods:

- `hello {}`
- `parse { patch }`
- `stream_parse { chunks: string[] }`
- `verify_patch { patch, cwd, mode }`
- `verify_invocation { argv, cwd, mode }`
- `apply_patch { patch, cwd, mode }`
- `shutdown {}`

`cwd` must be an absolute `file:` URI. `mode` is either `normalize_to_lf` or
`preserve_line_endings`. Verification previews are sorted by canonical path URI for a
stable wire representation. Applied deltas retain upstream mutation order and expose
the upstream `exact` bit.

Example:

```json
{
  "protocolVersion": 1,
  "id": 2,
  "method": "apply_patch",
  "params": {
    "cwd": "file:///tmp/work",
    "mode": "normalize_to_lf",
    "patch": "*** Begin Patch\n*** Add File: hello.txt\n+hello\n*** End Patch"
  }
}
```

`shutdown` writes its response, flushes stdout, and exits successfully.

## Result projections

`parse` returns:

```text
{ accepted, patch, environmentId, workdir, hunks[], error }
```

Hunks carry an upstream enum tag in `kind`: `AddFile`, `DeleteFile`, or
`UpdateFile`. Update chunks expose `changeContext`, `oldLines`, `newLines`,
`contextLineIndices`, and `isEndOfFile`. Parser failures preserve
`InvalidPatchError` or `InvalidHunkError`, including the upstream display message,
detail, and hunk line number.

`stream_parse` returns:

```text
{ accepted, chunkResults[], environmentId, hunks[], failedChunkIndex, error }
```

Each `chunkResults` entry is the complete upstream parser snapshot after that input
chunk. A `failedChunkIndex` equal to `chunks.length` means `finish()` failed.

`verify_patch` and `verify_invocation` return:

```text
{ classification, action, error }
```

Classification is `body`, `shell_parse_error`, `correctness_error`, or
`not_apply_patch`. A body action contains normalized patch text, effective cwd URI,
mode, emptiness, and sorted `Add`/`Delete`/`Update` previews. Update previews retain
the unified diff, move URI, and complete new content.

`apply_patch` returns:

```text
{
  success,
  stdout,
  stderr,
  delta: { exact, changes: [Add | Delete | Update] },
  error
}
```

Delta changes remain in upstream commit order. Failures can contain a non-empty
committed prefix and are never rolled back by this engine.
