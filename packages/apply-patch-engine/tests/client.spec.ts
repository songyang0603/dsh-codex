import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { ApplyPatchClient, ApplyPatchTransportError } from "../src/client.js";

const fixture = fileURLToPath(
  new URL("./fixtures/mock-engine.mjs", import.meta.url),
);
const clients: ApplyPatchClient[] = [];
const temporaryDirectories: string[] = [];

async function temporaryMarker(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "dsh-patch-client-"));
  temporaryDirectories.push(directory);
  return join(directory, "lifecycle.log");
}

async function waitForLine(path: string, expected: string): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    if (existsSync(path)) {
      const lines = (await readFile(path, "utf8")).trim().split("\n");
      if (lines.includes(expected)) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`timed out waiting for ${expected}`);
}

afterEach(async () => {
  await Promise.allSettled(
    clients.splice(0).map((client) => client.shutdown()),
  );
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("ApplyPatchClient", () => {
  it("fails closed when the sidecar identity is not the pinned commit", async () => {
    const client = new ApplyPatchClient({
      enginePath: process.execPath,
      engineArgs: [fixture, "bad-hello"],
    });
    clients.push(client);
    await expect(client.ready).rejects.toBeInstanceOf(ApplyPatchTransportError);
  });

  it("keeps an aborted in-flight mutation owner-visible through terminal shutdown", async () => {
    const marker = await temporaryMarker();
    const client = new ApplyPatchClient({
      enginePath: process.execPath,
      engineArgs: [fixture, "slow", marker],
    });
    clients.push(client);
    await client.ready;

    const controller = new AbortController();
    const mutation = client.applyPatch(
      {
        patch: "A",
        cwd: "file:///tmp",
        mode: "normalize_to_lf",
      },
      controller.signal,
    );
    await waitForLine(marker, "start:A");
    controller.abort();
    await expect(mutation).rejects.toMatchObject({ name: "AbortError" });

    const shutdown = client.shutdown();
    await expect(
      client.applyPatch({
        patch: "late",
        cwd: "file:///tmp",
        mode: "normalize_to_lf",
      }),
    ).rejects.toMatchObject({ name: "ApplyPatchClientClosedError" });
    await shutdown;
    const lifecycle = (await readFile(marker, "utf8")).trim().split("\n");
    expect(lifecycle).toEqual(["start:A", "terminal:A", "shutdown"]);
  });

  it("serializes accepted mutations in call order", async () => {
    const marker = await temporaryMarker();
    const client = new ApplyPatchClient({
      enginePath: process.execPath,
      engineArgs: [fixture, "slow", marker],
    });
    clients.push(client);
    await client.ready;

    const first = client.applyPatch({
      patch: "first",
      cwd: "file:///tmp",
      mode: "normalize_to_lf",
    });
    const second = client.applyPatch({
      patch: "second",
      cwd: "file:///tmp",
      mode: "normalize_to_lf",
    });
    await expect(Promise.all([first, second])).resolves.toMatchObject([
      { stdout: "first", success: true },
      { stdout: "second", success: true },
    ]);
    await client.shutdown();
    const lifecycle = (await readFile(marker, "utf8")).trim().split("\n");
    expect(lifecycle).toEqual([
      "start:first",
      "terminal:first",
      "start:second",
      "terminal:second",
      "shutdown",
    ]);
  });

  it("does not impose the former 16 MiB response cap on valid engine output", async () => {
    const client = new ApplyPatchClient({
      enginePath: process.execPath,
      engineArgs: [fixture, "normal"],
    });
    clients.push(client);
    await client.ready;

    const patch = "x".repeat(16 * 1024 * 1024 + 1);
    await expect(client.parse({ patch })).resolves.toMatchObject({
      accepted: true,
      patch,
    });
  }, 15_000);
});
