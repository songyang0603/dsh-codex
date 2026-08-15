# Contributing

Contributions are welcome, especially conformance fixtures, platform tests,
upstream-drift reports, and self-contained component implementations.

Before implementation, add or update the component boundary in
`docs/components.md`. A pull request must not mark a component
`parity_verified` without the evidence required by `docs/parity-standard.md`.

Run the relevant checks before opening a pull request:

```bash
pnpm install
pnpm check
pnpm native:test
```

Changes adapted from Codex must retain the upstream notice in the source file,
name the pinned commit, and be recorded in `THIRD_PARTY_NOTICES.md`. Do not use
OpenAI or DeepSeek trademarks in a way that implies affiliation.
