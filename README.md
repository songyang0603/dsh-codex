# dsh-codex

Codex rebuilt as independently installable DeepSeek Harness (DSH) components.
The project does not invoke the `codex` executable or use Codex as a subagent;
DSH owns the runtime and each package reproduces one pinned Codex subsystem.

The upstream reference is OpenAI Codex commit
`086396f7f60347b74c82784d5dfaf4fb2d3bda12`. A package may declare a narrow
component boundary, but behavior inside that boundary may not be weakened.

中文说明见 [README.zh-CN.md](README.zh-CN.md).

## Components

| Package                              | Responsibility                                                                                                           | Status                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `@songyang0603/dsh-codex-execpolicy` | policy/config loading, command classification, approval-requirement derivation, canonical migration and rule persistence | `0.1.0`; `parity_verified` on macOS arm64 source |
| `@songyang0603/dsh-codex-approval`   | rich approval wire, pending correlation and live-session cache                                                           | planned; not in the first release                |

`execpolicy` deliberately does not export a generic DSH `bash` enforcement
adapter. Stock DSH Bash cannot apply Codex `bypassSandbox`, managed-network,
rich-approval, and retry semantics without changing the observable behavior.
Those responsibilities belong to exact approval, shell, sandbox, and network
components. This is component separation, not a reduced Codex target.

See [docs/components.md](docs/components.md) for the full decomposition and
[docs/parity-standard.md](docs/parity-standard.md) for the completion rule.

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

## Use from a source checkout

Requirements: Node.js 22.19+, pnpm 10.19, and Rust 1.95.0.

```sh
pnpm install
pnpm native:stage
pnpm --filter @songyang0603/dsh-codex-execpolicy build
```

`native:stage` builds the current-platform Rust sidecar, verifies its protocol
and every pinned source identity, then places it in the package-local native
directory with a SHA-256 file. Generated binaries are intentionally ignored by
Git.

The execpolicy package declares a DSH bundle. With the DSH CLI installed:

```sh
dsh plugin --profile codex-dev add @deepseek-ai/cordis@4.0.1 ./packages/execpolicy
dsh --profile codex-dev --dump-config
```

The exact Cordis peer keeps the plugin on the DSH Context instance. The bundle
mounts `ctx.codexExecPolicy` and opens the canonical local Codex
policy stack. It does not yet turn a stock DSH agent into Codex by itself; later
components consume its exact semantic results.

This first release is source-only. No npm package or GitHub native-binary
release is claimed.

For API examples and configuration modes, see
[packages/execpolicy/README.md](packages/execpolicy/README.md).

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
