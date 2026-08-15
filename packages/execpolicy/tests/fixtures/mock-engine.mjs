import { createInterface } from "node:readline";

const mismatch = process.argv.includes("--mismatch");
const hostMismatch = process.argv.includes("--host-mismatch");
const protocolVersion = 3;
const rustOs = { darwin: "macos", linux: "linux", win32: "windows" }[
  process.platform
];
const rustArch = { arm64: "aarch64", x64: "x86_64" }[process.arch];
const hello = {
  protocolVersion,
  engineVersion: "0.1.0-test",
  codexCommit: "086396f7f60347b74c82784d5dfaf4fb2d3bda12",
  execpolicyTree: "e06e0b4ad718af8a74055a33b1536b25fb9d4a87",
  shellCommandTree: "3f5da93a61be77795d3fc5bb3d6e44a9dec1d106",
  configTree: "d3f4925b575b128dd1f0f74a5babcdb1efce0219",
  execServerTree: "51751785508060e633f0e0472fa0d2572787b36a",
  utilsCliTree: "5d9c72fcadefb9a1c95e38c4726d25c5b8d195ee",
  utilsHomeDirTree: "c2d10a4f4844c2a517584ee623a0b8aa4ceb44f5",
  cargoLockBlob: "a8c2addc02055be48c345b65760a7a1b96cfbf28",
  coreExecPolicyBlob: "5de05937533a2653a700b4ec40cda09578761f50",
  coreExecPolicyDirTree: mismatch
    ? "0000000000000000000000000000000000000000"
    : "b313a3ba1b113f08e3c1686272162910dad76540",
  os: hostMismatch ? "wrong-os" : rustOs,
  arch: hostMismatch ? "wrong-arch" : rustArch,
};

function result(id, value) {
  process.stdout.write(
    `${JSON.stringify({ protocolVersion, id, result: value })}\n`,
  );
}

function error(id, code, message, data) {
  process.stdout.write(
    `${JSON.stringify({
      protocolVersion,
      id,
      error: { code, message, ...(data === undefined ? {} : { data }) },
    })}\n`,
  );
}

const input = createInterface({
  input: process.stdin,
  crlfDelay: Number.POSITIVE_INFINITY,
});
input.on("line", (line) => {
  const request = JSON.parse(line);
  switch (request.method) {
    case "hello":
      result(request.id, hello);
      break;
    case "diagnostics":
      result(request.id, {
        hello,
        loadedSources: 1,
        allowedPrefixes: [["git", "status"]],
        networkRules: 0,
        hostExecutables: 0,
      });
      break;
    case "load":
      result(request.id, {
        loadedSources:
          (request.params.sources?.length ?? 0) +
          (request.params.paths?.length ?? 0),
        allowedPrefixes: [],
      });
      break;
    case "check_tokens": {
      const first = request.params.commands?.[0]?.[0];
      if (first === "exit") {
        process.stderr.write("intentional mock crash\n", () =>
          process.exit(17),
        );
      } else if (first === "delay") {
        setTimeout(
          () => result(request.id, { decision: "allow", matchedRules: [] }),
          120,
        );
      } else if (first === "engine_error") {
        error(request.id, "invalid_params", "mock invalid params", {
          fixture: true,
        });
      } else {
        result(request.id, { decision: "allow", matchedRules: [] });
      }
      break;
    }
    case "check_exec_approval_requirement":
      if (request.params.command?.includes("malformed")) {
        result(request.id, {
          requirement: { kind: "skip", bypassSandbox: "not-a-boolean" },
          evaluation: { decision: "allow", matchedRules: [] },
          loweredCommands: [["malformed"]],
          usedComplexParsing: false,
          commandOrigin: "generic",
        });
      } else {
        result(request.id, {
          requirement: { kind: "skip", bypassSandbox: false },
          evaluation: { decision: "allow", matchedRules: [] },
          loweredCommands: [request.params.command],
          usedComplexParsing: false,
          commandOrigin: "generic",
        });
      }
      break;
    case "compile_network_domains":
      result(request.id, { allowed: ["example.com"], denied: [] });
      break;
    case "shutdown":
      process.stdout.write(
        `${JSON.stringify({ protocolVersion, id: request.id, result: { shutdown: true } })}\n`,
        () => process.exit(0),
      );
      break;
    default:
      error(
        request.id,
        "invalid_params",
        `unknown fixture method ${request.method}`,
      );
  }
});
