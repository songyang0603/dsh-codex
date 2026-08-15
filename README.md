# dsh-codex

**English** | [简体中文](README.zh-CN.md)

> Rebuilding OpenAI Codex as exact, independently installable DeepSeek Harness components.

`dsh-codex` decomposes Codex into focused DSH plugins, then composes those plugins into a coding agent. DSH owns the runtime: the components do not invoke the `codex` executable and do not delegate work to Codex as a subagent.

Each completed component reproduces a precisely defined boundary from OpenAI Codex commit [`086396f`](https://github.com/openai/codex/tree/086396f7f60347b74c82784d5dfaf4fb2d3bda12). The rule is simple: a component may be small, but behavior inside its declared boundary must be exact.

This repository is under active development. Three foundational components are verified today; installing them does **not** yet produce the complete Codex agent.

## 💡 Why dsh-codex?

DeepSeek Harness is built around composable plugins. `dsh-codex` uses that architecture to turn Codex subsystems into reusable DSH services with explicit ownership, lifecycle, packaging, and conformance boundaries.

This makes it possible to:

- install and test one Codex capability at a time;
- reuse a component in a different DSH coding-agent profile;
- replace or compose components without hiding behavior in a monolithic wrapper;
- compare every completed boundary against the pinned upstream implementation;
- build toward a native DSH coding agent rather than a bridge to the Codex binary.

## 🧩 Components

| Component                                                                   | What it provides                                                                                                        | Status                                         |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [`@songyang0603/dsh-codex-execpolicy`](packages/execpolicy)                 | Codex policy/config discovery, command classification, approval-requirement derivation, migration, and rule persistence | `0.1.0` · macOS arm64 source `parity_verified` |
| [`@songyang0603/dsh-codex-approval`](packages/approval)                     | Lossless rich approval protocol, pending-request correlation, cancellation, and live-session approval cache             | `0.1.0` · macOS arm64 source `parity_verified` |
| [`@songyang0603/dsh-codex-apply-patch-engine`](packages/apply-patch-engine) | Apply-patch parsing, invocation recognition, verification, local mutation, and ordered committed delta                  | `0.1.0` · macOS arm64 source `parity_verified` |

See [the component map](docs/components.md) for the full Codex decomposition and [the parity standard](docs/parity-standard.md) for what `parity_verified` means.

## 🚀 Quick start

Requirements: Node.js 22.19+, pnpm 10.19, Rust 1.95.0, and DeepSeek Harness `0.1.0-rc.6`.

```bash
git clone https://github.com/songyang0603/dsh-codex.git
cd dsh-codex
pnpm install
pnpm native:stage
pnpm build
```

Install the completed components into one local DSH profile:

```bash
dsh plugin --profile codex-dev add ./packages/execpolicy
dsh plugin --profile codex-dev add ./packages/approval
dsh plugin --profile codex-dev add ./packages/apply-patch-engine
dsh --profile codex-dev --dump-config
```

The bundles mount three Cordis services:

```text
ctx.codexExecPolicy
ctx.codexApproval
ctx.codexApplyPatch
```

`native:stage` builds the current-platform Rust sidecars, verifies their protocols and pinned source identities, and writes package-local binaries plus SHA-256 files. Generated binaries are intentionally excluded from Git.

These releases are currently source-only. No npm release or GitHub native-binary release is claimed yet.

## ⚙️ How it works

```text
Pinned Codex source
        │
        ├── native semantic engines (Rust)
        │       └── exact upstream types and behavior
        │
        ├── DSH component packages (TypeScript + Cordis)
        │       └── lifecycle, IPC, validation, and service ownership
        │
        ├── canonical composition profile (in progress)
        │       └── shell, sandbox, network, provider, session, and UI
        │
        └── independent conformance suites
                └── pinned upstream oracle ↔ production component
```

Native sidecars are used where a TypeScript rewrite would risk semantic drift. The DSH packages own process lifecycle and expose typed Cordis services; consumers remain separate components so approval, sandboxing, networking, and execution order can be composed without double prompts or hidden bypasses.

Every installable package has its own `dsh.bundle.patch`, profile row, compiled entry points, instructions, license notices, and exact peers. The repository root is a component workspace, not an installable all-in-one bundle.

## ✅ What is verified today

| Boundary                    | Independent comparison                                                                         | Package/runtime checks                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Execpolicy                  | runtime `68/68`; config stack `6/6`; host discovery `11/11`; migration and persistence `16/16` | 18 TypeScript/native/real-Loader tests and a clean DSH rc.6 archive smoke test            |
| Approval                    | upstream/source-pinned `43/43`; DSH adapter contracts `10/10`                                  | 49 package tests and a clean DSH rc.6 add/activate/remove profile test                    |
| Apply-patch semantic engine | all 96 pinned upstream tests; differential oracle `23/23`                                      | 10 native tests, 6 TypeScript/native/real-Loader tests, and a clean archive mutation test |

The oracles are built from the pinned upstream source; candidate output never serves as its own oracle. Exact commands, identities, hashes, failures, and exclusions live under [`conformance/*/STATUS.md`](conformance) and in [`upstreams.lock.json`](upstreams.lock.json).

## 🌍 Platform scope

| Platform        | Current treatment                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| macOS arm64     | `parity_verified`; current source and packaging target                                                                       |
| macOS x64       | `planned / unverified`; compatibility CI retained, but no parity claim                                                       |
| Linux x64/arm64 | `planned / unverified`; upstream code, corpus, and non-blocking CI retained; no binary release                               |
| Windows x64     | `planned / unverified`; upstream `cfg(windows)` behavior, PowerShell corpus, and non-blocking CI retained; no binary release |

A Windows- or Linux-shaped case executed on macOS does not count as evidence for that operating system. A platform claim requires the pinned upstream oracle and candidate to run on the same real platform. We retain upstream platform branches and conformance entry points to avoid future reimplementation, but do not ship guessed compatibility code or unverified native binaries.

See [platform support and evidence](docs/platform-support.md) for the exact policy.

## 📁 Repository contents

```text
crates/                 native semantic engines
packages/<component>/   independently installable DSH plugins
conformance/<boundary>/ independent upstream oracles and compact corpora
docs/                   architecture, package contracts, and parity scope
research/               pinned DSH ecosystem plugin implementation study
scripts/                pin verification, packaging, and native staging
upstreams.lock.json     machine-readable Git and npm identities
```

Generated JSONL outputs, Cargo targets, package builds, and native binaries are not committed. Compact corpora and test-only upstream instrumentation remain in the repository so contributors can reproduce a parity claim.

## 🛠️ Development

```bash
pnpm check
```

Heavyweight conformance workflows are separate because they compile pinned upstream Codex crates. Package-specific commands and APIs are documented in each component README:

- [Execpolicy](packages/execpolicy/README.md)
- [Approval](packages/approval/README.md)
- [Apply-patch semantic engine](packages/apply-patch-engine/README.md)

## 🤝 Contributing

Issues and pull requests are welcome. A new component should own one clear subsystem, install independently, preserve DSH lifecycle semantics, pin its upstream identity, and include reproducible conformance evidence before claiming parity.

Start with [the component package contract](docs/component-package-contract.md), [the component map](docs/components.md), and [the DSH ecosystem compatibility study](docs/ecosystem-compatibility.md).

## 🔗 Upstream and independence

This is an independent community project. It is not affiliated with, endorsed by, or sponsored by OpenAI or DeepSeek.

OpenAI Codex and DeepSeek Harness remain separate upstream projects. Their names identify the systems being studied and integrated; they do not imply official status.

## 📄 License

Apache-2.0. See [LICENSE](LICENSE), [NOTICE](NOTICE), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), and [UPSTREAMS.md](UPSTREAMS.md).
