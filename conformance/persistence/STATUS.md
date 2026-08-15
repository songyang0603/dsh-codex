# Persistence differential status

- Status: `passed_local`; this is component evidence, not a
  `parity_verified` declaration.
- Run date: 2026-08-15
- Platform: `macos/aarch64`
- Rust: `1.95.x`
- Codex commit: `086396f7f60347b74c82784d5dfaf4fb2d3bda12`
- Sidecar protocol: `3`
- Corpus records: `16`
- Corpus SHA-256:
  `b16750e9062d390423e1465e685d84d482067aa500a5eb53e9a7588dd022565e`
- Instrumentation patch SHA-256:
  `905402f053c896c3b95bb3103f8ddaa2dcb316da122ffe625961412fa72700a3`
- Instrumentation source SHA-256:
  `d73e2b314e5838a112ee6a7d6d3f4ba640076eb0a0c38ca3ad6c8dfa1aebecc3`

## Recorded local run

The fixed checkout was clean before and after the run. The oracle used a
temporary shared clone and the exact source identities listed in
[`README.md`](./README.md).

Oracle command:

```bash
PATH=<rust-1.95-bin>:$PATH \
CARGO_NET_OFFLINE=true \
CODEX_PERSISTENCE_ORACLE_TARGET_DIR=<cargo-target> \
conformance/persistence/run-oracle.sh \
  --codex-checkout ../codex \
  --output /private/tmp/dsh-codex-persistence-oracle.jsonl
```

Observed result:

```text
running 1 test
test exec_policy::dsh_codex_exec_policy_persistence_oracle::dsh_codex_exec_policy_persistence_oracle ... ok
test result: ok. 1 passed; 0 failed
validated persistence output: 16 records (upstream_oracle)
```

Candidate and comparison commands:

```bash
node conformance/persistence/run-candidate.mjs \
  --engine target/debug/dsh-codex-execpolicy-engine \
  --corpus conformance/persistence/corpus.jsonl \
  --output /private/tmp/dsh-codex-persistence-candidate-final.jsonl

node conformance/persistence/compare.mjs \
  conformance/persistence/corpus.jsonl \
  /private/tmp/dsh-codex-persistence-oracle.jsonl \
  /private/tmp/dsh-codex-persistence-candidate-final.jsonl
```

Observed result:

```text
persistence parity: 16/16 cases matched
```

Transient output hashes (not committed):

- Oracle JSONL SHA-256:
  `fa31ee7478a93467a4ef02d816f5de73eee45a1eae7fdc575df24c06c790cd54`
- Candidate JSONL SHA-256:
  `3e03adce8418cad5d68198ac73cd5a1ba09609ed871eb5a7b74c7dc873b3213a`
- Candidate engine SHA-256:
  `9594638e80b6a62cf84cbd5ce745e50c9433ff1b5133d94fa041e70c08e14d18`

## Harness checks

- JSONL corpus validation passed with 16 unique, ordered case ids.
- Oracle and candidate output validation passed.
- The comparator's internal nested-difference self-test passed.
- A transient candidate mutation changed one `networkRuleCount`; comparison
  failed closed with `1/16 cases diverged`.
- A transient engine that accepted stdin but emitted no response was killed;
  the candidate runner failed after 15 seconds with
  `sidecar RPC timed out after 15000ms: hello`.
- `node --check` passed for every `.mjs` file.
- `bash -n` passed for `run-oracle.sh`.
- Rustfmt `--check` passed for the instrumentation source.
- `git apply --check` passed against the fixed Codex checkout.

The local oracle target was removed after the run to recover disk space. Future
local reruns should reuse an already-active fixed-commit `codex-core` target;
they must not create a second full target while another conformance build is
active.

## Evidence boundary

This local result establishes equality for the 16 recorded persistence state
machines on macOS arm64. It does not establish remote Linux, Windows, or macOS
x64 results, nondeterministic migration/append races, crash-window atomicity,
or simultaneous multi-process advisory-lock stress. Those limitations are not
silently converted into parity claims.
