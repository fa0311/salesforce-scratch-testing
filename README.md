# salesforce-scratch-testing

Scratch Org を Testcontainers のように扱う E2E テスト用ヘルパー。作成・デプロイ・権限付与・削除を `sf` で行い、jsforce にそのまま渡せる認証情報を返す。

## 前提

Dev Hub を CLI で認証しておく。`sf` はこのパッケージが依存として持つ。

```bash
pnpm exec sf org login web --alias devhub --set-default-dev-hub
```

`--set-default-dev-hub` はカレントのプロジェクトにしか効かないので、別ディレクトリから使うときは `SF_TARGET_DEV_HUB=devhub` を環境変数で渡すか、`sf config set target-dev-hub=devhub --global` にする。

## 使い方

```ts
import { Connection } from "@jsforce/jsforce-node";
import { createSalesforceScratchOrg } from "salesforce-scratch-testing";

const scratchOrg = createSalesforceScratchOrg(projectDirectory);
try {
  const connection = new Connection(await scratchOrg.connect());
  await connection.query("SELECT Name FROM Organization");
} finally {
  await scratchOrg.cleanup.close();
}
```

- `connect()`：Scratch Org を作り、削除を `cleanup` に登録し、Metadata をデプロイして Permission Set を割り当て、`{ alias, accessToken, instanceUrl }` を返す
- `cleanup.close()`：登録済みの後始末をすべて実行し、失敗があれば全部走らせてから `AggregateError` で投げる
- `runSalesforceCli` / `runSalesforceCliAs`：`sf` を `--json` で実行し `result` を返す。後者は zod で検証する

vitest では `globalSetup` で実行全体に 1 つ作り、`project.provide` / `inject` で認証情報を渡す。動く形は [tests/e2e](./tests/e2e)。

## 規約から決まるもの

引数は Salesforce DX プロジェクトのルートだけ。

| 項目                  | 決め方                                             |
| --------------------- | -------------------------------------------------- |
| Scratch Org 定義      | `config/project-scratch-def.json`                  |
| デプロイ対象          | `sfdx-project.json` の `packageDirectories`        |
| Permission Set        | デプロイ対象内の `*.permissionset-meta.xml` すべて |
| 有効期間 / エイリアス | 1 日 / `salesforce-e2e-` + ランダム 12 桁          |

## 開発

```bash
pnpm install
pnpm test       # unit(createCleanup)
pnpm test:e2e   # 実 Scratch Org を作る(既定 Dev Hub、または SF_TARGET_DEV_HUB=devhub)
pnpm typecheck
```
