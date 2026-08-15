# Platform support and evidence

A configured runner is not a passing result. Component parity is recorded per
platform.

## Execpolicy source component

| Platform           | Evidence host       | Current evidence                                                                                                                                                                          |
| ------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| macOS arm64        | local Apple silicon | `0.1.0` source component `parity_verified`; runtime 68/68, config stack 6/6, host config 11/11, persistence 16/16; 18 adapter/Loader tests; clean archived-package activation in DSH rc.6 |
| macOS arm64 remote | `macos-15`          | CI configured; no completed run recorded                                                                                                                                                  |
| macOS x64          | `macos-15-intel`    | CI configured; no completed run recorded                                                                                                                                                  |
| Linux x64          | `ubuntu-24.04`      | CI configured; no completed run recorded                                                                                                                                                  |
| Linux arm64        | `ubuntu-24.04-arm`  | CI configured; no completed run recorded                                                                                                                                                  |
| Windows x64        | `windows-2022`      | CI configured; no completed run recorded                                                                                                                                                  |

The local macOS host-config run executed the Unix symlink case. The corpus keeps
that case on Windows but requires oracle and candidate to emit the same explicit
`requires_unix_symlinks` skip; every other host case still runs. This explicit
skip is runner behavior, not evidence that Windows has already passed.

Windows is separately material because the pinned shell-command crate compiles
PowerShell parsing and host-executable behavior conditionally. A Unix run cannot
establish that row. Linux sandbox behavior is outside the execpolicy boundary,
but Linux path/config behavior and native process packaging still require their
own run.

## Approval source component

| Platform           | Evidence host       | Current evidence                                                                                                                                                                              |
| ------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| macOS arm64        | local Apple silicon | `0.1.0` source component `parity_verified`; upstream/source-pinned 43/43, adapter 10/10, 49 package tests, clean archived-package activation and stale superseded-token rejection in DSH rc.6 |
| macOS arm64 remote | `macos-15`          | CI configured; no completed run recorded                                                                                                                                                      |
| macOS x64          | `macos-15-intel`    | CI configured; no completed run recorded                                                                                                                                                      |
| Linux x64          | `ubuntu-24.04`      | CI configured; no completed run recorded                                                                                                                                                      |
| Linux arm64        | `ubuntu-24.04-arm`  | CI configured; no completed run recorded                                                                                                                                                      |
| Windows x64        | `windows-2022`      | CI configured; no completed run recorded; `usize` width and native archive behavior require their own execution                                                                               |

The verified boundary owns the pinned rich request/response wire, pending
correlation and cancellation, generic live-session approval cache, and
execpolicy-amendment persistence-before-release. Rich UI, shell/sandbox/network
effects, complete app-server turn transport, and other operating systems remain
separate claims.

## Distribution evidence

Source builds are currently authoritative. `pnpm native:stage` performs a real
hello/provenance handshake and writes the platform-local binary plus checksum
under the package. The profile smoke packs that staged binary, installs the
archive and exact Cordis peer into an isolated profile, checks the installed
checksum and dependency versions, and boots DSH. CI runs the same path after a
release build.

No npm package or GitHub binary release is claimed yet. A future binary release
must aggregate the supported target artifacts, checksums, licenses/notices and
an SBOM; a passing source component does not imply that an artifact was
published.

The heavyweight `upstream-conformance.yml` is manual because each platform
builds pinned `codex-core`. Its results must be linked here after execution;
the workflow file itself is not evidence.
