# List B: `awesome-dsh-plugin` source study

This directory studies the implementation of every GitHub plugin entry in
`awesome-dsh-plugin/awesome-dsh-plugin`, pinned at
`240b6706dee090040f3c56065c515fe3a1bfe144`. It does not study only the list
generator or contribution rules.

Artifacts:

- [`clusters.md`](clusters.md): methodology, aggregate implementation patterns,
  consequences for dsh-codex, counterexamples, and a complete 457-target index.
- [`plugins.jsonl`](plugins.jsonl): one deterministic, compact source-observation
  record per normalized repository + monorepo subpath, plus one metadata row.
- [`scripts/scan.mjs`](scripts/scan.mjs): dependency-free shallow/partial-clone
  scanner. It fixes every target to HEAD and reads manifests, bundle patches,
  core source, tests, workflows, and READMEs.
- [`scripts/summarize.mjs`](scripts/summarize.mjs): deterministic compactor and
  Markdown generator.
- [`scripts/verify.mjs`](scripts/verify.mjs): completeness, uniqueness, pin, bundle,
  path-safety, and Markdown-index checks.

Current coverage is 457/457 accessible targets, representing 448 repositories
and 27 explicit monorepo subpaths. The English and Chinese lists have identical
normalized targets. Of the 457 entries, 456 have both a manifest bundle
declaration and its referenced patch file at the pinned target commit.

## Reproduce

From the repository root:

```sh
node research/ecosystem-plugin-study/list-b/scripts/scan.mjs \
  --awesome /path/to/awesome-dsh-plugin \
  --output research/ecosystem-plugin-study/list-b/inventory.jsonl \
  --cache /private/tmp/dsh-list-b-cache \
  --concurrency 8

node research/ecosystem-plugin-study/list-b/scripts/summarize.mjs \
  research/ecosystem-plugin-study/list-b

node research/ecosystem-plugin-study/list-b/scripts/verify.mjs \
  research/ecosystem-plugin-study/list-b
```

The ignored `inventory.jsonl` is an evidence-rich generated intermediate.
`plugins.jsonl` and `clusters.md` are the commit-sized public artifacts.
