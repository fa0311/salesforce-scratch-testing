import type { SalesforceScratchOrg } from "../../src/index.ts";

declare module "vitest" {
  export interface ProvidedContext {
    scratchOrg: SalesforceScratchOrg;
  }
}
