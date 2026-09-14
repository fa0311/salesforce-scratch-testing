import { execFile as execFileCallback } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

const execFile = promisify(execFileCallback);

const entryScript = resolve(
  dirname(createRequire(import.meta.url).resolve("@salesforce/cli")),
  "../bin/run.js",
);

const JsonResponseSchema = z.object({ result: z.unknown() });
const ExecFileErrorSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
});

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

export const runSalesforceCliAs = async <T>(
  projectDirectory: string,
  ResultSchema: z.ZodType<T>,
  args: readonly string[],
) => {
  return ResultSchema.parse(await runSalesforceCli(projectDirectory, args));
};
