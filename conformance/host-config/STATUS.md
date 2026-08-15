# Host-config conformance execution status

Status: **executed; the pinned upstream oracle and protocol-v3 dsh-codex
candidate match all 11 bundled cases on macOS/aarch64**.

Execution date: 2026-08-15

## Environment and source

- Platform: `macos/aarch64` (`Darwin`, `arm64`)
- Rust: `rustc 1.95.0 (59807616e 2026-04-14)`
- Node.js: `v22.20.0`
- Candidate protocol: `3`
- Codex commit: `086396f7f60347b74c82784d5dfaf4fb2d3bda12`
- `codex-rs/config` tree: `d3f4925b575b128dd1f0f74a5babcdb1efce0219`
- `codex-rs/exec-server` tree: `51751785508060e633f0e0472fa0d2572787b36a`
- `codex-rs/utils/cli` tree: `5d9c72fcadefb9a1c95e38c4726d25c5b8d195ee`
- `codex-rs/utils/home-dir` tree: `c2d10a4f4844c2a517584ee623a0b8aa4ceb44f5`
- `codex-rs/execpolicy` tree: `e06e0b4ad718af8a74055a33b1536b25fb9d4a87`
- Core exec-policy blob: `5de05937533a2653a700b4ec40cda09578761f50`
- Core `Cargo.toml` blob: `ff683fb5f921dcf23fe52ef52db6cf9889ca8efe`
- `Cargo.lock` blob: `a8c2addc02055be48c345b65760a7a1b96cfbf28`

All fourteen pinned Git identities in `run-oracle.sh` were resolved again
immediately after the final run and matched. The user Codex checkout remained
at the fixed commit with an empty `git status --porcelain=v1
--untracked-files=all` result.

## Actual results

The current instrumentation was applied only to a detached shared temporary
clone. The final upstream command reused the one existing Cargo target and ran
exactly this ignored test:

```sh
env \
  CARGO_TARGET_DIR=/private/tmp/dsh-codex-host-config-target-fresh \
  CODEX_HOME=<temporary-cases-root>/0/home \
  DSH_CODEX_HOST_CONFIG_ORACLE_CORPUS=<repo>/conformance/host-config/corpus.jsonl \
  DSH_CODEX_HOST_CONFIG_ORACLE_OUTPUT=/private/tmp/dsh-codex-host-config-oracle-v3.jsonl \
  DSH_CODEX_HOST_CONFIG_ORACLE_CASES_ROOT=<temporary-cases-root> \
  RUSTC=<rust-1.95-bin>/rustc \
  <rust-1.95-bin>/cargo \
    test --locked --package codex-core --lib \
    exec_policy::dsh_codex_host_config_oracle::dsh_codex_host_config_oracle \
    -- --ignored --exact --nocapture --test-threads=1
```

Result: `1 passed; 0 failed; 0 ignored; 2212 filtered out`. The output then
passed both independent checks:

```text
validated host-config oracle output: 11/11 cases
verified bundled host-config semantics: 11/11 cases
```

The real sidecar was incrementally rebuilt in the already-existing candidate
target (5.17 seconds), then executed with:

```sh
node conformance/host-config/run-candidate.mjs \
  --engine /private/tmp/dsh-codex-config-candidate.3Tl1Zo/debug/dsh-codex-execpolicy-engine \
  --corpus conformance/host-config/corpus.jsonl \
  --output /private/tmp/dsh-codex-host-config-candidate-v3.jsonl

node conformance/host-config/compare.mjs \
  /private/tmp/dsh-codex-host-config-oracle-v3.jsonl \
  /private/tmp/dsh-codex-host-config-candidate-v3.jsonl
```

Results:

```text
validated host-config candidate output: 11/11 cases
host-config parity: 11/11 cases matched
```

The macOS run exercised the symlink case; it was not skipped. The Windows path
was not executed on this machine. Its behavior is explicit and fail-closed in
both runners and both output schemas: only the corpus record marked
`requiresUnixSymlinks: true` may produce the matching Windows `skipped` result.
The remaining ten cases still run on Windows.

## Fail-closed observations

- An earlier upstream wrapper attempt ran the real pinned test and validated
  11/11 records, then correctly withheld its staged output because the bundled
  semantic verifier had not yet been created. It is not counted as the final
  run above.
- The semantic verifier rejects that old preview output because an untrusted
  layer's disabled reason and dynamic `projects` keys leaked its temporary
  root. Canonicalization was fixed for both values and object keys; the final
  oracle/candidate outputs pass and compare exactly.
- Launching `/bin/echo` as the candidate engine exited 1 on process-boundary
  protocol failure. `/private/tmp/dsh-codex-host-config-fake-candidate.jsonl`
  was not published.
- A non-worktree supplied as `--codex-checkout` made `run-oracle.sh` exit 66
  before compilation or output publication.
- Ambient `/etc/codex` inputs and both relevant macOS MDM preference keys were
  absent. Either runner exits instead of claiming an isolated result when
  those inputs are present.
- Initial development attempts that lacked Rust in `PATH`, used a corrupt old
  upstream cache, or had incomplete instrumentation dependencies failed
  honestly and produced no passing evidence. The stale rebuildable cache was
  removed; the successful fixed target was retained for reuse.

## Evidence hashes

- Corpus SHA-256:
  `530fa54740aa6d4dbc41e327bad4d90ccc64069038d6bafe0e4b8229e29c2b6c`
- Instrumentation patch SHA-256:
  `9906c27b70df39e452a5eefa2a62120e65c3f01ecf6f8fb20ba3302a2ba0a4d8`
- Instrumentation Rust source SHA-256:
  `125fbbc08bcead6ae3954db8de330c204cb47aaa1c76d95bf912a9f20eff63c1`
- Oracle output SHA-256:
  `bae31b267e0338b0b4c96666c04721f38ed0907149df1837d8d880bbe93db986`
- Candidate output SHA-256:
  `de744ada9a90242b1a2530713e86eaf11b404825884eb1f1ed7c053a2fe03bbc`
- Candidate binary SHA-256:
  `1df338ba3f879fc8775af4b724d4e42d147f1289c1ac5d3a79c40ff1cbc209c3`

The JSONL outputs and Cargo targets are temporary execution evidence, not
repository artifacts. Re-run the README commands to regenerate them. No claim
is made for isolated system/MDM precedence, online cloud bootstrap, linked Git
worktrees, native Windows link semantics, or startup migration/persistence.
