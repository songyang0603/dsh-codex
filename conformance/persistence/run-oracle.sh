#!/usr/bin/env bash
set -euo pipefail

readonly expected_commit='086396f7f60347b74c82784d5dfaf4fb2d3bda12'
readonly expected_config_tree='d3f4925b575b128dd1f0f74a5babcdb1efce0219'
readonly expected_execpolicy_tree='e06e0b4ad718af8a74055a33b1536b25fb9d4a87'
readonly expected_core_exec_policy_blob='5de05937533a2653a700b4ec40cda09578761f50'
readonly expected_core_exec_policy_dir_tree='b313a3ba1b113f08e3c1686272162910dad76540'
readonly expected_cargo_lock_blob='a8c2addc02055be48c345b65760a7a1b96cfbf28'
readonly expected_instrumentation_patch_blob='2fd7275b54c4455016912eeb6e23df34c1cae7d8'
readonly expected_instrumentation_source_blob='507b48652b5a92f3637b75cec0d904b53ae62d15'

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
    '  --keep-temp         Keep the instrumented shared clone for inspection' \
    '  -h, --help          Show this help' \
    '' \
    'Environment:' \
    '  CODEX_UPSTREAM_CHECKOUT              Alternative to --codex-checkout' \
    '  CODEX_PERSISTENCE_ORACLE_TARGET_DIR  Persistent Cargo target cache' \
    '  CARGO_BIN                            Cargo executable (default: cargo)'
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

corpus="$(cd "$(dirname "$corpus")" && pwd -P)/$(basename "$corpus")"
mkdir -p "$(dirname "$output")"
output="$(cd "$(dirname "$output")" && pwd -P)/$(basename "$output")"
[[ "$corpus" != "$output" ]] || { printf '%s\n' 'output must not overwrite the corpus' >&2; exit 64; }

verify_object() {
  local label="$1"
  local object_spec="$2"
  local expected="$3"
  local actual
  if ! actual="$(git -C "$codex_checkout" rev-parse --verify "$object_spec" 2>/dev/null)"; then
    printf 'upstream %s is missing\n  expected: %s\n' "$label" "$expected" >&2
    exit 65
  fi
  if [[ "$actual" != "$expected" ]]; then
    printf 'upstream %s mismatch\n  expected: %s\n  actual:   %s\n' "$label" "$expected" "$actual" >&2
    exit 65
  fi
}

verify_object 'commit' "$expected_commit^{commit}" "$expected_commit"
verify_object 'config tree' "$expected_commit:codex-rs/config" "$expected_config_tree"
verify_object 'execpolicy tree' "$expected_commit:codex-rs/execpolicy" "$expected_execpolicy_tree"
verify_object 'core exec-policy blob' "$expected_commit:codex-rs/core/src/exec_policy.rs" "$expected_core_exec_policy_blob"
verify_object 'core exec-policy directory tree' "$expected_commit:codex-rs/core/src/exec_policy" "$expected_core_exec_policy_dir_tree"
verify_object 'Cargo.lock blob' "$expected_commit:codex-rs/Cargo.lock" "$expected_cargo_lock_blob"

actual_instrumentation_patch_blob="$(git hash-object "$script_dir/instrumentation.patch")"
actual_instrumentation_source_blob="$(git hash-object "$script_dir/instrumentation/exec_policy_persistence_oracle.rs")"
[[ "$actual_instrumentation_patch_blob" == "$expected_instrumentation_patch_blob" ]] || {
  printf '%s\n' 'instrumentation.patch content identity mismatch' >&2
  exit 65
}
[[ "$actual_instrumentation_source_blob" == "$expected_instrumentation_source_blob" ]] || {
  printf '%s\n' 'oracle instrumentation source identity mismatch' >&2
  exit 65
}

checkout_status_before="$(git -C "$codex_checkout" status --porcelain=v1 --untracked-files=all)"
[[ -z "$checkout_status_before" ]] || {
  printf '%s\n' 'the supplied Codex checkout must be clean; refusing to mix local changes into the oracle' >&2
  printf '%s\n' "$checkout_status_before" >&2
  exit 65
}

rustc_bin="${RUSTC:-rustc}"
rustc_version="$("$rustc_bin" --version)"
[[ "$rustc_version" == 'rustc 1.95.'* ]] || {
  printf 'Rust 1.95 is required; found: %s\n' "$rustc_version" >&2
  exit 65
}
node "$script_dir/validate-corpus.mjs" "$corpus"
corpus_sha256="$(node -e 'const fs=require("fs"),crypto=require("crypto");process.stdout.write(crypto.createHash("sha256").update(fs.readFileSync(process.argv[1])).digest("hex"))' "$corpus")"

temp_parent="${TMPDIR:-/private/tmp}"
temp_root="$(mktemp -d "$temp_parent/dsh-codex-persistence-oracle.XXXXXX")"
clone_dir="$temp_root/codex"
staged_output="$temp_root/oracle-output.jsonl"

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if [[ "$keep_temp" == true ]]; then
    printf 'kept instrumented clone: %s\n' "$clone_dir" >&2
  else
    rm -rf -- "$temp_root"
  fi
  exit "$status"
}
trap cleanup EXIT INT TERM

# A shared clone reads the pinned objects from the supplied checkout. It does
# not touch that checkout's worktree, index, config, or worktree registry.
git clone --quiet --shared --no-checkout -- "$codex_checkout" "$clone_dir"
git -C "$clone_dir" checkout --quiet --detach "$expected_commit"
git -C "$clone_dir" apply --check "$script_dir/instrumentation.patch"
git -C "$clone_dir" apply "$script_dir/instrumentation.patch"
install -m 0644 \
  "$script_dir/instrumentation/exec_policy_persistence_oracle.rs" \
  "$clone_dir/codex-rs/core/src/exec_policy_persistence_oracle.rs"
git -C "$clone_dir" diff --check

instrumented_status="$(git -C "$clone_dir" status --porcelain=v1 --untracked-files=all)"
expected_instrumented_status=$' M codex-rs/core/src/exec_policy.rs\n?? codex-rs/core/src/exec_policy_persistence_oracle.rs'
[[ "$instrumented_status" == "$expected_instrumented_status" ]] || {
  printf '%s\n' 'instrumented clone contains unexpected changes:' >&2
  printf '%s\n' "$instrumented_status" >&2
  exit 65
}

cargo_bin="${CARGO_BIN:-cargo}"
target_dir="${CODEX_PERSISTENCE_ORACLE_TARGET_DIR:-$temp_parent/dsh-codex-codex-core-target-$expected_commit}"
mkdir -p "$target_dir"
export CARGO_TARGET_DIR="$target_dir"
export DSH_CODEX_PERSISTENCE_ORACLE_CORPUS="$corpus"
export DSH_CODEX_PERSISTENCE_ORACLE_OUTPUT="$staged_output"
export DSH_CODEX_PERSISTENCE_CORPUS_SHA256="$corpus_sha256"

(
  cd "$clone_dir/codex-rs"
  "$cargo_bin" test --locked --package codex-core --lib \
    'exec_policy::dsh_codex_exec_policy_persistence_oracle::dsh_codex_exec_policy_persistence_oracle' \
    -- --ignored --exact --nocapture --test-threads=1
)

[[ -s "$staged_output" ]] || { printf '%s\n' 'oracle did not produce staged output' >&2; exit 70; }
node "$script_dir/validate-output.mjs" \
  --corpus "$corpus" \
  --output "$staged_output" \
  --kind upstream_oracle

checkout_status_after="$(git -C "$codex_checkout" status --porcelain=v1 --untracked-files=all)"
[[ "$checkout_status_after" == "$checkout_status_before" ]] || {
  printf '%s\n' 'the supplied Codex checkout changed while the oracle ran' >&2
  exit 70
}

mv -f -- "$staged_output" "$output"
printf 'upstream persistence oracle output: %s\n' "$output"
