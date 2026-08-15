# Upstream sources

This package is implemented against fixed source and artifact inputs. It does
not infer source provenance for an npm artifact when the publisher does not
provide a verifiable mapping.

## OpenAI Codex

- Repository: <https://github.com/openai/codex>
- Pinned commit: `086396f7f60347b74c82784d5dfaf4fb2d3bda12`
- License: Apache-2.0

Audited source objects:

| Path                                                          | Git object                                 |
| ------------------------------------------------------------- | ------------------------------------------ |
| `codex-rs/protocol/src/approvals.rs`                          | `44dc8d7d7c9728a69e0b153dc1e43e248aaab9bc` |
| `codex-rs/protocol/src/protocol.rs`                           | `bd5579987b3413eb4144da68a67d55a27677a1ca` |
| `codex-rs/app-server-protocol/src/protocol/v2/item.rs`        | `dcfe928508e8eef1af3b3f05c739860e75c0d607` |
| `codex-rs/app-server-protocol/src/protocol/v2/permissions.rs` | `9360934aa4c92e907a905926b490463cdd66a163` |
| `codex-rs/app-server-protocol/`                               | `1120727af584eecf578cdd6a5c63d3a9146167c8` |
| `codex-rs/app-server-protocol/src/protocol/v2/`               | `079e6cf5d2adbe98f3d3fd6fa3fbc2acb9b0b252` |
| `codex-rs/Cargo.lock`                                         | `a8c2addc02055be48c345b65760a7a1b96cfbf28` |
| `codex-rs/core/src/tools/sandboxing.rs`                       | `2d20334f6446b2273128e6ed54e8001e28e37a76` |
| `codex-rs/core/src/session/handlers.rs`                       | `a928090cc82eae3368030172e36b938c9422d5c3` |
| `codex-rs/core/src/session/session.rs`                        | `84829d90f112ab4717abeaa16877379c3ca0a117` |
| `codex-rs/core/src/session/tests.rs`                          | `a56c9bbdde0fa18c3394558692545a9a4749e3f3` |
| `codex-rs/core/src/tools/approvals.rs`                        | `4f5512482bde71761393f7e60ae60d1962d90a94` |
| `codex-rs/core/src/session/mod.rs`                            | `fb12a66355ae216cac6322fa08401fced59f5b70` |
| `codex-rs/core/src/tools/network_approval.rs`                 | `c41f8635922039a786cb33000e03fbfc41bc0762` |
| `codex-rs/app-server/src/bespoke_event_handling.rs`           | `32c222668614aa17b8496712c24b061d76bcc2b5` |

The public wire follows app-server v2. The fallback choice ordering,
ApprovedForSession all-keys behavior, and execpolicy persistence-before-release
semantics are checked against the corresponding core protocol and runtime
sources above.

The native protocol engine directly links the pinned public
`codex-app-server-protocol` crate so serde acceptance, aliases, optional-field
canonicalization, and integer ranges are upstream code rather than a local
TypeScript approximation. The TypeScript client and DSH lifecycle adapter are
independently written. `Cargo.lock` is checked against the pinned Codex lock;
external Rust dependency identities absent from that lock are rejected.

## DeepSeek Harness and Cordis

- Source repository: <https://github.com/deepseek-ai/DeepSeek-Harness>
- Audited source commit: `47f943859bef60e4160492346772ded9b24f765a`
- Source package version at that commit: `0.1.0-rc.5`
- License: MIT

Installed public artifacts used by this package:

| Package                             | Exact version | npm integrity                                                                                     |
| ----------------------------------- | ------------- | ------------------------------------------------------------------------------------------------- |
| `@deepseek-ai/cordis`               | `4.0.1`       | `sha512-YBdskTU2Po1kru3GgcUWUbkTsPMA9LkSQDAY8rBkFJeajdgcQad3QPJZE26JyK99Xb6HaASvoXg2DSUTeN/0Nw==` |
| `@deepseek-ai/cordis-plugin-loader` | `1.0.2`       | `sha512-RIW9hoVyhYDWdCI9BsvtZccPde1ECLC4OAxupwowGTak78vwVTVdb3HezTSOK1Y1/Ax3Ru0LA1pYOB04CnTxIQ==` |
| `@deepseek-ai/dsh-user-approval`    | `0.1.0-rc.6`  | `sha512-9rnkSDGOpu2XUeGwbPeTzVUTFWTND1PMPM5L/ZQPptV5yyZlQiNxM2rCC6OdL+ZVerwxEqrRhZIQn/KVtQfKag==` |

The rc.6 approval artifact exposes no `gitHead`. Consequently this package
does not claim that it was built from the rc.5 source commit. It is recorded by
the repository-level DSH test graph as a transitive contract fixture for the
explicitly reduced one-shot compatibility adapter. A machine check reads the
installed declaration and compares its exact four-value outcome union with the
local union; the package itself does not depend on the artifact. The rich
approval protocol does not pretend to be supplied by that artifact.
