import { randomUUID } from "node:crypto";
import { glob, readFile } from "node:fs/promises";
import { basename, posix, resolve } from "node:path";
import { z } from "zod";
import { createCleanup } from "./cleanup.ts";
import { runSalesforceCli, runSalesforceCliAs } from "./salesforce-cli.ts";

const SfdxProjectSchema = z.object({
  packageDirectories: z.array(z.object({ path: z.string() })).min(1),
});
const OrgDisplayResultSchema = z.object({ instanceUrl: z.url() });
const ShowAccessTokenResultSchema = z.object({
  accessToken: z.string().min(1),
});

/**
 * `projectDirectory` の Salesforce DX プロジェクトを対象にした Scratch Org。
 * `connect()` が Org を作り、削除を `cleanup` に登録してから、Metadata のデプロイと Permission Set の割り当てを行い、認証情報を返す。
 * 使い終わったら `cleanup.close()` を呼ぶ。
 */
export const createSalesforceScratchOrg = (projectDirectory: string) => {
  const cleanup = createCleanup();

  const connect = async () => {
    const { packageDirectories } = SfdxProjectSchema.parse(
      JSON.parse(
        await readFile(resolve(projectDirectory, "sfdx-project.json"), "utf8"),
      ),
    );
    const permissionSetPatterns = packageDirectories.map(({ path }) =>
      posix.join(path, "**/*.permissionset-meta.xml"),
    );
    const permissionSetFiles = await Array.fromAsync(
      glob(permissionSetPatterns, { cwd: projectDirectory }),
    );
    const permissionSetNames = permissionSetFiles
      .map((file) => basename(file, ".permissionset-meta.xml"))
      .sort();

    const alias = `salesforce-e2e-${randomUUID().replaceAll("-", "").slice(0, 12)}`;

    await runSalesforceCli(projectDirectory, [
      "org",
      "create",
      "scratch",
      "--alias",
      alias,
      "--definition-file",
      resolve(projectDirectory, "config/project-scratch-def.json"),
      "--duration-days",
      "1",
    ]);

    await cleanup.add(async () => {
      await runSalesforceCli(projectDirectory, [
        "org",
        "delete",
        "scratch",
        "--target-org",
        alias,
        "--no-prompt",
      ]);
    });

    await runSalesforceCli(projectDirectory, [
      "project",
      "deploy",
      "start",
      "--target-org",
      alias,
      ...packageDirectories.flatMap(({ path }) => [
        "--source-dir",
        resolve(projectDirectory, path),
      ]),
    ]);

    for (const permissionSetName of permissionSetNames) {
      await runSalesforceCli(projectDirectory, [
        "org",
        "assign",
        "permset",
        "--target-org",
        alias,
        "--name",
        permissionSetName,
      ]);
    }

    const { instanceUrl } = await runSalesforceCliAs(
      projectDirectory,
      OrgDisplayResultSchema,
      ["org", "display", "--target-org", alias],
    );
    const { accessToken } = await runSalesforceCliAs(
      projectDirectory,
      ShowAccessTokenResultSchema,
      ["org", "auth", "show-access-token", "--target-org", alias],
    );

    return { alias, accessToken, instanceUrl };
  };

  return { connect, cleanup };
};

/** `connect()` が返す認証情報。 */
export type SalesforceScratchOrg = Awaited<
  ReturnType<ReturnType<typeof createSalesforceScratchOrg>["connect"]>
>;
