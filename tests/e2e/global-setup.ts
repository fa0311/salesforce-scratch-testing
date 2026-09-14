import { resolve } from "node:path";
import type { TestProject } from "vitest/node";
import { createSalesforceScratchOrg } from "../../src/index.ts";
import "./provided-context.ts";

/** テスト実行全体で Scratch Org を 1 つ作り、認証情報を `inject("scratchOrg")` で各テストへ渡す。 */
const scratchOrg = createSalesforceScratchOrg(
  resolve(import.meta.dirname, "salesforce-project"),
);

export default async (project: TestProject) => {
  const disposables = new AsyncDisposableStack();
  disposables.defer(async () => {
    await scratchOrg.cleanup.close();
  });

  try {
    project.provide("scratchOrg", await scratchOrg.connect());
  } catch (error) {
    // setup が失敗すると vitest は teardown を呼ばないので、ここで後始末する
    await disposables.disposeAsync();

    throw error;
  }

  // メソッド参照をそのまま返すと this が外れて TypeError になる
  return () => disposables.disposeAsync();
};
