# Parity standard

## The claim is a tuple

`parity_verified` always names four things:

1. a component boundary;
2. an exact upstream Codex commit;
3. a dsh-codex component version or source commit;
4. the platforms on which the evidence actually ran.

A component boundary may be narrow. Partial behavior inside that boundary is
not acceptable. Platform support that has not run is not inferred from a CI
file or from another operating system.

For example, execpolicy owns policy/config semantics and policy-file side
effects. It does not own process launch, prompting, sandbox enforcement, or a
live network proxy. Returning `bypassSandbox` is exact execpolicy output;
applying it is a separate shell/sandbox component's requirement.

## Component and composition parity

There are two different proofs:

- **Component parity:** equivalent inputs produce the same canonical outputs,
  errors, ordering, and owned side effects.
- **Composition parity:** the versioned canonical `dsh-codex` profile connects
  components so the whole agent has the same externally observable behavior.

Pure semantic/provider components can become parity-verified on component
evidence. A component that launches a command, changes a sandbox, prompts a
human, or mutates a proxy also needs end-to-end composition evidence for that
effect. An arbitrary third-party DSH profile may add stricter guards or replace
providers and is outside the canonical-profile claim.

## Required evidence

Before a component is marked `parity_verified`, its record must contain:

- the upstream commit and exact source-object boundaries;
- direct reuse of public upstream code where possible;
- passing relevant upstream tests;
- an independent differential oracle for adapted private behavior;
- DSH Context and compiled-artifact Loader coverage;
- failure, cancellation, persistence, and concurrency cases that belong to the
  component;
- the platforms that actually ran;
- usable source/package instructions;
- explicit exclusions that lie outside the declared boundary.

The implementation under test cannot serve as its own oracle. Private
`codex-core` behavior is observed by applying a small test-only instrumentation
patch to a detached checkout of the pinned commit. The patch serializes the
upstream result; it does not replace the upstream decision logic.

A finite corpus proves those cases, not mathematical exhaustiveness. Confidence
comes from combining direct pinned crate reuse, upstream tests, focused
differential corpora, source review, and DSH integration tests. Known missing
behavior inside the boundary prevents verification; a hypothetical untested
input does not automatically make any real-world compatibility claim
impossible.

## Status vocabulary

- `planned`: boundary identified; implementation has not started.
- `in_progress`: implementation or required evidence is incomplete.
- `blocked`: a named external condition prevents further progress.
- `parity_verified`: every required gate is green for the stated tuple.
- `upstream_drift`: a newer upstream snapshot is being evaluated; the previous
  pinned claim remains explicit.

There is no `mostly_complete` state.

## Upgrades

An upstream update is a new verification target. The lock changes only with
updated source identities, adapted-code review, regenerated oracle evidence,
and passing component checks. Existing releases continue to name the commit
they implement.
