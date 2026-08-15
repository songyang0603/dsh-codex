import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Context } from "@deepseek-ai/cordis";
import Loader from "@deepseek-ai/cordis-plugin-loader";
import { describe, expect, it } from "vitest";
import type {
  ApplyPatchHelloOutput,
  ParsePatchOutput,
  ParsePatchParams,
} from "../src/types.js";

describe("real Cordis Loader package-artifact integration", () => {
  it("loads only the compiled semantic service and quiescently disposes it", async () => {
    const packageJsonUrl = new URL("../package.json", import.meta.url);
    const serviceSpecifier = "@songyang0603/dsh-codex-apply-patch-engine";
    const builtServiceUrl = new URL("../lib/index.js", import.meta.url);
    const fixture = fileURLToPath(
      new URL("./fixtures/mock-engine.mjs", import.meta.url),
    );
    const manifest = JSON.parse(await readFile(packageJsonUrl, "utf8")) as {
      exports: Record<string, { default?: string } | string>;
      files: string[];
      dsh?: { bundle?: { patch?: string } };
    };
    expect(manifest.exports["."]).toMatchObject({ default: "./lib/index.js" });
    expect(manifest.dsh?.bundle?.patch).toBe("./cordis.patch.yml");
    expect(manifest.files.some((entry) => entry.startsWith("src"))).toBe(false);
    expect(manifest.files.some((entry) => entry.startsWith("tests"))).toBe(
      false,
    );
    await expect(
      readFile(new URL("../cordis.patch.yml", import.meta.url), "utf8"),
    ).resolves.toContain(serviceSpecifier);

    // Import through the package export after the package test script builds
    // lib/. This exercises the same artifact entry Loader resolves.
    const serviceExports = (await import(serviceSpecifier)) as Record<
      string,
      unknown
    >;
    expect(typeof serviceExports.default).toBe("function");
    expect(serviceExports).not.toHaveProperty("apply");

    const ctx = new Context();
    const loaderFiber = await ctx.plugin(Loader, {
      baseUrl: packageJsonUrl.href,
    });
    const activeEntries: string[] = [];
    const create = async (options: Parameters<typeof ctx.loader.create>[0]) => {
      const id = await ctx.loader.create(options);
      activeEntries.push(id);
      return id;
    };
    const remove = async (id: string) => {
      await ctx.loader.remove(id);
      const index = activeEntries.indexOf(id);
      if (index >= 0) activeEntries.splice(index, 1);
    };

    try {
      const serviceId = await create({
        name: builtServiceUrl.href,
        config: {
          enginePath: process.execPath,
          engineArgs: [fixture, "normal"],
        },
      });
      await ctx.loader.await();
      const serviceEntry = ctx.loader.resolve(serviceId);
      expect(serviceEntry.fiber?.runtime?.callback?.name).toBe(
        "CodexApplyPatchService",
      );
      const service = ctx.get("codexApplyPatch") as {
        hello(): Promise<ApplyPatchHelloOutput>;
        parse(params: ParsePatchParams): Promise<ParsePatchOutput>;
      };
      await expect(service.hello()).resolves.toMatchObject({
        codexCommit: "086396f7f60347b74c82784d5dfaf4fb2d3bda12",
        filesystem: "LocalFileSystem::unsandboxed",
        sandbox: "none",
      });
      await expect(service.parse({ patch: "fixture" })).resolves.toMatchObject({
        accepted: true,
        patch: "fixture",
      });
      expect(ctx.get("tools")).toBeUndefined();

      await remove(serviceId);
      expect(ctx.get("codexApplyPatch")).toBeUndefined();
      await expect(
        service.parse({ patch: "after-dispose" }),
      ).rejects.toMatchObject({
        name: "ApplyPatchClientClosedError",
      });
    } finally {
      for (const id of [...activeEntries].reverse()) await remove(id);
      await loaderFiber.dispose();
    }
  });
});
