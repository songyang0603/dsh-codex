# Runtime oracle execution status

Status: **executed and passing for all 68 bundled cases on macOS/aarch64**.

Execution date: 2026-08-15

## Fixed source and environment

- Codex commit: `086396f7f60347b74c82784d5dfaf4fb2d3bda12`
- Core exec-policy blob: `5de05937533a2653a700b4ec40cda09578761f50`
- Execpolicy tree: `e06e0b4ad718af8a74055a33b1536b25fb9d4a87`
- Shell-command tree: `3f5da93a61be77795d3fc5bb3d6e44a9dec1d106`
- Rust/Cargo: 1.95.0
- Oracle and candidate platform: `macos/aarch64`
- Candidate sidecar protocol: `3`
- `pwsh`: not installed on the execution host
- User Codex checkout before and after execution:
  `HEAD=086396f7f60347b74c82784d5dfaf4fb2d3bda12`, empty
  `git status --porcelain=v1 --untracked-files=all`

## Observed execution

- `run-oracle.sh` verified the fixed Git objects, snapshotted the user
  checkout, created a temporary shared clone, applied the instrumentation, and
  built the pinned `codex-core --lib` test target in the single reusable target
  `/private/tmp/dsh-codex-runtime-semantic-target`.
- The full wrapper run used the current instrumentation source and read the
  then-current 64-case corpus. It ran exactly one explicitly ignored upstream
  test and reported:
  `1 passed; 0 failed; 2212 filtered out`.
- Four final branch-discriminating cases were then added: default-sandbox
  heredoc redirect, Windows full-disk managed profile, known-safe complex
  heredoc, and non-matching requested heredoc prefix. To avoid making Cargo
  duplicate path-sensitive artifacts from a third temporary clone, the exact
  pinned test binary produced by the wrapper re-read the final 68-case corpus.
  It again reported:
  `1 passed; 0 failed; 2212 filtered out` and emitted 68 records. This was an
  execution of the independently compiled upstream instrumentation, not a
  generated or hand-edited oracle fixture.
- The current sidecar had been rebuilt with
  `cargo build --locked --package dsh-codex-execpolicy-engine` and emitted 68
  candidate records through the real protocol-v3 `load` and
  `check_exec_approval_requirement` RPCs. The final formatted candidate runner
  was executed again before the first commit and reproduced the same candidate
  output hash.
- Strict comparison reported:
  `runtime policy parity: 68/68 cases matched`.
- The corpus grew from 20 to 68 cases after the pinned upstream
  `exec_policy_tests`, Windows tests, runtime implementation, and
  `model_policy_tests` audit. The exact branch-to-case map is in `README.md`.
- No candidate mismatch or semantic drift in the production runtime adapter was
  found on the executed macOS branches.

## Evidence hashes

- Corpus SHA-256:
  `4115e3004f9153085cf5b1bec3c01688cabaa3b68de87313716e5e7eb91ddd7d`
- Corpus schema SHA-256:
  `dc3fe293d924addce15e0097240b91bcf332cb842871205f07fff5bd0ffa5772`
- Instrumentation hook patch SHA-256:
  `506acb07ffaadbc91d561505dd19179b734dc069d67ee936860bc01198552e7e`
- Instrumentation Rust source SHA-256:
  `d95127cda8c99aa960a45e16e7e33d8951da1922b811b425907328bd4eef65a4`
- Oracle runner SHA-256:
  `289b2198a9355098b8f2a3a94060f61772c68afebc0d312057c10dfa8477bd61`
- Candidate runner SHA-256:
  `8eceb093c42136c9a0226bc549a2d6343ae142f817a4eba58d4735e520ab8d2c`
- Comparator SHA-256:
  `f1581737277380cb356b8d7cea4c5479d7958d79884135fbe59adff4f2fa395b`
- Oracle output SHA-256:
  `3deccc90c919005873681287a85616c68769d29af601b023ef6d831c66d66235`
- Candidate output SHA-256:
  `918f261332af087a78dca34af7dde11cc72bf1c863ef1e3eda869492069dcc53`
- Candidate binary SHA-256:
  `1df338ba3f879fc8775af4b724d4e42d147f1289c1ac5d3a79c40ff1cbc209c3`
- Pinned upstream oracle test binary SHA-256:
  `066c43aa8a8cfbeabff45aba7591ab4b952a91bc54017499ff2a3410e0430438`

The JSONL outputs were intentionally written to `/private/tmp` and are not
treated as durable repository artifacts. Re-run the documented commands to
regenerate evidence.

## Platform boundary

Cases 54–59 and 66 are cross-platform fixtures intended to discriminate
Windows-only control flow. On this macOS run they were compared through the
generic non-Windows path; that is useful corpus portability evidence, but it is
**not Windows semantic coverage**. On Windows, the four PowerShell cases fail
closed unless `powershell.exe` is runnable. A real Windows oracle/candidate run
is still required, and no Windows result is claimed here.
