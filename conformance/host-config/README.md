# Independent pinned-Codex host-config oracle

This harness compares dsh-codex's real `load_host_config_stack` RPC with host
discovery performed by OpenAI Codex itself at the fixed commit
`086396f7f60347b74c82784d5dfaf4fb2d3bda12`.

The oracle is independent of the dsh-codex adapter. Its test-only
instrumentation is injected into a detached, temporary clone of the pinned
Codex source. Every non-skipped successful case calls:

- `codex_config::loader::load_config_layers_state`;
- `codex_exec_server::LocalFileSystem::unsandboxed()`;
- upstream CLI override parsing and profile-name parsing;
- upstream `codex-core` policy-file discovery and policy loading after the real
  host loader returns its `ConfigLayerStack`.

It does not construct `ConfigLayerEntry` fixtures and it does not link any
dsh-codex crate. The candidate runner starts the compiled sidecar process and
uses the protocol-v3 `load_host_config_stack` and `check_tokens` RPCs. Thus the
comparison is upstream implementation versus the production wire, not an
adapter compared with itself.

## Fixed source identity

`run-oracle.sh` verifies the commit plus the exact trees/blobs for
`codex-config`, `codex-exec-server`, `codex-utils-cli`,
`codex-utils-home-dir`, `codex-execpolicy`, the private core policy loader, the
config loader/state files, and `Cargo.lock` before compilation. The identities
are repeated in every oracle record and checked again by the validator and
comparator. Any mismatch exits before publishing output.

The corpus has `schemaVersion: 1`; the sidecar has `protocolVersion: 3`. These
are deliberately separate version domains.

## Corpus coverage

The eleven bundled cases cover:

1. an empty/default host using upstream `CODEX_HOME` discovery;
2. base user config, profile-v2 config, raw CLI precedence, and per-key origins;
3. an invalid profile-v2 name;
4. the profile-v2 versus legacy-profile conflict;
5. trusted project discovery from repository root through nested cwd,
   low-to-high project precedence, and stable `rules/*.rules` ordering;
6. an untrusted project retained as a disabled layer, including visible but
   inactive rule-file inventory;
7. `ignoreUserConfig` suppressing user config values while user rules remain;
8. `ignoreUserAndProjectExecPolicyRules` suppressing rules while user config
   remains;
9. an injected offline cloud snapshot with multiple config and requirements
   fragments, provenance, and most-restrictive policy evaluation;
10. deterministic ordinary-rule parse failure and fallback to managed cloud
    requirements;
11. symlinked-cwd project trust and discovery on Unix.

Fixtures are real directories, files, Git markers, and (on Unix) a real
symlink under a per-case temporary root. Dynamic paths in values **and object
keys** are canonicalized to `$CASE`, and canonical fixture paths use `/`
separators on every platform. Both runners snapshot the fixture tree;
`load_host_config_stack` must not mutate it. Every successful load must report
`discovery.startupMigration.mode = "not_requested"`, because migration and
canonical persistence belong to `open_host_policy`, not this RPC.

On Windows, the corpus retains the symlink case but both runners emit the same
explicit result:

```json
{ "skipped": { "reason": "requires_unix_symlinks", "platform": "windows" } }
```

The validator allows that skip only for the declared symlink case and only
when the recorded platform identity is Windows. All other cases still run; the
corpus is never rejected wholesale at parse time.

## Run the upstream oracle

Rust 1.95 is required by the pinned Codex workspace. The first build can be
large. Reuse one target directory; do not point it at the user Codex checkout.

```sh
RUSTC=/absolute/path/to/rustc-1.95 \
CARGO_BIN=/absolute/path/to/cargo-1.95 \
CODEX_HOST_CONFIG_ORACLE_TARGET_DIR=/tmp/dsh-codex-host-config-target \
bash conformance/host-config/run-oracle.sh \
  --codex-checkout /absolute/path/to/codex \
  --output /tmp/codex-host-config-oracle.jsonl
```

The runner verifies source identity and ambient-host isolation, makes a shared
detached temporary clone, applies `instrumentation.patch`, installs the
test-only module, runs exactly one ignored `codex-core` test, validates record
identity/completeness, and runs `verify-bundled-output.mjs` for the bundled
corpus. Output is staged inside the temporary directory and moved to the
requested path only after every check succeeds. The supplied checkout's HEAD
and complete porcelain status are compared before and after the run.

The runner fails closed if `/etc/codex` policy files or the relevant macOS MDM
preferences are present. This avoids silently contaminating fixtures with
ambient machine policy.

## Run the production candidate and compare

```sh
cargo build --locked --package dsh-codex-execpolicy-engine

node conformance/host-config/run-candidate.mjs \
  --engine target/debug/dsh-codex-execpolicy-engine \
  --corpus conformance/host-config/corpus.jsonl \
  --output /tmp/dsh-codex-host-config-candidate.jsonl

node conformance/host-config/compare.mjs \
  /tmp/codex-host-config-oracle.jsonl \
  /tmp/dsh-codex-host-config-candidate.jsonl
```

The candidate runner verifies the v3 hello and fixed source hashes before the
first case. It never merges config or parses policy itself. The comparator
requires the same platform and exact case set, then compares the complete
canonical result (or mapped wire error) recursively, including layer order,
disabled reasons, effective config, selected origins, rule inventory and
ordering, requirements provenance, structured warnings, evaluations, and
matched-rule order.

## Files

- `corpus.jsonl` and `corpus.schema.json`: durable input fixtures and schema;
- `instrumentation.patch` and `instrumentation/`: the test-only upstream hook;
- `run-oracle.sh`: pinned-source oracle runner;
- `run-candidate.mjs`: real-sidecar RPC runner;
- `validate-output.mjs`: identity, case-set, result-shape, migration, and
  platform-skip validation;
- `verify-bundled-output.mjs`: independent semantic assertions for all bundled
  cases;
- `compare.mjs`: strict upstream/candidate comparison;
- `*-output.schema.json`: oracle and candidate JSONL record contracts;
- `STATUS.md`: the last actual execution and evidence hashes.

## Claim boundary

This proves the observed behavior of the fixed source, corpus, and recorded
platform. Production exposes no test-only path injection for system config,
system requirements, legacy managed files, or MDM, so isolated system/MDM
precedence is intentionally not claimed. The cloud cases use supplied offline
snapshots; online cloud bootstrap, authentication, transport, and refresh are
not covered. A Unix symlink is covered; a linked Git worktree and native
Windows symlink/junction semantics are not. The host loader RPC intentionally
does not test startup migration or persistence.
