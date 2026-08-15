# Approval conformance against pinned Codex

This directory compares the real `@songyang0603/dsh-codex-approval` package
with approval semantics from OpenAI Codex commit
`086396f7f60347b74c82784d5dfaf4fb2d3bda12`. It deliberately keeps two
evidence classes separate:

- `upstream-corpus.jsonl` exercises behavior observable in pinned Codex. Most
  operations call the actual upstream Rust implementation. The one private
  reverse bridge is labeled `pinned_private_source_model`, not silently passed
  off as a callable public API.
- `adapter-contract.jsonl` exercises DSH-owned correlation, cancellation, and
  lifecycle behavior. Its expected values are local contracts and are never
  described as upstream oracle results.

The recorded macOS/aarch64 result is **43/43 upstream cases matched** plus
**10/10 local adapter contracts matched**. See `STATUS.md` for the exact
execution, package/native profile smoke, and hashes.

## Fixed source and trust boundary

`run-oracle.sh` fails closed unless all of these objects resolve at the fixed
commit:

| Upstream source                                        | Git blob                                   |
| ------------------------------------------------------ | ------------------------------------------ |
| `codex-rs/protocol/src/approvals.rs`                   | `44dc8d7d7c9728a69e0b153dc1e43e248aaab9bc` |
| `codex-rs/core/src/tools/sandboxing.rs`                | `2d20334f6446b2273128e6ed54e8001e28e37a76` |
| `codex-rs/core/src/session/handlers.rs`                | `a928090cc82eae3368030172e36b938c9422d5c3` |
| `codex-rs/core/src/session/session.rs`                 | `84829d90f112ab4717abeaa16877379c3ca0a117` |
| `codex-rs/core/src/session/tests.rs`                   | `a56c9bbdde0fa18c3394558692545a9a4749e3f3` |
| `codex-rs/app-server-protocol/src/protocol/v2/item.rs` | `dcfe928508e8eef1af3b3f05c739860e75c0d607` |
| `codex-rs/app-server/src/bespoke_event_handling.rs`    | `32c222668614aa17b8496712c24b061d76bcc2b5` |

The runner snapshots the supplied checkout's `HEAD` and exact porcelain
status, creates a detached shared temporary clone, applies only
`instrumentation.patch`, copies the test-only Rust module, and runs one
explicitly ignored `codex-core --lib` test. Its `EXIT` trap verifies that the
user checkout did not change. Output is staged inside the temporary clone and
published only after the test succeeds.

The candidate runner imports the built package from `packages/approval/lib`,
starts the actual pinned native protocol client, mounts the real
`CodexApprovalService` in Cordis, and drives the exported wire, service, cache,
persistence, and bridge surfaces. It does not inspect package source to derive
expected results.

## Oracle operations and coverage

The 43 cases are intentionally branch-oriented rather than permutations of the
same happy path.

| Operation          | Cases | Oracle authority                                                                              | Distinguishing coverage                                                                                                                                                                                              |
| ------------------ | ----: | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `decisions`        |     7 | Actual `ExecApprovalRequestEvent::effective_available_decisions`                              | Explicit ordered lists preserve order, duplicates, and emptiness; ordinary fallback omits session approval; exec-policy amendment, additional permissions, network first-allow, and network-without-allow precedence |
| `requestWire`      |     9 | Actual `serde_json::from_value::<CommandExecutionRequestApprovalParams>`                      | Omitted `Option` fields, omitted child fields, ignored unknown fields, `current_working_directory` alias normalization, i64 and usize acceptance/rejection boundaries, and zero-depth rejection                      |
| `responseWire`     |     4 | Actual response Serde plus source-pinned handler observation; candidate uses the real service | Empty offered list plus valid response, valid unoffered session response, ignored top-level response fields, and ignored amendment-child fields                                                                      |
| `cache`            |     3 | Actual `with_cached_approval` on fresh upstream `Session` instances                           | Store all exact keys, subset hit, mixed miss, empty-key bypass, cache only `ApprovedForSession`, and no restoration in a new Session                                                                                 |
| `persistence`      |     2 | Actual `session::handlers::exec_approval` and real `default.rules` I/O                        | Successful amendment persists before release; failed persistence emits one warning before release yet releases the current approval                                                                                  |
| `decisionFromCore` |     8 | Actual upstream `From<ReviewDecision>`                                                        | Every core branch: approved, exec amendment, session, unexpected MCP amendment fail-closed, network amendment, denied, timed out, and abort                                                                          |
| `responseToCore`   |    10 | Exact test-only model of the private pinned app-server match, source blob pinned              | Six v2 decision variants, separate network allow/deny completion status, exact decline rejection, malformed-response failure, and rejection of ambiguous externally tagged enum objects                              |

### Private reverse-bridge boundary

At this commit, command response-to-core conversion is embedded in the private
async function `on_command_execution_request_approval_response`; there is no
callable public helper. Building and driving the complete app-server would add
a second large target and substantial unrelated infrastructure. The test-only
oracle therefore reproduces only the exact success and deserialization-failure
match from `bespoke_event_handling.rs:1983-2029`, compiles it against the real
pinned protocol/core types, verifies the containing source blob, and labels
those ten records `pinned_private_source_model`.

This is independent of the TypeScript adapter but is not claimed as execution
of the private production handler. Client transport failures, receiver
failures, and the turn-transition early-return path are not dynamically
covered here.

### Offered decisions are presentation, not authorization

Pinned Codex does not check whether a valid response is present in the
`availableDecisions` list. Consequently, these two statements are both part of
the conformance contract:

1. an ordinary command presents only `accept` and `cancel`, so the adapter must
   not invent a session button; and
2. if a client nevertheless returns the syntactically valid
   `acceptForSession`, the app-server accepts it. A valid response is likewise
   accepted when the offered list is explicitly empty.

The decisions cases lock the first rule. The response cases drive the real DSH
service and lock the second. No offered-membership authorization check is
invented locally.

### Lossless integer boundary

The raw corpus contains exact JSON integers at `i64::MAX`, `i64::MAX + 1`,
`usize::MAX`, and `usize::MAX + 1` on 64-bit hosts. The candidate never parses
the subject with JavaScript first. It sends the untouched raw JSON string to a
Rust sidecar that directly links the exact pinned
`codex-app-server-protocol` crate. Real upstream Serde performs validation,
then returns canonical JSON plus every unsafe integer's JSON Pointer and exact
decimal lexeme. The TypeScript client restores accepted unsafe values as
`bigint` immediately after canonical parsing.

Those four cases use `comparison: "acceptanceOnly"` because canonical numeric
output is intentionally excluded from the comparison. The adjacent pairs are
still discriminating: both pinned Codex and the candidate accept each exact
maximum and reject its overflow. This closes the earlier lossy object-mode gap
without tolerance, coercion, or a hand-written TypeScript integer parser.

## DSH-owned adapter contracts

The ten local cases cover behavior that is not an independently callable Codex
oracle surface:

- two concurrent prompts resolved in reverse order retain exact correlation;
- abort-signal cancellation removes pending state and ignores a late answer;
- unknown and duplicate response IDs cannot settle another prompt;
- a malformed answer for a known prompt fails closed and cannot later be
  replaced;
- an ordinary prompt does not present `acceptForSession`; and
- service disposal cancels pending work and ignores late answers;
- equal effective IDs are isolated across threads but supersede within one
  thread; every replacement receives a fresh correlation token, so a late
  response to the superseded prompt cannot settle its successor;
- an ambiguous externally tagged decision object fails closed; and
- malformed backend output fails closed instead of producing an unhandled
  exception.

`compare-adapter-contract.mjs` compares these outputs with explicit local
expectations. They are not included in the 43-case upstream parity count.

## Run

Rust 1.95 and Node.js 22.19 or later are required. Reuse one Cargo target: a
full `codex-core --lib` test build is large.

Generate the independent oracle without changing the supplied checkout:

```sh
CODEX_APPROVAL_TARGET_DIR=/tmp/dsh-codex-approval-target \
  bash conformance/approval/run-oracle.sh \
  --codex-checkout /absolute/path/to/codex \
  --output /tmp/dsh-codex-approval-oracle.jsonl
```

Build and stage the exact native engine, build the package, generate the real
candidate output, and compare:

```sh
pnpm native:release-build
pnpm native:stage
pnpm --filter @songyang0603/dsh-codex-approval build

node conformance/approval/run-candidate.mjs \
  --package-dir packages/approval \
  --corpus conformance/approval/upstream-corpus.jsonl \
  --output /tmp/dsh-codex-approval-candidate.jsonl

node conformance/approval/compare.mjs \
  conformance/approval/upstream-corpus.jsonl \
  /tmp/dsh-codex-approval-oracle.jsonl \
  /tmp/dsh-codex-approval-candidate.jsonl
```

The comparator is strict about case sets, pinned identity, evidence class,
platform identity, object shape, ordering, and values. The recorded
macOS/aarch64 run exits zero with all 43 records matched. Missing, malformed,
or provenance-mismatched native engines fail closed.

Run the separately classified local contracts:

```sh
node conformance/approval/run-adapter-contract.mjs \
  --package-dir packages/approval \
  --corpus conformance/approval/adapter-contract.jsonl \
  --output /tmp/dsh-codex-approval-adapter.jsonl

node conformance/approval/compare-adapter-contract.mjs \
  conformance/approval/adapter-contract.jsonl \
  /tmp/dsh-codex-approval-adapter.jsonl
```

## Claim boundary

The executed result proves the listed branches for one fixed Codex commit,
this corpus, and the recorded macOS/aarch64 environment. It is not exhaustive
over every approval payload or operating system. Windows and 32-bit execution,
full app-server transport/turn orchestration, rich UI rendering, canonical
shell/sandbox enforcement, and the network-policy coordinator are outside this
component's current dynamic claim.
