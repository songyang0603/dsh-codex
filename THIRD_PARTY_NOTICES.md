# Third-party notices

## OpenAI Codex

This repository uses and adapts portions of OpenAI Codex from commit
`086396f7f60347b74c82784d5dfaf4fb2d3bda12`. Codex is licensed under the
Apache License, Version 2.0. See `UPSTREAMS.md` and `upstreams.lock.json` for
the exact source boundaries and object identities.

The current copied/adapted behavior concerns execpolicy runtime, configuration,
and persistence. The approval protocol sidecar directly links the pinned
public Codex app-server protocol crate; its DSH lifecycle/state adapter is
independently written. The apply-patch semantic sidecar directly links the
pinned public apply-patch/filesystem implementation. Modified Rust source
carries prominent change notices. Direct Git dependencies remain upstream code.

Upstream Codex carries additional notices, including MIT-licensed
Ratatui-derived code. This repository does not currently copy that UI code. If
a future UI component does, its notice and license text must be added before
redistribution.

## DeepSeek Harness

The TypeScript packages use public DeepSeek Harness and Cordis plugin APIs.
DeepSeek Harness is licensed under the MIT License. No DeepSeek Harness source
is vendored into this repository.

The audited rc.5 source snapshot and the exact installed npm artifacts are
recorded separately. The rc.6 CLI is used by integration tests, and the rc.6
one-shot approval declaration is used only as a reduced compatibility-contract
fixture. No source-to-tarball identity is inferred for either artifact.

## Release inventories

`Cargo.lock` and `pnpm-lock.yaml` are committed. A binary or npm release must
also publish the applicable licenses/notices, checksums, and an SBOM. No binary
or npm release is claimed by the current source repository.
