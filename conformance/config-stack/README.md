# Independent Codex config-stack oracle

This harness records config-stack and managed exec-policy behavior from the
actual OpenAI Codex implementation at a fixed source snapshot:

- Codex commit: `086396f7f60347b74c82784d5dfaf4fb2d3bda12`
- `codex-rs/config` tree: `d3f4925b575b128dd1f0f74a5babcdb1efce0219`
- `codex-rs/execpolicy` tree: `e06e0b4ad718af8a74055a33b1536b25fb9d4a87`
- `codex-rs/core/src/exec_policy.rs` blob:
  `5de05937533a2653a700b4ec40cda09578761f50`
- `codex-rs/Cargo.lock` blob: `a8c2addc02055be48c345b65760a7a1b96cfbf28`

It does not link or call dsh-codex packages. The output is therefore an
independent oracle, not a self-comparison.

## What the instrumentation calls

`ConfigLayerStack`, `effective_config`, `origins`, `compose_requirements`, and
requirements normalization are public `codex-config` APIs. The two operations
needed to observe rule loading precisely are private to `codex-core`:

- `collect_policy_files`, including its path sort;
- `load_exec_policy_with_warning`, including requirements overlay and the
  parse-error fallback.

`instrumentation.patch` adds one `#[cfg(test)]` child module to upstream
`exec_policy.rs`. The child position gives the test Rust privacy access to those
real functions; it does not copy their algorithms. The module is only installed
in a temporary clone and is never used as production code.

## Corpus coverage

The six bundled cases cover:

1. low-to-high layer precedence, recursive config merge, and per-key origins;
2. fail-closed rejection of an incorrectly ordered layer stack;
3. stable lexical ordering of `rules/*.rules` within a layer;
4. ignoring user and project rules while retaining system rules;
5. low-to-high requirements composition, high-priority-first rule provenance,
   and the requirements overlay's most-restrictive result;
6. ordinary `.rules` parse warning behavior, deterministic first-error path,
   and fallback to the requirements-only policy.

Inputs follow `corpus.schema.json`. Each output record follows
`oracle-output.schema.json`. Generated fixture paths are canonicalized under
`$CASE`, so output is stable across temporary directories.

The corpus `schemaVersion: 1` and sidecar `protocolVersion: 3` are independent
version domains. Corpus version 1 identifies these durable fixtures; protocol
version 3 is the wire contract that exposes their complete config-stack
projection.

## Run

Rust 1.95 is required by the pinned workspace. The first run may need network
access to fetch the fixed lockfile dependencies. With dependencies cached, the
run can be forced offline:

```sh
CARGO_NET_OFFLINE=true \
CODEX_CONFIG_ORACLE_TARGET_DIR=/tmp/dsh-codex-config-stack-target \
  bash conformance/config-stack/run-oracle.sh \
  --codex-checkout /absolute/path/to/codex \
  --output /tmp/codex-config-stack-oracle.jsonl
```

The runner verifies every pinned Git object above, uses a detached shared local
clone, applies the test-only patch, runs exactly one ignored `codex-core` test,
validates output identity and case completeness, and only then moves the staged
output to the requested path. For the bundled corpus it also verifies the six
semantic expectations in `verify-bundled-output.mjs`; custom corpora receive the
identity/completeness validation without bundled-case assumptions. `CARGO_BIN`
can select a non-default Cargo binary.

## Run the dsh-codex candidate and compare

Build the real sidecar, drive it with the same corpus, then compare it with an
oracle file produced above:

```sh
cargo build --locked --package dsh-codex-execpolicy-engine

node conformance/config-stack/run-candidate.mjs \
  --engine target/debug/dsh-codex-execpolicy-engine \
  --corpus conformance/config-stack/corpus.jsonl \
  --output /tmp/dsh-codex-config-stack-candidate.jsonl

node conformance/config-stack/compare.mjs \
  /tmp/codex-config-stack-oracle.jsonl \
  /tmp/dsh-codex-config-stack-candidate.jsonl
```

`run-candidate.mjs` launches the compiled process and verifies its v3 hello,
fixed commit/tree/blob identities, and platform. It materializes paths and
files from the corpus without implementing config merge, requirements
composition, policy parsing, or policy evaluation in JavaScript. Those
semantics remain in the sidecar and are compared with the independent Codex
oracle.

The comparator requires the exact case set and checks the complete canonical
projection: stack order, effective config, selected origins, discovered files,
requirements source provenance, evaluations and matched-rule order, structured
warning fields, and expected stack rejection. The oracle also records Codex's
derived warning `display` string as supplemental evidence; v3 transmits the
underlying `kind`, `path`, raw `message`, and source `location`, so only that
lossless structured warning is part of the cross-wire equality check. Both
runners stage output and publish it only after a complete successful run.

## Claim boundary

This harness proves the observed semantics for the pinned snapshot, platform,
and corpus. Layers are materialized directly as upstream `ConfigLayerEntry`
values; it does not claim coverage of OS-specific MDM reads, cloud transport,
project trust discovery, or every field in `config.toml`/`requirements.toml`.
The warning result is the upstream structured exec-policy warning and formatted
source diagnostic, not a TUI snapshot or tracing assertion.

The exact execution state and output hash are recorded in `STATUS.md`. Never
infer a passing oracle merely from the presence of this harness.
