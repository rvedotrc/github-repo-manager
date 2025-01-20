export type Either<L, R> =
  | { readonly _tag: "left"; readonly left: L }
  | { readonly _tag: "right"; readonly right: R };

export const makeLeft = <L>(left: L): Either<L, never> => ({
  _tag: "left",
  left,
});
export const makeRight = <R>(right: R): Either<never, R> => ({
  _tag: "right",
  right,
});

export const isLeft = <L, R>(either: Either<L, R>) => either._tag === "left";
export const isRight = <L, R>(either: Either<L, R>) => either._tag === "right";

export const mapLeft = <L, R, O>(
  either: Either<L, R>,
  fn: (left: L) => O,
): Either<O, R> => (isLeft(either) ? makeLeft(fn(either.left)) : either);
export const mapRight = <L, R, O>(
  either: Either<L, R>,
  fn: (right: R) => O,
): Either<L, O> => (isLeft(either) ? either : makeRight(fn(either.right)));

export const fold = <L, R>(either: Either<L, R>): L | R =>
  isLeft(either) ? either.left : either.right;

export const leftOrThrow = <L, R>(either: Either<L, R>): L => {
  if (isLeft(either)) return either.left;
  throw either.right;
};

export default Either;
