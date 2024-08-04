export type Resolvers<T> = {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

export type DetachedPromise<T> = {
  resolvers: Resolvers<T>;
  promise: Promise<T>;
};

export const makeDetachedPromise = <T>(): Promise<DetachedPromise<T>> =>
  new Promise<DetachedPromise<T>>((resolveDetached) => {
    const promise = new Promise<T>((resolve, reject) =>
      process.nextTick(() =>
        resolveDetached({
          resolvers: { resolve, reject },
          promise,
        }),
      ),
    );
  });
