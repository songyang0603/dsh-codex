# Apply-patch semantic-engine conformance status

Status: `parity_verified`

Verified tuple: `@songyang0603/dsh-codex-apply-patch-engine@0.1.0`, OpenAI
Codex `086396f7f60347b74c82784d5dfaf4fb2d3bda12`, DeepSeek Harness CLI/profile
`0.1.0-rc.6`, macOS arm64 source build.

Executed on 2026-08-15 on macOS arm64:

- Pinned upstream oracle: one ignored instrumentation test passed and emitted
  all 23 corpus records from Codex commit
  `086396f7f60347b74c82784d5dfaf4fb2d3bda12`.
- Native sidecar: 3 unit tests and 7 black-box process tests passed; 0 failed.
- The complete pinned public `codex-apply-patch` test suite passed: 69 library
  tests and 27 CLI/scenario tests (`96/96`, 0 failed).
- TypeScript package: build, typecheck, 6 TypeScript/native/real-Loader tests,
  Prettier, and publint passed.
- Real package/client candidate execution emitted all 23 records.
- Strict differential: `23/23` cases matched, including semantic success/error
  projections, stdout/stderr, ordered deltas, complete file bytes, Unix modes,
  symlink targets, and no-follow filesystem effects.
- The frozen one-shot `run.sh` path completed successfully from pinned oracle
  through the built package client and native sidecar to the comparator.
- A packed-component check installed the archive into a clean DSH rc.6 profile,
  verified the package-local native binary and SHA-256, activated the real
  Cordis service, performed verification and mutation, and removed the package.
  No repository `target/` binary could serve as a fallback.

The component directly links the unchanged pinned public semantic
implementation rather than translating it. The complete upstream suite guards
that implementation, while the independent differential and package/profile
checks cover the adapter, protocol, lifecycle, archive, and DSH composition
seams. This evidence closes the declared macOS arm64 semantic-engine boundary.

Excluded from this status: freeform/tool transport, tool registration, safety,
approval, sandboxing, events, hooks, TurnDiff, agent loop, session behavior, and
UI. Linux, Windows, macOS x64, and remote macOS arm64 remain unverified until
their configured workflows actually run.
