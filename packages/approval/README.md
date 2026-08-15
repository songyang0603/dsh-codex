# `@songyang0603/dsh-codex-approval`

Rich command-approval protocol and in-memory approval state for the Codex
subsystem pinned at commit
`086396f7f60347b74c82784d5dfaf4fb2d3bda12`, exposed as a Cordis service for
DeepSeek Harness.

Status: **`parity_verified` for the `0.1.0` macOS arm64 source-component
tuple**. The independent pinned-Codex comparison is `43/43`, and the
separately classified DSH-owned adapter contract is `10/10`: the
raw app-server subject crosses into the directly pinned Rust serde before any
JavaScript parse, so exact `i64::MAX` and 64-bit `usize::MAX` values remain
distinguishable from their rejected overflowing neighbors. No failure was
skipped or weakened. This bounded result is not a claim of shell, sandbox,
network, whole-session, UI, or complete-agent parity.

The package ships a DSH bundle manifest. Adding its archive to a profile mounts
the `codexApproval` service; it does not install or pretend to provide a rich
approval UI, shell consumer, sandbox, or network-policy coordinator.

## Install from this checkout

This package is still under conformance work and has not been released to npm.
For local integration testing, run these commands at the repository root:

```sh
pnpm install
pnpm native:release-build
node scripts/stage-approval-native.mjs
pnpm --filter @songyang0603/dsh-codex-approval build
dsh plugin --profile codex-approval-dev add ./packages/approval
dsh --profile codex-approval-dev --dump-config
```

The package archive contains compiled runtime files, the current platform's
checksummed native protocol engine, and `cordis.patch.yml`; it does not publish
its tests or conformance harness. Installation mounts only the approval service
described below. It does not turn a stock DSH profile into a Codex-equivalent
coding agent. Cordis remains an exact `4.0.1` peer and resolves through the DSH
profile's own dependency fallback, so the plugin shares DSH's Context instance
instead of asking users to add another runtime package.

## What this package owns

- The pinned app-server v2 `CommandExecutionRequestApprovalParams` wire,
  including `additionalPermissions` and ordered `availableDecisions`.
- A mandatory JSONL sidecar that directly uses the pinned
  `codex-app-server-protocol` Rust crate, validates its source identity at
  startup, and returns canonical JSON plus exact integer lexemes.
- The pinned `CommandExecutionApprovalDecision` union.
- The pinned core `ReviewDecision` to v2 conversion and the inverse app-server
  response bridge, including exact rejection strings and declined/failed
  command completion statuses.
- The exact legacy fallback order when `availableDecisions` is absent:
  - normal command: `accept`, optional execpolicy amendment, `cancel`;
  - additional permissions: `accept`, `cancel`;
  - network: `accept`, `acceptForSession`, first proposed allow amendment,
    `cancel`.
- Rich pending request correlation, `AbortSignal` cancellation, prompt
  withdrawal, late-answer discard, and fail-closed runtime validation.
- The generic `ApprovedForSession` all-keys cache. Cache keys are opaque,
  canonical strings supplied by the consumer.
- Coordination of an accepted execpolicy amendment: attempt persistence before
  releasing the command; if persistence fails, emit a warning and return only
  an approved-once authorization.

The package does not derive shell approval keys. A canonical shell consumer
must include every upstream key field—such as session/environment, argv, cwd,
sandbox permissions, additional permissions, and tty where applicable—inside
its opaque canonical key.

## Live-session cache lifecycle

`ApprovedForSession` is deliberately not a durable event or resumable grant.
Create one non-serializable handle for each live session:

```ts
const cache = ctx.codexApproval.createSessionCache();
const key = ApprovalCacheKey(canonicalSerializedShellApprovalKey);

const resolution = await ctx.codexApproval.request({
  params,
  sessionCache: cache,
  sessionCacheKeys: [key],
});

ctx.codexApproval.closeSessionCache(cache);
```

A resumed session must call `createSessionCache()` again. Unknown, closed, or
foreign handles fail closed. Empty key arrays bypass lookup and storage, as in
the pinned generic Codex cache. Network approvals are explicitly rejected from
this generic cache: their host/port/environment cache, pending coalescing,
commit lock, and managed-proxy state belong to the canonical network
coordinator.

## Rich answerer transport

External app-server JSON must use the lossless ingress. `requestJson()` keeps
the subject as a string until pinned Rust serde accepts and canonicalizes it;
integer JSON Pointers outside the safe JavaScript range are then represented as
`bigint` inside the service. `respondJson()` applies the same rule to response
envelopes:

```ts
const resolution = await ctx.codexApproval.requestJson({
  rawJson: rawCommandExecutionRequestApprovalParams,
  signal,
});

await ctx.codexApproval.respondJson(
  prompt.requestId,
  rawCommandExecutionRequestApprovalResponse,
);
```

The returned parse object also retains `canonicalJson` and
`integerLexemes[{ pointer, decimalLexeme }]` for exact replay. `bigint` is an
in-process semantic value, not a JSON encoding; consumers must use the retained
canonical JSON instead of calling `JSON.stringify()` on the reconstructed
object. The object-mode `request()`/`respond()` methods remain available for
already parsed internal values; wide integers must already be `bigint` because
a rounded JavaScript `number` cannot be repaired.

The Cordis waterfall carries the complete immutable prompt. An answerer either
delegates with `next()` or returns `claimed` and later settles the exact
correlation id:

```ts
ctx.on("codex-approval/request", async (prompt, next) => {
  if (!transportOwns(prompt.params.threadId)) return next();

  void transport.present(prompt).then((decision) => {
    ctx.codexApproval.respond(prompt.requestId, decision);
  });
  return "claimed";
});
```

The service scopes `approvalId ?? itemId` by `threadId` as an internal
supersession ownership key. Every outbound prompt receives a separate fresh,
opaque correlation id. Registering a second request with the same owner key
supersedes and cancels the first, while a late response carrying the first
prompt's token is ignored and cannot approve its successor.

`respond()` accepts any valid pinned decision. The ordered choices are a
presentation contract, not an authorization allowlist: the pinned app-server
also accepts a valid programmatic decision that was not offered, including
`accept` after an explicitly empty list. A malformed decision settles the known
request with a fail-closed decline. An unknown or already-settled id is ignored
and can never grant another request. `prompt.signal` aborts when the request is
answered, cancelled, or disposed, so a transport can remove stale UI.

The wire parser preserves an explicitly empty or duplicate
`availableDecisions` vector because the pinned serde contract permits both. A
duplicate or empty vector reaches the transport unchanged. Unknown object
fields are ignored, missing optional children are canonicalized, and the
legacy `current_working_directory` special path is emitted as `project_roots`,
matching pinned serde behavior.

## Execpolicy amendment coordination

The service does not parse rules or choose a file path. The shell/profile
consumer supplies the semantic persistence operation:

```ts
const resolution = await ctx.codexApproval.request({
  params,
  execpolicyAmendmentCoordinator: {
    // Integration-owned semantic operation; this package does not choose a
    // policy path or invent a weaker append API.
    persistExecpolicyAmendment: persistUsingCanonicalExecpolicyStore,
  },
});
```

For an accepted amendment, `request()` waits for the coordinator. Success is
reported as `amendmentPersistence.kind === 'persisted'`. Failure emits
`codex-approval/warning`, logs a warning, and returns
`kind === 'approved_once'` with `amendmentPersistence.kind === 'failed'`.
This matches the pinned ordering: a disk failure must not falsely record a
future rule, but it does not revoke the user's one-shot approval of the current
command.

## DSH rc.6 compatibility backend

`@deepseek-ai/dsh-user-approval@0.1.0-rc.6` can return only
`allowed-once`, `rejected`, `cancelled`, or `unavailable`. It cannot represent
`acceptForSession`, an execpolicy amendment, or a network amendment.

`createDshOneShotCompatibilityBackend()` therefore advertises a reduced
capability object. It maps `allowed-once` to `accept`, maps DSH `cancelled` to
Codex `cancel`, and delegates `unavailable` to the next backend (or reaches the
service's fail-closed decline when none exists). Only DSH `rejected` lacks the
Codex continue-turn versus cancel-turn distinction, so the integrator must map
that one outcome explicitly to `decline` or `cancel`; the adapter never guesses
it.

```ts
ctx.codexApproval.registerBackend(
  createDshOneShotCompatibilityBackend({
    id: "dsh-one-shot",
    rejectionDecision: "cancel",
    request: (prompt) =>
      ctx.approval.request({
        agent: resolveLiveAgent(prompt.params.threadId),
        toolName: "bash",
        callId: resolveCallId(prompt.params.itemId),
        reason: prompt.params.reason ?? undefined,
        signal: prompt.signal,
      }),
  }),
);
```

This is a compatibility fallback, not a rich Codex approval UI. Its published
capabilities explicitly set session grant, execpolicy amendment, network
amendment, rich presentation, and decline/cancel distinction to `false`.
The last flag describes the UI's inability to offer both denial meanings; it
does not erase the separate transport-level `cancelled` outcome.
The package declares that four-value vocabulary locally and does not require
`dsh-user-approval` as a runtime or development dependency. The repository's
exact rc.6 DSH installation still records and verifies that transitive artifact
as the compatibility contract fixture.

## Deliberate boundaries

This package does not implement:

- command execution, sandbox selection, `bypassSandbox`, or retry sequencing;
- the canonical shell consumer or exact cache-key construction;
- execpolicy parsing, canonical policy-path discovery, append locking, or
  reload;
- network session cache, same-host pending coalescing, commit locking, managed
  proxy mutation, or actual-effect callbacks;
- a web/terminal approval panel, host RPC, or durable approval audit log;
- generic DSH tool preauthorization receipts or stock-bash double-prompt
  suppression.

Those consumers must use this service's result without weakening its
discriminated union. In particular, a network amendment is returned as
`kind === 'network_policy_amendment'`; this package does not pretend that the
proxy or persistent rule changed.

## Verification

```sh
pnpm run build
pnpm run typecheck:tests
pnpm exec vitest run --config vitest.config.ts
pnpm run pack:check
cargo test --locked -p dsh-codex-approval-protocol-engine
node ../../conformance/approval/run-candidate.mjs --package-dir . \
  --corpus ../../conformance/approval/upstream-corpus.jsonl \
  --output /tmp/dsh-codex-approval-candidate.jsonl
```

The package suite currently includes 49 tests, including real native process
tests and a real `@deepseek-ai/cordis-plugin-loader` test that loads the
compiled `lib/index.js` service, opens a pending request, removes the Loader
entry, and verifies cancellation and cleanup. It also removes the
service after an amendment response while persistence is blocked: the caller
and Loader teardown must remain pending until the persistence operation and
the request are quiescent. Loader removal can never report completion while a
permanent allow rule is still being mutated in the background.

The clean-profile smoke packs the component, installs that archive into DSH
rc.6, validates the package-local native checksum and lossless integer path,
then supersedes one same-owner prompt. A late answer carrying the old prompt's
token must be ignored before the replacement can be approved with its own
fresh token; the archive is removed again after the check.

See [UPSTREAMS.md](./UPSTREAMS.md) and
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for exact source boundaries
and attribution.
