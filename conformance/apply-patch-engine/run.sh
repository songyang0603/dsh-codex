#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
codex_checkout=''
engine=''
package_dir=''
artifacts_dir=''

usage() {
  printf '%s\n' \
    'Usage: run.sh --codex-checkout PATH --engine FILE --package-dir DIR --artifacts-dir DIR' \
    '' \
    'Runs the independently pinned oracle, the built package/client candidate,' \
    'and the strict same-platform differential comparator.'
}

while (($# > 0)); do
  case "$1" in
    --codex-checkout)
      [[ $# -ge 2 ]] || { printf '%s\n' 'missing value for --codex-checkout' >&2; exit 64; }
      codex_checkout="$2"
      shift 2
      ;;
    --engine)
      [[ $# -ge 2 ]] || { printf '%s\n' 'missing value for --engine' >&2; exit 64; }
      engine="$2"
      shift 2
      ;;
    --package-dir)
      [[ $# -ge 2 ]] || { printf '%s\n' 'missing value for --package-dir' >&2; exit 64; }
      package_dir="$2"
      shift 2
      ;;
    --artifacts-dir)
      [[ $# -ge 2 ]] || { printf '%s\n' 'missing value for --artifacts-dir' >&2; exit 64; }
      artifacts_dir="$2"
      shift 2
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

[[ -n "$codex_checkout" && -n "$engine" && -n "$package_dir" && -n "$artifacts_dir" ]] || {
  usage >&2
  exit 64
}
[[ -x "$engine" ]] || { printf 'engine is not executable: %s\n' "$engine" >&2; exit 66; }
[[ -f "$package_dir/lib/client.js" ]] || {
  printf 'built package client is missing: %s/lib/client.js\n' "$package_dir" >&2
  exit 66
}

mkdir -p "$artifacts_dir"
artifacts_dir="$(cd "$artifacts_dir" && pwd -P)"
oracle="$artifacts_dir/oracle.jsonl"
candidate="$artifacts_dir/candidate.jsonl"

"$script_dir/run-oracle.sh" \
  --codex-checkout "$codex_checkout" \
  --output "$oracle"
node "$script_dir/run-candidate.mjs" \
  --engine "$engine" \
  --package-dir "$package_dir" \
  --output "$candidate"
node "$script_dir/compare.mjs" "$script_dir/corpus.jsonl" "$oracle" "$candidate"
