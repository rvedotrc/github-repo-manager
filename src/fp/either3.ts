export type Either3<L, R> =
  | { readonly _tag: "left"; readonly left: L }
  | { readonly _tag: "right"; readonly right: R }
  | { readonly _tag: "defect"; error: unknown };

export const makeLeft = <L>(left: L): Either3<L, never> => ({
  _tag: "left",
  left,
});
export const makeRight = <R>(right: R): Either3<never, R> => ({
  _tag: "right",
  right,
});
export const makeDefect = (error: unknown): Either3<never, never> => ({
  _tag: "defect",
  error,
});

export const isLeft = <L, R>(either: Either3<L, R>) => either._tag === "left";
export const isRight = <L, R>(either: Either3<L, R>) => either._tag === "right";
export const isDefect = <L, R>(either: Either3<L, R>) =>
  either._tag === "defect";

export const mapLeft = <L, R, O>(
  either: Either3<L, R>,
  fn: (left: L) => O,
): Either3<O, R> => (isLeft(either) ? makeLeft(fn(either.left)) : either);
export const mapRight = <L, R, O>(
  either: Either3<L, R>,
  fn: (right: R) => O,
): Either3<L, O> => (isRight(either) ? makeRight(fn(either.right)) : either);

export const fold = <L, R>(either: Either3<L, R>): L | R => {
  if (isDefect(either)) throw either.error;
  return isLeft(either) ? either.left : either.right;
};

// export const leftOrThrow = <L, R>(either: Either3<L, R>): L => {
//   if (isLeft(either)) return either.left;
//   throw either.right;
// };

export default Either3;
