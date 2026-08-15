# Approval conformance execution status

Status: **`parity_verified` for approval `0.1.0` on macOS/aarch64; 43/43
upstream/source-pinned cases and 10/10 DSH adapter contracts match**.

Execution date: 2026-08-15

## Fixed source and environment

- Codex commit: `086396f7f60347b74c82784d5dfaf4fb2d3bda12`
- Rust: `rustc 1.95.0 (59807616e 2026-04-14)`
- Cargo: `cargo 1.95.0 (f2d3ce0bd 2026-03-21)`
- Node.js: `v22.20.0`
- Platform: `macos/aarch64`, 64-bit (`macOS 15.3`)
- DSH CLI/profile smoke: `0.1.0-rc.6`
- User Codex checkout before and after the oracle:
  `HEAD=086396f7f60347b74c82784d5dfaf4fb2d3bda12`, empty
  `git status --porcelain=v1 --untracked-files=all`

The upstream runner re-verified the seven Git objects listed in `README.md`.
It created a detached shared clone, applied test-only instrumentation, ran one
explicitly ignored `codex-core --lib` test, and verified that the supplied
checkout remained unchanged.

## Actual execution

The pinned Codex oracle ran exactly:

```text
session::tests::dsh_codex_approval_conformance_oracle::dsh_codex_approval_conformance_oracle

1 passed; 0 failed; 0 ignored; 2212 filtered out
pinned approval oracle output: /private/tmp/dsh-codex-approval-oracle-43.jsonl
```

The oracle emitted 43 records. Its nonfatal warning that PATH aliases could not
be created (`Operation not permitted`) did not suppress or change any case.

The production candidate was rebuilt, its pinned native protocol engine was
staged into the package, and the following comparison completed successfully:

```sh
node conformance/approval/run-candidate.mjs \
  --package-dir packages/approval \
  --corpus conformance/approval/upstream-corpus.jsonl \
  --output /private/tmp/dsh-codex-approval-candidate-43.jsonl

node conformance/approval/compare.mjs \
  conformance/approval/upstream-corpus.jsonl \
  /private/tmp/dsh-codex-approval-oracle-43.jsonl \
  /private/tmp/dsh-codex-approval-candidate-43.jsonl
```

Result: `approval upstream parity: 43/43 cases matched`.

The package sends the untouched raw JSON subject to a Rust sidecar that links
the exact pinned `codex-app-server-protocol` crate. The sidecar performs real
Serde validation and returns canonical JSON plus exact integer lexemes. The
TypeScript client restores unsafe accepted integers as `bigint` before the
request reaches the approval service. This preserves the discriminating
boundary rather than rounding it:

- `i64::MAX` is accepted while `i64::MAX + 1` is rejected;
- 64-bit `usize::MAX` is accepted while `usize::MAX + 1` is rejected.

All operation groups matched. The two added response-to-core cases prove that
objects containing multiple externally tagged enum variants, or one known and
one future variant, fail closed exactly as pinned Rust Serde does:

| Group                                           | Result |
| ----------------------------------------------- | -----: |
| Available-decision derivation                   |    7/7 |
| Request wire                                    |    9/9 |
| Response wire and no offered-membership check   |    4/4 |
| Session approval cache                          |    3/3 |
| Exec-policy amendment persistence orchestration |    2/2 |
| Core-to-v2 bridge                               |    8/8 |
| Private response-to-core pinned source model    |  10/10 |

The persistence success case observed the real upstream rule contents before
the pending approval receiver was released, with one persistence attempt and
zero warnings. The failure case observed one warning before release, no
persisted rule, and release of the current amendment decision. Both match the
candidate coordinator behavior.

The separately classified DSH-owned adapter run completed with:

```text
approval adapter contract: 10/10 cases matched
```

Additional executed checks:

- approval package: 5 Vitest files, 49 tests passed, including a valid request
  whose native response exceeds the former 8 MiB local ceiling;
- native approval protocol engine: 1 unit and 9 process black-box tests passed;
- locked Rust workspace: 26 tests passed;
- clean packed-profile smoke: DSH `0.1.0-rc.6` added the approval archive,
  loaded its package-local `darwin-arm64` native engine, preserved
  `i64::MAX` as `bigint`, superseded one same-owner prompt, rejected its late
  response, resolved the replacement through its fresh correlation token, and
  removed the plugin;
- publint, TypeScript build/typecheck, Rust fmt/clippy/build, package archive
  contents, and native SHA-256 checks passed.

## Evidence hashes

- Upstream corpus:
  `dce526290e882d38230104320e78afe6f7f01674410fe200b7acbe4719e87b04`
- Upstream corpus schema:
  `f61f1e295434e17ab6db211a80b878a323a65976ad0a96f1e10d14cdaeed716d`
- Adapter contract:
  `64e8511d682424968e6fcdbbc42bf73ca36a9fda3ee6d7b892a67ce43f1abc3b`
- Adapter contract schema:
  `04765072fea632bfda8d4a959a2426105fdf7871eb6193386686b2682b21ffde`
- Instrumentation hook patch:
  `74a429b0ceff26b6addc7694faa6c8ab2716f95dab64a8114a26e45d16f070e6`
- Instrumentation Rust source:
  `75d9aaebba7a8f857183845e48a7bbae0e960255e02eaf566e3d4bedc14833d5`
- Oracle runner:
  `1f95a24723fc33af2eec03e0fab2b7da80a9547c733b108e5f41e7af327b6c4a`
- Candidate runner:
  `d1215e897ae97afe71b6f5cbd3624e15c5dd2f0f030cac878a590839a2d2436d`
- Strict comparator:
  `fe3b2e988ce0f51e128698b1702113cf547aec05b09ae47e9c78c0a9e19ad08e`
- Oracle output:
  `ca46cab9c44915f694dc8d313f63634e2b7a1bd2eef9426f96a38e3110fb7292`
- Adapter runner:
  `2a16e2517b459cd02dfb1418ef40c6080c633c43f9e85b7509c98719acfbb657`
- Adapter comparator:
  `8497da11243141f0f1ef2ce160ef2e6a2fbdacd81c3cd1f02bebe8de1f48f90f`
- Candidate output:
  `7d2b6eb1afdbfc9091b72a412a744f6e60584c25a7a65b328d6957caa3e92e2f`
- Adapter output:
  `d5949a4f29a0f4d444a3c8c97ef9bc6a1ba61049f064b0832e54b3644da61625`
- Candidate `lib/service.js`:
  `dd3c55ff5cd7ac0f70ac519bb45dcdd6ded73921bd8592b551893356fe82da44`
- Candidate `lib/validation.js`:
  `cdf9d1bb5d9ed0b895c54703451eb20ebd7fc8e5a1d5f9e5f9f351760bcf6e25`
- Candidate `lib/bridge.js`:
  `037e2f5bba944f3539cb8aac4e3e3efbeb938e105f551963d923bca543240212`
- Candidate `lib/client.js`:
  `3486d8166eaf2b0dd1a3c9f0104cd19fa32c204f0d48f0d089a5626aea066494`
- Staged `darwin-arm64` native engine:
  `cd2f73a0935d99068b18f34a707887e47a145a8d6b04f9ddc08601af4bfe9cc4`
- Native staging script:
  `e3ccf2344419c96bd486cdff00da08daf8b7060740afbf1bae13643f0d06c1ce`
- Clean-profile script:
  `357ba0dfd5b595eb5847d0650a9f79166eba576b453e27882080df55292ec32a`

The JSONL outputs, staged binaries, and Cargo targets are local execution
evidence, not source-controlled artifacts. Re-run the documented commands to
regenerate them.

## Claim boundary

This execution supports the listed approval boundary for fixed Codex commit
`086396f7f60347b74c82784d5dfaf4fb2d3bda12` on macOS/aarch64. It does not
claim Windows or 32-bit runtime evidence. The ten `responseToCore` cases are
explicitly source-model evidence because the pinned mapping is private; they
are not execution of the complete app-server async handler. Full app-server
transport and turn transitions, rich approval UI, canonical shell/sandbox
execution, and the network-policy coordinator belong to later components.
