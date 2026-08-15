# Apply-patch semantic-engine differential

This directory independently compares the built
`@songyang0603/dsh-codex-apply-patch-engine` client/native sidecar path with the
public `codex-apply-patch` APIs at Codex commit
`086396f7f60347b74c82784d5dfaf4fb2d3bda12`.

The verified claim is deliberately narrow: on macOS arm64, the unchanged
pinned public implementation passes all 96 upstream tests, while the 23
input-only cases in `corpus.jsonl` prove that the production DSH client/native
path produces the same semantic result and local filesystem state. This
establishes the declared semantic-engine boundary, not whole-tool parity.

## Independence model

- The corpus contains inputs and fixtures only. It has no checked-in expected
  values, snapshots, or candidate-authored golden outputs.
- `run-oracle.sh` verifies the exact Codex commit and six source objects, clones
  it to a detached temporary worktree, applies test-only instrumentation, and
  invokes the pinned crate's public parse, streaming, invocation, verification,
  and apply APIs directly.
- `run-candidate.mjs` calls the built package's real `ApplyPatchClient`, which
  speaks the production JSONL wire to the native sidecar. It does not call the
  oracle or the installed Codex executable.
- Oracle and candidate independently materialize every case in a fresh
  temporary root. Their snapshots use `symlink_metadata`/`lstat`, never follow
  symlinks, and capture file bytes, Unix modes, symlink targets, and path kinds.
- `compare.mjs` is standalone and imports no candidate code. It pins provenance,
  rejects missing/extra cases, normalizes only the independently generated
  temporary-root prefix, and strictly compares pre-state, semantic result, and
  post-state. Delta and summary order remain significant.
- The supplied Codex checkout's HEAD and complete porcelain status are checked
  before and after the oracle run. A changed checkout or mismatched source object
  fails closed.

## Covered discriminators

The corpus currently exercises:

- successful and rejected parsing, including hunk/error projection;
- character-boundary streaming and CRLF/environment metadata;
- direct, heredoc-with-`cd`, implicit, and non-apply invocation recognition;
- duplicate resolved paths and missing delete/update verification;
- add-overwrite, move-overwrite, committed-prefix partial failure, and nested
  parent creation;
- LF normalization, CRLF preservation, and mixed-ending preservation;
- missing context/delete/update failures and A/M/D summary ordering;
- deletion of a symlink without following it, including the upstream inexact
  delta on Unix.

## Run

Prerequisites are Rust 1.95, Node.js 22.19 or newer, a clean-accessible checkout
containing the pinned Codex commit, a built package (`lib/client.js`), and a
native engine executable.

```bash
pnpm --filter @songyang0603/dsh-codex-apply-patch-engine build
cargo build -p dsh-codex-apply-patch-engine

conformance/apply-patch-engine/run.sh \
  --codex-checkout /path/to/pinned/codex \
  --engine target/debug/dsh-codex-apply-patch-engine \
  --package-dir packages/apply-patch-engine \
  --artifacts-dir /tmp/dsh-codex-apply-patch-engine-conformance
```

The artifact directory receives runtime oracle and candidate JSONL. These are
evidence for that execution and are intentionally not committed as expected
fixtures.

## Boundary not tested here

This suite covers only the unsandboxed local semantic/filesystem engine. It does
not claim parity for Codex freeform tool transport, tool-schema registration,
safety classification, approval routing, sandbox selection/enforcement, core
events, hooks, turn diff, agent loop, session lifecycle, or UI. Those belong to
separate components and conformance obligations.

## License and distribution

The oracle applies local test instrumentation to a user-supplied Codex checkout;
it does not redistribute that checkout. Codex is Apache-2.0 licensed. Native
sidecar source or binaries distributed by this repository must retain the
repository's Apache-2.0 license, attribution, modified-source notice, and
third-party notices. A native sidecar is intentional here: a TypeScript port
would create a second semantic implementation and would require its own complete
differential proof.
