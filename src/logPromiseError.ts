// import { EventEmitter } from "stream";

export const logPromiseError = (name: string) => (error: Error) => {
  console.error(`Promise failed [${name}]`, error);
  throw error;
};

export const succeeded = <T>(value: T): SF<T, never> => ({
  tag: "succeeded",
  value,
});

export const failed = <T>(reason: T): SF<never, T> => ({
  tag: "failed",
  reason,
});

export type NONE = "NONE" & { readonly t: unique symbol };
export const NONE = "NONE" as NONE;

export type SF<A, B> =
  | { readonly tag: "succeeded"; readonly value: A }
  | { readonly tag: "failed"; readonly reason: B };

export const didSucceed = <A, B>(
  sf: SF<A, B>,
): sf is SF<A, B> & { readonly tag: "succeeded" } => sf.tag === "succeeded";
export const didFail = <A, B>(
  sf: SF<A, B>,
): sf is SF<A, B> & { readonly tag: "failed" } => sf.tag === "failed";

export type SFWithContext<I, A, B, D = unknown> = {
  readonly inputs: I;
  readonly debug: D;
  readonly result: SF<A, B>;
};
