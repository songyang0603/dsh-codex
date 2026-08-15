#!/usr/bin/env bash
set -euo pipefail

readonly expected_commit='086396f7f60347b74c82784d5dfaf4fb2d3bda12'
readonly expected_protocol_approvals_blob='44dc8d7d7c9728a69e0b153dc1e43e248aaab9bc'
readonly expected_sandboxing_blob='2d20334f6446b2273128e6ed54e8001e28e37a76'
readonly expected_session_handlers_blob='a928090cc82eae3368030172e36b938c9422d5c3'
readonly expected_session_constructor_blob='84829d90f112ab4717abeaa16877379c3ca0a117'
readonly expected_session_tests_blob='a56c9bbdde0fa18c3394558692545a9a4749e3f3'
readonly expected_app_server_item_blob='dcfe928508e8eef1af3b3f05c739860e75c0d607'
readonly expected_app_server_bespoke_blob='32c222668614aa17b8496712c24b061d76bcc2b5'

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
codex_checkout="${CODEX_UPSTREAM_CHECKOUT:-}"
corpus="$script_dir/upstream-corpus.jsonl"
output=''
keep_temp=false

usage() {
  printf '%s\n' \
    'Usage: run-oracle.sh --codex-checkout PATH --output FILE [options]' \
    '' \
    'Options:' \
    '  --corpus FILE       JSONL corpus (default: bundled upstream-corpus.jsonl)' \
    '  --keep-temp         Keep the instrumented temporary clone for inspection' \
    '  -h, --help          Show this help' \
    '' \
    'Environment:' \
    '  CODEX_UPSTREAM_CHECKOUT       Alternative to --codex-checkout' \
    '  CODEX_APPROVAL_TARGET_DIR     Single reusable Cargo target directory' \
    '  CODEX_APPROVAL_TEMP_ROOT      Optional absent temp root for path-stable retries' \
    '  CARGO_BIN                    Cargo executable (default: cargo)'
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
[[ -f "$corpus" ]] || { printf 'corpus does not exist: %s\n' "$corpus" >&2; exit 66; }
[[ -n "$output" ]] || { printf '%s\n' '--output is required' >&2; exit 64; }

codex_checkout="$(cd "$codex_checkout" && pwd -P)"
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
verify_object 'protocol approvals blob' "$expected_commit:codex-rs/protocol/src/approvals.rs" "$expected_protocol_approvals_blob"
verify_object 'core sandboxing blob' "$expected_commit:codex-rs/core/src/tools/sandboxing.rs" "$expected_sandboxing_blob"
verify_object 'session handlers blob' "$expected_commit:codex-rs/core/src/session/handlers.rs" "$expected_session_handlers_blob"
verify_object 'session constructor blob' "$expected_commit:codex-rs/core/src/session/session.rs" "$expected_session_constructor_blob"
verify_object 'session tests blob' "$expected_commit:codex-rs/core/src/session/tests.rs" "$expected_session_tests_blob"
verify_object 'app-server item blob' "$expected_commit:codex-rs/app-server-protocol/src/protocol/v2/item.rs" "$expected_app_server_item_blob"
verify_object 'app-server bespoke handler blob' "$expected_commit:codex-rs/app-server/src/bespoke_event_handling.rs" "$expected_app_server_bespoke_blob"

checkout_head_before="$(git -C "$codex_checkout" rev-parse --verify HEAD)"
checkout_status_before="$(git -C "$codex_checkout" status --porcelain=v1 --untracked-files=all)"

rustc_bin="${RUSTC:-rustc}"
rustc_version="$("$rustc_bin" --version)"
[[ "$rustc_version" == 'rustc 1.95.'* ]] || {
  printf 'Rust 1.95 is required; found: %s\n' "$rustc_version" >&2
  exit 65
}

temp_parent="${TMPDIR:-/tmp}"
if [[ -n "${CODEX_APPROVAL_TEMP_ROOT:-}" ]]; then
  temp_root="$CODEX_APPROVAL_TEMP_ROOT"
  [[ ! -e "$temp_root" ]] || {
    printf 'CODEX_APPROVAL_TEMP_ROOT must not already exist: %s\n' "$temp_root" >&2
    exit 73
  }
  [[ "$(basename "$temp_root")" == dsh-codex-approval-oracle.* ]] || {
    printf '%s\n' 'CODEX_APPROVAL_TEMP_ROOT basename must start with dsh-codex-approval-oracle.' >&2
    exit 64
  }
  mkdir -p "$(dirname "$temp_root")"
  mkdir "$temp_root"
else
  temp_root="$(mktemp -d "$temp_parent/dsh-codex-approval-oracle.XXXXXX")"
fi
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
    printf '%s\n' 'ERROR: supplied Codex checkout changed while the oracle ran' >&2
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

git clone --quiet --shared --no-checkout -- "$codex_checkout" "$clone_dir"
git -C "$clone_dir" checkout --quiet --detach "$expected_commit"
git -C "$clone_dir" apply --check "$script_dir/instrumentation.patch"
git -C "$clone_dir" apply "$script_dir/instrumentation.patch"
install -m 0644 \
  "$script_dir/instrumentation/approval_conformance_oracle.rs" \
  "$clone_dir/codex-rs/core/src/session/approval_conformance_oracle.rs"
git -C "$clone_dir" diff --check

cargo_bin="${CARGO_BIN:-cargo}"
target_dir="${CODEX_APPROVAL_TARGET_DIR:-$temp_parent/dsh-codex-approval-target-$expected_commit}"
mkdir -p "$target_dir"
export CARGO_TARGET_DIR="$target_dir"
export DSH_CODEX_APPROVAL_ORACLE_CORPUS="$corpus"
export DSH_CODEX_APPROVAL_ORACLE_OUTPUT="$staged_output"

(
  cd "$clone_dir/codex-rs"
  "$cargo_bin" test --locked --package codex-core --lib \
    'session::tests::dsh_codex_approval_conformance_oracle::dsh_codex_approval_conformance_oracle' \
    -- --ignored --exact --nocapture --test-threads=1
)

[[ -s "$staged_output" ]] || { printf '%s\n' 'oracle did not produce staged output' >&2; exit 70; }
mv -f -- "$staged_output" "$output"
printf 'pinned approval oracle output: %s\n' "$output"
