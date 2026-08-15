# Priority DSH plugin architecture synthesis

This note is the source-level synthesis for the DSH plugins most directly
related to rebuilding Codex as independently installable components. It is not
the exhaustive inventory: the per-list scanners and review matrices live in
`list-a/` and `list-b/`. Every observation below is tied to a fixed repository
commit so a later upstream rewrite does not silently change the evidence.

## Scope and evidence rule

The community plugins are implementation examples, not Codex parity oracles.
They can teach us how to compose with Cordis and DSH, but only the pinned Codex
source and differential harness may define a `parity_verified` component.

For each sample we inspected the package manifest, bundle patch, runtime entry,
state/lifecycle implementation, tests, and release surface when present. A
compiled-only package is marked as such; its README claims are not treated as
source-level proof.

## Approval and policy plugins

### `dsh-approval-llm`

- Repository: [`yuan3211/dsh-approval-llm`](https://github.com/yuan3211/dsh-approval-llm)
- Reviewed commit: `af70355a3c48c15f1ec8ac31c39fa279e895c168`
- Relevant files: `src/index.ts`, `src/reviewer.ts`, `src/context.ts`,
  `src/routing.ts`, `tests/plugin.test.ts`, `cordis.patch.yml`

The useful design is its separation of deterministic routing from model
judgment. A deny list wins over the allow list, a human-only route delegates to
the next answerer, and only the remaining requests reach a separate reviewer
model. Timeout, parse failure, and provider failure delegate rather than forge
a policy decision. The reviewer receives JSON-framed evidence and a policy that
is not shown to the main agent. A per-session consecutive-denial breaker also
hands authority back to a human.

For `dsh-codex`, this means a future Codex reviewer belongs in a separate
component layered over the exact approval semantic service. It must not be
embedded into `packages/approval`, because the pinned Codex request/decision
protocol and the optional reviewer policy have different state and authority.
The community plugin's heuristic policy is not copied and cannot establish
Codex reviewer parity.

### `dsh-auto-approve`

- Repository: [`KeQiao12/dsh-auto-approve`](https://github.com/KeQiao12/dsh-auto-approve)
- Reviewed commit: `c4206726634e919a3743684e9ecdcfdd8831c58f`
- Relevant files: `src/index.ts`, `src/classifier.ts`, `src/evidence.ts`,
  lifecycle tests, `cordis.patch.yml`

This plugin is strongest at authority handoff and teardown. It checks
cancellation before and after classification and again before returning an
allow. It closes admission, aborts active classifications, and drains their
promises on unload. Its classifier consumes actual tool arguments and the most
recent genuine user message, bounds the evidence, uses a tiny response
vocabulary, and delegates uncertain or failed classifications to the human
chain. Its in-memory report is explicitly non-authoritative; DSH approval
events remain the audit source.

We already applied the lifecycle lesson to `packages/approval`: a finalizing
amendment persistence operation stays owner-visible and unload waits for
quiescence. The exact Codex approval service must continue checking authority
at the final grant boundary, not merely when a request is created.

### `dsh-permission-rules`

- Repository: [`fritze250/dsh-permission-rules`](https://github.com/fritze250/dsh-permission-rules)
- Reviewed commit: `b509ba24336791a18ae6f0ce64749d10f2ac50d9`
- Relevant files: `src/index.ts`, rule compiler/loader/cache modules,
  `tests/**`, `cordis.patch.yml`

The implementation keeps the `tools/pre-execute` hot path precompiled and free
of filesystem I/O. It uses ordered first-match rules, bounded glob/rule/input
sizes, canonical workspace paths, Windows case folding, an LRU workspace
cache, and watches both existing rule files and absent candidate paths. A bad
hot reload retains the previous good generation, while initial invalid
configuration can fail loudly. Dry-run is observational and always delegates
to `next()`.

This is a good DSH integration pattern, but its rule language is not Codex
execpolicy. `packages/execpolicy` therefore keeps the Rust parser/runtime and
Codex config stack as the semantic authority. The reusable lesson is
generation-based reload: construct and validate a complete next generation,
then swap it atomically while in-flight calls finish on the old generation.

## Session, subagent, rewind, and durable-state plugins

### `dsh-background-agents`

- Repository: [`omdsh-dev/dsh-background-agents`](https://github.com/omdsh-dev/dsh-background-agents)
- Reviewed commit: `54ec7fc06b27347cdc42c5ea987d37d9692b8dc9`
- Relevant files: `ARCHITECTURE.md`, `src/index.ts`, `src/tools.ts`,
  `src/lifecycle.ts`, `src/projection.ts`, `tests/integration.spec.ts`

The plugin cleanly separates durable facts, model-visible notices, live
bookkeeping, and UI projection. Structured ignorable session facts and the
official child catalog are authoritative; the in-memory lifecycle owns only
throttle/idle watermarks. The UI is a pure projection over replayable facts and
uses official session/subagent APIs for actions. Concurrent child starts for a
parent are serialized around count + cap check + start, preventing a race that
would exceed the configured cap.

For future `subagents`, `thread/session`, and UI components, `dsh-codex` should
declare every field as one of: durable source of truth, replay projection,
live cache, or presentation-only state. A UI package must not become the owner
of child/session semantics, and process loss must not destroy durable catalog
facts.

### `dsh-checkpoint-rewind`

- Repository: [`omdsh-dev/dsh-checkpoint-rewind`](https://github.com/omdsh-dev/dsh-checkpoint-rewind)
- Reviewed commit: `98a51d8d766842fdbd1cfda8e3e6c38b9b4eeced`
- Relevant files: `ARCHITECTURE.md`, `index.mjs`, `lib/providers/**`,
  `lib/projection.mjs`, `test/**`

Its pre-mutation listeners use `{ prepend: true }` to observe before mutation
but always return `next()`, so checkpointing does not steal the single policy
decision slot. One in-flight snapshot is shared per session/turn/step. File
restore and session fork are deliberately separate phases; a fork failure is
reported as a partial outcome instead of being described as an atomic
rollback. A pre-rewind guard makes the restore itself reversible. Provider
registrations are effects, persisted records are validated at the boundary,
and unknown session-event support is detected rather than assumed.

This directly informs the future Codex checkpoint/rollback component: it may
observe shell/fs mutation seams, but approval and execpolicy remain the policy
owners. File restoration granularity and session-fork granularity must remain
separate, and any partial transaction must be represented explicitly.

### `dsh-turn-rewind`

- Repository: [`Anionex/dsh-turn-rewind`](https://github.com/Anionex/dsh-turn-rewind)
- Reviewed commit: `27ebefa76a2d39b0ecb8f6f92b33946b4a575500`
- Relevant files: `src/engine.ts`, `src/store.ts`, `src/snapshot.ts`,
  `src/rewind-host.ts`, `docs/FORMAT.md`, `tests/**`

This is a more durable restore engine: content-addressed blobs, validated
manifests, per-workspace locks with stale-owner checks, atomic state writes,
pre-restore rescue points, operation journals, post-restore hash verification,
and rollback/recovery states. A preview mints an expiring session-bound plan;
the mutation call must present the matching reviewed plan. It refuses path
escape, symlink-parent traversal, unmanaged-file replacement, active-session
conflicts, and in-progress Git operations. Conversation rewind creates a child
session because DSH logs are append-only.

The pattern to preserve is not its exact file format; it is the split between a
reusable durable `ChangeLedger` service and the Web/host rewind consumer. The
future Codex rollback service should likewise expose semantic operations while
the canonical shell/session consumer owns when those operations run.

## Memory and live configuration

### `dsh-mnemon`

- Repository: [`omdsh-dev/dsh-mnemon`](https://github.com/omdsh-dev/dsh-mnemon)
- Reviewed commit: `ade5a7b395f2d0578ae1d8807b8df7d54ac03c3c`
- Relevant files: `docs/en/architecture.md`, `docs/en/storage-model.md`,
  `src/index.ts`, `src/live-runtime.ts`, `src/lifecycle.ts`, `tests/**`

The host entry is a composition root rather than a monolith. It builds a
complete runtime graph, validates it during settings preparation, and swaps a
stable proxy to the new generation in one JavaScript turn. In-flight methods
remain bound to the generation from which they started. It distinguishes
runtime memory, managed documents, and long-term stores, naming one
authoritative source and any derived projections for each layer. Browser
writes pass through typed host RPC and explicit authority checks; the browser
never opens SQLite or spawns the CLI.

For the later Codex memory/context components, we should not publish one
catch-all `memory` package. Candidate boundaries are runtime/world state,
project instruction/documents, and durable memory/index storage. Hot settings
updates should use prepared generation swaps, not mutate a live graph field by
field.

## Provider and tool integrations

### `dsh-codex-provider`

- Repository: [`Hu9956/dsh-codex-provider`](https://github.com/Hu9956/dsh-codex-provider)
- Reviewed commit: `15d8c9ecadbf1faba5fe3ed14f920cb74975b20b`
- Evidence boundary: compiled `lib/index.js` and `lib/client.js`; no source or
  tests were present in the reviewed snapshot.

The package demonstrates a real DSH host/client split, credentials-service
storage, settings activation, a cross-process refresh lock, refresh-token
rotation, abortable login/refresh tasks, and unload draining. It is an OAuth
and provider adapter only: the Codex agent loop, tools, approvals, sandbox,
sessions, and UI do not move into DSH. Because the reviewed repository is
compiled-only and calls an internal backend, it is not a source oracle for our
model-provider component.

The useful boundary is that authentication/token rotation should be its own
credential/provider component. The model adapter should consume a credential
reference and must not own login UI or plaintext token presentation.

### `dsh-codex-tools`

- Repository: [`SPYQWER1/dsh-codex-tools`](https://github.com/SPYQWER1/dsh-codex-tools)
- Reviewed commit: `6da8a204359e7822308845d755122cb1024b91a9`
- Relevant files: `index.js`, `tools.js`, `scripts/codex-common.mjs`,
  transport scripts, `test/tools.test.mjs`

This bundle registers web search, image generation, and vision tools and moves
large prompts/tokens through environment variables into bounded subprocesses,
avoiding shell-quoting corruption. It validates tool inputs and emits one JSON
result line. It also illustrates the limit of a wrapper: the scripts directly
target an undocumented ChatGPT backend, implement their own protocol subsets,
and have no pinned Codex differential suite.

`dsh-codex` may reuse the packaging pattern, but not the semantic claim. Exact
Codex tools should reuse pinned upstream crates or copied pinned logic behind a
versioned JSONL protocol and be tested against upstream behavior. Credentials
must not be duplicated across independent tools.

### `dsh-tool-turbo`

- Repository: [`Electricitysheep/dsh-tool-turbo`](https://github.com/Electricitysheep/dsh-tool-turbo)
- Reviewed commit: `4932bb78f7d191e79ea09e905d66369411446d00`
- Relevant files: `src/index.ts`, `src/effort-decision.ts`,
  `tests/effort-decision.spec.ts`, `package.json`

This small project shows the value of keeping a policy pure and independently
testable, but it is not an installable DSH bundle at this snapshot: the package
is private, points `main` at TypeScript source, and has no `dsh.bundle.patch`.
Its heuristic reads only string-shaped arguments and its telemetry map has no
explicit teardown. We retain the pure-policy lesson but reject it as a package
or lifecycle template.

## Presets and package scaffolding

### `dsh-plans`

- Repository: [`Optim-Agent/dsh-plans`](https://github.com/Optim-Agent/dsh-plans)
- Reviewed commit: `2bac9907edc7d6a0b5f57360204230c6f6257c42`
- Relevant files: `agent.cordis.yml`, `lib/plan-subagents.js`, `skills/**`,
  `scripts/dsh_plans_state.py`

This is an agent preset, not a normal package bundle. Its strongest pattern is
composition: it reuses official services/tools, disables the conflicting stock
plan group, contributes a narrow subagent tool, and makes reviewer children
read-only through a structural deny list rather than prompt text alone. Public
plan artifacts and private machine state are stored separately.

For the eventual all-components `dsh-codex` profile, this is evidence that the
canonical Codex composition should remain a separate bundle/preset. Component
packages must not silently patch unrelated stock rows; the canonical profile
is the one place that replaces stock consumers and proves end-to-end parity.

### `dsh-suite` and `create-dsh-plugin`

- Repository: [`whyihaveyou/dsh-suite`](https://github.com/whyihaveyou/dsh-suite)
- Reviewed commit: `38bb785e8b962f748052a33ecb61262e5ef92447`
- Relevant files: `packages/create-dsh-plugin/**`,
  `docs/plugin-dev-guide.en.md`, `scripts/risk-scan.mjs`,
  `scripts/compat-check.mjs`

The scaffold tests the generated manifest, unique bundle row, exact DSH tool
version, compiled entry, and a real temporary-profile `plugin add` /
`dump-config` flow. The suite also distinguishes catalog metadata, install
compatibility, and static risk signals. Some tutorial claims are broader than
the official runtime contract, so we use the executable templates/checks as
evidence and not every explanatory sentence.

This reinforced the repository-wide `ecosystem:check` and clean-profile smoke
tests already added to `dsh-codex`. Our stricter additions remain necessary:
fixed upstream object hashes, native artifact identity, real built-artifact
Loader tests, archive allowlists that exclude tests, and parity status that is
independent of catalog visibility.

## Repository changes derived from these implementations

Every component should converge on the following ownership layout:

```text
packages/<component>/
  src/
    index.ts          # DSH/Cordis composition only
    service.ts        # semantic service and lifecycle ownership
    client.ts         # optional native sidecar client
    types.ts          # public component vocabulary
  tests/              # source repository only; excluded from package archive
  cordis.patch.yml
  README.md
  UPSTREAMS.md
  THIRD_PARTY_NOTICES.md

crates/<component>-engine/
  src/                # pinned lossless/native semantics
  tests/              # protocol and upstream differential contracts

conformance/<component>/
  corpus + pinned upstream oracle + candidate + strict comparator
```

The rules behind that layout are:

1. One component owns one semantic state/effect boundary. Optional reviewer,
   UI, profile, and compatibility adapters stay separate from the exact core.
2. Durable source, derived projection, live cache, and presentation state are
   named explicitly. A cache is never described as persistent state.
3. A waterfall has one policy owner. Observers use pass-through middleware and
   cannot consume approval/execpolicy authority.
4. Non-Cordis async work closes admission, aborts when cancellation is part of
   the contract, and remains owner-visible until it drains.
5. Hot configuration is prepared and validated as a whole generation before
   an atomic swap.
6. Native or lossless protocol semantics cross a versioned, fail-closed JSONL
   boundary. TypeScript does not reinterpret integers, rule languages, or
   platform parsers that require exact upstream behavior.
7. A component archive contains runtime artifacts, bundle metadata,
   instructions, license/notices, provenance, and platform identity. Tests and
   conformance stay in GitHub source, not the consumer archive.
8. The future canonical `dsh-codex` profile owns stock-component replacement
   and end-to-end composition parity. Installing a semantic component alone
   must never claim execution effects supplied only by that profile.

## Immediate impact on the approval component

The ecosystem review supports, rather than changes, the current direction:

- keep `CodexApprovalService` as the semantic owner;
- add the pinned Rust protocol engine inside the same package for lossless raw
  JSON ingress and exact `i64`/`usize` handling;
- keep the DSH one-shot adapter explicitly degraded and non-authoritative;
- retain the quiescent finalizer lifecycle proven by real archive unload;
- do not add reviewer heuristics or a rich Web UI until their own Codex
  boundaries and conformance suites exist;
- do not mark approval complete until raw-wire differential is 41/41 and the
  packaged native binary passes real Loader/profile activation.
