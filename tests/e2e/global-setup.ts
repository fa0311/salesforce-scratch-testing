import { resolve } from "node:path";
import type { TestProject } from "vitest/node";
import { createSalesforceScratchOrg } from "../../src/index.ts";
import "./provided-context.ts";

const scratchOrg = createSalesforceScratchOrg(
  resolve(import.meta.dirname, "salesforce-project"),
);

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
