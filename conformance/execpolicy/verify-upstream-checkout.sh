#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${CODEX_UPSTREAM_CHECKOUT:-}" ]]; then
  printf '%s\n' 'SKIP: set CODEX_UPSTREAM_CHECKOUT to a local OpenAI Codex checkout.' >&2
  exit 77
fi

expected_commit='086396f7f60347b74c82784d5dfaf4fb2d3bda12'
expected_execpolicy_tree='e06e0b4ad718af8a74055a33b1536b25fb9d4a87'
expected_shell_command_tree='3f5da93a61be77795d3fc5bb3d6e44a9dec1d106'
expected_core_exec_policy_blob='5de05937533a2653a700b4ec40cda09578761f50'
expected_core_exec_policy_dir_tree='b313a3ba1b113f08e3c1686272162910dad76540'

if ! git -C "$CODEX_UPSTREAM_CHECKOUT" cat-file -e "${expected_commit}^{commit}"; then
  printf 'FAIL: checkout does not contain pinned Codex commit %s\n' "$expected_commit" >&2
  exit 1
fi

actual_execpolicy_tree="$(git -C "$CODEX_UPSTREAM_CHECKOUT" rev-parse "$expected_commit":codex-rs/execpolicy)"
actual_shell_command_tree="$(git -C "$CODEX_UPSTREAM_CHECKOUT" rev-parse "$expected_commit":codex-rs/shell-command)"
actual_core_exec_policy_blob="$(git -C "$CODEX_UPSTREAM_CHECKOUT" rev-parse "$expected_commit":codex-rs/core/src/exec_policy.rs)"
actual_core_exec_policy_dir_tree="$(git -C "$CODEX_UPSTREAM_CHECKOUT" rev-parse "$expected_commit":codex-rs/core/src/exec_policy)"

verify_equal() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$actual" != "$expected" ]]; then
    printf 'FAIL: %s\n  expected: %s\n  actual:   %s\n' "$label" "$expected" "$actual" >&2
    exit 1
  fi
}

verify_equal 'execpolicy tree' "$expected_execpolicy_tree" "$actual_execpolicy_tree"
verify_equal 'shell-command tree' "$expected_shell_command_tree" "$actual_shell_command_tree"
verify_equal 'core exec-policy blob' "$expected_core_exec_policy_blob" "$actual_core_exec_policy_blob"
verify_equal 'core exec-policy directory tree' "$expected_core_exec_policy_dir_tree" "$actual_core_exec_policy_dir_tree"

printf '%s\n' 'Verified pinned Codex commit and exec-policy source objects.'
