import assert from "node:assert/strict";
import { describe, test } from "vitest";
import { createCleanup } from "../../src/cleanup.ts";

describe("createCleanup", () => {
  test("close は登録した handler をすべて実行し、二度目の close では再実行しない", async () => {
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

  test("複数の handler が失敗しても全部走らせてから AggregateError で投げる", async () => {
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

  test("close 後に add した handler は即座に実行する", async () => {
    const log: string[] = [];
    const cleanup = createCleanup();

    await cleanup.close();
    await cleanup.add(async () => {
      log.push("late");
    });

    assert.deepEqual(log, ["late"]);
  });
});
