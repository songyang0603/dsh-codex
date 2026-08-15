# DSH ecosystem compatibility

This document records the distribution and discovery rules used by
`dsh-codex`. It is a compatibility decision, not a popularity ranking or an
endorsement of every repository carrying the `dsh-plugin` topic.

## Reviewed snapshot

Reviewed on 2026-08-15:

- [`0xsline/awesome-deepseek-harness`](https://github.com/0xsline/awesome-deepseek-harness) at `fb63172804b17befd383d658ab3b828abfbb95e5`;
- [`awesome-dsh-plugin/awesome-dsh-plugin`](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) at `240b6706dee090040f3c56065c515fe3a1bfe144`;
- the public [`dsh-plugin` topic](https://github.com/topics/dsh-plugin), as
  captured through the first list's generated catalog;
- the pinned official DSH source and installed rc.6 artifacts recorded in
  [`upstreams.lock.json`](../upstreams.lock.json).

This was an implementation study, not a review of list-maintenance mechanics.
For every accessible target, the study fixed a repository SHA and inspected the
package manifest, bundle patch, host/client entry points, tests, workflows,
release scripts, and installation documentation. The complete records are:

- [`list-a/README.md`](../research/ecosystem-plugin-study/list-a/README.md):
  1,409 unique repository/subpath targets from the first list and its catalog;
  1,218 received source-level key-file inspection and 191 were unavailable,
  private, or empty;
- [`list-a/plugin-study.jsonl`](../research/ecosystem-plugin-study/list-a/plugin-study.jsonl):
  one machine-readable record per target;
- [`list-a/implementation-patterns.md`](../research/ecosystem-plugin-study/list-a/implementation-patterns.md):
  concrete implementation lessons from plugins such as context-doctor,
  codex-connect, mneme, task-passport, chat-import, file-claim, turn-rewind,
  mcp-lens, collaboration, plans, and plugin-check;
- [`list-b/README.md`](../research/ecosystem-plugin-study/list-b/README.md):
  all 457 listed targets inspected at pinned SHAs, spanning 448 repositories;
- [`list-b/plugins.jsonl`](../research/ecosystem-plugin-study/list-b/plugins.jsonl)
  and [`list-b/clusters.md`](../research/ecosystem-plugin-study/list-b/clusters.md):
  per-plugin implementation records and capability clusters mapped to future
  `dsh-codex` components.

“Source-inspected” means that the relevant implementation files were actually
read and classified. It does not mean that every third-party plugin was
installed or executed. Loader, archive, runtime, and parity claims remain
separate evidence classes.

The official runtime remains authoritative when community documentation and
generated marketplace commands disagree.

## Findings

### Component boundaries follow state and effect ownership

The strongest recurring pattern is not “everything belongs in one plugin.” A
user-installable package can contain host, client, protocol, and persistence
parts, but one service must own the authoritative state and side effects. Tools,
events, HTTP routes, and UI are adapters to that service. Plugins such as
context-doctor, mneme, task-passport, chat-import, file-claim, and turn-rewind
make this separation observable in their source.

`dsh-codex` therefore splits Codex by semantic owner: approval owns pending
decisions and live-session grants; execpolicy owns policy parsing and durable
rules; the future canonical shell owns process launch and sandbox sequencing;
session owns resume/fork/compaction state. A preset may compose these packages,
but it must not become a second hidden owner of their state.

### Lifecycle completion means quiescence

289 targets in the second list contain disposer, unload, abort, or cleanup
signals. The best implementations bind long-lived routes, watchers, processes,
and queues to their Cordis owner. This directly informed the approval service:
removal detaches admission and then waits for an in-flight amendment
persistence operation to settle; it cannot report disposal while background
work can still publish a grant or durable rule.

Every native `dsh-codex` component consequently needs both compiled Loader
coverage and packed-profile teardown coverage. Merely deleting a service name
from the context is not sufficient cleanup evidence.

### Host, client, and protocol are separate runtime surfaces

113 targets in the second list expose both host and client source, while many
others are deliberately host-only or client-only. Stable implementations share
an explicit wire contract; browser code does not reach into host-private state.
This supports the approval package's `native protocol -> Cordis service ->
future rich UI` layering and requires the same separation for session and tool
registry components.

The ecosystem also confirms a negative boundary: a model/provider bridge such
as codex-connect can be well packaged and useful without owning the Codex agent
loop, approval state, sandbox, session, or context semantics. It is therefore a
provider component, not evidence that Codex itself has been reconstructed.

### Persistence is part of a component contract

The inspected plugins use SQLite with migrations for authoritative long-lived
state, atomic or locked files for interoperable checkpoints, and browser
storage for display preferences. `dsh-codex` follows the same ownership rule:
policy and session state cannot be silently delegated to UI storage, and every
durable format needs an owner, versioning or migration behavior, concurrency
semantics, and failure tests.

### Large tool catalogs need progressive disclosure

MCP-lens and related tool plugins avoid injecting a complete remote schema
catalog into every prompt. Future `dsh-codex` tool-registry work should
separate discovery from exact invocation, keep connections lazy, and make
cache/schema changes visible to the session contract. This is a context-budget
mechanism, not a license to weaken the selected tool's argument schema.

### Activation is a bundle contract

Both curated lists require a package-level `dsh.bundle.patch`; a package that
is merely present in profile dependencies remains inactive. The patch must be
part of the archive and insert a uniquely named row whose `name` resolves to
the package. Browser-facing code may additionally declare `dsh.client`, but
`dsh.client` alone is not an installable profile bundle.

`dsh-codex` consequently gives every component its own manifest and row. The
root monorepo will not claim to be an all-components bundle until an exact,
versioned canonical profile actually exists.

### npm/prebuilt archives are the stable consumer path

The curated ecosystem recommends npm packages because Git dependencies may run
`prepare` and pnpm can require an explicit `allowBuilds` grant. Representative
plugins either publish prebuilt npm/tarball contents or document that source
installation needs a build approval. Native `dsh-codex` components additionally
need a binary for the consumer's platform, so a Git checkout with ignored local
build outputs is not a portable release artifact.

Our release order is therefore:

1. source and reproducible conformance in GitHub;
2. component archive inspection and clean-profile activation;
3. prebuilt, checksummed platform artifacts where required;
4. one npm package per component;
5. a separate canonical composition bundle only when its dependency graph has
   end-to-end parity evidence.

No README may present a later stage as already released.

The source study reinforces this rule: in the second list, 299 targets show a
test signal, but only 76 show Loader/profile testing and only 21 show
packed/archive installation testing. Repository tests and consumer-artifact
tests cover different failure surfaces. `dsh-codex` requires both for each
published component.

### Monorepo subpath commands are not a stable contract

The first awesome list explicitly says the former repository-plugin and
`&path:` subpath forms are not part of the current official bundle flow. At the
same snapshot, the second list's site generator still emitted
`github:owner/repo#path:/subdir` for monorepo entries. We treat this as
community-tooling drift and do not copy that generated command.

Local development uses a real package directory. Registry installation will
use the component's npm name. A future GitHub release may use a direct prebuilt
tarball URL. The monorepo root is not an alias for any of these.

### Discovery is not compatibility evidence

The public topic is useful for discovery but is noisy and fast-moving. GitHub
search is capped at 1,000 results in the catalog generator reviewed here, while
the topic page already reported substantially more repositories. The larger
catalog also contains manually classified and README-only projects. A topic,
star count, awesome-list entry, or marketplace card therefore does not prove
that a package activates, builds, or matches Codex.

For `dsh-codex`, discovery metadata is deliberately factual:

- repository and packages use `deepseek-harness`, `dsh-plugin`, and `codex`
  keywords;
- package `repository.directory` points to the real monorepo subdirectory;
- descriptions state the owned subsystem and never imply whole-agent parity;
- status is taken only from the component ledger and parity evidence.

### Peers and archive contents matter

The curated guidance recommends keeping official DSH runtime packages as peers
to avoid a second Context/runtime copy. `dsh-codex` pins its required peer ABI
exactly rather than using `*` or a broad range. A dependency may remain
package-local only when state identity is not shared and the component has a
specific runtime reason for owning it.

Consumer archives contain compiled runtime files, manifests, instructions,
licenses, notices, and provenance. They exclude tests, conformance harnesses,
local build caches, and repository-only tooling. GitHub source retains the
small tests and oracle instrumentation needed to reproduce claims.

## Repository rules derived from the review

`pnpm ecosystem:check` enforces the mechanical subset of this contract for
every directory under `packages/`:

- scoped component name and correct repository subdirectory;
- required discovery keywords;
- exported and archived `cordis.patch.yml`;
- a unique non-core row whose `name` equals the package name;
- a standard `dsh plugin --profile ... add` example;
- exact Cordis peer declaration;
- no tests or conformance sources in the package `files` allowlist.

This check is intentionally narrower than community health checkers. Some
public checkers require `src` in published archives or restrict package names
to a particular organization. Those are project policies, not official DSH
runtime requirements, and conflict with this repository's explicit archive and
namespace design.

## Contribution and listing path

After a component has a real public archive and clean-profile evidence:

1. publish that component under its own package name;
2. add the repository's `dsh-plugin`, `deepseek-harness`, and `codex` topics;
3. submit factual English and Chinese one-line entries to curated lists;
4. link the package-specific README, not an invalid monorepo install command;
5. keep marketplace metadata synchronized with the package repository field.

Listing is a distribution step. It never changes a component's parity status.
