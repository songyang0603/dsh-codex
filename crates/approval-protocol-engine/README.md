# `dsh-codex-approval-protocol-engine`

Lossless JSONL sidecar for the command-execution approval wire at OpenAI Codex
commit `086396f7f60347b74c82784d5dfaf4fb2d3bda12`.

The production parser and serializer are the pinned
`codex-app-server-protocol` Rust types themselves. The outer RPC carries the
subject payload in `params.rawJson`, a JSON string, so JavaScript never parses
or rounds an upstream `i64`/`usize` before Rust validates it.

Each accepted parse returns deterministic `canonicalJson` plus every integer
in that canonical `serde_json::Value` as an RFC 6901 JSON pointer and exact
decimal lexeme. A TypeScript adapter can parse safe fields normally and recover
integer fields from `integerLexemes` as `BigInt`.

The stable methods are:

- `hello` with `{}` params;
- `parse_command_execution_request_approval` with `{ "rawJson": "..." }`;
- `parse_command_execution_request_approval_response` with the same params;
- `shutdown` with `{}` params.

Subject syntax/schema rejection is returned as a successful RPC result with
`accepted: false`, `canonicalJson: null`, an empty `integerLexemes`, and a
stable `error.code` (`invalid_json` or `schema_rejected`). Outer framing,
version, method, and params errors use the RPC `error` member and never produce
an approval result.

See `NOTICE` and `THIRD_PARTY_NOTICES.md` before distributing the binary. The
workspace-root Apache-2.0 `LICENSE` and `NOTICE` must accompany it.
