import { appendFileSync } from "node:fs";
import { createInterface } from "node:readline";

const mode = process.argv[2] ?? "normal";
const marker = process.argv[3];
const protocolVersion = 1;
const delayMs = mode === "slow" ? 80 : 0;

const mark = (value) => {
  if (marker !== undefined) appendFileSync(marker, `${value}\n`);
};
const respond = (id, result) => {
  process.stdout.write(`${JSON.stringify({ protocolVersion, id, result })}\n`);
};
const hello = () => ({
  protocolVersion,
  engineVersion: "0.1.0-test",
  codexRepository: "https://github.com/openai/codex",
  codexCommit:
    mode === "bad-hello"
      ? "0000000000000000000000000000000000000000"
      : "086396f7f60347b74c82784d5dfaf4fb2d3bda12",
  codexApplyPatchPackage: "codex-apply-patch",
  codexApplyPatchVersion: "0.0.0",
  codexApplyPatchTree: "1601c43435739cfeca8c5ae4fe28e56b5efc4246",
  codexApplyPatchLibBlob: "5b5fac0683288b0e008ebf753dee0d588f625b77",
  codexApplyPatchParserBlob: "c400d075a684fda29c10269aef1958a27faf90aa",
  codexApplyPatchStreamingParserBlob:
    "ff1b2f82feec7bdf454f6cba61ad5f15611f5573",
  codexApplyPatchInvocationBlob: "41ee8b539aa0c2be321e1e839a503ee4760393a7",
  codexApplyPatchFileUpdateBlob: "d700570264f2b72f356011064028dededa4a2a55",
  codexApplyPatchTextFileBlob: "b7d598ca973ec73f0ed064d2360f4d218e2a792d",
  codexApplyPatchSeekSequenceBlob: "9934fa55e767cacf85db7e459a913e72c9d828a0",
  codexCargoLockBlob: "a8c2addc02055be48c345b65760a7a1b96cfbf28",
  os: process.platform === "darwin" ? "macos" : process.platform,
  arch: process.arch === "arm64" ? "aarch64" : "x86_64",
  pointerWidth: 64,
  filesystem: "LocalFileSystem::unsandboxed",
  sandbox: "none",
  scope:
    "apply_patch semantic engine only; excludes Codex core approval, sandbox orchestration, hooks, lifecycle events, and TurnDiff",
  methods: [
    "hello",
    "parse",
    "stream_parse",
    "verify_patch",
    "verify_invocation",
    "apply_patch",
    "shutdown",
  ],
  modes: ["normalize_to_lf", "preserve_line_endings"],
});
const applied = (patch) => ({
  success: true,
  stdout: patch,
  stderr: "",
  delta: { exact: true, changes: [] },
  error: null,
});

let queue = Promise.resolve();
const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
lines.on("line", (line) => {
  queue = queue.then(async () => {
    const request = JSON.parse(line);
    if (request.method === "hello") {
      respond(request.id, hello());
      return;
    }
    if (request.method === "apply_patch") {
      const patch = request.params.patch;
      mark(`start:${patch}`);
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      mark(`terminal:${patch}`);
      respond(request.id, applied(patch));
      return;
    }
    if (request.method === "parse") {
      respond(request.id, {
        accepted: true,
        patch: request.params.patch,
        environmentId: null,
        workdir: null,
        hunks: [],
        error: null,
      });
      return;
    }
    if (request.method === "shutdown") {
      mark("shutdown");
      respond(request.id, { shutdown: true });
      process.exitCode = 0;
      process.stdin.pause();
      return;
    }
    respond(request.id, null);
  });
});
