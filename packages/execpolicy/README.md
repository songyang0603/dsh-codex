# `@songyang0603/dsh-codex-execpolicy`

Codex execpolicy semantics as a stateful DeepSeek Harness Cordis service,
pinned to OpenAI Codex commit
`086396f7f60347b74c82784d5dfaf4fb2d3bda12`.

Status: `0.1.0` is `parity_verified` for the macOS arm64 source-component
boundary. Runtime, config-stack, host-discovery, and persistence corpora match
their independently built upstream oracles `68/68`, `6/6`, `11/11`, and
`16/16` respectively. This is not a whole-agent or multi-platform claim.

## What this component owns

- Extended Starlark execpolicy parsing and rule ordering;
- Bash/sh/zsh lowering, compound-command splitting, safe/dangerous heuristics,
  and the pinned Windows PowerShell path;
- `ExecApprovalRequirement` derivation, including `bypassSandbox`, forbidden
  reasons, and transparent execpolicy amendment payloads;
- materialized `ConfigLayerStack` composition, requirements overlays,
  provenance, sorted `rules/*.rules` discovery, and parse-warning fallback;
- canonical local Codex host discovery through the pinned public config loader;
- startup banned-prefix migration before policy load;
- canonical `$CODEX_HOME/rules/default.rules` prefix/network persistence,
  locking, exact-line deduplication, and same-manager in-memory updates;
- compiled network allow/deny domain output.

The TypeScript layer does not interpret policy. It owns the DSH service
lifecycle, a versioned JSONL process boundary, cancellation, strict response
validation, backpressure, fail-closed teardown, and provenance handshake.

## Install from this checkout

At repository root:

```sh
pnpm install
pnpm native:stage
pnpm --filter @songyang0603/dsh-codex-execpolicy build
```

Then add the package's DSH bundle to a profile:

```sh
dsh plugin --profile codex-dev add ./packages/execpolicy
dsh --profile codex-dev --dump-config
```

The shipped `cordis.patch.yml` mounts the package with canonical local host
discovery: discovered `CODEX_HOME`, current cwd, no CLI overrides, and no
online cloud bootstrap. Service activation performs the same pinned ordering
as Codex: discover config, attempt the one-shot migration when applicable, then
load policy and retain ownership of the canonical update path.

The exact Cordis peer resolves through the DSH profile's dependency fallback so
the package and DSH use the same Context instance. Package archives normalize
the native file's Unix mode; the client restores only the owner execute bit on
its own package-local sidecar before spawning it. The clean-profile smoke test
checks the installed archive, native checksum, exact dependency versions,
activation, and teardown without access to repository `target/*` fallbacks.

## Cordis API

The default export is a legal Cordis `Service` plugin and augments
`Context` with `ctx.codexExecPolicy`.

```ts
const result = await ctx.codexExecPolicy.checkExecApprovalRequirement({
  command: ["bash", "-lc", "git status && cargo test"],
  approvalPolicy: { kind: "on_request" },
  permissionProfile: {
    kind: "managed",
    fileSystem: "restricted",
    hasFullDiskWriteAccess: false,
  },
  windowsSandboxLevel: "disabled",
  sandboxPermissions: "use_default",
});

switch (result.requirement.kind) {
  case "skip":
    // A later exact shell/sandbox component must apply bypassSandbox.
    break;
  case "needs_approval":
    // Pass the rich facts to the exact approval component.
    break;
  case "forbidden":
    // Deny with result.requirement.reason.
    break;
}
```

The service also exposes:

- `hello()` and `diagnostics()`;
- `load()` for an explicit ordered set of paths/inline sources;
- `loadConfigStack()` for a materialized pinned-Codex layer stack;
- `loadHostConfigStack()` for host discovery without migration/persistence
  ownership;
- `openHostPolicy()` for canonical startup and persistence ownership;
- `checkTokens()` and `checkExecApprovalRequirement()`;
- `compileNetworkDomains()`;
- `appendPrefixAmendment()` and `appendNetworkAmendment()`.

Amendment methods accept semantic payloads only. Callers cannot supply an
arbitrary writable path; persistence is available only after
`openHostPolicy()` has established the canonical Codex home and default policy
path.

## Configuration modes

Only one initial input mode may be selected:

1. `hostConfigStack`: real host discovery; this is the bundle default;
2. `configStack`: already materialized layers and raw requirements layers;
3. `rulePaths` / `ruleSources`: a lower-level explicit ordered policy.

Online cloud authentication and fetching are not performed here. A caller may
provide a previously acquired `cloud: { mode: "snapshot", bundle }`; producing
that snapshot belongs to a future cloud/auth component.

The native engine is resolved without consulting `PATH`, in this order:

1. explicit `enginePath`;
2. `DSH_CODEX_EXECPOLICY_ENGINE`;
3. `native/<platform>-<arch>/...` inside this package;
4. repository-local debug/release targets for development.

Every process must return protocol version `3` plus the exact pinned commit and
source-object identities before any policy result is accepted.

## Exact boundary

This package produces policy facts and owns policy-file side effects. It does
not launch commands, prompt a user, select or bypass a sandbox, mutate a live
network proxy, or retry a denied process. Those observable effects belong to
the approval, shell, sandbox, and network components and must consume the
discriminated outputs without weakening them.

In particular, this package intentionally exports no stock-DSH Bash
enforcement adapter. Returning `bypassSandbox: true` is not equivalent to
actually launching with the pinned Codex sandbox behavior, and generic DSH
one-shot approval cannot represent Codex's full decision union.

Pinned upstream persistence also has observable non-transactional behavior:
prefix persistence is disk-first; network proxy mutation is outside this
component; separate managers do not live-broadcast file changes; and the
startup migration can race a separate manager's append. This implementation
preserves those behaviors instead of silently "improving" them.

## Verification

Local component checks:

```sh
pnpm run build
pnpm run typecheck:tests
pnpm run test
pnpm run pack:check
```

Independent upstream procedures and the last real execution evidence are in:

- `conformance/upstream-runtime/`;
- `conformance/config-stack/`;
- `conformance/host-config/`;
- `conformance/persistence/`.

At repository root, `pnpm profile:check` builds a real package archive and
installs it into a temporary DSH `0.1.0-rc.6` profile. It may fetch the exact
registry dependencies on a cold machine.

See [UPSTREAMS.md](UPSTREAMS.md) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for exact provenance and
attribution.
