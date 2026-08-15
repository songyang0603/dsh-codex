# Third-party notices

## OpenAI Codex — direct production dependency

This sidecar directly links `codex-app-server-protocol` from
<https://github.com/openai/codex> at the immutable Git revision
`086396f7f60347b74c82784d5dfaf4fb2d3bda12`.

The linked crate supplies the production `serde` implementations for
`CommandExecutionRequestApprovalParams` and
`CommandExecutionRequestApprovalResponse`. No handwritten TypeScript or local
Rust approximation decides whether those payloads are accepted or how they are
canonicalized.

Pinned source identities reported by the `hello` RPC:

- `codex-rs/app-server-protocol` tree:
  `1120727af584eecf578cdd6a5c63d3a9146167c8`
- `codex-rs/app-server-protocol/src/protocol/v2` tree:
  `079e6cf5d2adbe98f3d3fd6fa3fbc2acb9b0b252`
- `codex-rs/app-server-protocol/src/protocol/v2/item.rs` blob:
  `dcfe928508e8eef1af3b3f05c739860e75c0d607`
- `codex-rs/app-server-protocol/src/protocol/v2/permissions.rs` blob:
  `9360934aa4c92e907a905926b490463cdd66a163`
- `codex-rs/Cargo.lock` blob:
  `a8c2addc02055be48c345b65760a7a1b96cfbf28`

OpenAI Codex is licensed under the Apache License, Version 2.0. The workspace
root `LICENSE` and `NOTICE` apply to distributions of this binary.
