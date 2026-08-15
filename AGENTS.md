# Repository working agreement

## Product contract

- Reproduce a bounded Codex subsystem exactly against the commit in
  `upstreams.lock.json`; do not substitute a smaller MVP and call it complete.
- Keep incomplete work visible as `in_progress`. Only the evidence in
  `docs/parity-standard.md` permits `parity_verified`.
- Do not use the installed `codex` executable as the production implementation.
  It may be an independently pinned test oracle where its public surface covers
  the behavior under test.
- Treat component-output parity and canonical-profile enforcement parity as
  separate obligations.

## Upstream changes

- Never float Codex Git dependencies or DeepSeek Harness peer versions.
- Change a source pin only together with source-object hashes, regenerated
  fixtures, differential results, and an explicit ledger update.
- Preserve Apache-2.0 attribution and prominent modified-source notices for
  adapted Codex code.

## DSH plugin rules

- Function plugins export `name`, `inject`, `Config`, and `apply` as named
  exports; they must not also default-export the plugin object.
- Service classes may be default exports.
- Exercise plugins through a real built-artifact Loader test in addition to
  direct Context tests.
- Split packages by state/effect ownership. Do not put an approximate consumer
  in an otherwise exact semantic service.
- Security decisions and native protocol failures fail closed. A component
  must not claim an execution effect that it only serialized for a later
  consumer.

## Verification

- Run `pnpm check` before proposing a change.
- Run `pnpm upstream:verify -- --codex <checkout> --deepseek-harness <checkout>`
  when changing pins, native semantics, or DSH integration.
- Do not describe a configured CI matrix as passing until the corresponding
  remote workflow has actually completed.
