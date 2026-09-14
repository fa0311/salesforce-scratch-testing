export const createCleanup = () => {
  const handlers: (() => Promise<void>)[] = [];
  let closed = false;

  const add = async (handler: () => Promise<void>) => {
    if (closed) {
      await handler();
    } else {
      handlers.push(handler);
    }
  };

  const close = async () => {
    closed = true;
    const results = await Promise.allSettled(
      handlers.splice(0).map((handler) => handler()),
    );
    const rejected = results.filter((result) => result.status === "rejected");
    if (rejected.length > 0) {
      throw new AggregateError(
        rejected.map((result) => result.reason),
        "cleanup failed",
      );
    }
  };

  return { add, close };
};
