# salesforce-scratch-testing

Disposable Salesforce Scratch Orgs for E2E tests.

```bash
pnpm exec sf org login web --alias devhub --set-default-dev-hub
```

```ts
const scratchOrg = createSalesforceScratchOrg(projectDirectory);
try {
  const connection = new Connection(await scratchOrg.connect());
} finally {
  await scratchOrg.cleanup.close();
}
```

`connect()` creates the org from `config/project-scratch-def.json`, deploys `sfdx-project.json`'s package directories, and assigns every permission set in them.

## vitest

`globalSetup` runs in the main process and tests run in workers, so pass the org through `provide` / `inject`.

```ts
// tests/global-setup.ts
import type { TestProject } from "vitest/node";
import { createSalesforceScratchOrg } from "salesforce-scratch-testing";
import "./provided-context.ts";

const scratchOrg = createSalesforceScratchOrg(import.meta.dirname);

export default async (project: TestProject) => {
  try {
    project.provide("scratchOrg", await scratchOrg.connect());
  } catch (error) {
    await scratchOrg.cleanup.close();
    throw error;
  }

  return async () => {
    await scratchOrg.cleanup.close();
  };
};
```

See [tests/e2e](./tests/e2e) for the full setup, including `provided-context.ts` and the vitest config.

```bash
pnpm test       # unit
pnpm test:e2e   # real scratch org
```
