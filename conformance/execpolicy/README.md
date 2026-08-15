# Exec-policy conformance suite

This directory contains black-box and differential conformance inputs for the
exec-policy sidecar. The suite deliberately separates two claims:

1. `protocol_black_box.rs` launches the compiled sidecar and verifies its
   newline-delimited JSON protocol and lifecycle as an external consumer would.
2. `upstream_differential.rs` computes expected pure-policy results by calling
   `codex_execpolicy` directly. That crate is a Git dependency pinned to Codex
   commit `086396f7f60347b74c82784d5dfaf4fb2d3bda12`; no dsh-codex engine code is
   used as the oracle.

The differential suite covers parsing, prefix matching, fallback decisions,
strictest-decision aggregation, matched-rule serialization, and compiled
network domains. Runtime approval/sandbox behavior in this directory is tested
through the sidecar, but is **not** labelled as an upstream differential result
because Codex keeps that runtime function private to `codex-core`. The
independent test-only instrumented comparison now lives in
[`../upstream-runtime`](../upstream-runtime/README.md); its current bounded
result is recorded in that directory's `STATUS.md`. It builds and calls the
pinned private upstream method rather than comparing dsh-codex to itself.

## Run

From the repository root:

```sh
bash conformance/execpolicy/run.sh
```

To independently verify a local Codex checkout before running the oracle:

```sh
CODEX_UPSTREAM_CHECKOUT=/absolute/path/to/codex \
  bash conformance/execpolicy/verify-upstream-checkout.sh
```

`verify-upstream-checkout.sh` exits with status 77 when no checkout is supplied.
This is an explicit skip, not a passing verification.

The broader upstream selections are intentionally separate from this quick
suite. From the pinned Codex `codex-rs` directory, run:

```sh
cargo test --locked -p codex-execpolicy -p codex-shell-command
cargo test --locked -p codex-core --lib exec_policy
```

On the recorded macOS arm64 run these selected `177` public-package tests and
`102` core tests respectively. Other platforms must produce their own results;
the counts and compiled branches can differ under conditional compilation.
