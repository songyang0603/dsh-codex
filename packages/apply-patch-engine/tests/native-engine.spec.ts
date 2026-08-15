import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ApplyPatchClient } from "../src/client.js";

const executableName =
  process.platform === "win32"
    ? "dsh-codex-apply-patch-engine.exe"
    : "dsh-codex-apply-patch-engine";
const nativeDirectory = `${process.platform}-${process.arch}`;
const nativeEngine = fileURLToPath(
  new URL(`../native/${nativeDirectory}/${executableName}`, import.meta.url),
);
const nativeChecksum = `${nativeEngine}.sha256`;

describe("pinned native apply-patch engine integration", () => {
  let client: ApplyPatchClient | undefined;
  let temporaryDirectory: string | undefined;

  beforeAll(() => {
    if (!existsSync(nativeEngine)) {
      throw new Error(
        `packaged native apply-patch engine is required at ${nativeEngine}; stage the pinned workspace build before tests`,
      );
    }
  });

  afterEach(async () => {
    await client?.shutdown();
    client = undefined;
    if (temporaryDirectory !== undefined) {
      await rm(temporaryDirectory, { recursive: true, force: true });
      temporaryDirectory = undefined;
    }
  });

  it("parses, streams, recognizes, verifies, and applies through the real wire", async () => {
    const binary = await readFile(nativeEngine);
    const recordedChecksum = (await readFile(nativeChecksum, "utf8")).split(
      /\s+/u,
      1,
    )[0];
    expect(createHash("sha256").update(binary).digest("hex")).toBe(
      recordedChecksum,
    );

    client = new ApplyPatchClient({ enginePath: nativeEngine });
    await expect(client.hello()).resolves.toMatchObject({
      codexCommit: "086396f7f60347b74c82784d5dfaf4fb2d3bda12",
      codexApplyPatchTree: "1601c43435739cfeca8c5ae4fe28e56b5efc4246",
      filesystem: "LocalFileSystem::unsandboxed",
      sandbox: "none",
    });

    const patch = [
      "*** Begin Patch",
      "*** Add File: hello.txt",
      "+hello",
      "*** End Patch",
    ].join("\n");
    await expect(client.parse({ patch })).resolves.toMatchObject({
      accepted: true,
      hunks: [{ kind: "AddFile", path: "hello.txt", contents: "hello\n" }],
    });
    await expect(
      client.streamParse({
        chunks: [patch.slice(0, 24), patch.slice(24)],
      }),
    ).resolves.toMatchObject({ accepted: true, failedChunkIndex: null });

    temporaryDirectory = await mkdtemp(join(tmpdir(), "dsh-patch-native-"));
    const cwd = pathToFileURL(temporaryDirectory).href;
    await expect(
      client.verifyPatch({ patch, cwd, mode: "normalize_to_lf" }),
    ).resolves.toMatchObject({
      classification: "body",
      action: { empty: false, changes: [{ kind: "Add" }] },
    });
    await expect(
      client.verifyInvocation({
        argv: ["apply_patch", patch],
        cwd,
        mode: "normalize_to_lf",
      }),
    ).resolves.toMatchObject({ classification: "body" });

    const applied = await client.applyPatch({
      patch,
      cwd,
      mode: "normalize_to_lf",
    });
    expect(applied).toMatchObject({
      success: true,
      delta: { exact: true, changes: [{ kind: "Add" }] },
    });
    await expect(
      readFile(join(temporaryDirectory, "hello.txt"), "utf8"),
    ).resolves.toBe("hello\n");
  });
});
