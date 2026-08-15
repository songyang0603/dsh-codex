# dsh-codex

Codex rebuilt as independently installable DeepSeek Harness (DSH) components.
The project does not invoke the `codex` executable or use Codex as a subagent;
DSH owns the runtime and each package reproduces one pinned Codex subsystem.

The upstream reference is OpenAI Codex commit
`086396f7f60347b74c82784d5dfaf4fb2d3bda12`. A package may declare a narrow
component boundary, but behavior inside that boundary may not be weakened.

中文说明见 [README.zh-CN.md](README.zh-CN.md).

## Components

| Package                                      | Responsibility                                                                                                           | Status                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `@songyang0603/dsh-codex-execpolicy`         | policy/config loading, command classification, approval-requirement derivation, canonical migration and rule persistence | `0.1.0`; `parity_verified` on macOS arm64 source |
| `@songyang0603/dsh-codex-approval`           | lossless rich approval wire, pending correlation and live-session cache                                                  | `0.1.0`; `parity_verified` on macOS arm64 source |
| `@songyang0603/dsh-codex-apply-patch-engine` | parsing, invocation recognition, verification, local mutation, and committed delta                                       | `0.1.0`; `parity_verified` on macOS arm64 source |

`execpolicy` deliberately does not export a generic DSH `bash` enforcement
adapter. Stock DSH Bash cannot apply Codex `bypassSandbox`, managed-network,
rich-approval, and retry semantics without changing the observable behavior.
Those responsibilities belong to exact approval, shell, sandbox, and network
components. This is component separation, not a reduced Codex target.

See [docs/components.md](docs/components.md) for the full decomposition,
[docs/component-package-contract.md](docs/component-package-contract.md) for
the package/state ownership rules, and
[docs/parity-standard.md](docs/parity-standard.md) for the completion rule.

## DSH ecosystem contract

This is a component monorepo, not one opaque plugin. Every independently
installable package ships its own `dsh.bundle.patch`, unique profile row,
compiled entry points, package-scoped instructions, and exact DSH peers. Test
and conformance sources stay in GitHub for contributors, while package archives
exclude them.

The repository root is not advertised as an installable bundle. Until a
versioned canonical composition profile exists, do not use
`github:songyang0603/dsh-codex` as though it installed every component. Source
checkouts use explicit package paths; future registry releases will use one npm
package per component and prebuilt platform artifacts where native code is
required.

These choices come from a pinned, per-plugin source study of both public
awesome lists and the `dsh-plugin` topic catalog, plus official rc.6 behavior.
See [docs/ecosystem-compatibility.md](docs/ecosystem-compatibility.md) for the
coverage, implementation records, conflicts between community installers, and
the rules we adopted.

## Approval evidence

The approval `0.1.0` macOS arm64 source-component tuple is
`parity_verified`. It matches all 43 independent upstream or source-pinned
cases and all 10 DSH-owned adapter contracts. Its mandatory native protocol
engine directly uses pinned Codex serde before JavaScript parses the subject,
preserving exact `i64::MAX` and 64-bit `usize::MAX` while their overflowing
neighbors remain rejected. It also passes 49 package tests and a clean DSH
rc.6 archive add/activate/remove check that verifies and boots the package-local
native binary, preserves lossless integers, and proves that a superseded
prompt's late response cannot approve its replacement. No failed case was
skipped or waived.

This exact boundary covers the rich command-approval wire, pending
correlation/cancellation, generic live-session approval cache, and execpolicy
amendment persistence-before-release. It does not claim the future rich UI,
canonical shell/sandbox/network consumer, complete app-server turn transport,
or unexecuted Linux/Windows platforms.

## Execpolicy evidence

The `0.1.0` macOS arm64 source-component tuple is `parity_verified`. It has
zero differences on four independent, instrumented upstream comparisons:

- runtime policy requirement: `68/68` cases;
- materialized config stack: `6/6` cases;
- real host config discovery: `11/11` cases;
- startup migration and rule persistence: `16/16` cases.

The Rust engine directly depends on the pinned public Codex crates. Private
`codex-core` behavior is adapted under prominent source notices and compared
with test-only instrumentation compiled inside a detached checkout of the same
commit. Candidate output never serves as its own oracle.

The compiled package also passes 18 TypeScript/native/real-Loader tests. A
separate smoke check packs the component, installs the archive and exact Cordis
peer into a clean DSH `0.1.0-rc.6` profile, verifies the packaged native binary
and checksum, then boots and unloads the real bundle. It cannot fall back to a
repository build.

These are bounded local results, not a complete-agent claim. The configured
Linux, macOS, and Windows CI matrix becomes platform evidence only after it has
actually run. Exact commands, hashes, failures, and exclusions are recorded
under `conformance/*/STATUS.md`.

## Apply-patch engine evidence

The `0.1.0` macOS arm64 semantic-engine tuple is `parity_verified`. The native
sidecar directly links the pinned public `codex-apply-patch` implementation;
all 96 upstream library/CLI/scenario tests pass. An independent 23-case oracle
then compares the production TypeScript client and native protocol against the
pinned public APIs, including parse/stream/invocation errors, raw output,
ordered committed deltas, partial failure, exact file bytes, Unix modes, and
no-follow symlink effects: `23/23` matched. The component also passes 10 native
tests, 6 TypeScript/native/real-Loader tests, and a clean DSH rc.6 archived
package add/activate/mutate/remove check using only the packaged native binary.

This claim is intentionally the semantic/filesystem engine only. Installing it
does not register an `apply_patch` model tool. Codex's freeform provider wire,
environment selection, safety, rich approval, platform sandbox/retry,
hooks/events, TurnDiff, agent/session behavior, and Linux/Windows execution are
separate unfinished boundaries.

## Use from a source checkout

Requirements: Node.js 22.19+, pnpm 10.19, and Rust 1.95.0.

```sh
pnpm install
pnpm native:stage
pnpm --filter @songyang0603/dsh-codex-execpolicy build
pnpm --filter @songyang0603/dsh-codex-approval build
pnpm --filter @songyang0603/dsh-codex-apply-patch-engine build
```

`native:stage` builds the current-platform Rust sidecar, verifies its protocol
and every pinned source identity, then places it in the package-local native
directory with a SHA-256 file. Generated binaries are intentionally ignored by
Git.

Each completed component package declares its own DSH bundle. With the DSH CLI
installed:

```sh
dsh plugin --profile codex-dev add ./packages/execpolicy
dsh plugin --profile codex-approval-dev add ./packages/approval
dsh plugin --profile codex-apply-patch-dev add ./packages/apply-patch-engine
dsh --profile codex-dev --dump-config
```

The exact Cordis peer resolves through the profile's own dependency fallback,
keeping the plugin on the DSH Context instance. The bundle mounts
`ctx.codexExecPolicy` and opens the canonical local Codex
policy stack. It does not yet turn a stock DSH agent into Codex by itself; later
components consume its exact semantic results.

These component releases are source-only. No npm package or GitHub
native-binary release is claimed.

For API examples and configuration modes, see
[packages/execpolicy/README.md](packages/execpolicy/README.md) and
[packages/approval/README.md](packages/approval/README.md). The semantic engine
API and its deliberate non-tool boundary are documented in
[packages/apply-patch-engine/README.md](packages/apply-patch-engine/README.md).

## Repository layout

```text
crates/                 native semantic engines
packages/<component>/   independently installable DSH components
conformance/<boundary>/ independent upstream oracles and durable corpora
docs/                   architecture, component ledger, and evidence scope
scripts/                pin verification and native staging
upstreams.lock.json     machine-readable Git and npm identities
```

Generated JSONL outputs, Cargo targets, package builds, and native binaries are
not committed. The small conformance corpora and oracle instrumentation are
source: they let contributors reproduce the parity claim.

## Development

```sh
pnpm check
```

The heavyweight pinned-upstream oracle workflow is separate because it builds
`codex-core` and may take substantial time.

This is an independent community project and is not affiliated with, endorsed
by, or sponsored by OpenAI or DeepSeek.

## License

Apache-2.0. See [LICENSE](LICENSE), [NOTICE](NOTICE),
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), and
[UPSTREAMS.md](UPSTREAMS.md).
