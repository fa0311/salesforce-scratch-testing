import assert from "node:assert/strict";
import { describe, test } from "vitest";
import { createCleanup } from "../../src/cleanup.ts";

describe("createCleanup", () => {
  test("close runs every registered handler once; a second close runs nothing", async () => {
    const log: string[] = [];
    const cleanup = createCleanup();

    await cleanup.add(async () => {
      log.push("a");
    });
    await cleanup.add(async () => {
      log.push("b");
    });
    await cleanup.close();
    await cleanup.close();

    assert.deepEqual(log, ["a", "b"]);
  });

  test("close runs all handlers even if some fail, then throws AggregateError", async () => {
    const log: string[] = [];
    const cleanup = createCleanup();

    await cleanup.add(async () => {
      throw new Error("first");
    });
    await cleanup.add(async () => {
      log.push("ran");
    });
    await cleanup.add(async () => {
      throw new Error("second");
    });

    await assert.rejects(cleanup.close(), (error: unknown) => {
      assert.ok(error instanceof AggregateError);
      assert.deepEqual(
        error.errors.map((inner: unknown) =>
          inner instanceof Error ? inner.message : inner,
        ),
        ["first", "second"],
      );

      return true;
    });
    assert.deepEqual(log, ["ran"]);
  });

  test("a handler added after close runs immediately", async () => {
    const log: string[] = [];
    const cleanup = createCleanup();

    await cleanup.close();
    await cleanup.add(async () => {
      log.push("late");
    });

    assert.deepEqual(log, ["late"]);
  });
});
