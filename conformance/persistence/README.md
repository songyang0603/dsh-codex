# Execpolicy startup and persistence differential conformance

This harness compares the protocol-v3 execpolicy sidecar with the private,
pinned Codex `ExecPolicyManager` and its canonical startup sequence. It tests
observable manager state and exact filesystem side effects; it does not use the
dsh-codex implementation as its oracle.

## Fixed upstream

The oracle refuses to run unless all of these Git objects exist with exactly
the recorded identities in the supplied checkout:

- Codex commit: `086396f7f60347b74c82784d5dfaf4fb2d3bda12`
- `codex-rs/config` tree: `d3f4925b575b128dd1f0f74a5babcdb1efce0219`
- `codex-rs/execpolicy` tree: `e06e0b4ad718af8a74055a33b1536b25fb9d4a87`
- `codex-rs/core/src/exec_policy.rs` blob:
  `5de05937533a2653a700b4ec40cda09578761f50`
- `codex-rs/core/src/exec_policy` tree:
  `b313a3ba1b113f08e3c1686272162910dad76540`
- `codex-rs/Cargo.lock` blob: `a8c2addc02055be48c345b65760a7a1b96cfbf28`

`run-oracle.sh` also pins the Git blob identities of the instrumentation patch
and Rust test source. It requires a clean upstream checkout, creates a temporary
`--shared` clone at the fixed commit, applies the test-only patch there, and
checks that exactly two files differ. The supplied checkout is never patched or
registered as a worktree.

The injected test module is a narrow projection over real upstream code:

1. Construct the already-resolved user `ConfigLayerStack` used by these
   persistence-only cases.
2. Run upstream `prefix_rule_migration` with upstream
   `BANNED_PREFIX_SUGGESTIONS`, in canonical startup order.
3. Call the private upstream `ExecPolicyManager::load`.
4. Call its private `append_amendment_and_update` and
   `append_network_rule_and_update` methods.
5. Observe `current()` manager state and the real rules/marker files.

The candidate runner starts real built sidecars and calls
`open_host_policy`, `append_prefix_amendment`,
`append_network_amendment`, `diagnostics`, and
`compile_network_domains`. Every RPC has a 15-second fail-closed timeout; a
timed-out engine is killed. Candidate records also bind the run to the SHA-256
of the exact engine binary.

## Corpus

[`corpus.jsonl`](./corpus.jsonl) currently contains 16 ordered state-machine
cases. The comparator checks the state and complete normalized filesystem
snapshot after every operation, not only the final state.

The cases cover:

- migration before load and exact banned-prefix removal;
- retention of non-exact lines and ASCII-case-insensitive exact matching;
- any existing marker content skipping migration and the marker's one-shot
  behavior;
- a missing home/rules tree producing `.sandbox_migration` with exact `v1\n`;
- the ignore flag skipping migration while later amendments remain available;
- migration I/O failure being a warning while policy loading continues;
- ordinary Starlark parse failure falling back to the non-file policy;
- exact prefix-rule disk formatting, repeat deduplication, and in-memory update
  behavior;
- a wider existing allow causing the narrower exact line to reach disk without
  replacing the current in-memory policy;
- empty-prefix and missing-parent disk errors leaving memory unchanged;
- network host/protocol normalization, exact disk deduplication, duplicate
  network entries in the current manager, and one entry after reopen;
- sequential prefix plus network updates through one manager;
- two managers sharing disk but not broadcasting memory changes, followed by
  explicit reopen.

The migration-warning case uses a self-referential marker symlink and is marked
`requiresUnix`; both runners emit the same explicit skip on Windows.

## Run

Build the candidate from this repository:

```bash
cargo build --locked --package dsh-codex-execpolicy-engine
```

Run the independent upstream oracle. A persistent target is strongly
recommended because `codex-core` is large; concurrent harnesses for the same
commit should share one target rather than allocate another full build tree.

```bash
PATH=/path/to/rust-1.95/bin:$PATH \
CODEX_PERSISTENCE_ORACLE_TARGET_DIR=/private/tmp/codex-core-target \
conformance/persistence/run-oracle.sh \
  --codex-checkout ../codex \
  --output /private/tmp/persistence-oracle.jsonl
```

Run the protocol-v3 candidate and compare:

```bash
node conformance/persistence/run-candidate.mjs \
  --engine target/debug/dsh-codex-execpolicy-engine \
  --corpus conformance/persistence/corpus.jsonl \
  --output /private/tmp/persistence-candidate.jsonl

node conformance/persistence/compare.mjs \
  conformance/persistence/corpus.jsonl \
  /private/tmp/persistence-oracle.jsonl \
  /private/tmp/persistence-candidate.jsonl
```

Generated oracle/candidate output is deliberately kept outside the repository.
The corpus, schemas, instrumentation, runners, and comparator are the
reproducible public evidence.

## Deliberate boundaries

- Codex has a known migration-versus-append race because migration and
  amendment persistence do not share one lock. This harness documents that
  upstream defect and does not claim to fix it; a nondeterministic race is not
  treated as a stable golden case.
- Disk persistence precedes the manager update and is not transactional. The
  disk-error cases prove that a failed write does not update memory. This corpus
  does not inject a process crash in the disk-written/memory-not-yet-published
  window.
- The sidecar request loop is sequential. The one-manager mixed-update case
  verifies ordered effects, not every possible Tokio scheduling interleaving.
- Cross-manager cases verify independent in-memory snapshots and shared disk,
  but do not assert live broadcast or reload behavior because upstream has
  neither.
- This suite does not turn advisory file locking into a cross-platform mutual
  exclusion claim; simultaneous multi-process lock contention needs a separate
  stress test.
- Local evidence in [`STATUS.md`](./STATUS.md) is macOS arm64 only. A configured
  CI matrix is not considered passing until those remote jobs actually run.
