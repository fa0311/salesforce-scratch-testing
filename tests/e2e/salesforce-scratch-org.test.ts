import { Connection } from "@jsforce/jsforce-node";
import assert from "node:assert/strict";
import { inject, test } from "vitest";
import { z } from "zod";
import "./provided-context.ts";

const { accessToken, instanceUrl } = inject("scratchOrg");
const connection = new Connection({ accessToken, instanceUrl });

const OrganizationRecordsSchema = z.array(z.object({ Name: z.string() }));
const PermissionSetAssignmentRecordsSchema = z.array(
  z.object({ PermissionSet: z.object({ Name: z.string() }) }),
);

test("connect した Scratch Org に jsforce で接続できる", async () => {
  const { records } = await connection.query("SELECT Name FROM Organization");

  assert.deepEqual(OrganizationRecordsSchema.parse(records), [
    { Name: "salesforce-project" },
  ]);
});

test("ソース内の Permission Set がすべて割り当てられている", async () => {
  const { records } = await connection.query(
    "SELECT PermissionSet.Name FROM PermissionSetAssignment WHERE PermissionSet.Name IN ('Admin', 'Notes')",
  );

  assert.deepEqual(
    PermissionSetAssignmentRecordsSchema.parse(records)
      .map(({ PermissionSet }) => PermissionSet.Name)
      .sort(),
    ["Admin", "Notes"],
  );
});
