#!/usr/bin/env bash
set -euo pipefail

readonly expected_commit='086396f7f60347b74c82784d5dfaf4fb2d3bda12'
readonly expected_config_tree='d3f4925b575b128dd1f0f74a5babcdb1efce0219'
readonly expected_exec_server_tree='51751785508060e633f0e0472fa0d2572787b36a'
readonly expected_utils_cli_tree='5d9c72fcadefb9a1c95e38c4726d25c5b8d195ee'
readonly expected_utils_home_dir_tree='c2d10a4f4844c2a517584ee623a0b8aa4ceb44f5'
readonly expected_execpolicy_tree='e06e0b4ad718af8a74055a33b1536b25fb9d4a87'
readonly expected_core_exec_policy_blob='5de05937533a2653a700b4ec40cda09578761f50'
readonly expected_core_cargo_blob='ff683fb5f921dcf23fe52ef52db6cf9889ca8efe'
readonly expected_cargo_lock_blob='a8c2addc02055be48c345b65760a7a1b96cfbf28'
readonly expected_config_loader_blob='244f7df02f1aba0eeb80fa8acebc7732195f8f3a'
readonly expected_config_state_blob='bda2b7d1a73a22c0f39abbba0bad7f4a5e6932ea'
readonly expected_exec_server_lib_blob='bfaec24cad2a27a91a7c685f3fead3138e2b01f7'
readonly expected_utils_cli_lib_blob='633638e72d65a931f68a503d523c76f75d0ac62b'
readonly expected_utils_home_dir_lib_blob='caa43569c78bae9f5cc875092f378f4d935b8063'

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
    '  --keep-temp         Keep the instrumented temporary clone and fixtures' \
    '  -h, --help          Show this help' \
    '' \
    'Environment:' \
    '  CODEX_UPSTREAM_CHECKOUT          Alternative to --codex-checkout' \
    '  CODEX_HOST_CONFIG_ORACLE_TARGET_DIR  Persistent Cargo target cache' \
    '  CARGO_BIN                        Cargo executable (default: cargo)'
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
verify_object 'exec-server tree' "$expected_commit:codex-rs/exec-server" "$expected_exec_server_tree"
verify_object 'utils-cli tree' "$expected_commit:codex-rs/utils/cli" "$expected_utils_cli_tree"
verify_object 'utils-home-dir tree' "$expected_commit:codex-rs/utils/home-dir" "$expected_utils_home_dir_tree"
verify_object 'execpolicy tree' "$expected_commit:codex-rs/execpolicy" "$expected_execpolicy_tree"
verify_object 'core exec-policy blob' "$expected_commit:codex-rs/core/src/exec_policy.rs" "$expected_core_exec_policy_blob"
verify_object 'core Cargo.toml blob' "$expected_commit:codex-rs/core/Cargo.toml" "$expected_core_cargo_blob"
verify_object 'Cargo.lock blob' "$expected_commit:codex-rs/Cargo.lock" "$expected_cargo_lock_blob"
verify_object 'config loader blob' "$expected_commit:codex-rs/config/src/loader/mod.rs" "$expected_config_loader_blob"
verify_object 'config state blob' "$expected_commit:codex-rs/config/src/state.rs" "$expected_config_state_blob"
verify_object 'exec-server lib blob' "$expected_commit:codex-rs/exec-server/src/lib.rs" "$expected_exec_server_lib_blob"
verify_object 'utils-cli lib blob' "$expected_commit:codex-rs/utils/cli/src/lib.rs" "$expected_utils_cli_lib_blob"
verify_object 'utils-home-dir lib blob' "$expected_commit:codex-rs/utils/home-dir/src/lib.rs" "$expected_utils_home_dir_lib_blob"

# Production intentionally exposes no test-only overrides for host-wide files
# or MDM. Fail closed instead of silently mixing ambient policy into an
# allegedly isolated fixture run. These surfaces are documented as uncovered.
for host_file in \
  /etc/codex/config.toml \
  /etc/codex/requirements.toml \
  /etc/codex/managed_config.toml
do
  if [[ -e "$host_file" ]]; then
    printf 'ambient host policy prevents an isolated run: %s\n' "$host_file" >&2
    exit 69
  fi
done
if [[ "$(uname -s)" == Darwin ]]; then
  for managed_key in config_toml_base64 requirements_toml_base64; do
    if /usr/bin/defaults read com.openai.codex "$managed_key" >/dev/null 2>&1; then
      printf 'ambient MDM preference prevents an isolated run: com.openai.codex:%s\n' "$managed_key" >&2
      exit 69
    fi
  done
fi

rustc_bin="${RUSTC:-rustc}"
rustc_version="$("$rustc_bin" --version)"
[[ "$rustc_version" == 'rustc 1.95.'* ]] || {
  printf 'Rust 1.95 is required; found: %s\n' "$rustc_version" >&2
  exit 65
}

checkout_head_before="$(git -C "$codex_checkout" rev-parse HEAD)"
checkout_status_before="$(git -C "$codex_checkout" status --porcelain=v1 --untracked-files=all)"
temp_parent="${TMPDIR:-/tmp}"
temp_root="$(mktemp -d "$temp_parent/dsh-codex-host-config-oracle.XXXXXX")"
temp_root="$(cd "$temp_root" && pwd -P)"
clone_dir="$temp_root/codex"
cases_root="$temp_root/cases"
staged_output="$temp_root/oracle-output.jsonl"

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  local checkout_head_after
  local checkout_status_after
  checkout_head_after="$(git -C "$codex_checkout" rev-parse HEAD 2>/dev/null || true)"
  checkout_status_after="$(git -C "$codex_checkout" status --porcelain=v1 --untracked-files=all 2>/dev/null || true)"
  if [[ "$checkout_head_after" != "$checkout_head_before" || "$checkout_status_after" != "$checkout_status_before" ]]; then
    printf '%s\n' 'supplied Codex checkout changed during oracle execution' >&2
    status=74
  fi
  if [[ "$keep_temp" == true ]]; then
    printf 'kept instrumented clone: %s\n' "$clone_dir" >&2
    printf 'kept host fixtures: %s\n' "$cases_root" >&2
  else
    rm -rf -- "$temp_root"
  fi
  exit "$status"
}
trap cleanup EXIT INT TERM

mkdir -p "$cases_root/0/home"

# A shared clone reads pinned objects from the supplied checkout without
# changing its worktree, index, configuration, or registered worktrees.
git clone --quiet --shared --no-checkout -- "$codex_checkout" "$clone_dir"
git -C "$clone_dir" checkout --quiet --detach "$expected_commit"
git -C "$clone_dir" apply --check "$script_dir/instrumentation.patch"
git -C "$clone_dir" apply "$script_dir/instrumentation.patch"
install -m 0644 \
  "$script_dir/instrumentation/exec_policy_host_config_oracle.rs" \
  "$clone_dir/codex-rs/core/src/exec_policy_host_config_oracle.rs"
git -C "$clone_dir" diff --check

cargo_bin="${CARGO_BIN:-cargo}"
target_dir="${CODEX_HOST_CONFIG_ORACLE_TARGET_DIR:-$temp_parent/dsh-codex-host-config-target-$expected_commit}"
mkdir -p "$target_dir"

export CARGO_TARGET_DIR="$target_dir"
export CODEX_HOME="$cases_root/0/home"
export DSH_CODEX_HOST_CONFIG_ORACLE_CORPUS="$corpus"
export DSH_CODEX_HOST_CONFIG_ORACLE_OUTPUT="$staged_output"
export DSH_CODEX_HOST_CONFIG_ORACLE_CASES_ROOT="$cases_root"

(
  cd "$clone_dir/codex-rs"
  "$cargo_bin" test --locked --package codex-core --lib \
    'exec_policy::dsh_codex_host_config_oracle::dsh_codex_host_config_oracle' \
    -- --ignored --exact --nocapture --test-threads=1
)

[[ -s "$staged_output" ]] || { printf '%s\n' 'oracle did not produce staged output' >&2; exit 70; }
node "$script_dir/validate-output.mjs" --kind oracle --corpus "$corpus" --output "$staged_output"
if [[ "$corpus" == "$script_dir/corpus.jsonl" ]]; then
  node "$script_dir/verify-bundled-output.mjs" "$staged_output"
fi
mv -f -- "$staged_output" "$output"
printf 'upstream host-config oracle output: %s\n' "$output"
