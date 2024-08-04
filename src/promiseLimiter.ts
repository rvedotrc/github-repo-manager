type Logger = Pick<Console, "debug">;

type Tag = string | (() => string);

type Entry<T> = {
  id: number;
  makePromise: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  tag: Tag;
};

export type PromiseLimiter<T> = {
  submit: <T2 extends T>(
    makePromise: () => Promise<T2>,
    tag: Tag,
  ) => Promise<T2>;
};

const tagToString = (tag: Tag) => (typeof tag === "string" ? tag : tag());

export const makePromiseLimiter = <T>(
  size: number,
  name: string,
  logger?: Logger,
): PromiseLimiter<T> => {
  let free = size;
  const queue: Entry<T>[] = [];

  const inFlight = new Set<Entry<T>>();
  const describe = () =>
    [...inFlight]
      .map((e) => e.id)
      .sort()
      .join(",");

  const tryStart = () => {
    while (free > 0) {
      const entry = queue.shift();
      if (!entry) break;

      --free;
      const { id, makePromise, resolve, reject, tag } = entry;
      inFlight.add(entry);
      logger?.debug(
        `${name} start job #${id}/${nextId} ${tagToString(
          tag,
        )} (in flight: ${describe()})`,
      );
      makePromise()
        .finally(() => {
          inFlight.delete(entry);
          logger?.debug(
            `${name} end job #${id}/${nextId} ${tagToString(
              tag,
            )} (in flight: ${describe()})`,
          );
          ++free;
          tryStart();
        })
        .then(resolve, reject);
    }
  };

  let nextId = 0;

  const submit = <T2 extends T>(
    makePromise: () => Promise<T2>,
    tag: Tag,
  ): Promise<T2> => {
    const id = nextId++;
    logger?.debug(`${name} submit job #${id} ${tagToString(tag)}`);
    return new Promise((resolve, reject) => {
      queue.push({ id, makePromise, resolve, reject, tag });
      tryStart();
    });
  };

  return {
    submit,
  };
};
