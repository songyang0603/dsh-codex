# Upstream sources

In repository checkouts, machine-readable identities live in
`upstreams.lock.json`; this document carries the human-readable package copy.

## OpenAI Codex

- Repository: <https://github.com/openai/codex>
- Pinned commit: `086396f7f60347b74c82784d5dfaf4fb2d3bda12`
- License: Apache-2.0

The execpolicy component directly depends on the pinned public crates under:

- `codex-rs/execpolicy`;
- `codex-rs/shell-command`;
- `codex-rs/config`;
- `codex-rs/exec-server`;
- `codex-rs/utils/absolute-path`, `utils/cli`, and `utils/home-dir`.

Its adapted private boundary is `codex-rs/core/src/exec_policy.rs` plus
`codex-rs/core/src/exec_policy/`. The source files name the fixed commit and
describe the modifications. Runtime, config-stack, host-config, and persistence
oracles compile the private upstream code with test-only instrumentation; they
never link the dsh-codex candidate into the oracle.

The lock records individual Git tree/blob identities rather than relying on the
commit alone. `scripts/verify-upstream-pins.mjs` checks those objects against a
Codex checkout, checks every direct Codex Cargo dependency revision and lock
resolution, and rejects external Rust dependency identities absent from the
pinned Codex lockfile.

The approval component additionally directly links the pinned public
`codex-app-server-protocol` crate and records its complete tree, v2 subtree,
Cargo lock, request/response blobs, core decision union, approval cache,
session handlers, network approval state, and app-server bridge. Its
independent oracle compiles the pinned core behavior with test-only
instrumentation; package-local tests are not used as the upstream oracle.

Apache-2.0 reuse requires the upstream license and notices to accompany
redistribution. Modified/adapted source carries prominent notices. A future
component must add its own exact paths and applicable third-party attribution;
this file does not pre-authorize omission.

## DeepSeek Harness

- Repository: <https://github.com/deepseek-ai/DeepSeek-Harness>
- Pinned source commit: `47f943859bef60e4160492346772ded9b24f765a`
- Source package version: `0.1.0-rc.5`
- License: MIT

The source pin defines the audited DSH/Cordis plugin and profile contracts. It
is not a claim about the newest npm dist-tag.

Installable packages use exact npm artifacts recorded separately in
`upstreams.lock.json`:

- `@deepseek-ai/dsh@0.1.0-rc.6` as the profile-installation test CLI;
- `@deepseek-ai/cordis@4.0.1`;
- `@deepseek-ai/cordis-plugin-loader@1.0.2`;
- `@deepseek-ai/cordis-plugin-include@1.0.6` as Cordis's auto-installed
  optional peer in the locked test graph;
- `@deepseek-ai/schemastery@3.18.1`.
- `@deepseek-ai/dsh-user-approval@0.1.0-rc.6` as an indirect compatibility
  contract fixture; installable dsh-codex packages do not depend on it.

The rc.6 CLI artifact exposes no `gitHead`, so it is not presented as a build of
the audited rc.5 CLI source tree. The verification script checks all audited
DSH source objects, direct package declarations, and every recorded pnpm
integrity; transitive/optional artifacts are marked as such in the lock.

`scripts/verify-dsh-artifact-contracts.mjs` reads the installed, integrity-pinned
rc.6 approval declaration and compares its exact four-value one-shot outcome
union with the reduced compatibility vocabulary declared locally. This
comparison does not promote the stock DSH one-shot service into a rich Codex
approval implementation.

The execpolicy package itself now depends only on Cordis and Schemastery at
runtime and Loader for its built-artifact test. It does not depend on
`dsh-tools` or the stock one-shot approval seam because it intentionally
exports no approximate Bash enforcement adapter.
