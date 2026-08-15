# awesome-dsh-plugin: per-plugin source study

> This is a source study of every GitHub entry in the pinned list, not a study of how the awesome list is generated. List prose is discovery input; repository contents are the evidence.

## Coverage and method

- List pin: `awesome-dsh-plugin/awesome-dsh-plugin@240b6706dee090040f3c56065c515fe3a1bfe144`.
- Parsed 457 English and 457 Chinese entries. Their normalized targets are identical.
- 457 unique repository+subpath targets, 448 repositories, 27 explicit monorepo subpaths.
- 457/457 targets were source-accessible and pinned to a concrete HEAD; 456 have an observable manifest declaration whose patch file exists.
- Every target was inspected for package manifests, `dsh.bundle.patch`, patch rows, core host/client source, Cordis use, tools/events/services/state/persistence signals, tests, CI/release, and install/package instructions.
- The scanner uses `git clone --depth=1 --filter=blob:limit=384k --no-checkout`; it retries with `blob:none`, reads only relevant blobs, caches one JSON record per target, and deletes working clones.
- All negative counts below mean "not observable in the pinned tree/inspected files". They do not prove a behavior cannot exist at runtime.

The reproducible scanner is [`scripts/scan.mjs`](scripts/scan.mjs); the compact row for every target is [`plugins.jsonl`](plugins.jsonl). `inventory.jsonl` is the scanner's evidence-rich intermediate.

## What the 457 implementations actually look like

| Classification            | Count |
| ------------------------- | ----: |
| dsh-runtime-plugin        |   430 |
| skin-plugin               |    13 |
| skill-bundle-plugin       |     9 |
| distribution              |     2 |
| broken-bundle-declaration |     1 |
| plugin-collection         |     1 |
| template                  |     1 |

The key correction to a simple "everything is a plugin" mental model is that the bundle patch is only the composition edge. Real implementations repeatedly split into host services, client extensions, shared protocol/types, persistent stores, background processes, and release artifacts. The patch makes those pieces loadable; it does not erase their boundaries.

### Runtime boundaries

`H` = observable host imports, `C` = observable client/UI imports, `P` = subprocess/RPC/worker boundary.

| Boundary | Count |
| -------- | ----: |
| -        |   126 |
| H        |    75 |
| H+C+P    |    66 |
| H+P      |    58 |
| H+C      |    47 |
| P        |    37 |
| C+P      |    25 |
| C        |    23 |

322 targets expose source-visible injected service names; 165 contain a visible tool-registration call/name; 289 contain a disposer/unload/abort cleanup signal.

- [src/index.ts](https://github.com/Zhenyu98/dsh-context-doctor/blob/4a91502c106f7fed86981421c740566abf309977/src/index.ts) @ `4a91502c106f7fed86981421c740566abf309977`: A clean host/client split: host audits injected `fs`, `skills`, `tools`, and sessions; the client registers locale, store, and UI slots.
- [src/client/index.tsx](https://github.com/omdsh-dev/dsh-genui/blob/0e756efb7671e6b8413dde3d8e199c68fa89cbeb/src/client/index.tsx) @ `0e756efb7671e6b8413dde3d8e199c68fa89cbeb`: The client is not a cosmetic afterthought: an action/event loop joins rendered components back to host behavior, with Loader/profile tests around the integration.
- [src/main.rs](https://github.com/openma-ai/deepseek-harness-tui/blob/636ae5b61cb11a95be9eba90b5747e8974731468/src/main.rs) @ `636ae5b61cb11a95be9eba90b5747e8974731468`: A standalone Rust terminal client can still ship a DSH bundle adapter; protocol/process and DSH composition remain distinct layers.
- [packages/dsh/src/index.ts](https://github.com/Jesse-njx/dsh-cowork/blob/2ae5cf755c4294a1e988eebf3b12dd062425d84c/packages/dsh/src/index.ts) @ `2ae5cf755c4294a1e988eebf3b12dd062425d84c`: One repository can contain core, CLI, MCP, DSH, and chat-node packages; the listed root is a collection, not one indivisible plugin.

8 root-level list entries have no root bundle declaration but do contain one or more nested installable DSH packages. This includes adapter monorepos such as `freehul/sgme`, `taxueseek/argo`, and `btspoony/mstar-harness`. For dsh-codex, the publishable package path and npm `repository.directory` must therefore be authoritative; a GitHub repository URL alone is not an install contract.

### Tools, services, events, and lifecycle

Across the list, tool implementations are commonly thin registrations over injected services. Long-lived concerns (session queries, filesystems, approvals, web servers, persistence) are obtained from the Cordis context rather than recreated inside each tool. UI-heavy plugins often communicate through events or a shared store. Cleanup is normally registered at the same ownership boundary that created routes, timers, watchers, or subprocesses.

- [index.mjs](https://github.com/PerryLink/dsh-memento/blob/24aa872fa8a52ccdf49f95780ce3de7a82c09c98/index.mjs) @ `24aa872fa8a52ccdf49f95780ce3de7a82c09c98`: Memory writes are approval-gated and persisted behind a typed service seam; this is directly relevant to keeping Codex policy and persistence separable.
- [src/index.ts](https://github.com/dfycaly98931680/dsh-trajectory-governance/blob/07fb79f0a972a263c1b57de99637722183b5fe80/src/index.ts) @ `07fb79f0a972a263c1b57de99637722183b5fe80`: A stateful governance plugin combines SQLite, events, host/client surfaces, and tests instead of embedding all behavior in one tool callback.
- [src/index.ts](https://github.com/Jesse-njx/dsh-crosstalk/blob/7b513104085dd48f9e3c4b94de5d60ceb20d6e94/src/index.ts) @ `7b513104085dd48f9e3c4b94de5d60ceb20d6e94`: Cross-session coordination uses a file-backed registry/inbox with heartbeat and locking signals, illustrating explicit ownership of durable state.
- [src/index.ts](https://github.com/kunjinkao-os/dsh-mobile-gui-agent/blob/7c2b5609aa66b4ab401c834008a791507d4872bf/src/index.ts) @ `7c2b5609aa66b4ab401c834008a791507d4872bf`: A high-event-count host/client implementation shows that event contracts become a first-class API surface and need their own compatibility tests.

### State and persistence

359 targets contain at least one storage/transport signal; 63 contain atomic-write/rename signals and 11 contain mutex, semaphore, lockfile, or optimistic-lock signals. Frequent observable media are filesystem JSON/JSONL, SQLite/FTS5, browser localStorage, and remote HTTP stores.

For dsh-codex this argues for explicit persistence components and typed state transitions. A session, approval cache, policy store, or task ledger should not be hidden in a UI plugin, and process shutdown must make outstanding writes owner-visible.

- [dsh-mneme/src/index.js](https://github.com/modusensus/dsh-mneme/blob/67376b3075fac55c230272c7da65ed54324c74a0/dsh-mneme/src/index.js) @ `67376b3075fac55c230272c7da65ed54324c74a0`: SQLite plus a human-editable Markdown mirror demonstrates dual durable representations and offline search inside a scoped package.
- [index.mjs](https://github.com/Nwflower/dsh-file-claim/blob/65aebf02cd881af9d170af692f17189bf785cb8a/index.mjs) @ `65aebf02cd881af9d170af692f17189bf785cb8a`: Heartbeat stale takeover and a merge area make concurrency semantics explicit rather than relying on last-write-wins.
- [src/index.ts](https://github.com/Anionex/dsh-turn-rewind/blob/27ebefa76a2d39b0ecb8f6f92b33946b4a575500/src/index.ts) @ `27ebefa76a2d39b0ecb8f6f92b33946b4a575500`: Workspace rewind is built around a persistent change ledger, a useful model for Codex undo/checkpoint components.

### Process, sandbox, and native/provider boundaries

- [typescript/packages/dsh/src/index.ts](https://github.com/strukto-ai/mirage/blob/c32855fd91d8efe88b73b5a612d549da71863a12/typescript/packages/dsh/src/index.ts) @ `c32855fd91d8efe88b73b5a612d549da71863a12`: Filesystem and bash providers are swapped behind a virtual-workspace adapter; execution backends remain selectable process/sandbox providers.
- [src/index.ts](https://github.com/omdsh-dev/sandbox-micro/blob/ebc8be539a4ed4e66157d1f8255c58a4db4e4dc4/src/index.ts) @ `ebc8be539a4ed4e66157d1f8255c58a4db4e4dc4`: A sandbox implementation is packaged as a provider component with focused tests and packed-artifact checks, not as scattered command conditionals.
- [src/index.ts](https://github.com/Anionex/dsh-computer-use/blob/76bfe8607f61945c1cbb84e73976e601100c13a2/src/index.ts) @ `76bfe8607f61945c1cbb84e73976e601100c13a2`: Browser/computer control crosses host, client, process, approval, and archive-install boundaries and therefore tests more than the nominal tool response.
- [src/index.ts](https://github.com/suntianc/dsh-codex-auth/blob/9cbb02c5a3e21ccdae420e19be0d679f39f0b768/src/index.ts) @ `9cbb02c5a3e21ccdae420e19be0d679f39f0b768`: Codex authentication is adapted at an account/provider seam while the native product remains external; this is a bridge pattern, not a Codex loop decomposition.
- [src/index.ts](https://github.com/franksong2702/dsh-codex-connect/blob/2c99d177db51bfa18683b4e3c13d125ec0200367/src/index.ts) @ `2c99d177db51bfa18683b4e3c13d125ec0200367`: Codex connectivity similarly demonstrates a bounded adapter with Loader tests, rather than evidence that Codex internals became DSH components.

### Approval and policy plugins

- [src/index.ts](https://github.com/ilharp/dsh-tool-approval/blob/c01801a7e39c36515d8445747abff6a6388c1278/src/index.ts) @ `c01801a7e39c36515d8445747abff6a6388c1278`: Manual approval is implemented as its own runtime component and can therefore be compared independently with Codex decision semantics.
- [package.json](https://github.com/arrow949/dsh-turn-approval/blob/5b4cbfd425885ed3f3ed93c796d5113847cc93b8/package.json) @ `5b4cbfd425885ed3f3ed93c796d5113847cc93b8`: Turn-scoped authorization adds an explicit lifetime to cached permission, a useful contrast with session/permanent approval scope.
- [src/index.ts](https://github.com/lonelymoon87/dsh-guardian/blob/a6f076c85b0fbe31dd8f7eef77d9bd2a84f7d40f/src/index.ts) @ `a6f076c85b0fbe31dd8f7eef77d9bd2a84f7d40f`: Policy checks and output redaction are kept as a security component with CI, rather than mixed into every tool implementation.

These plugins are useful design references, not Codex-parity oracles. dsh-codex approval must continue to derive wire types, decisions, lifetime, cancellation, and persistence from the pinned Codex source and conformance corpus.

## Verification and release patterns

- 299 targets expose a test script or inspected test file.
- 76 contain Loader/profile integration-test signals.
- 21 contain npm-pack/tarball/real-plugin-install test signals.
- 131 contain a CI workflow signal; 44 contain npm publish automation; 38 contain OIDC/provenance signals; 23 contain a platform/target matrix.

- [src/index.ts](https://github.com/dsh-market/dsh-market/blob/f76727d20df0d05b836ebc9d29d13d2b415d303d/src/index.ts) @ `f76727d20df0d05b836ebc9d29d13d2b415d303d`: Combines archive installation checks, tag/version release discipline, npm publishing, provenance, and a platform matrix.
- [src/index.ts](https://github.com/omdsh-dev/dsh-plugin-check/blob/397aa26df241aca530aa65a08484a664f7d555ad/src/index.ts) @ `397aa26df241aca530aa65a08484a664f7d555ad`: Treats package structure as executable contract checks; useful checks must still be filtered against official DSH behavior rather than copied wholesale.
- [src/index.ts](https://github.com/labmimors/dsh-mcp-lens/blob/fb5351dff01f780d033e7e0f80458fc15f33486f/src/index.ts) @ `fb5351dff01f780d033e7e0f80458fc15f33486f`: Pairs Loader/archive signals with multi-workflow release automation, showing that plugin discovery and runtime management can be tested from packed output.
- [src/main.rs](https://github.com/openma-ai/deepseek-harness-tui/blob/636ae5b61cb11a95be9eba90b5747e8974731468/src/main.rs) @ `636ae5b61cb11a95be9eba90b5747e8974731468`: Cross-platform native builds and npm provenance are both required when an installable DSH adapter carries a native client.

### Observable gaps and counterexamples

These are pinned-tree observations, not security or quality verdicts:

| Observation                             | Count |
| --------------------------------------- | ----: |
| no-observable-ci                        |   325 |
| no-observable-tests                     |   158 |
| private-bundle-not-registry-publishable |    70 |
| source-install-executes-prepare         |    67 |
| declared-bundle-file-missing            |     1 |
| listed-without-observable-dsh-bundle    |     1 |

- [src/index.ts](https://github.com/ICCuse/dsh-pain-point-check/blob/1dfa372a1d9ed5b58f9f1683c150fbcf101bb268/src/index.ts) @ `1dfa372a1d9ed5b58f9f1683c150fbcf101bb268`: The manifest declares `./cordis.patch.yml`, but that file is absent at the pinned HEAD. This is the one list entry whose declared bundle could not be resolved.
- A `prepare` hook makes a Git/source install execute build code; it is not automatically wrong, but it is a materially different trust and reproducibility boundary from a prebuilt npm archive.
- A private bundle package can be source-installable but cannot be treated as a registry-distributed component without a separate publishable package.
- README listing, topic membership, stars, or an awesome badge never substitutes for Loader activation and packed-artifact tests.

## Codex-component mapping learned from implementations

| dsh-codex surface         | Implementation references                                                                                                                                                                                                                                                                                                                 | Reusable DSH lesson                                                                                        | Boundary that still needs Codex parity evidence                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Approval                  | [src/index.ts](https://github.com/ilharp/dsh-tool-approval/blob/c01801a7e39c36515d8445747abff6a6388c1278/src/index.ts) @ `c01801a7e39c`; [package.json](https://github.com/arrow949/dsh-turn-approval/blob/5b4cbfd425885ed3f3ed93c796d5113847cc93b8/package.json) @ `5b4cbfd42588`                                                        | Approval can be a separately installable service; cached grants need an explicit lifetime.                 | Decision enum, raw wire integers, cancellation, rejection text, persistence, and pending-request lifecycle come from Codex, not these plugins. |
| Sandbox and execution     | [typescript/packages/dsh/src/index.ts](https://github.com/strukto-ai/mirage/blob/c32855fd91d8efe88b73b5a612d549da71863a12/typescript/packages/dsh/src/index.ts) @ `c32855fd91d8`; [src/index.ts](https://github.com/omdsh-dev/sandbox-micro/blob/ebc8be539a4ed4e66157d1f8255c58a4db4e4dc4/src/index.ts) @ `ebc8be539a4e`                  | Filesystem/bash/sandbox backends can be provider packages behind a stable DSH seam.                        | Codex sandbox profiles, exec policy, escalation, platform syscalls, and failure mapping remain pinned-oracle work.                             |
| Tool system               | [packages/dsh-tool-calculator/src/index.ts](https://github.com/omdsh-dev/dsh-toolkit/blob/5d4628929aa2695cab7b4534670c0ca3c9cd7652/packages/dsh-tool-calculator/src/index.ts) @ `5d4628929aa2`; [src/index.ts](https://github.com/vibeinging/dsh-tool-search/blob/265ce76eda21b211dc4a4c8f30d73a6826f035ca/src/index.ts) @ `265ce76eda21` | Tool registration should be thin over injected services; discovery/search can remain a separate component. | Codex schemas, parallelism, truncation, approval coupling, and tool-result protocol must be differential-tested.                               |
| Context and compaction    | [src/index.ts](https://github.com/Zhenyu98/dsh-context-doctor/blob/4a91502c106f7fed86981421c740566abf309977/src/index.ts) @ `4a91502c106f`; [src/index.ts](https://github.com/EvilIrving/dsh-context-proxy/blob/1e1965f51ace195272697ff55b9dc8d43798e6a6/src/index.ts) @ `1e1965f51ace`                                                   | Host accounting and client visualization can share typed data without merging runtimes.                    | Token accounting, instruction discovery, compaction triggers/content, and resume behavior require Codex fixtures.                              |
| Sessions and rollback     | [src/index.ts](https://github.com/Anionex/dsh-turn-rewind/blob/27ebefa76a2d39b0ecb8f6f92b33946b4a575500/src/index.ts) @ `27ebefa76a2d`; [index.mjs](https://github.com/Nwflower/dsh-file-claim/blob/65aebf02cd881af9d170af692f17189bf785cb8a/index.mjs) @ `65aebf02cd88`                                                                  | Durable ledgers, heartbeat ownership, and merge/rewind state deserve independent services.                 | Codex event log shape, fork/resume semantics, rollout recovery, and workspace checkpoint behavior remain upstream-defined.                     |
| Agent loop and automation | [src/index.mjs](https://github.com/vlln/dsh-loop/blob/e7159369169526e92f75727b35d83029568b3a21/src/index.mjs) @ `e71593691695`; [src/index.ts](https://github.com/Jesse-njx/dsh-routines/blob/f59b4f03e7b36648b804fd07e57a53e276da5d81/src/index.ts) @ `f59b4f03e7b3`                                                                     | The loop/scheduler can be a plugin and coordinate through events/services.                                 | Codex turn state machine, tool scheduling, retry, cancellation, and compaction ordering need exact loop conformance.                           |
| Model/account adapters    | [src/index.ts](https://github.com/franksong2702/dsh-codex-connect/blob/2c99d177db51bfa18683b4e3c13d125ec0200367/src/index.ts) @ `2c99d177db51`; [src/index.ts](https://github.com/suntianc/dsh-codex-auth/blob/9cbb02c5a3e21ccdae420e19be0d679f39f0b768/src/index.ts) @ `9cbb02c5a3e2`                                                    | Auth, RPC, settings UI, and model/provider registration are separable adapter seams.                       | These are bridges to native Codex; they do not reproduce the Codex agent loop or its context/session state.                                    |
| TUI/UI                    | [src/main.rs](https://github.com/openma-ai/deepseek-harness-tui/blob/636ae5b61cb11a95be9eba90b5747e8974731468/src/main.rs) @ `636ae5b61cb1`; [src/index.ts](https://github.com/omdsh-dev/DSH-better-sidebar/blob/5bd961f7f1f65b2a0ddace6d2b4e7d94a2a2fc3d/src/index.ts) @ `5bd961f7f1f6`                                                  | A standalone/native client can speak a stable protocol while an installable DSH adapter owns activation.   | Codex TUI event rendering, input modes, approval UX, interrupt behavior, and resume/fork views need their own parity corpus.                   |
| Packaging/release         | [src/index.ts](https://github.com/dsh-market/dsh-market/blob/f76727d20df0d05b836ebc9d29d13d2b415d303d/src/index.ts) @ `f76727d20df0`; [src/index.ts](https://github.com/omdsh-dev/dsh-plugin-check/blob/397aa26df241aca530aa65a08484a664f7d555ad/src/index.ts) @ `397aa26df241`                                                           | Validate the packed archive, publish with provenance, and add a platform matrix for native payloads.       | A green source-tree test does not establish installed-artifact or cross-platform parity.                                                       |

## Direct design consequences for dsh-codex

1. **Keep one installable DSH component per bounded Codex contract.** Each publishable package owns its bundle row, README, types, build, tests, and release artifact. A root composition bundle may assemble them later, but must not hide component identity.
2. **Separate protocol engines from DSH adapters.** The approved Rust approval-protocol sidecar belongs inside the approval component's distribution, while the Cordis service owns DSH lifecycle and routing. This matches the ecosystem's successful process/provider adapters without weakening the Codex wire oracle.
3. **Make host/client/shared boundaries visible in the directory tree.** Use `src/host`, `src/client`, and `src/shared` (or equivalent explicit packages); do not make UI imports accidental dependencies of headless behavior.
4. **Model services, events, and tools separately.** Tools should be shallow endpoints over typed services. Event names and payloads are contracts. Persistence and approval are services with lifecycle, not helper functions copied into callers.
5. **Make cleanup awaitable.** Routes, watchers, subprocesses, pending approvals, locks, and writes must settle under the owning Cordis disposer. The ecosystem has many disposer signals, but dsh-codex should additionally prove quiescence with adversarial tests.
6. **Use a layered test ladder for every parity claim.** Pure contract tests -> pinned upstream differential oracle -> real Cordis Loader/profile -> packed archive install/activate/remove -> cross-platform native artifact. No single layer is enough.
7. **Publish prebuilt artifacts with provenance.** For TypeScript-only components, restrict `files` and run `prepack`; for Rust/native components, publish platform artifacts from a matrix and verify checksum/tag/version linkage. Avoid making ordinary users compile arbitrary Git HEADs.
8. **Treat community plugins as implementation references, not behavioral specifications.** Codex parity continues to be decided by pinned Codex code and conformance results. Ecosystem code informs packaging, Cordis integration, lifecycle, UI seams, and practical failure modes.

## Complete target index (each target exactly once)

The full machine-readable details are in `plugins.jsonl`. Here `tests` is inspected test files or a test script; `CI` is a source-visible CI signal; `bundle` requires both the manifest declaration and the referenced patch file.

### Tools & Capabilities (113)

| Target                                                                                                                                        | HEAD           | Kind               | Boundary | Bundle | Tests |  CI |
| --------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------ | -------- | -----: | ----: | --: |
| [x2802490130-prog/dsh-tool-writing](https://github.com/x2802490130-prog/dsh-tool-writing)                                                     | `76f0891efeb1` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [x2802490130-prog/dsh-writing-remote](https://github.com/x2802490130-prog/dsh-writing-remote)                                                 | `b49f82e59785` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [xmutfyh/dsh-plugin-writing-guard](https://github.com/xmutfyh/dsh-plugin-writing-guard)                                                       | `5cfe30d1a066` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [ConsoleSun/Gemini-Eyes](https://github.com/ConsoleSun/Gemini-Eyes)                                                                           | `1084aadf16d6` | dsh-runtime-plugin | P        |    yes |   yes |  no |
| [Edge-Echo/dsh-mcp-bridge](https://github.com/Edge-Echo/dsh-mcp-bridge)                                                                       | `e62699854a4c` | dsh-runtime-plugin | P        |    yes |    no | yes |
| [Smalldy/godot-bridge](https://github.com/Smalldy/godot-bridge)                                                                               | `793fa73115ef` | dsh-runtime-plugin | H+P      |    yes |    no |  no |
| [LeemanCheung/dsh-agent-preset-recommender](https://github.com/LeemanCheung/dsh-agent-preset-recommender)                                     | `f7511b276941` | dsh-runtime-plugin | P        |    yes |   yes | yes |
| [CheshireJCat/blender](https://github.com/CheshireJCat/blender)                                                                               | `3d641dae1c84` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [ysr666/dsh-vision-router](https://github.com/ysr666/dsh-vision-router)                                                                       | `a1dcdeabaaac` | dsh-runtime-plugin | P        |    yes |   yes | yes |
| [Flyvhidbwo/dsh-vision-proxy](https://github.com/Flyvhidbwo/dsh-vision-proxy)                                                                 | `679b0efc4719` | dsh-runtime-plugin | -        |    yes |   yes | yes |
| [ximengxiaolan/dsh-vision-bridge](https://github.com/ximengxiaolan/dsh-vision-bridge)                                                         | `55bbd9bfc588` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [linenxi-ctrl/dsh-vision](https://github.com/linenxi-ctrl/dsh-vision)                                                                         | `957b53694638` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [Einskyle/dsh-llm-vision-bridge](https://github.com/Einskyle/dsh-llm-vision-bridge)                                                           | `5a8e31788f4b` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [lire1131/dsh-undo-plugin](https://github.com/lire1131/dsh-undo-plugin)                                                                       | `020d45ba4a4b` | dsh-runtime-plugin | -        |    yes |   yes | yes |
| [MAXeaglet/dsh-bash-terminal](https://github.com/MAXeaglet/dsh-bash-terminal)                                                                 | `640deef6198b` | dsh-runtime-plugin | C        |    yes |   yes | yes |
| [Fro2en12/dsh-download-progress](https://github.com/Fro2en12/dsh-download-progress)                                                           | `46af2b195108` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [CZX2244/dsh-bilibili](https://github.com/CZX2244/dsh-bilibili)                                                                               | `b4a02753469d` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [Anionex/dsh-vision-toolkit](https://github.com/Anionex/dsh-vision-toolkit)                                                                   | `29850a83871d` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [SPYQWER1/dsh-codex-tools](https://github.com/SPYQWER1/dsh-codex-tools)                                                                       | `6da8a204359e` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [yun520-1/deepseek-heartflow](https://github.com/yun520-1/deepseek-heartflow)                                                                 | `d9ecc37b7019` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [omdsh-dev/dsh-custom-tool](https://github.com/omdsh-dev/dsh-custom-tool)                                                                     | `b0392bb332cc` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [ZRui-C/dsh-computer-use](https://github.com/ZRui-C/dsh-computer-use)                                                                         | `0b0a0844018b` | dsh-runtime-plugin | H+P      |    yes |   yes | yes |
| [Anionex/dsh-computer-use](https://github.com/Anionex/dsh-computer-use)                                                                       | `76bfe8607f61` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [kunjinkao-os/dsh-mobile-gui-agent](https://github.com/kunjinkao-os/dsh-mobile-gui-agent)                                                     | `7c2b5609aa66` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [omdsh-dev/dsh-data-agent](https://github.com/omdsh-dev/dsh-data-agent)                                                                       | `56871019e984` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [omdsh-dev/dsh-toolkit](https://github.com/omdsh-dev/dsh-toolkit)                                                                             | `5d4628929aa2` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [flymysql/dsh-remote](https://github.com/flymysql/dsh-remote)                                                                                 | `393782c39619` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [omdsh-dev/dsh-tool-csv](https://github.com/omdsh-dev/dsh-tool-csv)                                                                           | `93657cbf6a48` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [omdsh-dev/dsh-tool-calculator](https://github.com/omdsh-dev/dsh-tool-calculator)                                                             | `701f6549b4e1` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [omdsh-dev/dsh-tool-diff](https://github.com/omdsh-dev/dsh-tool-diff)                                                                         | `73c142e26227` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [omdsh-dev/dsh-tool-encoding](https://github.com/omdsh-dev/dsh-tool-encoding)                                                                 | `5baa75fcbe98` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [omdsh-dev/dsh-tool-json](https://github.com/omdsh-dev/dsh-tool-json)                                                                         | `902bdf60da4d` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [omdsh-dev/dsh-tool-markdown](https://github.com/omdsh-dev/dsh-tool-markdown)                                                                 | `51b9f2a9efa7` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [omdsh-dev/dsh-tool-regex](https://github.com/omdsh-dev/dsh-tool-regex)                                                                       | `457c84fed784` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [omdsh-dev/dsh-tool-schema](https://github.com/omdsh-dev/dsh-tool-schema)                                                                     | `8d9a65214493` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [omdsh-dev/dsh-tool-stat](https://github.com/omdsh-dev/dsh-tool-stat)                                                                         | `86d42cafd710` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [omdsh-dev/dsh-tool-time](https://github.com/omdsh-dev/dsh-tool-time)                                                                         | `bc55c350f016` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [omdsh-dev/dsh-kb-sieve](https://github.com/omdsh-dev/dsh-kb-sieve)                                                                           | `01aba653f576` | dsh-runtime-plugin | H+P      |    yes |    no |  no |
| [HuanLinOTO/dsh-plugin-mineru](https://github.com/HuanLinOTO/dsh-plugin-mineru)                                                               | `79809aa57bd1` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [Jesse-njx/dsh-cowork](https://github.com/Jesse-njx/dsh-cowork)                                                                               | `2ae5cf755c42` | plugin-collection  | H+P      |    yes |   yes | yes |
| [Jesse-njx/dsh-skillport](https://github.com/Jesse-njx/dsh-skillport)                                                                         | `77c1d4ecc202` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [sakikoTGW/pack-agent](https://github.com/sakikoTGW/pack-agent)                                                                               | `04f7ecac3e76` | dsh-runtime-plugin | P        |    yes |   yes |  no |
| [vibeinging/dsh-tool-search](https://github.com/vibeinging/dsh-tool-search)                                                                   | `265ce76eda21` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [THU-MAIC/dsh-openmaic](https://github.com/THU-MAIC/dsh-openmaic)                                                                             | `09c1693cfe83` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [lzszq/dsh-scholar](https://github.com/lzszq/dsh-scholar)                                                                                     | `9b2b1ae4a120` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [ylwl1997/noatmark-dsh-plugin](https://github.com/ylwl1997/noatmark-dsh-plugin)                                                               | `a1936495fa6c` | dsh-runtime-plugin | H        |    yes |    no |  no |
| [jihongboo/dsh-apple-mode](https://github.com/jihongboo/dsh-apple-mode)                                                                       | `2000ae233bfc` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [ZK-Andy/dsh-continual-evolve](https://github.com/ZK-Andy/dsh-continual-evolve)                                                               | `9ff642c9b498` | dsh-runtime-plugin | H+P      |    yes |   yes | yes |
| [zp-home/dsh-recommend](https://github.com/zp-home/dsh-recommend)                                                                             | `c720299617d6` | dsh-runtime-plugin | H+C+P    |    yes |    no | yes |
| [liustack/modlens](https://github.com/liustack/modlens)                                                                                       | `28181920f6b0` | dsh-runtime-plugin | P        |    yes |   yes | yes |
| [dsh-market/dsh-market](https://github.com/dsh-market/dsh-market)                                                                             | `f76727d20df0` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [crTnT/dsh-plugin-suite#dsh-plugin-center](https://github.com/crTnT/dsh-plugin-suite) `dsh-plugin-center`                                     | `5582b6035563` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [crTnT/dsh-plugin-suite#dsh-plugin-updater](https://github.com/crTnT/dsh-plugin-suite) `dsh-plugin-updater`                                   | `5582b6035563` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [awesome-dsh-plugin/dsh-find-plugin](https://github.com/awesome-dsh-plugin/dsh-find-plugin)                                                   | `e75dc2e865c3` | dsh-runtime-plugin | H        |    yes |    no | yes |
| [lonelymoon87/dsh-code-intel](https://github.com/lonelymoon87/dsh-code-intel)                                                                 | `3e95b9cb4113` | dsh-runtime-plugin | H        |    yes |   yes | yes |
| [lynx-gt/dsh-subagent-tools](https://github.com/lynx-gt/dsh-subagent-tools)                                                                   | `0c3e355a95b5` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [lynx-gt/dsh-subagent-cwd](https://github.com/lynx-gt/dsh-subagent-cwd)                                                                       | `f6df81141006` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [Jesse-njx/dsh-voice](https://github.com/Jesse-njx/dsh-voice)                                                                                 | `37164b11690a` | dsh-runtime-plugin | H+C      |    yes |   yes | yes |
| [Jesse-njx/dsh-docker](https://github.com/Jesse-njx/dsh-docker)                                                                               | `8fe414f419f8` | dsh-runtime-plugin | H+C      |    yes |   yes | yes |
| [hccccc01333/dsh-excel-chat](https://github.com/hccccc01333/dsh-excel-chat)                                                                   | `dea7b08b6b23` | dsh-runtime-plugin | H+P      |    yes |   yes | yes |
| [zhang787jun/dsh-finance](https://github.com/zhang787jun/dsh-finance)                                                                         | `bf350c23ff7d` | dsh-runtime-plugin | H        |    yes |   yes | yes |
| [Realyujie/dsh-us-stocks](https://github.com/Realyujie/dsh-us-stocks)                                                                         | `289b8e534d76` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [1624318455/dsh-plugin-tavily](https://github.com/1624318455/dsh-plugin-tavily)                                                               | `bcfe6ecbb763` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [EvilIrving/dsh-context-proxy](https://github.com/EvilIrving/dsh-context-proxy)                                                               | `1e1965f51ace` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [zhaoolee/notes](https://github.com/zhaoolee/notes)                                                                                           | `90ca5f7a8a73` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [zimai233/dsh-figma-to-lottie](https://github.com/zimai233/dsh-figma-to-lottie)                                                               | `8e21469374eb` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [zimai233/dsh-exam-countdown](https://github.com/zimai233/dsh-exam-countdown)                                                                 | `54492515553f` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [zimai233/dsh-wash-calendar](https://github.com/zimai233/dsh-wash-calendar)                                                                   | `3622edd766f0` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [zimai233/dsh-adhd-copilot](https://github.com/zimai233/dsh-adhd-copilot)                                                                     | `6527cb64b11b` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [zimai233/dsh-image-search](https://github.com/zimai233/dsh-image-search)                                                                     | `95ac2b739f74` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [zimai233/dsh-video-downloader](https://github.com/zimai233/dsh-video-downloader)                                                             | `48107ee57bc1` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [Luke-Yong/dsh-plugin-knowledge-graph](https://github.com/Luke-Yong/dsh-plugin-knowledge-graph)                                               | `c5e80055a358` | dsh-runtime-plugin | H        |    yes |    no | yes |
| [liustack/modsearch](https://github.com/liustack/modsearch)                                                                                   | `e1dba224b726` | dsh-runtime-plugin | P        |    yes |   yes | yes |
| [taxueseek/argo](https://github.com/taxueseek/argo)                                                                                           | `49f8a80302b1` | dsh-runtime-plugin | P        |    yes |   yes |  no |
| [TonyDua/dsh-web-search-exa](https://github.com/TonyDua/dsh-web-search-exa)                                                                   | `083706bae60a` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [Lum1104/dsh-browser](https://github.com/Lum1104/dsh-browser)                                                                                 | `2cc70cf7f448` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [Sanqi-normal/dsh-webui-market-plugin](https://github.com/Sanqi-normal/dsh-webui-market-plugin)                                               | `46eacea0604e` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [huey1in/trio](https://github.com/huey1in/trio)                                                                                               | `4f2942f8622e` | dsh-runtime-plugin | P        |    yes |   yes | yes |
| [zoahdev/dsh-github-release-radar](https://github.com/zoahdev/dsh-github-release-radar)                                                       | `2d3d78628af3` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [zoahdev/dsh-github-intelligence](https://github.com/zoahdev/dsh-github-intelligence)                                                         | `be228ebc7070` | dsh-runtime-plugin | H        |    yes |   yes | yes |
| [SamXiaBing/dsh-adb](https://github.com/SamXiaBing/dsh-adb)                                                                                   | `d0e38c887664` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [xiaoyuyu6420/dsh-backup](https://github.com/xiaoyuyu6420/dsh-backup)                                                                         | `6381efedc148` | dsh-runtime-plugin | P        |    yes |    no |  no |
| [Letter2025/dsh-tool-search](https://github.com/Letter2025/dsh-tool-search)                                                                   | `009ffb13f4c9` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [1na-ko/dsh-hdc-bridge](https://github.com/1na-ko/dsh-hdc-bridge)                                                                             | `5d4db7fca516` | dsh-runtime-plugin | -        |    yes |    no | yes |
| [PicGo/dsh-plugin](https://github.com/PicGo/dsh-plugin)                                                                                       | `2f7dd0133932` | dsh-runtime-plugin | H        |    yes |   yes | yes |
| [mafeis/dsh-net-proxy](https://github.com/mafeis/dsh-net-proxy)                                                                               | `61dd838ce92b` | dsh-runtime-plugin | -        |    yes |   yes | yes |
| [bwndlct/dsh-session-audit](https://github.com/bwndlct/dsh-session-audit)                                                                     | `7f1d90e70fc6` | dsh-runtime-plugin | -        |    yes |   yes | yes |
| [fly233338/dsh-overleaf](https://github.com/fly233338/dsh-overleaf)                                                                           | `9f2e7be9a211` | dsh-runtime-plugin | P        |    yes |   yes |  no |
| [LeslieWylie/dsh-fleet-audit](https://github.com/LeslieWylie/dsh-fleet-audit)                                                                 | `0fb4af940c33` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [whyihaveyou/dsh-suite#plugin-manager](https://github.com/whyihaveyou/dsh-suite) `packages/plugins/plugin-manager`                            | `a1896bb3f7fe` | dsh-runtime-plugin | -        |    yes |    no | yes |
| [loguhan/dsh-workshop](https://github.com/loguhan/dsh-workshop)                                                                               | `cf36f61f7081` | dsh-runtime-plugin | H+C+P    |    yes |    no |  no |
| [LeslieWylie/dsh-md-preview](https://github.com/LeslieWylie/dsh-md-preview)                                                                   | `ef117cc37239` | dsh-runtime-plugin | P        |    yes |   yes | yes |
| [jinguanghai/deepseek-harness-forge-plugins#forge-gates](https://github.com/jinguanghai/deepseek-harness-forge-plugins) `plugins/forge-gates` | `bd4e4c756421` | dsh-runtime-plugin | P        |    yes |    no |  no |
| [jinguanghai/deepseek-harness-forge-plugins#forge-tcm](https://github.com/jinguanghai/deepseek-harness-forge-plugins) `plugins/forge-tcm`     | `bd4e4c756421` | dsh-runtime-plugin | P        |    yes |    no |  no |
| [lsz-asd/dsh-plugin-device-info](https://github.com/lsz-asd/dsh-plugin-device-info)                                                           | `cca8aec573c9` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [jiayan-xu/dsh-codebase-memory](https://github.com/jiayan-xu/dsh-codebase-memory)                                                             | `5e844983808c` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [jiayan-xu/dsh-nuphus-mcp](https://github.com/jiayan-xu/dsh-nuphus-mcp)                                                                       | `3b6ac446a80d` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [superagents-lab/dsh-s1](https://github.com/superagents-lab/dsh-s1)                                                                           | `dd6be06e0838` | dsh-runtime-plugin | H        |    yes |    no | yes |
| [truelove-dreamer/dsh-plugin-git-workflow](https://github.com/truelove-dreamer/dsh-plugin-git-workflow)                                       | `4146393e9e5d` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [wly8691-jpg/knowlp-rag](https://github.com/wly8691-jpg/knowlp-rag)                                                                           | `84e1edfae200` | dsh-runtime-plugin | P        |    yes |   yes | yes |
| [ChenLaoshiYF/dsh-mcpguard](https://github.com/ChenLaoshiYF/dsh-mcpguard)                                                                     | `ce7dd0652158` | dsh-runtime-plugin | -        |    yes |   yes | yes |
| [6Mikao9/dsh-wsl-workspace](https://github.com/6Mikao9/dsh-wsl-workspace)                                                                     | `89905a82ebbf` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [dfycaly98931680/dsh-trajectory-governance](https://github.com/dfycaly98931680/dsh-trajectory-governance)                                     | `07fb79f0a972` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [Q1hangL/dsh-ask-guard](https://github.com/Q1hangL/dsh-ask-guard)                                                                             | `a45f230320ed` | dsh-runtime-plugin | P        |    yes |   yes |  no |
| [Huang-zhishi/dsh-plugin-call-trace](https://github.com/Huang-zhishi/dsh-plugin-call-trace)                                                   | `66e467535cc1` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [ShiXiangYu2/dsh-translate-pro](https://github.com/ShiXiangYu2/dsh-translate-pro)                                                             | `a43a2aac086c` | dsh-runtime-plugin | H        |    yes |    no |  no |
| [anweat/dsh-web-search-pro](https://github.com/anweat/dsh-web-search-pro)                                                                     | `f8f388c75d11` | dsh-runtime-plugin | H+P      |    yes |    no | yes |
| [anweat/dsh-browser](https://github.com/anweat/dsh-browser)                                                                                   | `570ac8b54bd1` | dsh-runtime-plugin | H+P      |    yes |    no | yes |
| [anweat/dsh-voice-webspeech](https://github.com/anweat/dsh-voice-webspeech)                                                                   | `eb6a51ff9428` | dsh-runtime-plugin | H+C      |    yes |    no | yes |
| [MicroHEROX/dsh-Kimi-WebBridge](https://github.com/MicroHEROX/dsh-Kimi-WebBridge)                                                             | `2a03591ef1ed` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [MicroHEROX/dsh-exa-mcp](https://github.com/MicroHEROX/dsh-exa-mcp)                                                                           | `69100aa45d34` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [MicroHEROX/dsh-koboldcpp-hands](https://github.com/MicroHEROX/dsh-koboldcpp-hands)                                                           | `30b98481bd33` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [MicroHEROX/dsh-unsloth-hands](https://github.com/MicroHEROX/dsh-unsloth-hands)                                                               | `20daa461bce0` | dsh-runtime-plugin | H        |    yes |   yes |  no |

### UI Enhancements (106)

| Target                                                                                                                        | HEAD           | Kind               | Boundary | Bundle | Tests |  CI |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------ | -------- | -----: | ----: | --: |
| [1624318455/dsh-plugin-tts](https://github.com/1624318455/dsh-plugin-tts)                                                     | `b9393fd4639c` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [x2802490130-prog/dsh-client-ui-writing](https://github.com/x2802490130-prog/dsh-client-ui-writing)                           | `66365dbddc4e` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [badai147/dsh-global-rules](https://github.com/badai147/dsh-global-rules)                                                     | `2ed39cc22c63` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [AcidGr/dsh-web-mobile-fix](https://github.com/AcidGr/dsh-web-mobile-fix)                                                     | `bf705b267807` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [mexiaosqwq/dsh-web-mobile](https://github.com/mexiaosqwq/dsh-web-mobile)                                                     | `0703a5ca8b5b` | dsh-runtime-plugin | C        |    yes |    no |  no |
| [AcidGr/dsh-web-lan-access](https://github.com/AcidGr/dsh-web-lan-access)                                                     | `0d032891921c` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [Bernardxu123/dsh-mobile-gate](https://github.com/Bernardxu123/dsh-mobile-gate)                                               | `06e0ea87101d` | dsh-runtime-plugin | P        |    yes |    no |  no |
| [Noob-stupid/dsh-plugin-hub](https://github.com/Noob-stupid/dsh-plugin-hub)                                                   | `4f4a5be6e44f` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [Make0209/dsh-usage-stats](https://github.com/Make0209/dsh-usage-stats)                                                       | `8992d306cdca` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [Ychris12138/dsh-usage-stats](https://github.com/Ychris12138/dsh-usage-stats)                                                 | `1f220b9d8e02` | dsh-runtime-plugin | C        |    yes |   yes | yes |
| [V-dev-388/dsh-usage-meter](https://github.com/V-dev-388/dsh-usage-meter)                                                     | `c552367069c4` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [zoumutou/dsh-cost-balance](https://github.com/zoumutou/dsh-cost-balance)                                                     | `3903cb1e1d12` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [bowenliang123/dsh-context](https://github.com/bowenliang123/dsh-context)                                                     | `3951da0f42d0` | dsh-runtime-plugin | H+C      |    yes |   yes | yes |
| [wjy9902/dsh-web-default-session](https://github.com/wjy9902/dsh-web-default-session)                                         | `c35dd04209a2` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [Fishsb/dsh-prompt-enhancer](https://github.com/Fishsb/dsh-prompt-enhancer)                                                   | `5e815be03821` | dsh-runtime-plugin | C+P      |    yes |   yes |  no |
| [huiliyi37/dsh-tianshu-tui](https://github.com/huiliyi37/dsh-tianshu-tui)                                                     | `7c7bf0accb2e` | dsh-runtime-plugin | H+P      |    yes |   yes | yes |
| [openma-ai/deepseek-harness-tui](https://github.com/openma-ai/deepseek-harness-tui)                                           | `636ae5b61cb1` | dsh-runtime-plugin | P        |    yes |   yes | yes |
| [WhitePlusMS/dsh-input-plus](https://github.com/WhitePlusMS/dsh-input-plus)                                                   | `cee1c7907e7f` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [omdsh-dev/dsh-at-file](https://github.com/omdsh-dev/dsh-at-file)                                                             | `9c71e52c483a` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [alingalingling/ui-status-label](https://github.com/alingalingling/ui-status-label)                                           | `c93917b044da` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [LeemanCheung/dsh-whale-animation](https://github.com/LeemanCheung/dsh-whale-animation)                                       | `da75465be6e7` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [01Virex/dsh-status-rotator](https://github.com/01Virex/dsh-status-rotator)                                                   | `09836ff04330` | dsh-runtime-plugin | -        |    yes |    no | yes |
| [ZSeven-W/dsh-openpencil](https://github.com/ZSeven-W/dsh-openpencil)                                                         | `49b0417a6d6f` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [Nagi-ovo/dsh-visualize](https://github.com/Nagi-ovo/dsh-visualize)                                                           | `e3254f762cbe` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [ccq1/dsh-side-panel](https://github.com/ccq1/dsh-side-panel)                                                                 | `baca7806714a` | dsh-runtime-plugin | C+P      |    yes |   yes |  no |
| [openAGFS/dsh-agfs](https://github.com/openAGFS/dsh-agfs)                                                                     | `9cfbac4bbe2e` | dsh-runtime-plugin | H+P      |    yes |   yes | yes |
| [dingyi222666/dsh-focus-chat](https://github.com/dingyi222666/dsh-focus-chat)                                                 | `b29b83d5c5df` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [omdsh-dev/dsh-genui](https://github.com/omdsh-dev/dsh-genui)                                                                 | `0e756efb7671` | dsh-runtime-plugin | H+C      |    yes |   yes | yes |
| [omdsh-dev/dsh-annotation](https://github.com/omdsh-dev/dsh-annotation)                                                       | `687f13dcf154` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [vlln/dsh-navbar](https://github.com/vlln/dsh-navbar)                                                                         | `6e23640bd60c` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [asukasec/dsh-message-preview](https://github.com/asukasec/dsh-message-preview)                                               | `dfdb543e3982` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [jjxjjjjiik-bot/dsh-chat-timeline](https://github.com/jjxjjjjiik-bot/dsh-chat-timeline)                                       | `45da13fc07e3` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [vlln/dsh-task-status](https://github.com/vlln/dsh-task-status)                                                               | `4453da02d622` | dsh-runtime-plugin | C        |    yes |    no |  no |
| [Nanki-nn/dsh-answer-pet](https://github.com/Nanki-nn/dsh-answer-pet)                                                         | `eb51f16f80b2` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [renat3u/dsh-web-archive](https://github.com/renat3u/dsh-web-archive)                                                         | `e106daf623fe` | dsh-runtime-plugin | P        |    yes |    no |  no |
| [0xsline/dsh-spotlight](https://github.com/0xsline/dsh-spotlight)                                                             | `dd7ef5ed160a` | dsh-runtime-plugin | P        |    yes |   yes |  no |
| [GooodWei/arcana](https://github.com/GooodWei/arcana)                                                                         | `82f910c0b5e6` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [GooodWei/context-vista](https://github.com/GooodWei/context-vista)                                                           | `9d854bd925e4` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [bill9109/dsh-101](https://github.com/bill9109/dsh-101)                                                                       | `ae6b4addadfd` | dsh-runtime-plugin | H+C+P    |    yes |    no |  no |
| [bill9109/dsh-drag-and-drop](https://github.com/bill9109/dsh-drag-and-drop)                                                   | `09088d689086` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [GLFzr/dsh-drop-file-to-path](https://github.com/GLFzr/dsh-drop-file-to-path)                                                 | `83086aee27c2` | dsh-runtime-plugin | -        |    yes |   yes | yes |
| [taxueseek/dsh-files](https://github.com/taxueseek/dsh-files)                                                                 | `43887e2dca25` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [l541402398/dsh-file-uploads](https://github.com/l541402398/dsh-file-uploads)                                                 | `3ea46e1583ea` | dsh-runtime-plugin | C        |    yes |   yes |  no |
| [qyw233/dsh-deeplink](https://github.com/qyw233/dsh-deeplink)                                                                 | `0ec5da351b24` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [lehhair/dsh-diff-viewer](https://github.com/lehhair/dsh-diff-viewer)                                                         | `75ded1bc49d0` | dsh-runtime-plugin | C+P      |    yes |   yes | yes |
| [omdsh-dev/ex-setting](https://github.com/omdsh-dev/ex-setting)                                                               | `b08744fce644` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [omdsh-dev/web-components](https://github.com/omdsh-dev/web-components)                                                       | `6d6f77aaf881` | dsh-runtime-plugin | C        |    yes |   yes |  no |
| [vibeinging/dsh-turn-navigator](https://github.com/vibeinging/dsh-turn-navigator)                                             | `bcae07a26842` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [SnowCrescenter-tech/dsh-milestone](https://github.com/SnowCrescenter-tech/dsh-milestone)                                     | `c238f8c5d4af` | dsh-runtime-plugin | C+P      |    yes |   yes |  no |
| [Ghost011118/dsh-balance-meter](https://github.com/Ghost011118/dsh-balance-meter)                                             | `db97c0ea4976` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [v587d/dsh-opencode-go-usage](https://github.com/v587d/dsh-opencode-go-usage)                                                 | `ed8c8a080363` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [GLFzr/dsh-opencode-go-quota](https://github.com/GLFzr/dsh-opencode-go-quota)                                                 | `0c08ead4bd6f` | dsh-runtime-plugin | -        |    yes |   yes | yes |
| [Han-1413141/dsh-cost-meter](https://github.com/Han-1413141/dsh-cost-meter)                                                   | `2908d2dca74c` | dsh-runtime-plugin | -        |    yes |   yes | yes |
| [fishxcode/dsh-plugin-deepseek-balance](https://github.com/fishxcode/dsh-plugin-deepseek-balance)                             | `0a1c211ad3e0` | dsh-runtime-plugin | H+C      |    yes |    no | yes |
| [Sev7een/ds-api-usage](https://github.com/Sev7een/ds-api-usage)                                                               | `b16fbf288ec7` | dsh-runtime-plugin | C+P      |    yes |    no |  no |
| [nonewind/dsh-spend](https://github.com/nonewind/dsh-spend)                                                                   | `df8235c3e29b` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [stevenx65/dsh-balance-plugin](https://github.com/stevenx65/dsh-balance-plugin)                                               | `9067ed33ac83` | dsh-runtime-plugin | C+P      |    yes |    no |  no |
| [LemCAE/dsh-balance](https://github.com/LemCAE/dsh-balance)                                                                   | `74a3c3ba9e65` | dsh-runtime-plugin | H+C+P    |    yes |    no | yes |
| [huanyuLv/dsh-balance-tide](https://github.com/huanyuLv/dsh-balance-tide)                                                     | `b82e77afd2bc` | dsh-runtime-plugin | C        |    yes |    no |  no |
| [ccch1mneyyy/dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI)                                                                 | `9a0559b820fb` | dsh-runtime-plugin | H+C+P    |    yes |    no | yes |
| [omdsh-dev/DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)                                               | `5bd961f7f1f6` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [tsonglew/dsh-workspace-search](https://github.com/tsonglew/dsh-workspace-search)                                             | `fc2ebaa9f998` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [tsonglew/dsh-media-preview](https://github.com/tsonglew/dsh-media-preview)                                                   | `ef9685c9b4f0` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [Han-1413141/dsh-sticky-disclosure](https://github.com/Han-1413141/dsh-sticky-disclosure)                                     | `8c378a17f075` | dsh-runtime-plugin | -        |    yes |   yes | yes |
| [Meredith2328/dsh-sticky-note](https://github.com/Meredith2328/dsh-sticky-note)                                               | `fa793c61f1b7` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [Luaphes/dsh-web-attention-badge](https://github.com/Luaphes/dsh-web-attention-badge)                                         | `8b2ede6ccda6` | dsh-runtime-plugin | -        |    yes |    no | yes |
| [zhu1090093659/dsh-web-ui#packages/dsh-web-ui-all](https://github.com/zhu1090093659/dsh-web-ui) `packages/dsh-web-ui-all`     | `a7a38401dcb0` | dsh-runtime-plugin | H        |    yes |   yes | yes |
| [zealot00/dsh-pet](https://github.com/zealot00/dsh-pet)                                                                       | `cb31dd4474f6` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [sereinmono/dsh-desktop-pet](https://github.com/sereinmono/dsh-desktop-pet)                                                   | `d35e0981b373` | dsh-runtime-plugin | H+C      |    yes |   yes | yes |
| [Starfie1d1272/dsh-builtin-toggles](https://github.com/Starfie1d1272/dsh-builtin-toggles)                                     | `cbec814dee81` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [jiangnanquan/dsh-ux](https://github.com/jiangnanquan/dsh-ux)                                                                 | `a080a6d104fb` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [a903067276-rgb/dsh-hud](https://github.com/a903067276-rgb/dsh-hud)                                                           | `a9aa0a123459` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [wsxwj123/dsh-plugins#turn-scrubber](https://github.com/wsxwj123/dsh-plugins) `packages/turn-scrubber`                        | `89890d31a0b0` | dsh-runtime-plugin | C+P      |    yes |    no |  no |
| [Sttrevens/dsh-cost-meter](https://github.com/Sttrevens/dsh-cost-meter)                                                       | `cd86d737de3c` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [a903067276-rgb/dsh-file-mentions](https://github.com/a903067276-rgb/dsh-file-mentions)                                       | `c65d59b39b94` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [bobcat848/dsh-calculator](https://github.com/bobcat848/dsh-calculator)                                                       | `1f4b17db702a` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [Jolly-J/dsh-deepseek-billing](https://github.com/Jolly-J/dsh-deepseek-billing)                                               | `20039ba5842f` | dsh-runtime-plugin | H+C      |    yes |    no |  no |
| [AKIRACOD/dsh-drag-and-drop](https://github.com/AKIRACOD/dsh-drag-and-drop)                                                   | `c20646ad6d4e` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [HsiangNianian/dsh-auto-continue](https://github.com/HsiangNianian/dsh-auto-continue)                                         | `be19b6b6bec6` | dsh-runtime-plugin | H+C      |    yes |   yes | yes |
| [liliuCourier/dsh-chat-outline](https://github.com/liliuCourier/dsh-chat-outline)                                             | `cedc81c9466f` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [LaoYueHanNi/dsh-token-usage](https://github.com/LaoYueHanNi/dsh-token-usage)                                                 | `c06684bb6641` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [QT-Chen/dsh-mic-input](https://github.com/QT-Chen/dsh-mic-input)                                                             | `23a0ba5cccc8` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [LeemanCheung/dsh-task-dag](https://github.com/LeemanCheung/dsh-task-dag)                                                     | `ec40d65634ba` | dsh-runtime-plugin | C+P      |    yes |    no | yes |
| [MorGogh/widget-dock](https://github.com/MorGogh/widget-dock)                                                                 | `13e50202a105` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [qjcnmd/dsh-reasoning-slider](https://github.com/qjcnmd/dsh-reasoning-slider)                                                 | `c1b29d373c8f` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [Semidia/dsh-sampling-sliders](https://github.com/Semidia/dsh-sampling-sliders)                                               | `659d38cad7d1` | dsh-runtime-plugin | H        |    yes |    no |  no |
| [causebefore/dsh-pomodoro](https://github.com/causebefore/dsh-pomodoro)                                                       | `77ea17ed5c58` | dsh-runtime-plugin | -        |    yes |    no | yes |
| [siberiah2o/dsh-plugin-terminal](https://github.com/siberiah2o/dsh-plugin-terminal)                                           | `aaada240ca96` | dsh-runtime-plugin | C+P      |    yes |   yes |  no |
| [urzeye/dsh-outline](https://github.com/urzeye/dsh-outline)                                                                   | `4678ff557cc1` | dsh-runtime-plugin | H+C      |    yes |   yes | yes |
| [283Gawin/dsh-heatmap](https://github.com/283Gawin/dsh-heatmap)                                                               | `4ba131df0980` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [Max-Samson/dsh-usage-chart](https://github.com/Max-Samson/dsh-usage-chart)                                                   | `f2d59d34d31a` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [RAFOLIE/dsh-desktop-windowos#plugin](https://github.com/RAFOLIE/dsh-desktop-windowos) `plugin`                               | `d559d37876c8` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [ZichengGurrr/dsh-window#plugin](https://github.com/ZichengGurrr/dsh-window) `plugin`                                         | `b7f9f24a1051` | dsh-runtime-plugin | H+P      |    yes |   yes | yes |
| [yyyyukari/dsh-plugin-workshop](https://github.com/yyyyukari/dsh-plugin-workshop)                                             | `5169bed1e9dc` | dsh-runtime-plugin | C+P      |    yes |   yes |  no |
| [zoumutou/dsh-web-preview](https://github.com/zoumutou/dsh-web-preview)                                                       | `f813fbed6557` | dsh-runtime-plugin | H+C+P    |    yes |    no |  no |
| [FengHuoLinShan/dsh-plugin-llm-balance](https://github.com/FengHuoLinShan/dsh-plugin-llm-balance)                             | `f08076d7ffc5` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [x2802490130-prog/dsh-balance-float](https://github.com/x2802490130-prog/dsh-balance-float)                                   | `fd0521b15f01` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [Semidia/dsh-session-manager](https://github.com/Semidia/dsh-session-manager)                                                 | `d4f6f857e79b` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [x2802490130-prog/dsh-lan-pass](https://github.com/x2802490130-prog/dsh-lan-pass)                                             | `bef815b1d0f2` | dsh-runtime-plugin | P        |    yes |   yes |  no |
| [magicOF2/dsh-turn-marks](https://github.com/magicOF2/dsh-turn-marks)                                                         | `16fb46efd374` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [magicOF2/dsh-chat-width-customizer](https://github.com/magicOF2/dsh-chat-width-customizer)                                   | `3c5a6258005e` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [luokai-demo/dsh-plugins#plugins/dsh-balance-plugin](https://github.com/luokai-demo/dsh-plugins) `plugins/dsh-balance-plugin` | `7d320cb1349e` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [Ceelog/dsh-plugins#dsh-plugin-setting-mcp](https://github.com/Ceelog/dsh-plugins) `src/plugins/dsh-plugin-setting-mcp`       | `982e240c6bc9` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [BeiZi6/dsh-opencodego-usage](https://github.com/BeiZi6/dsh-opencodego-usage)                                                 | `0990d71ccb09` | dsh-runtime-plugin | C+P      |    yes |    no |  no |
| [SpookySandwich/dsh-smooth-stream](https://github.com/SpookySandwich/dsh-smooth-stream)                                       | `2a9cc67d292d` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [ook826092-cloud/dsh-mobile-css](https://github.com/ook826092-cloud/dsh-mobile-css)                                           | `6f4f27aa99a9` | dsh-runtime-plugin | -        |    yes |    no |  no |

### Development & Runtime (63)

| Target                                                                                                                              | HEAD           | Kind                      | Boundary | Bundle | Tests |  CI |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------- | -------- | -----: | ----: | --: |
| [icefall7/dsh-plugin-scout](https://github.com/icefall7/dsh-plugin-scout)                                                           | `cccc690850c9` | dsh-runtime-plugin        | P        |    yes |    no |  no |
| [SaiSenBox/dsh-boot-guard](https://github.com/SaiSenBox/dsh-boot-guard)                                                             | `bcd01aaf6e40` | dsh-runtime-plugin        | -        |    yes |   yes | yes |
| [leechen298/Code2Skill](https://github.com/leechen298/Code2Skill)                                                                   | `e59a74f861a0` | dsh-runtime-plugin        | P        |    yes |   yes |  no |
| [bujue600-arch/dsh-testgen](https://github.com/bujue600-arch/dsh-testgen)                                                           | `1730f3927342` | dsh-runtime-plugin        | H+P      |    yes |   yes | yes |
| [omdsh-dev/fabric](https://github.com/omdsh-dev/fabric)                                                                             | `b788ea5ecc12` | dsh-runtime-plugin        | H+C      |    yes |   yes |  no |
| [LoserFox/dsh-git-identity](https://github.com/LoserFox/dsh-git-identity)                                                           | `39c608ca8e07` | dsh-runtime-plugin        | P        |    yes |    no |  no |
| [Zhenyu98/dsh-context-doctor](https://github.com/Zhenyu98/dsh-context-doctor)                                                       | `4a91502c106f` | dsh-runtime-plugin        | H+C      |    yes |   yes |  no |
| [labmimors/dsh-mcp-lens](https://github.com/labmimors/dsh-mcp-lens)                                                                 | `fb5351dff01f` | dsh-runtime-plugin        | H+P      |    yes |   yes | yes |
| [ICCuse/dsh-pain-point-check](https://github.com/ICCuse/dsh-pain-point-check)                                                       | `1dfa372a1d9e` | broken-bundle-declaration | H        |     no |   yes |  no |
| [omdsh-dev/dsh-plugin-check](https://github.com/omdsh-dev/dsh-plugin-check)                                                         | `397aa26df241` | dsh-runtime-plugin        | H+P      |    yes |   yes |  no |
| [omdsh-dev/dsh-security-audit](https://github.com/omdsh-dev/dsh-security-audit)                                                     | `b1974e1ac18c` | dsh-runtime-plugin        | H+P      |    yes |   yes |  no |
| [omdsh-dev/dsh-session-health](https://github.com/omdsh-dev/dsh-session-health)                                                     | `72065059cec8` | dsh-runtime-plugin        | H        |    yes |   yes |  no |
| [william-jin-cmu/dsh-evolve](https://github.com/william-jin-cmu/dsh-evolve)                                                         | `37462647f896` | dsh-runtime-plugin        | H        |    yes |   yes |  no |
| [vibeinging/dsh-trace](https://github.com/vibeinging/dsh-trace)                                                                     | `caadf1b831ae` | dsh-runtime-plugin        | H        |    yes |   yes | yes |
| [030611/dsh-telemetry-redactor](https://github.com/030611/dsh-telemetry-redactor)                                                   | `811b0b1abf42` | dsh-runtime-plugin        | H+P      |    yes |   yes | yes |
| [030611/dsh-verification-receipt](https://github.com/030611/dsh-verification-receipt)                                               | `92f63a9022e1` | dsh-runtime-plugin        | H        |    yes |   yes | yes |
| [030611/qiushi-dsh-evidence-audit](https://github.com/030611/qiushi-dsh-evidence-audit)                                             | `94fae130b284` | dsh-runtime-plugin        | H+P      |    yes |   yes | yes |
| [omdsh-dev/sandbox-micro](https://github.com/omdsh-dev/sandbox-micro)                                                               | `ebc8be539a4e` | dsh-runtime-plugin        | H        |    yes |   yes |  no |
| [omdsh-dev/sandbox-mxc](https://github.com/omdsh-dev/sandbox-mxc)                                                                   | `61ed9e8dd135` | dsh-runtime-plugin        | P        |    yes |   yes |  no |
| [omdsh-dev/sandbox-nono](https://github.com/omdsh-dev/sandbox-nono)                                                                 | `d8e1b7914db7` | dsh-runtime-plugin        | P        |    yes |   yes |  no |
| [vibeinging/dsh-agent-budget](https://github.com/vibeinging/dsh-agent-budget)                                                       | `2702e6d4846d` | dsh-runtime-plugin        | H        |    yes |   yes |  no |
| [Jesse-njx/dsh-polyglot](https://github.com/Jesse-njx/dsh-polyglot)                                                                 | `127ceefb1532` | dsh-runtime-plugin        | H        |    yes |   yes | yes |
| [ilharp/dsh-tool-approval](https://github.com/ilharp/dsh-tool-approval)                                                             | `c01801a7e39c` | dsh-runtime-plugin        | H        |    yes |    no | yes |
| [arrow949/dsh-turn-approval](https://github.com/arrow949/dsh-turn-approval)                                                         | `5b4cbfd42588` | dsh-runtime-plugin        | -        |    yes |   yes |  no |
| [omdsh-dev/plugin-template](https://github.com/omdsh-dev/plugin-template)                                                           | `68e1a7dce774` | template                  | P        |    yes |   yes |  no |
| [Small-tailqwq/dsh-tps](https://github.com/Small-tailqwq/dsh-tps)                                                                   | `69dac729c6c8` | dsh-runtime-plugin        | C        |    yes |   yes |  no |
| [disyli/dsh-tool-call-stats](https://github.com/disyli/dsh-tool-call-stats)                                                         | `f1e956cdbb5b` | dsh-runtime-plugin        | H        |    yes |    no |  no |
| [Areium/dsh-fail-logger](https://github.com/Areium/dsh-fail-logger)                                                                 | `854791d33511` | dsh-runtime-plugin        | -        |    yes |   yes | yes |
| [Cavan-Ou/dsh-observation-journal](https://github.com/Cavan-Ou/dsh-observation-journal)                                             | `0fbbaf098d3c` | dsh-runtime-plugin        | -        |    yes |   yes |  no |
| [BiBoyang/dsh-eval-harness](https://github.com/BiBoyang/dsh-eval-harness)                                                           | `035d1c6e1ebf` | dsh-runtime-plugin        | H+P      |    yes |   yes | yes |
| [hust-open-atom-club/oh-dsh](https://github.com/hust-open-atom-club/oh-dsh)                                                         | `81276e0d7ff0` | distribution              | C+P      |    yes |   yes | yes |
| [BrambleXu/dsh-annotate](https://github.com/BrambleXu/dsh-annotate)                                                                 | `43f39543f720` | dsh-runtime-plugin        | H+P      |    yes |   yes |  no |
| [BrambleXu/dsh-prompt-profile](https://github.com/BrambleXu/dsh-prompt-profile)                                                     | `c205d44e88e6` | dsh-runtime-plugin        | H        |    yes |   yes |  no |
| [BrambleXu/dsh-revdiff](https://github.com/BrambleXu/dsh-revdiff)                                                                   | `90e7f41040ed` | dsh-runtime-plugin        | H+P      |    yes |   yes |  no |
| [lonelymoon87/dsh-gitflow](https://github.com/lonelymoon87/dsh-gitflow)                                                             | `71fa14570363` | dsh-runtime-plugin        | H        |    yes |   yes | yes |
| [lonelymoon87/dsh-guardian](https://github.com/lonelymoon87/dsh-guardian)                                                           | `a6f076c85b0f` | dsh-runtime-plugin        | H        |    yes |   yes | yes |
| [Jesse-njx/dsh-plugin-manager](https://github.com/Jesse-njx/dsh-plugin-manager)                                                     | `2da969ab638d` | dsh-runtime-plugin        | H+P      |    yes |   yes |  no |
| [Jesse-njx/dsh-tmuxctl](https://github.com/Jesse-njx/dsh-tmuxctl)                                                                   | `1804d3956cef` | dsh-runtime-plugin        | H+C      |    yes |   yes | yes |
| [xingyingyuzhui/dsh-updater-ui](https://github.com/xingyingyuzhui/dsh-updater-ui)                                                   | `bf3077254e1e` | dsh-runtime-plugin        | C        |    yes |    no |  no |
| [EvilIrving/dsh-repro](https://github.com/EvilIrving/dsh-repro)                                                                     | `e51736ba5838` | dsh-runtime-plugin        | H+P      |    yes |   yes |  no |
| [PerryLink/dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)                                                               | `76b9040550ae` | dsh-runtime-plugin        | H+C+P    |    yes |   yes | yes |
| [Jayden-X-L/forkprobe](https://github.com/Jayden-X-L/forkprobe)                                                                     | `defe0b47e0d6` | dsh-runtime-plugin        | H+P      |    yes |   yes |  no |
| [vlln/plugin-registry](https://github.com/vlln/plugin-registry)                                                                     | `6dab4de27cde` | dsh-runtime-plugin        | H+C+P    |    yes |   yes |  no |
| [forrestchang/dsh-multica-runtime](https://github.com/forrestchang/dsh-multica-runtime)                                             | `e29aae228449` | distribution              | H+P      |    yes |   yes |  no |
| [DietCokewithSugar/dsh-user-experience](https://github.com/DietCokewithSugar/dsh-user-experience)                                   | `c6fd7766234a` | dsh-runtime-plugin        | H+C      |    yes |   yes | yes |
| [yflmq001/dsh-cost-tracker](https://github.com/yflmq001/dsh-cost-tracker)                                                           | `f83602fc8ea0` | dsh-runtime-plugin        | H+C      |    yes |   yes |  no |
| [slywalker2006/dsh-passwords](https://github.com/slywalker2006/dsh-passwords)                                                       | `5af345b4dea8` | dsh-runtime-plugin        | H+C+P    |    yes |    no |  no |
| [Yuuz12/dsh-webui-auth](https://github.com/Yuuz12/dsh-webui-auth)                                                                   | `6adeb61e8db3` | dsh-runtime-plugin        | P        |    yes |    no |  no |
| [Leon0555/dsh-lan-access](https://github.com/Leon0555/dsh-lan-access)                                                               | `5eea4062ccc8` | dsh-runtime-plugin        | -        |    yes |    no |  no |
| [wikkd/dsh-remote-access-web#remote-access-web](https://github.com/wikkd/dsh-remote-access-web) `packages/bundle/remote-access-web` | `73e3ef308d1e` | dsh-runtime-plugin        | -        |    yes |   yes |  no |
| [lsz-asd/dsh-chameleon#bundle](https://github.com/lsz-asd/dsh-chameleon) `bundle`                                                   | `89ecdaf934af` | dsh-runtime-plugin        | -        |    yes |   yes |  no |
| [jiayan-xu/dsh-ocr-review](https://github.com/jiayan-xu/dsh-ocr-review)                                                             | `de31b6cb3962` | dsh-runtime-plugin        | -        |    yes |    no |  no |
| [huguangyu666/dsh-store](https://github.com/huguangyu666/dsh-store)                                                                 | `46bfc86169b7` | dsh-runtime-plugin        | C+P      |    yes |    no |  no |
| [liqichen/dsh-plugin-manager](https://github.com/liqichen/dsh-plugin-manager)                                                       | `36a73f0174f0` | dsh-runtime-plugin        | C+P      |    yes |    no |  no |
| [buhuikongpan/dsh-pluginmanager](https://github.com/buhuikongpan/dsh-pluginmanager)                                                 | `0cb591c48625` | dsh-runtime-plugin        | -        |    yes |    no |  no |
| [tianyaZTY/dsh-hot-plugin-host](https://github.com/tianyaZTY/dsh-hot-plugin-host)                                                   | `369985a7722f` | dsh-runtime-plugin        | C        |    yes |    no |  no |
| [moonquake2004/dsh-doctor#plugin](https://github.com/moonquake2004/dsh-doctor) `plugin`                                             | `7dcb57ede019` | dsh-runtime-plugin        | C+P      |    yes |   yes |  no |
| [x2802490130-prog/dsh-guard](https://github.com/x2802490130-prog/dsh-guard)                                                         | `71396827781c` | dsh-runtime-plugin        | C        |    yes |    no |  no |
| [x2802490130-prog/dsh-shield](https://github.com/x2802490130-prog/dsh-shield)                                                       | `56db93deae6e` | dsh-runtime-plugin        | C        |    yes |    no |  no |
| [strukto-ai/mirage#dsh](https://github.com/strukto-ai/mirage) `typescript/packages/dsh`                                             | `c32855fd91d8` | dsh-runtime-plugin        | H+P      |    yes |   yes | yes |
| [truelove-dreamer/dsh-plugin-vetting](https://github.com/truelove-dreamer/dsh-plugin-vetting)                                       | `2ee287b27b1b` | dsh-runtime-plugin        | -        |    yes |   yes |  no |
| [anweat/dsh-restart](https://github.com/anweat/dsh-restart)                                                                         | `8d9f4947530a` | dsh-runtime-plugin        | H+C+P    |    yes |    no | yes |
| [sjh9714/dsh-movein](https://github.com/sjh9714/dsh-movein)                                                                         | `8829c3dd767d` | dsh-runtime-plugin        | -        |    yes |   yes | yes |

### Sessions & Messages (37)

| Target                                                                                                                           | HEAD           | Kind               | Boundary | Bundle | Tests |  CI |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------ | -------- | -----: | ----: | --: |
| [starslittle/dsh-queue-plus](https://github.com/starslittle/dsh-queue-plus)                                                      | `ee93da210fda` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [fredalxin/dsh-solo-thinking](https://github.com/fredalxin/dsh-solo-thinking)                                                    | `7e6406162bf3` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [ishuowang/dsh-agent-team-room](https://github.com/ishuowang/dsh-agent-team-room)                                                | `ee5726975825` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [cindyguyuehu123/dsh-webchatlike](https://github.com/cindyguyuehu123/dsh-webchatlike)                                            | `212c0e73cbd1` | dsh-runtime-plugin | H+C+P    |    yes |    no |  no |
| [penguin-oo/dsh-bookmarks](https://github.com/penguin-oo/dsh-bookmarks)                                                          | `691b93721f51` | dsh-runtime-plugin | C+P      |    yes |    no |  no |
| [Anionex/dsh-turn-rewind](https://github.com/Anionex/dsh-turn-rewind)                                                            | `27ebefa76a2d` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [Jesse-njx/dsh-crosstalk](https://github.com/Jesse-njx/dsh-crosstalk)                                                            | `7b513104085d` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [dongsheng123132/task-passport](https://github.com/dongsheng123132/task-passport)                                                | `19672b5c7c06` | dsh-runtime-plugin | H+P      |    yes |   yes | yes |
| [LeslieWylie/dsh-task-relay](https://github.com/LeslieWylie/dsh-task-relay)                                                      | `3ae0eee536be` | dsh-runtime-plugin | H        |    yes |   yes | yes |
| [hellodigua/dsh-share](https://github.com/hellodigua/dsh-share)                                                                  | `9a582f840227` | dsh-runtime-plugin | C+P      |    yes |   yes | yes |
| [Moeblack/dsh-message-edit](https://github.com/Moeblack/dsh-message-edit)                                                        | `e950651786e9` | dsh-runtime-plugin | H+C+P    |    yes |    no |  no |
| [Buyi-wsgzg/dsh-sidechain](https://github.com/Buyi-wsgzg/dsh-sidechain)                                                          | `ee6fadd9bae9` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [bill9109/dsh-conversation-share](https://github.com/bill9109/dsh-conversation-share)                                            | `f582d8ec88e5` | dsh-runtime-plugin | H+C+P    |    yes |    no |  no |
| [yuezengwu/dsh-explain](https://github.com/yuezengwu/dsh-explain)                                                                | `f2cd85bb85bd` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [Moeblack/dsh-prompt-studio](https://github.com/Moeblack/dsh-prompt-studio)                                                      | `be5e97d6ea4e` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [czm15053/dsh-peer-link](https://github.com/czm15053/dsh-peer-link)                                                              | `a6c5aa872fca` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [PwnKY/dsh-session-link](https://github.com/PwnKY/dsh-session-link)                                                              | `ec6351e25f04` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [Nwflower/dsh-chat-import](https://github.com/Nwflower/dsh-chat-import)                                                          | `eea0b4f937d9` | dsh-runtime-plugin | -        |    yes |   yes | yes |
| [Nwflower/dsh-file-claim](https://github.com/Nwflower/dsh-file-claim)                                                            | `65aebf02cd88` | dsh-runtime-plugin | -        |    yes |   yes | yes |
| [Chinesezjc/dsh-interconnect](https://github.com/Chinesezjc/dsh-interconnect)                                                    | `75488fbc4cbf` | dsh-runtime-plugin | H+P      |    yes |   yes | yes |
| [3403473060/dsh-inline-images](https://github.com/3403473060/dsh-inline-images)                                                  | `79f8ba778441` | dsh-runtime-plugin | H+C      |    yes |    no | yes |
| [Wine-Red/dsh-prompt-stash](https://github.com/Wine-Red/dsh-prompt-stash)                                                        | `265057c6ddc0` | dsh-runtime-plugin | C        |    yes |   yes | yes |
| [heartmove/dsh-side-chat](https://github.com/heartmove/dsh-side-chat)                                                            | `e1f4b53a0dbb` | dsh-runtime-plugin | C        |    yes |   yes |  no |
| [bwndlct/dsh-session-export](https://github.com/bwndlct/dsh-session-export)                                                      | `eb18389192e3` | dsh-runtime-plugin | H        |    yes |   yes | yes |
| [LeemanCheung/dsh-token-usage](https://github.com/LeemanCheung/dsh-token-usage)                                                  | `c6be2736d179` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [whyihaveyou/dsh-suite#plugin-session-export](https://github.com/whyihaveyou/dsh-suite) `packages/plugins/plugin-session-export` | `a1896bb3f7fe` | dsh-runtime-plugin | H+P      |    yes |    no | yes |
| [LeslieWylie/dsh-session-search-pro](https://github.com/LeslieWylie/dsh-session-search-pro)                                      | `d6ba7b5b6796` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [lsz-asd/dsh-plugin-session-delete](https://github.com/lsz-asd/dsh-plugin-session-delete)                                        | `352510e55298` | dsh-runtime-plugin | H+C+P    |    yes |    no |  no |
| [huguangyu666/dsh-plugin-session-import](https://github.com/huguangyu666/dsh-plugin-session-import)                              | `3478ef49efbb` | dsh-runtime-plugin | C+P      |    yes |    no |  no |
| [beijingwahw/dsh-companion](https://github.com/beijingwahw/dsh-companion)                                                        | `1eea40151bc7` | dsh-runtime-plugin | H+C      |    yes |    no |  no |
| [ishuowang/dsh-sideband](https://github.com/ishuowang/dsh-sideband)                                                              | `c38cb05bd552` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [mayf3/dsh-session-doctor](https://github.com/mayf3/dsh-session-doctor)                                                          | `8147c144075a` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [MuWinds/dsh-archived-sessions](https://github.com/MuWinds/dsh-archived-sessions)                                                | `7d3ba012d3ed` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [anweat/dsh-assistant-message-forge](https://github.com/anweat/dsh-assistant-message-forge)                                      | `0f05362ef4cd` | dsh-runtime-plugin | H+C      |    yes |    no | yes |
| [yangyongzhen/dsh-session-export](https://github.com/yangyongzhen/dsh-session-export)                                            | `65f204cfd2db` | dsh-runtime-plugin | H        |    yes |    no |  no |
| [yangyongzhen/dsh-session-report](https://github.com/yangyongzhen/dsh-session-report)                                            | `e451602e74c3` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [Boliban/dsh-enter-customizer](https://github.com/Boliban/dsh-enter-customizer)                                                  | `44f4ac629ec4` | dsh-runtime-plugin | -        |    yes |    no |  no |

### Workflow & Automation (34)

| Target                                                                                                                          | HEAD           | Kind               | Boundary | Bundle | Tests |  CI |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------ | -------- | -----: | ----: | --: |
| [ztl34245881-commits/dsh-task-planner](https://github.com/ztl34245881-commits/dsh-task-planner)                                 | `7326670e4131` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [icetomoyo/dsh_workflow](https://github.com/icetomoyo/dsh_workflow)                                                             | `44b83c182aa0` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [KanoNoUta/dsh-captain](https://github.com/KanoNoUta/dsh-captain)                                                               | `32aa25201bad` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [NanmiCoder/dsh-agent-teams](https://github.com/NanmiCoder/dsh-agent-teams)                                                     | `00a8329a8fc8` | dsh-runtime-plugin | H+C+P    |    yes |    no |  no |
| [toolclub/agent_team_gui](https://github.com/toolclub/agent_team_gui)                                                           | `bd1b779fee00` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [titanwings/dsh-automation](https://github.com/titanwings/dsh-automation)                                                       | `a622b1b1758c` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [Sev7een/dsh-plugin-automations](https://github.com/Sev7een/dsh-plugin-automations)                                             | `971a53e5eaa1` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [Jesse-njx/dsh-routines](https://github.com/Jesse-njx/dsh-routines)                                                             | `f59b4f03e7b3` | dsh-runtime-plugin | H+P      |    yes |   yes | yes |
| [titanwings/dsh-plannotator](https://github.com/titanwings/dsh-plannotator)                                                     | `c0fe880107aa` | dsh-runtime-plugin | C        |    yes |   yes |  no |
| [vlln/dsh-loop](https://github.com/vlln/dsh-loop)                                                                               | `e71593691695` | dsh-runtime-plugin | H+C      |    yes |    no |  no |
| [fuhefei/dsh-sentinel](https://github.com/fuhefei/dsh-sentinel)                                                                 | `f73e8aeb4af3` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [omdsh-dev/dsh-deep-research](https://github.com/omdsh-dev/dsh-deep-research)                                                   | `c0b329e02cd0` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [omdsh-dev/dsh-inspect](https://github.com/omdsh-dev/dsh-inspect)                                                               | `9876349054f0` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [fakechris/dsh-track](https://github.com/fakechris/dsh-track)                                                                   | `4e6112b6b3c2` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [btspoony/dsh-advisor](https://github.com/btspoony/dsh-advisor)                                                                 | `db4b0ff36b43` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [lonelymoon87/dsh-specflow](https://github.com/lonelymoon87/dsh-specflow)                                                       | `76e308f9a9f1` | dsh-runtime-plugin | H        |    yes |   yes | yes |
| [biociao/dsh-science](https://github.com/biociao/dsh-science)                                                                   | `ef7ef5ad4b78` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [EvilIrving/dsh-proof](https://github.com/EvilIrving/dsh-proof)                                                                 | `7e5fb648ac93` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [PerryLink/dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)                                                       | `427a59e74c75` | dsh-runtime-plugin | H+P      |    yes |   yes | yes |
| [btspoony/mstar-harness](https://github.com/btspoony/mstar-harness)                                                             | `c96522f44e17` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [LeslieWylie/dsh-ops-kit](https://github.com/LeslieWylie/dsh-ops-kit)                                                           | `c4ba8353cb58` | dsh-runtime-plugin | H+P      |    yes |   yes | yes |
| [Letter2025/dsh-approval-llm](https://github.com/Letter2025/dsh-approval-llm)                                                   | `af70355a3c48` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [simon300000/dsh-auto](https://github.com/simon300000/dsh-auto)                                                                 | `eb409400843e` | dsh-runtime-plugin | P        |    yes |   yes |  no |
| [Letter2025/dsh-model-failover](https://github.com/Letter2025/dsh-model-failover)                                               | `64d5c3558013` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [whyihaveyou/dsh-suite#plugin-team-board](https://github.com/whyihaveyou/dsh-suite) `packages/plugins/plugin-team-board`        | `a1896bb3f7fe` | dsh-runtime-plugin | H        |    yes |    no | yes |
| [Karbo123/DSH-EvoResearch#evoresearch-plugin](https://github.com/Karbo123/DSH-EvoResearch) `packages/evoresearch-plugin`        | `2632659bac9d` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [february2015/dsh-taskswarm](https://github.com/february2015/dsh-taskswarm)                                                     | `f04d25f349a7` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [truelove-dreamer/dsh-plugin-hooks](https://github.com/truelove-dreamer/dsh-plugin-hooks)                                       | `6cf763e7d6fe` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [severin-ye/uagent-sync#packages/dsh](https://github.com/severin-ye/uagent-sync) `packages/dsh`                                 | `dd70f1c8cb22` | dsh-runtime-plugin | H        |    yes |   yes | yes |
| [Noelune/dsh-agent-relay](https://github.com/Noelune/dsh-agent-relay)                                                           | `d9a3b96e3362` | dsh-runtime-plugin | P        |    yes |   yes | yes |
| [Ceelog/dsh-plugins#dsh-plugin-scheduled-tasks](https://github.com/Ceelog/dsh-plugins) `src/plugins/dsh-plugin-scheduled-tasks` | `982e240c6bc9` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [yangyongzhen/dsh-scheduler](https://github.com/yangyongzhen/dsh-scheduler)                                                     | `b4765259ca07` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [yangyongzhen/dsh-git-workflow](https://github.com/yangyongzhen/dsh-git-workflow)                                               | `a7c2a9c7bdd6` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [yangyongzhen/dsh-article-publish](https://github.com/yangyongzhen/dsh-article-publish)                                         | `12f43523d8d1` | dsh-runtime-plugin | H        |    yes |   yes |  no |

### Notifications & Integrations (31)

| Target                                                                                                           | HEAD           | Kind               | Boundary | Bundle | Tests |  CI |
| ---------------------------------------------------------------------------------------------------------------- | -------------- | ------------------ | -------- | -----: | ----: | --: |
| [radres/dsh-plugin-call-me](https://github.com/radres/dsh-plugin-call-me)                                        | `af1a21bc85ce` | dsh-runtime-plugin | -        |    yes |   yes | yes |
| [omdsh-dev/dsh-open-in-vscode](https://github.com/omdsh-dev/dsh-open-in-vscode)                                  | `149f21aed3d0` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [omdsh-dev/dsh-notification](https://github.com/omdsh-dev/dsh-notification)                                      | `3e33100f51f2` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [bobleer/dsh-acp-for-bitfun](https://github.com/bobleer/dsh-acp-for-bitfun)                                      | `8dedce1ee1a4` | dsh-runtime-plugin | P        |    yes |    no |  no |
| [openma-ai/deepseek-harness-acp](https://github.com/openma-ai/deepseek-harness-acp)                              | `f1f60c3f3054` | dsh-runtime-plugin | H+P      |    yes |   yes | yes |
| [LoserFox/telegram](https://github.com/LoserFox/telegram)                                                        | `a0a9ca11e427` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [luzhengyangtx/dsh-telegram-duty](https://github.com/luzhengyangtx/dsh-telegram-duty)                            | `1f87dc643923` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [Jesse-njx/dsh-chatnode-wechat](https://github.com/Jesse-njx/dsh-chatnode-wechat)                                | `a724da34b5c7` | dsh-runtime-plugin | H        |    yes |   yes | yes |
| [dingyi222666/dsh-session-notification](https://github.com/dingyi222666/dsh-session-notification)                | `6bdd080f9e63` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [bill9109/dsh-web-ui-notify](https://github.com/bill9109/dsh-web-ui-notify)                                      | `865d2f6fc93f` | dsh-runtime-plugin | C+P      |    yes |   yes |  no |
| [wsxwj123/dsh-plugins#pet-bridge](https://github.com/wsxwj123/dsh-plugins) `packages/pet-bridge`                 | `89890d31a0b0` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [bill9109/dsh-webbridge](https://github.com/bill9109/dsh-webbridge)                                              | `fb6fa96fed4b` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [BiBoyang/dsh-im-bridge](https://github.com/BiBoyang/dsh-im-bridge)                                              | `d5bcb1d27d13` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [imetn/dsh-lark-bridge](https://github.com/imetn/dsh-lark-bridge)                                                | `f1e544cce510` | dsh-runtime-plugin | H+P      |    yes |   yes | yes |
| [yeruizhi/dsh-lark-meeting-notifier](https://github.com/yeruizhi/dsh-lark-meeting-notifier)                      | `9254c621a4c8` | dsh-runtime-plugin | C        |    yes |    no |  no |
| [pc439527/dsh-notify-bark](https://github.com/pc439527/dsh-notify-bark)                                          | `26e229876312` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [CAOGGL/dsh-ding](https://github.com/CAOGGL/dsh-ding)                                                            | `e8010e4dc5c8` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [ldchaowin/dsh-plugin-notify-sound](https://github.com/ldchaowin/dsh-plugin-notify-sound)                        | `d6a267dea612` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [whyihaveyou/dsh-suite#plugin-notify](https://github.com/whyihaveyou/dsh-suite) `packages/plugins/plugin-notify` | `a1896bb3f7fe` | dsh-runtime-plugin | H+P      |    yes |    no | yes |
| [xmanrui/dsh-feishu](https://github.com/xmanrui/dsh-feishu)                                                      | `aad650feabad` | dsh-runtime-plugin | C+P      |    yes |   yes | yes |
| [doncelee229-cmyk/dsh-plugin-approval-alert](https://github.com/doncelee229-cmyk/dsh-plugin-approval-alert)      | `8c25a602ef9a` | dsh-runtime-plugin | C        |    yes |    no |  no |
| [muretai/muretai-dsh-skill](https://github.com/muretai/muretai-dsh-skill)                                        | `5b7613cdc388` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [itr-del/dsh-feishu](https://github.com/itr-del/dsh-feishu)                                                      | `584fb2c543ff` | dsh-runtime-plugin | H+P      |    yes |    no |  no |
| [wz-heng/dsh-feishu-bridge](https://github.com/wz-heng/dsh-feishu-bridge)                                        | `3107fd0c6922` | dsh-runtime-plugin | P        |    yes |   yes |  no |
| [huguangyu666/dsh-plugin-notify](https://github.com/huguangyu666/dsh-plugin-notify)                              | `83750ec26647` | dsh-runtime-plugin | C+P      |    yes |    no |  no |
| [xmanrui/dsh-weixin](https://github.com/xmanrui/dsh-weixin)                                                      | `76d076771b2c` | dsh-runtime-plugin | C+P      |    yes |   yes |  no |
| [xmanrui/dsh-im](https://github.com/xmanrui/dsh-im)                                                              | `ef426d54c5d5` | dsh-runtime-plugin | C+P      |    yes |   yes |  no |
| [THEWOLFWALKER/dsh-notifier](https://github.com/THEWOLFWALKER/dsh-notifier)                                      | `d72a1b4ef6a0` | dsh-runtime-plugin | -        |    yes |   yes | yes |
| [zhengjy01/dsh-notify](https://github.com/zhengjy01/dsh-notify)                                                  | `7563ff49b8d4` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [ThreeBody6666/dsh-im-hub](https://github.com/ThreeBody6666/dsh-im-hub)                                          | `1de471e73229` | dsh-runtime-plugin | P        |    yes |   yes |  no |
| [yangyongzhen/dsh-notify](https://github.com/yangyongzhen/dsh-notify)                                            | `710a154e3ad7` | dsh-runtime-plugin | H        |    yes |   yes |  no |

### Memory (23)

| Target                                                                                                                                          | HEAD           | Kind               | Boundary | Bundle | Tests |  CI |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------ | -------- | -----: | ----: | --: |
| [LoserFox/distill](https://github.com/LoserFox/distill)                                                                                         | `d2aaa395adef` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [omdsh-dev/dsh-mnemon](https://github.com/omdsh-dev/dsh-mnemon)                                                                                 | `ade5a7b395f2` | dsh-runtime-plugin | C+P      |    yes |   yes | yes |
| [modusensus/dsh-mneme#dsh-mneme](https://github.com/modusensus/dsh-mneme) `dsh-mneme`                                                           | `67376b3075fa` | dsh-runtime-plugin | H        |    yes |   yes | yes |
| [nowledge-co/nowledge-mem-deepseek-harness](https://github.com/nowledge-co/nowledge-mem-deepseek-harness)                                       | `97956d33e793` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [Jesse-njx/dsh-memory](https://github.com/Jesse-njx/dsh-memory)                                                                                 | `2eed97da7f95` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [flymysql/dsh-memory](https://github.com/flymysql/dsh-memory)                                                                                   | `d6afee4bb594` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [Xplore-LAB/dsh-plugin-asmemory](https://github.com/Xplore-LAB/dsh-plugin-asmemory)                                                             | `04ef11c60d18` | dsh-runtime-plugin | P        |    yes |    no |  no |
| [PerryLink/dsh-memento](https://github.com/PerryLink/dsh-memento)                                                                               | `24aa872fa8a5` | dsh-runtime-plugin | H        |    yes |   yes | yes |
| [GIT121995/dsh-memory-gate](https://github.com/GIT121995/dsh-memory-gate)                                                                       | `5a0b51780ac4` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [ICCuse/dsh-file-memory](https://github.com/ICCuse/dsh-file-memory)                                                                             | `979b17a7409b` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [ICCuse/dsh-knowledge](https://github.com/ICCuse/dsh-knowledge)                                                                                 | `34bec0c1ec33` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [ICCuse/dsh-premise-guard](https://github.com/ICCuse/dsh-premise-guard)                                                                         | `2161842c336d` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [freehul/sgme](https://github.com/freehul/sgme)                                                                                                 | `b08ce3f1c063` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [Phant0Meow/dsh-memory-meow](https://github.com/Phant0Meow/dsh-memory-meow)                                                                     | `0e6393b68e10` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [jiayan-xu/dsh-memoria](https://github.com/jiayan-xu/dsh-memoria)                                                                               | `436a55a823f7` | dsh-runtime-plugin | H+P      |    yes |    no |  no |
| [jinguanghai/deepseek-harness-forge-plugins#forge-memory](https://github.com/jinguanghai/deepseek-harness-forge-plugins) `plugins/forge-memory` | `bd4e4c756421` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [FuRongJun-1999/dsh-memory](https://github.com/FuRongJun-1999/dsh-memory)                                                                       | `4c96995e6460` | dsh-runtime-plugin | H+P      |    yes |   yes |  no |
| [jiayan-xu/dsh-memoria-extra](https://github.com/jiayan-xu/dsh-memoria-extra)                                                                   | `21fc8bd70ff9` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [truelove-dreamer/dsh-plugin-recall](https://github.com/truelove-dreamer/dsh-plugin-recall)                                                     | `f72e1d22122a` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [Noelune/unified-agent-memory](https://github.com/Noelune/unified-agent-memory)                                                                 | `6d6aa5ec299b` | dsh-runtime-plugin | -        |    yes |   yes | yes |
| [FleetingEcho/dsh-handoff](https://github.com/FleetingEcho/dsh-handoff)                                                                         | `c22be09f3277` | dsh-runtime-plugin | H+P      |    yes |    no |  no |
| [yangyongzhen/dsh-memory](https://github.com/yangyongzhen/dsh-memory)                                                                           | `79d5bfa060c8` | dsh-runtime-plugin | H        |    yes |   yes |  no |
| [akslcw/dsh-negative-ledger](https://github.com/akslcw/dsh-negative-ledger)                                                                     | `f0ecad5ec8e2` | dsh-runtime-plugin | P        |    yes |   yes | yes |

### Just for Fun (18)

| Target                                                                              | HEAD           | Kind               | Boundary | Bundle | Tests |  CI |
| ----------------------------------------------------------------------------------- | -------------- | ------------------ | -------- | -----: | ----: | --: |
| [Nagi-ovo/dsh-ads](https://github.com/Nagi-ovo/dsh-ads)                             | `401819c43f12` | dsh-runtime-plugin | C+P      |    yes |   yes |  no |
| [omdsh-dev/dsh-gomoku](https://github.com/omdsh-dev/dsh-gomoku)                     | `5b27af9808f5` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [AnacondaKC/dsh-stock-market](https://github.com/AnacondaKC/dsh-stock-market)       | `02278af12330` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [hellodigua/dsh-emoji](https://github.com/hellodigua/dsh-emoji)                     | `2caa1987504a` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [lhh010/dsh-minigames](https://github.com/lhh010/dsh-minigames)                     | `a22b3c143839` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [william-jin-cmu/dsh-stickers](https://github.com/william-jin-cmu/dsh-stickers)     | `1703f09915db` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [vlln/whale-girl](https://github.com/vlln/whale-girl)                               | `ecba322be408` | dsh-runtime-plugin | P        |    yes |   yes |  no |
| [Moeblack/deepseek-manners](https://github.com/Moeblack/deepseek-manners)           | `32f58a8a0087` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [HuanLinOTO/dsh-plugin-d399](https://github.com/HuanLinOTO/dsh-plugin-d399)         | `66d0898478fd` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [omdsh-dev/dsh-auto-chess](https://github.com/omdsh-dev/dsh-auto-chess)             | `cc0728d808cb` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [AnacondaKC/dsh-douyin](https://github.com/AnacondaKC/dsh-douyin)                   | `2f28338b2950` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |
| [minybear/DeepSeek-Harness-Pet](https://github.com/minybear/DeepSeek-Harness-Pet)   | `ef98b23fd6e0` | dsh-runtime-plugin | -        |    yes |   yes |  no |
| [yyh-001/dsh-expression](https://github.com/yyh-001/dsh-expression)                 | `227604955e88` | dsh-runtime-plugin | H+C      |    yes |    no |  no |
| [PC2005-cloud/dsh-pet#dsh-pet](https://github.com/PC2005-cloud/dsh-pet) `dsh-pet`   | `f9f769e3d55f` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [xiekai886/dsh-MusicPlayer](https://github.com/xiekai886/dsh-MusicPlayer)           | `289a8e5d4cce` | dsh-runtime-plugin | H+C      |    yes |    no |  no |
| [609476965/dsh-LorebookMD](https://github.com/609476965/dsh-LorebookMD)             | `4bc4110efbfb` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [Awu12277/dsh-stock-watch](https://github.com/Awu12277/dsh-stock-watch)             | `3a5bbce8ef2d` | dsh-runtime-plugin | C        |    yes |    no |  no |
| [sjh9714/clippy-harness#plugin](https://github.com/sjh9714/clippy-harness) `plugin` | `21a77d8d1daa` | dsh-runtime-plugin | H+C      |    yes |   yes |  no |

### Themes & Appearance (13)

| Target                                                                                                 | HEAD           | Kind        | Boundary | Bundle | Tests |  CI |
| ------------------------------------------------------------------------------------------------------ | -------------- | ----------- | -------- | -----: | ----: | --: |
| [KinGao294/dsh-skin](https://github.com/KinGao294/dsh-skin)                                            | `13554dfcb170` | skin-plugin | -        |    yes |    no |  no |
| [Small-tailqwq/dsh-deep-whale](https://github.com/Small-tailqwq/dsh-deep-whale)                        | `2fbeec96f9ad` | skin-plugin | H        |    yes |   yes |  no |
| [wsxwj123/dsh-plugins#theme-gallery](https://github.com/wsxwj123/dsh-plugins) `packages/theme-gallery` | `89890d31a0b0` | skin-plugin | C        |    yes |    no |  no |
| [PAKIKNOWLEDGE/dsh-client-ui-skin-claude](https://github.com/PAKIKNOWLEDGE/dsh-client-ui-skin-claude)  | `78690f8449b6` | skin-plugin | -        |    yes |    no |  no |
| [tianyhjg-lab/dsh-font](https://github.com/tianyhjg-lab/dsh-font)                                      | `d299f56bde1e` | skin-plugin | C        |    yes |    no |  no |
| [starslittle/dsh-blue-whale](https://github.com/starslittle/dsh-blue-whale)                            | `1abc6eea4530` | skin-plugin | -        |    yes |    no |  no |
| [chinaRXQ/dsh-wallpaper](https://github.com/chinaRXQ/dsh-wallpaper)                                    | `ac35d036582b` | skin-plugin | -        |    yes |    no |  no |
| [SamizuHM/dsh-client-ui-theme-xp](https://github.com/SamizuHM/dsh-client-ui-theme-xp)                  | `76d58ffbc5e2` | skin-plugin | -        |    yes |    no |  no |
| [Tommy00748/dsh-theme-cyberpunk2077](https://github.com/Tommy00748/dsh-theme-cyberpunk2077)            | `5f7978bfcba2` | skin-plugin | -        |    yes |    no |  no |
| [Tkingxiao/dsh-any-background](https://github.com/Tkingxiao/dsh-any-background)                        | `ad5aab101b38` | skin-plugin | H+C      |    yes |    no |  no |
| [BeiZi6/dsh-theme-plugin](https://github.com/BeiZi6/dsh-theme-plugin)                                  | `b3e7e143532c` | skin-plugin | C        |    yes |    no |  no |
| [zhijun-dai/Catppuccin-dsh-theme](https://github.com/zhijun-dai/Catppuccin-dsh-theme)                  | `1dadda020082` | skin-plugin | -        |    yes |    no |  no |
| [zhijun-dai/Solarized-dsh-theme](https://github.com/zhijun-dai/Solarized-dsh-theme)                    | `a1afee78635c` | skin-plugin | C        |    yes |    no |  no |

### Models & Providers (10)

| Target                                                                                        | HEAD           | Kind               | Boundary | Bundle | Tests |  CI |
| --------------------------------------------------------------------------------------------- | -------------- | ------------------ | -------- | -----: | ----: | --: |
| [Noob-stupid/dsh-github-login](https://github.com/Noob-stupid/dsh-github-login)               | `647d2f2aab86` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [dylan121322/llm-adaptive](https://github.com/dylan121322/llm-adaptive)                       | `305be1c75d09` | dsh-runtime-plugin | -        |    yes |    no |  no |
| [btspoony/dsh-llm-fallbacks](https://github.com/btspoony/dsh-llm-fallbacks)                   | `b9d78c2c2d93` | dsh-runtime-plugin | H+C      |    yes |   yes | yes |
| [franksong2702/dsh-codex-connect](https://github.com/franksong2702/dsh-codex-connect)         | `2c99d177db51` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [kam74515-boop/dsh-everything-oauth](https://github.com/kam74515-boop/dsh-everything-oauth)   | `fe7b691f52bc` | dsh-runtime-plugin | H+C+P    |    yes |   yes |  no |
| [omdsh-dev/Qwen-MM-Plugins](https://github.com/omdsh-dev/Qwen-MM-Plugins)                     | `a03d50556272` | dsh-runtime-plugin | P        |    yes |   yes |  no |
| [suntianc/dsh-codex-auth](https://github.com/suntianc/dsh-codex-auth)                         | `9cbb02c5a3e2` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [feibi-mochi/deepseek-harness-wallet](https://github.com/feibi-mochi/deepseek-harness-wallet) | `578d42f33a3c` | dsh-runtime-plugin | -        |    yes |   yes | yes |
| [superboy911/dsh-model-router](https://github.com/superboy911/dsh-model-router)               | `98ca5cec34ce` | dsh-runtime-plugin | H+C+P    |    yes |   yes | yes |
| [kaixinbaba/dsh-vision-recognizer](https://github.com/kaixinbaba/dsh-vision-recognizer)       | `f2638ad9256d` | dsh-runtime-plugin | C        |    yes |   yes |  no |

### Skills (9)

| Target                                                                            | HEAD           | Kind                | Boundary | Bundle | Tests |  CI |
| --------------------------------------------------------------------------------- | -------------- | ------------------- | -------- | -----: | ----: | --: |
| [dhicoc/dsh-reverse-skill](https://github.com/dhicoc/dsh-reverse-skill)           | `190ae9a94e2c` | skill-bundle-plugin | H        |    yes |   yes | yes |
| [dhicoc/dsh-wuyun-liuqi](https://github.com/dhicoc/dsh-wuyun-liuqi)               | `91dadf18adc4` | skill-bundle-plugin | -        |    yes |   yes | yes |
| [creght-dev/skills](https://github.com/creght-dev/skills)                         | `5e20ab3ab576` | skill-bundle-plugin | H        |    yes |    no |  no |
| [zhaiyateng/dsh-design-skills](https://github.com/zhaiyateng/dsh-design-skills)   | `741272753c25` | skill-bundle-plugin | H        |    yes |    no |  no |
| [YTxue/dsh-skill-manager-ytxue](https://github.com/YTxue/dsh-skill-manager-ytxue) | `f254f3005a44` | skill-bundle-plugin | -        |    yes |   yes |  no |
| [lunw/shopline-ai-toolkit-dsh](https://github.com/lunw/shopline-ai-toolkit-dsh)   | `e97981fd4eb2` | skill-bundle-plugin | -        |    yes |    no |  no |
| [jeremy9682/dsh-skill-pack](https://github.com/jeremy9682/dsh-skill-pack)         | `6e0bed1aa846` | skill-bundle-plugin | -        |    yes |    no |  no |
| [Cavan-Ou/hermes-dsh-collab](https://github.com/Cavan-Ou/hermes-dsh-collab)       | `3a70cb3f5590` | skill-bundle-plugin | -        |    yes |    no |  no |
| [linxichen/dsh-rigorquant](https://github.com/linxichen/dsh-rigorquant)           | `53d4722f55b8` | skill-bundle-plugin | -        |    yes |    no |  no |
