export type Optional<T> =
  | { readonly present: true; readonly value: T }
  | { readonly present: false };

export const makePresent = <T>(value: T): Optional<T> => ({
  present: true,
  value,
});
export const makeAbsent = <T = never>(): Optional<T> => ({ present: false });

export const isPresent = <T>(optional: Optional<T>): boolean =>
  optional.present;
export const isAbsent = <T>(optional: Optional<T>): boolean =>
  !optional.present;

export const map = <T, O>(
  optional: Optional<T>,
  fn: (value: T) => O,
): Optional<O> =>
  optional.present ? makePresent(fn(optional.value)) : optional;
export const getOrElse = <T, O>(optional: Optional<T>, fn: () => O): T | O =>
  optional.present ? optional.value : fn();

export default Optional;
