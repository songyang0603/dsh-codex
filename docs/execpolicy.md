# Execpolicy component

## Verification target

- Upstream: OpenAI Codex
  `086396f7f60347b74c82784d5dfaf4fb2d3bda12`
- Native crate: `crates/execpolicy-engine`
- DSH package: `@songyang0603/dsh-codex-execpolicy`
- Component version: `0.1.0`
- Protocol: `3`
- Current status: `parity_verified` for the macOS arm64 source-component tuple

## Exact boundary

Execpolicy answers: given Codex config/policy state and canonical command facts,
what policy applies, what approval requirement follows, and how do approved
policy amendments change the canonical policy store?

It owns:

- local host config discovery and layer precedence;
- materialized config-stack composition and provenance;
- requirements-policy composition, most-restrictive overlay and fallback;
- sorted rule-file discovery and Extended Starlark parsing;
- command lowering, heuristics, rule matching and reason strings;
- approval requirement and amendment derivation;
- startup prefix migration;
- prefix/network amendment persistence and current-manager updates;
- network-domain compilation.

It does not own:

- displaying or correlating a human prompt;
- `ApprovedForSession` cache lifecycle;
- process/PTY launch and retry;
- sandbox enforcement;
- a live managed-network proxy;
- online cloud authentication/fetch/refresh.

Those exclusions are separate state owners, not missing shortcuts inside this
component.

## Implementation

Public semantics are linked directly from immutable Git dependencies:

- `codex-execpolicy`;
- `codex-shell-command`;
- `codex-config`;
- `codex-exec-server`;
- Codex absolute-path, CLI and home-directory utilities.

`codex-core` runtime and manager methods are private. The minimal required logic
is adapted in Rust with an in-file modification notice. Independent oracle
harnesses compile the private upstream methods in a detached clone and compare
canonical JSON with the production sidecar.

The sidecar is long-lived so policy state, update ordering and manager-local
behavior are preserved. The TypeScript client rejects a protocol/source
identity mismatch before loading any policy, caps line size and pending
requests, validates the runtime discriminated union, and poisons the client on
malformed native output.

## Loading and persistence

`load_host_config_stack` invokes the pinned public host loader but does not
perform migration. `open_host_policy` follows Codex startup order:

1. discover and materialize the host layer stack;
2. attempt the one-shot banned-prefix migration unless user/project policy is
   ignored;
3. load the resulting policy with requirements fallback;
4. retain `$CODEX_HOME/rules/default.rules` as the only update path.

Prefix amendment persistence is disk-first. If disk append fails, memory is not
updated. A narrower prefix can be written even when a wider in-memory allow
already covers it, matching upstream. Network lines deduplicate on disk while a
same-manager repeated append can remain duplicated in memory until reopen.
Separate managers do not broadcast changes. These upstream quirks are covered
by the persistence oracle and intentionally preserved.

There is no invented file watcher or generic reload promise. Reopening a host
policy constructs current state; in-manager semantic append methods update the
current policy according to pinned behavior.

## Current independent evidence

| Boundary                          | Oracle                                           | Local macOS arm64 result |
| --------------------------------- | ------------------------------------------------ | ------------------------ |
| runtime approval requirement      | crate-private `ExecPolicyManager` runtime method | `68/68`                  |
| config stack                      | pinned core/config composition                   | `6/6`                    |
| real host discovery               | public loader plus private policy discovery/load | `11/11`                  |
| startup migration and persistence | private manager/migration/amend methods          | `16/16`                  |

Each harness verifies the fixed commit and relevant Git objects, applies
test-only instrumentation to a detached shared clone, validates complete JSONL
identity/shape, then compares against a freshly launched production sidecar.
The repository contains corpus and instrumentation source but not generated
oracle/candidate output.

The runtime oracle compares Codex's returned `ExecApprovalRequirement` exactly.
Adapter-only introspection fields such as lowered commands and parse origin are
validated by local protocol tests but are not presented as Codex-returned API
surface.

The host corpus covers profile-v2, CLI precedence, project trust, rule ordering,
ignore flags, supplied cloud config/requirements, parse fallback and a Unix
symlink. Isolated system/MDM injection, online cloud bootstrap, linked Git
worktrees and native Windows link semantics are not claimed by that corpus.
System/MDM discovery still runs through the direct pinned public loader in
production; it simply lacks isolated fixture evidence here.

Exact commands, hashes and negative checks are in:

- `conformance/upstream-runtime/STATUS.md`;
- `conformance/config-stack/STATUS.md`;
- `conformance/host-config/STATUS.md`;
- `conformance/persistence/STATUS.md`.

## DSH contract

The package default export is a Cordis Service. A real
`@deepseek-ai/cordis-plugin-loader` test imports the compiled `lib/index.js`,
waits for handshake and initial load, calls the service, unloads the row, and
verifies the retained service reference is closed.

The package also declares `dsh.bundle.patch`. Its patch mounts only the semantic
service with canonical local host discovery. It does not insert a stock Bash
adapter. Future exact consumers will inject `codexExecPolicy` and act on the
returned union.

The source-install check packs `0.1.0`, installs the archive plus exact Cordis
peer into a clean DSH `0.1.0-rc.6` profile, verifies that the installed package
and native checksum are not workspace fallbacks, then boots and unloads the
real bundle. This proves independent component activation, not default-base or
whole-agent composition parity.

## Outside the current verification tuple

- push the source so the configured OS/architecture matrix can actually run;
- run the heavyweight upstream workflow on each claimed platform;
- publish/aggregate native artifacts only after their checksums, notices and
  SBOM are available.

These distribution and additional-platform items do not change the already
compared macOS component semantics; they limit the scope of any current parity
declaration.
