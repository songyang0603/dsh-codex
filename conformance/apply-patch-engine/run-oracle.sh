#!/usr/bin/env bash
set -euo pipefail

readonly expected_commit='086396f7f60347b74c82784d5dfaf4fb2d3bda12'
readonly expected_apply_patch_tree='1601c43435739cfeca8c5ae4fe28e56b5efc4246'
readonly expected_exec_server_tree='51751785508060e633f0e0472fa0d2572787b36a'
readonly expected_file_system_tree='971c42b87f1e8e94411d6b63a854b1404df45d1d'
readonly expected_path_uri_tree='02fceb44b126b04efe3d4d2087284d092fa02f13'
readonly expected_cargo_lock_blob='a8c2addc02055be48c345b65760a7a1b96cfbf28'

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
    '  CODEX_UPSTREAM_CHECKOUT                    Alternative to --codex-checkout' \
    '  CODEX_APPLY_PATCH_ENGINE_TARGET_DIR        Reusable Cargo target directory' \
    '  CODEX_APPLY_PATCH_ENGINE_TEMP_ROOT         Optional absent temporary root' \
    '  CARGO_BIN                                 Cargo executable (default: cargo)'
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
verify_object 'apply-patch tree' "$expected_commit:codex-rs/apply-patch" "$expected_apply_patch_tree"
verify_object 'exec-server tree' "$expected_commit:codex-rs/exec-server" "$expected_exec_server_tree"
verify_object 'file-system tree' "$expected_commit:codex-rs/file-system" "$expected_file_system_tree"
verify_object 'path-uri tree' "$expected_commit:codex-rs/utils/path-uri" "$expected_path_uri_tree"
verify_object 'Cargo.lock blob' "$expected_commit:codex-rs/Cargo.lock" "$expected_cargo_lock_blob"

checkout_head_before="$(git -C "$codex_checkout" rev-parse --verify HEAD)"
checkout_status_before="$(git -C "$codex_checkout" status --porcelain=v1 --untracked-files=all)"
[[ "$checkout_head_before" == "$expected_commit" ]] || {
  printf 'supplied Codex checkout HEAD is not pinned\n  expected: %s\n  actual:   %s\n' \
    "$expected_commit" "$checkout_head_before" >&2
  exit 65
}
[[ -z "$checkout_status_before" ]] || {
  printf '%s\n' 'supplied Codex checkout must be clean (including untracked files)' >&2
  printf '%s\n' "$checkout_status_before" >&2
  exit 65
}

rustc_bin="${RUSTC:-rustc}"
rustc_version="$("$rustc_bin" --version)"
[[ "$rustc_version" == 'rustc 1.95.'* ]] || {
  printf 'Rust 1.95 is required; found: %s\n' "$rustc_version" >&2
  exit 65
}

temp_parent="${TMPDIR:-/tmp}"
if [[ -n "${CODEX_APPLY_PATCH_ENGINE_TEMP_ROOT:-}" ]]; then
  temp_root="$CODEX_APPLY_PATCH_ENGINE_TEMP_ROOT"
  [[ ! -e "$temp_root" ]] || {
    printf 'CODEX_APPLY_PATCH_ENGINE_TEMP_ROOT must not already exist: %s\n' "$temp_root" >&2
    exit 73
  }
  [[ "$(basename "$temp_root")" == dsh-codex-apply-patch-engine-oracle.* ]] || {
    printf '%s\n' 'CODEX_APPLY_PATCH_ENGINE_TEMP_ROOT basename must start with dsh-codex-apply-patch-engine-oracle.' >&2
    exit 64
  }
  mkdir -p "$(dirname "$temp_root")"
  mkdir "$temp_root"
else
  temp_root="$(mktemp -d "$temp_parent/dsh-codex-apply-patch-engine-oracle.XXXXXX")"
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
  "$script_dir/instrumentation/apply_patch_engine_conformance_oracle.rs" \
  "$clone_dir/codex-rs/apply-patch/src/apply_patch_engine_conformance_oracle.rs"
git -C "$clone_dir" diff --check

cargo_bin="${CARGO_BIN:-cargo}"
target_dir="${CODEX_APPLY_PATCH_ENGINE_TARGET_DIR:-$temp_parent/dsh-codex-apply-patch-engine-target-$expected_commit}"
mkdir -p "$target_dir"
export CARGO_TARGET_DIR="$target_dir"
export DSH_CODEX_APPLY_PATCH_ENGINE_ORACLE_CORPUS="$corpus"
export DSH_CODEX_APPLY_PATCH_ENGINE_ORACLE_OUTPUT="$staged_output"

umask 022
(
  cd "$clone_dir/codex-rs"
  "$cargo_bin" test --locked --package codex-apply-patch --lib \
    'dsh_codex_apply_patch_engine_conformance_oracle::dsh_codex_apply_patch_engine_conformance_oracle' \
    -- --ignored --exact --nocapture --test-threads=1
)

[[ -s "$staged_output" ]] || { printf '%s\n' 'oracle did not produce staged output' >&2; exit 70; }
mv -f -- "$staged_output" "$output"
printf 'pinned apply-patch engine oracle output: %s\n' "$output"
