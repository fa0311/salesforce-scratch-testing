import { execFile as execFileCallback } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

const execFile = promisify(execFileCallback);

/**
 * `@salesforce/cli` は `dist/index.js` しか export しないので、そこから `bin/run.js` を導く。
 * `import.meta.resolve` は Vite の module runner(vitest の globalSetup など)で使えないため `createRequire` で解決する。
 */
const entryScript = resolve(
  dirname(createRequire(import.meta.url).resolve("@salesforce/cli")),
  "../bin/run.js",
);

const JsonResponseSchema = z.object({ result: z.unknown() });
const ExecFileErrorSchema = z.object({ stdout: z.string(), stderr: z.string() });

/** `projectDirectory` で `sf` を `--json` 付きで実行し、応答の `result` を返す。失敗時は `sf` の出力を含めて投げる。 */
export const runSalesforceCli = async (
  projectDirectory: string,
  args: readonly string[],
) => {
  const stdout = await (async () => {
    try {
      const { stdout } = await execFile(
        process.execPath,
        ["--no-deprecation", entryScript, ...args, "--json"],
        { cwd: projectDirectory, maxBuffer: 10 * 1024 * 1024 },
      );

      return stdout;
    } catch (error) {
      const { stdout, stderr } = ExecFileErrorSchema.parse(error);

      throw new Error(`sf ${args.join(" ")} failed\n${stdout}${stderr}`, {
        cause: error,
      });
    }
  })();

  return JsonResponseSchema.parse(JSON.parse(stdout)).result;
};

/** `runSalesforceCli` の `result` を `ResultSchema` で検証して返す。 */
export const runSalesforceCliAs = async <T>(
  projectDirectory: string,
  ResultSchema: z.ZodType<T>,
  args: readonly string[],
) => {
  return ResultSchema.parse(await runSalesforceCli(projectDirectory, args));
};
