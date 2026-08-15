# Config-stack conformance execution status

Status: **executed; upstream oracle and dsh-codex candidate match all 6 bundled
cases on macOS/aarch64**.

Execution date: 2026-08-15

## Fixed source and environment

- Codex commit: `086396f7f60347b74c82784d5dfaf4fb2d3bda12`
- `codex-rs/config` tree: `d3f4925b575b128dd1f0f74a5babcdb1efce0219`
- `codex-rs/execpolicy` tree: `e06e0b4ad718af8a74055a33b1536b25fb9d4a87`
- Core exec-policy blob: `5de05937533a2653a700b4ec40cda09578761f50`
- Rust: `rustc 1.95.0 (59807616e 2026-04-14)`
- Node.js: `v22.20.0`
- Platform: `macos/aarch64`
- Candidate sidecar protocol: `3`

The supplied user Codex checkout remained at the fixed commit. After all
oracle runs, `git status --porcelain` was empty and both worktree and index
`git diff --quiet` checks exited 0.

## Executed evidence

- The final oracle wrapper verified all five pinned Git objects, made a
  detached shared temporary clone, applied the test-only instrumentation, and
  ran exactly one ignored `codex-core` test. Result:
  `1 passed; 0 failed; 2212 filtered out`.
- Oracle identity/completeness validation reported:
  `validated config-stack oracle output: 6/6 cases`.
- Bundled semantic assertions reported:
  `verified bundled config-stack semantics: 6/6 cases`.
- The first attempt to build into a new candidate Cargo target failed honestly
  with `No space left on device`; it emitted no candidate result and is not
  counted as a passing build. The failed target and a completed, rebuildable
  upstream Cargo cache were removed while the JSONL evidence was retained.
- A second empty Cargo target built the real
  `dsh-codex-execpolicy-engine` with `cargo build --locked` in 1m45s.
- The same fresh target passed the full engine test suite: 9 unit tests, 4
  process-boundary protocol tests, and 3 direct upstream differential tests.
- The candidate runner launched that fresh binary, verified the then-current
  hello and all
  fixed upstream identities, and emitted exactly 6 candidate records.
- The strict comparator reported:
  `config-stack parity: 6/6 cases matched`.
- After the sidecar advanced to protocol v3, the existing candidate target was
  incrementally rebuilt and the config-stack candidate/comparator were rerun
  against the independently generated, still-current upstream oracle. The v3
  hello reported the fixed commit and `macos/aarch64`; the strict comparator
  again reported `config-stack parity: 6/6 cases matched`. The candidate and
  binary hashes below describe this current v3 build.

The first comparator execution exposed a defect in the comparator itself: its
recursive object branch omitted the equal-object `null` return and therefore
reported visually identical objects as mismatches. The comparator was fixed,
given an always-run nested equality/difference self-test, and rerun against the
unchanged oracle and candidate data before the passing result above. It never
produced a false pass.

Fail-closed checks were also executed:

- treating an oracle file as candidate output exited 1 on missing candidate
  engine identity;
- launching `/bin/echo` instead of a sidecar exited 1 and did not publish the
  requested candidate output;
- changing `allow` decisions to `prompt` through a transient stream made the
  comparator exit 1, identifying exact semantic paths and reporting 3/6
  divergent cases;
- an unrelated checkout without the pinned commit made `run-oracle.sh` exit 65
  before compilation or output publication;
- feeding corpus records to the oracle output validator exited 1 on missing
  upstream identity.

## Evidence hashes

- Corpus SHA-256:
  `67849026474c65cb9fe3e1200fbabe351fbb60bc27d7cd679dee25ec30847e94`
- Instrumentation hook patch SHA-256:
  `3741cf2dc0327bf84020d792f21ade39ef801950d92d3ca95063aaf72e203050`
- Instrumentation Rust source SHA-256:
  `2f71a94d4d4f6f3b1e4619d19e3092abd3b17225a68cb8b1e25fc3fcd4397e02`
- Oracle output SHA-256:
  `93034a6a71b9ec914b894dde03fbdc0b9f01b8e401053690876f5432966af7dd`
- Candidate output SHA-256:
  `90dd291b6a28bd45633d3c99c0a17d613679b78dd01c9e8eadb02ecdd23071a7`
- Current candidate binary SHA-256:
  `1df338ba3f879fc8775af4b724d4e42d147f1289c1ac5d3a79c40ff1cbc209c3`

The two JSONL outputs and fresh build target are intentionally temporary and
are not durable repository artifacts. Re-run the README commands to regenerate
them. This status proves the pinned implementation and six-case corpus on the
recorded platform; it does not claim other operating systems, OS-specific MDM
or cloud loading, project trust discovery, or exhaustive config-field coverage.
