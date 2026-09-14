import type { SalesforceScratchOrg } from "../../src/index.ts";

/** `globalSetup` が `provide` し、テストが `inject` する値の型。両側がこのファイルを import して augmentation を有効にする。 */
declare module "vitest" {
  export interface ProvidedContext {
    scratchOrg: SalesforceScratchOrg;
  }
}
