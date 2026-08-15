# Platform support boundary

Status: implemented

## Problem

The repository needs to distinguish current macOS parity from future platform work. Removing all Linux and Windows paths would discard pinned upstream behavior and conformance assets, while presenting configured runners or cross-platform-shaped fixtures as support would overstate the evidence.

## Decision

Platform source retention, CI, artifact publication, and parity claims are tracked separately.

macOS arm64 is the only current `parity_verified` platform for the three completed component boundaries. macOS x64, Linux x64/arm64, and Windows x64 remain `planned / unverified`.

Pinned upstream platform code, dedicated corpus, platform boundary designs, and CI entry points remain in the repository. Unverified platform jobs are non-blocking until they are promoted by executed same-platform oracle/candidate evidence. No unverified Linux or Windows native binary is published or included in a macOS package.

## Alternatives considered

- Deleting every Windows/Linux branch was rejected because it would remove low-cost upstream semantics and force future reimplementation.
- Calling a successful cross-compile or a generic macOS fixture platform evidence was rejected because it does not execute the operating system's real shell, path, permission, or sandbox behavior.
- Treating every planned platform CI failure as a macOS release blocker was rejected because it would conflate future evidence collection with the current supported tuple.

## Consequences

The required macOS arm64 lane remains release-blocking. Other platform lanes remain visible and useful but do not create a parity claim unless the pinned oracle and candidate both pass on that platform. Documentation and package contents must preserve this distinction.

## Testing / Verification

- README and `docs/platform-support.md` state the same platform matrix and evidence rule.
- CI retains macOS, Linux, and Windows entries and marks every unverified tuple non-blocking.
- Package-native directories contain only the locally staged `darwin-arm64` artifacts; generated binaries remain ignored by Git.
- `pnpm artifact:verify`, component-package verification, formatting, and repository diff checks run after the change.
