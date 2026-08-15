# Upstream sources

## OpenAI Codex

- Repository: <https://github.com/openai/codex>
- Pinned commit: `086396f7f60347b74c82784d5dfaf4fb2d3bda12`
- License: Apache-2.0

This package's native semantic boundary directly links the public pinned
`codex-apply-patch` crate and its public filesystem/path dependencies:

- `codex-rs/apply-patch`, tree `1601c43435739cfeca8c5ae4fe28e56b5efc4246`;
- `codex-rs/file-system`, tree `971c42b87f1e8e94411d6b63a854b1404df45d1d`;
- `codex-rs/utils/path-uri`, tree `02fceb44b126b04efe3d4d2087284d092fa02f13`.

The strict runtime handshake also pins the source blobs that own the exported
semantic projections:

- `codex-rs/apply-patch/src/lib.rs`, blob
  `5b5fac0683288b0e008ebf753dee0d588f625b77`;
- `codex-rs/apply-patch/src/parser.rs`, blob
  `c400d075a684fda29c10269aef1958a27faf90aa`;
- `codex-rs/apply-patch/src/streaming_parser.rs`, blob
  `ff1b2f82feec7bdf454f6cba61ad5f15611f5573`;
- `codex-rs/apply-patch/src/invocation.rs`, blob
  `41ee8b539aa0c2be321e1e839a503ee4760393a7`;
- `codex-rs/apply-patch/src/file_update.rs`, blob
  `d700570264f2b72f356011064028dededa4a2a55`;
- `codex-rs/apply-patch/src/text_file.rs`, blob
  `b7d598ca973ec73f0ed064d2360f4d218e2a792d`;
- `codex-rs/apply-patch/src/seek_sequence.rs`, blob
  `9934fa55e767cacf85db7e459a913e72c9d828a0`;
- `codex-rs/Cargo.lock`, blob
  `a8c2addc02055be48c345b65760a7a1b96cfbf28`.

The future model-visible tool must also reproduce these pinned integration
objects, but they are not implemented or claimed by this service package:

- `codex-rs/core/src/tools/handlers/apply_patch.rs`, blob
  `36ae51ba7b9022350cd5a362464b63655ead6b84`;
- `codex-rs/core/src/tools/handlers/apply_patch_spec.rs`, blob
  `39956d208fa798d2ae5d9162482789fd8cd37f48`;
- `codex-rs/core/src/tools/handlers/apply_patch.lark`, blob
  `5aa41b0af797a0bde0dc2459c272c9af63e96dc3`.

Machine-readable identities live in the repository root `upstreams.lock.json`.
The sidecar hello handshake repeats the identities it actually implements and
the TypeScript client rejects any mismatch.

## DeepSeek Harness

- Repository: <https://github.com/deepseek-ai/DeepSeek-Harness>
- Audited source commit: `47f943859bef60e4160492346772ded9b24f765a`
- Runtime Cordis artifact: `@deepseek-ai/cordis@4.0.1`
- Runtime Schemastery artifact: `@deepseek-ai/schemastery@3.18.1`

The package is a Cordis service plugin loaded by DSH. It intentionally does not
register a DSH tool and does not claim that DSH rc.6 supports Codex's freeform
custom-tool wire.
