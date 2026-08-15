# Platform support and evidence

Platform source retention, CI availability, published artifacts, and parity evidence are separate decisions. A configured runner or successful cross-compilation is not a parity result.

## Current matrix

| Platform    | Source and corpus                                           | CI                                   | Release artifact        | Parity status                                                  |
| ----------- | ----------------------------------------------------------- | ------------------------------------ | ----------------------- | -------------------------------------------------------------- |
| macOS arm64 | retained                                                    | required `macos-15` lane             | none; source build only | `parity_verified` for the three completed component boundaries |
| macOS x64   | retained                                                    | non-blocking `macos-15-intel` lane   | none                    | `planned / unverified`                                         |
| Linux x64   | retained                                                    | non-blocking `ubuntu-24.04` lane     | none                    | `planned / unverified`                                         |
| Linux arm64 | retained                                                    | non-blocking `ubuntu-24.04-arm` lane | none                    | `planned / unverified`                                         |
| Windows x64 | upstream `cfg(windows)` paths and dedicated corpus retained | non-blocking `windows-2022` lane     | none                    | `planned / unverified`                                         |

Only the macOS arm64 component tuples currently carry `parity_verified`:

- Execpolicy: runtime 68/68, config stack 6/6, host config 11/11, persistence 16/16, 18 adapter/Loader tests, and clean DSH rc.6 archive activation.
- Approval: upstream/source-pinned 43/43, adapter 10/10, 49 package tests, and clean archive activation with stale-token rejection.
- Apply-patch semantic engine: all 96 pinned upstream tests, differential 23/23, 10 native tests, 6 package/Loader tests, and clean archived-package mutation.

## Retention policy for unverified platforms

The repository retains:

- behavior directly inherited from pinned Codex crates, including `cfg(windows)` implementations;
- platform-specific conformance corpus and runner entry points;
- Windows PowerShell, shell detection, path, permission, and sandbox boundary designs;
- Linux and Windows CI lanes that can produce future evidence when they pass on real runners;
- explicit documentation that those platforms remain unverified.

The repository does not retain or distribute:

- unverified Windows or Linux native binaries;
- guessed TypeScript simulations written only to appear cross-platform;
- platform binaries inside macOS package archives;
- compatibility branches that cannot be traced to the pinned Codex behavior;
- local build caches.

A PowerShell-shaped case executed on macOS may traverse a generic path. It is corpus portability evidence, not Windows evidence. Windows parity requires the pinned upstream oracle and candidate to execute on Windows; Linux parity has the same-platform requirement.

## Distribution evidence

Source builds are authoritative. `pnpm native:stage` performs a real hello/provenance handshake and writes the current platform's binary plus checksum under each package. The macOS profile smoke packs that staged binary, installs the archive and exact Cordis peer into an isolated profile, checks the checksum and dependency versions, and boots DSH.

No npm package or GitHub binary release is claimed yet. A future release may contain only platform artifacts backed by executed same-platform evidence, with checksums, licenses/notices, and an SBOM.

The heavyweight `upstream-conformance.yml` remains manual because it builds pinned `codex-core`. Its results count only after execution and must be linked from current-state documentation.
