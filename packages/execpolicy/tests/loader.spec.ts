import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Context } from "@deepseek-ai/cordis";
import Loader from "@deepseek-ai/cordis-plugin-loader";
import { describe, expect, it } from "vitest";
import type { HelloOutput } from "../src/types.js";

describe("real Cordis Loader package-artifact integration", () => {
  it("loads the compiled package service and disposes its sidecar", async () => {
    const packageJsonUrl = new URL("../package.json", import.meta.url);
    const serviceSpecifier = "@songyang0603/dsh-codex-execpolicy";
    const fixture = new URL("./fixtures/mock-engine.mjs", import.meta.url);
    const manifest = JSON.parse(await readFile(packageJsonUrl, "utf8")) as {
      exports: Record<string, { default?: string } | string>;
      dsh?: { bundle?: { patch?: string } };
    };
    expect(manifest.exports["."]).toMatchObject({ default: "./lib/index.js" });
    expect(manifest.exports["./enforce"]).toBeUndefined();
    expect(manifest.dsh?.bundle?.patch).toBe("./cordis.patch.yml");
    await expect(
      readFile(new URL("../cordis.patch.yml", import.meta.url), "utf8"),
    ).resolves.toContain("@songyang0603/dsh-codex-execpolicy");

    // Variable specifiers keep test typechecking independent of ignored build
    // output; the package test script builds lib/ before Vitest starts.
    const serviceExports = (await import(serviceSpecifier)) as Record<
      string,
      unknown
    >;
    expect(typeof serviceExports.default).toBe("function");

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
        name: serviceSpecifier,
        config: {
          enginePath: process.execPath,
          engineArgs: [fileURLToPath(fixture)],
          ruleSources: [
            {
              identifier: "loader.rules",
              content:
                'prefix_rule(pattern=["git", "status"], decision="allow")',
            },
          ],
        },
      });
      await ctx.loader.await();
      const serviceEntry = ctx.loader.resolve(serviceId);
      expect(serviceEntry.fiber?.runtime?.callback?.name).toBe(
        "CodexExecPolicyService",
      );
      const service = ctx.get("codexExecPolicy") as {
        hello(): Promise<HelloOutput>;
        diagnostics(): Promise<unknown>;
      };
      await expect(service.hello()).resolves.toMatchObject({
        codexCommit: "086396f7f60347b74c82784d5dfaf4fb2d3bda12",
        configTree: "d3f4925b575b128dd1f0f74a5babcdb1efce0219",
        execServerTree: "51751785508060e633f0e0472fa0d2572787b36a",
        utilsCliTree: "5d9c72fcadefb9a1c95e38c4726d25c5b8d195ee",
        utilsHomeDirTree: "c2d10a4f4844c2a517584ee623a0b8aa4ceb44f5",
        cargoLockBlob: "a8c2addc02055be48c345b65760a7a1b96cfbf28",
        coreExecPolicyDirTree: "b313a3ba1b113f08e3c1686272162910dad76540",
      });

      await remove(serviceId);
      expect(ctx.get("codexExecPolicy")).toBeUndefined();
      await expect(service.diagnostics()).rejects.toMatchObject({
        name: "ExecPolicyClientClosedError",
      });
    } finally {
      for (const id of [...activeEntries].reverse()) {
        await remove(id);
      }
      await loaderFiber.dispose();
    }
  });
});
