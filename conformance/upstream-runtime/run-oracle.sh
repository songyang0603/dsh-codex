#!/usr/bin/env bash
set -euo pipefail

readonly expected_commit='086396f7f60347b74c82784d5dfaf4fb2d3bda12'
readonly expected_execpolicy_tree='e06e0b4ad718af8a74055a33b1536b25fb9d4a87'
readonly expected_shell_command_tree='3f5da93a61be77795d3fc5bb3d6e44a9dec1d106'
readonly expected_core_exec_policy_blob='5de05937533a2653a700b4ec40cda09578761f50'

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
codex_checkout="${CODEX_UPSTREAM_CHECKOUT:-}"
corpus="$script_dir/corpus.jsonl"
output=''
keep_temp=false

usage() {
  printf '%s\n' \
    'Usage: run-oracle.sh --codex-checkout PATH --output FILE [options]' \
    '' \
    'Options:' \
    '  --corpus FILE       JSONL corpus (default: bundled corpus.jsonl)' \
    '  --keep-temp         Keep the instrumented temporary clone for inspection' \
    '  -h, --help          Show this help' \
    '' \
    'Environment:' \
    '  CODEX_UPSTREAM_CHECKOUT    Alternative to --codex-checkout' \
    '  CODEX_ORACLE_TARGET_DIR    Persistent Cargo target cache directory' \
    '  CARGO_BIN                  Cargo executable (default: cargo)'
}

while (($# > 0)); do
  case "$1" in
    --codex-checkout)
      [[ $# -ge 2 ]] || { printf '%s\n' 'missing value for --codex-checkout' >&2; exit 64; }
      codex_checkout="$2"
      shift 2
      ;;
    --corpus)
      [[ $# -ge 2 ]] || { printf '%s\n' 'missing value for --corpus' >&2; exit 64; }
      corpus="$2"
      shift 2
      ;;
    --output)
      [[ $# -ge 2 ]] || { printf '%s\n' 'missing value for --output' >&2; exit 64; }
      output="$2"
      shift 2
      ;;
    --keep-temp)
      keep_temp=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'unknown argument: %s\n' "$1" >&2
      usage >&2
      exit 64
      ;;
  esac
done

[[ -n "$codex_checkout" ]] || { printf '%s\n' 'a Codex checkout is required' >&2; exit 64; }
[[ -d "$codex_checkout" ]] || { printf 'checkout directory does not exist: %s\n' "$codex_checkout" >&2; exit 66; }
[[ "$(git -C "$codex_checkout" rev-parse --is-inside-work-tree 2>/dev/null || true)" == true ]] || {
  printf 'not a Git worktree: %s\n' "$codex_checkout" >&2
  exit 66
}
codex_checkout="$(cd "$codex_checkout" && pwd -P)"
[[ -f "$corpus" ]] || { printf 'corpus does not exist: %s\n' "$corpus" >&2; exit 66; }
[[ -n "$output" ]] || { printf '%s\n' '--output is required' >&2; exit 64; }

corpus="$(cd "$(dirname "$corpus")" && pwd -P)/$(basename "$corpus")"
mkdir -p "$(dirname "$output")"
output="$(cd "$(dirname "$output")" && pwd -P)/$(basename "$output")"
[[ "$corpus" != "$output" ]] || { printf '%s\n' 'output must not overwrite the corpus' >&2; exit 64; }

verify_object() {
  local label="$1"
  local object_spec="$2"
  local expected="$3"
  local actual
  actual="$(git -C "$codex_checkout" rev-parse --verify "$object_spec")"
  if [[ "$actual" != "$expected" ]]; then
    printf 'upstream %s mismatch\n  expected: %s\n  actual:   %s\n' "$label" "$expected" "$actual" >&2
    exit 65
  fi
}

verify_object 'commit' "$expected_commit^{commit}" "$expected_commit"
verify_object 'execpolicy tree' "$expected_commit:codex-rs/execpolicy" "$expected_execpolicy_tree"
verify_object 'shell-command tree' "$expected_commit:codex-rs/shell-command" "$expected_shell_command_tree"
verify_object 'core exec-policy blob' "$expected_commit:codex-rs/core/src/exec_policy.rs" "$expected_core_exec_policy_blob"

# The supplied checkout is evidence, not a work area. Capture both its checked
# out commit and exact porcelain status so the EXIT trap can fail closed if the
# runner (including a failed Cargo invocation) changes either one.
checkout_head_before="$(git -C "$codex_checkout" rev-parse --verify HEAD)"
checkout_status_before="$(git -C "$codex_checkout" status --porcelain=v1 --untracked-files=all)"

rustc_bin="${RUSTC:-rustc}"
rustc_version="$("$rustc_bin" --version)"
[[ "$rustc_version" == 'rustc 1.95.'* ]] || {
  printf 'Rust 1.95 is required; found: %s\n' "$rustc_version" >&2
  exit 65
}

temp_parent="${TMPDIR:-/tmp}"
temp_root="$(mktemp -d "$temp_parent/dsh-codex-runtime-oracle.XXXXXX")"
clone_dir="$temp_root/codex"
staged_output="$temp_root/oracle-output.jsonl"

cleanup() {
  local status=$?
  local checkout_head_after=''
  local checkout_status_after=''
  trap - EXIT INT TERM
  checkout_head_after="$(git -C "$codex_checkout" rev-parse --verify HEAD 2>/dev/null || true)"
  checkout_status_after="$(git -C "$codex_checkout" status --porcelain=v1 --untracked-files=all 2>/dev/null || true)"
  if [[ "$checkout_head_after" != "$checkout_head_before" || "$checkout_status_after" != "$checkout_status_before" ]]; then
    printf '%s\n' 'ERROR: the supplied Codex checkout changed while the oracle ran' >&2
    printf '  HEAD before: %s\n  HEAD after:  %s\n' "$checkout_head_before" "$checkout_head_after" >&2
    status=74
  fi
  if [[ "$keep_temp" == true ]]; then
    printf 'kept instrumented clone: %s\n' "$clone_dir" >&2
  else
    rm -rf -- "$temp_root"
  fi
  exit "$status"
}
trap cleanup EXIT INT TERM

# A shared local clone reads objects from the supplied checkout but does not add
# worktree metadata or modify files/configuration in that checkout.
git clone --quiet --shared --no-checkout -- "$codex_checkout" "$clone_dir"
git -C "$clone_dir" checkout --quiet --detach "$expected_commit"

git -C "$clone_dir" apply --check "$script_dir/instrumentation.patch"
git -C "$clone_dir" apply "$script_dir/instrumentation.patch"
install -m 0644 \
  "$script_dir/instrumentation/exec_policy_runtime_oracle.rs" \
  "$clone_dir/codex-rs/core/src/exec_policy_runtime_oracle.rs"
git -C "$clone_dir" diff --check

cargo_bin="${CARGO_BIN:-cargo}"
target_dir="${CODEX_ORACLE_TARGET_DIR:-$temp_parent/dsh-codex-codex-core-target-$expected_commit}"
mkdir -p "$target_dir"

export CARGO_TARGET_DIR="$target_dir"
export DSH_CODEX_RUNTIME_ORACLE_CORPUS="$corpus"
export DSH_CODEX_RUNTIME_ORACLE_OUTPUT="$staged_output"

(
  cd "$clone_dir/codex-rs"
  "$cargo_bin" test --locked --package codex-core --lib \
    'exec_policy::dsh_codex_runtime_oracle::dsh_codex_runtime_policy_oracle' \
    -- --ignored --exact --nocapture --test-threads=1
)

[[ -s "$staged_output" ]] || { printf '%s\n' 'oracle did not produce staged output' >&2; exit 70; }
mv -f -- "$staged_output" "$output"
printf 'upstream runtime oracle output: %s\n' "$output"
