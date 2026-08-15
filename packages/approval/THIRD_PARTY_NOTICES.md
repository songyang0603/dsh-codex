# Third-party notices

## OpenAI Codex

The native approval wire engine directly links OpenAI Codex's
`codex-app-server-protocol` crate at commit
`086396f7f60347b74c82784d5dfaf4fb2d3bda12`; the semantic state/lifecycle
adapter is independently implemented against pinned Codex behavior. Codex is
licensed under the Apache License, Version 2.0. Exact audited source objects
are recorded in `UPSTREAMS.md`. No Codex UI source is bundled.

## DeepSeek Harness and Cordis

This package uses public Cordis APIs. Repository-level provenance checks compare
the local one-shot compatibility vocabulary with the exact transitive
`@deepseek-ai/dsh-user-approval` artifact; this package does not depend on that
artifact. DeepSeek Harness and Cordis are licensed under the MIT License. No
DeepSeek Harness source is vendored here.

Source provenance and installed npm artifact provenance are recorded
separately because the published rc.6 approval artifact does not expose a
verifiable `gitHead`.

A complete transitive dependency license inventory and release SBOM remain
release-level obligations before the first npm publication.
