# Platform support and evidence

`dsh-codex` currently targets macOS. Platform parity is recorded only for a component tuple whose evidence actually ran; a configured runner or successful cross-compilation is not a parity result.

## Component evidence

| Component                   | Platform    | Evidence host       | Current evidence                                                                                                                                                                              |
| --------------------------- | ----------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Execpolicy                  | macOS arm64 | local Apple silicon | `0.1.0` source component `parity_verified`; runtime 68/68, config stack 6/6, host config 11/11, persistence 16/16; 18 adapter/Loader tests; clean archived-package activation in DSH rc.6     |
| Approval                    | macOS arm64 | local Apple silicon | `0.1.0` source component `parity_verified`; upstream/source-pinned 43/43, adapter 10/10, 49 package tests, clean archived-package activation and stale superseded-token rejection in DSH rc.6 |
| Apply-patch semantic engine | macOS arm64 | local Apple silicon | `0.1.0` source component `parity_verified`; 96/96 pinned upstream tests, differential 23/23, 10 native tests, 6 package/Loader tests, clean archived-package mutation in DSH rc.6             |
| All three components        | macOS arm64 | `macos-15`          | CI build, test, staging, profile, and package lane; a run supplements but does not replace the independent parity corpora above                                                               |
| All three components        | macOS x64   | `macos-15-intel`    | CI build, test, staging, and profile compatibility lane; no `parity_verified` claim until the independent corpora run on x64                                                                  |

Linux and Windows are outside the current support claim. Their conditional shell parsing, path behavior, sandbox implementations, permissions, symlink or reparse-point effects, native packaging, and operating-system errors are not inferred from macOS evidence.

## Distribution evidence

Source builds are currently authoritative. `pnpm native:stage` performs a real hello/provenance handshake and writes the macOS platform-local binary plus checksum under each package. The profile smoke packs that staged binary, installs the archive and exact Cordis peer into an isolated profile, checks the installed checksum and dependency versions, and boots DSH.

No npm package or GitHub binary release is claimed yet. A future binary release must aggregate the supported macOS artifacts, checksums, licenses/notices, and an SBOM; a passing source component does not imply that an artifact was published.

The heavyweight `upstream-conformance.yml` is manual because it builds pinned `codex-core`. Its results must be linked here after execution; the workflow file itself is not evidence.
