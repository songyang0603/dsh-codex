#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cargo_bin="${CARGO_BIN:-cargo}"

cd "$repository_root"
"$cargo_bin" test --locked --package dsh-codex-execpolicy-engine \
  --test protocol_black_box \
  --test upstream_differential
