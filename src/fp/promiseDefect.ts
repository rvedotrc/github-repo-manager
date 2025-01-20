// type ExtendedPromiseConstructor = {
//   [k in keyof PromiseConstructor]: PromiseConstructor[k] extends (
//     ...args: unknown[]
//   ) => Promise<infer T>
//     ? (
//         ...args: Parameters<PromiseConstructor[k]>
//       ) => ExtendedPromise<T> & Promise<T>
//     : PromiseConstructor[k] extends Promise<infer T>
//       ? ExtendedPromise<T> & Promise<T>
//       : PromiseConstructor[k];
// } & {
//   readonly staticKnobs: true;
//   readonly reverse: <T>() => ExtendedPromise<T>;
// };

// type ExtendedPromise<T> = {
//   [k in keyof Promise<T>]: Promise<T>[k] extends (
//     ...args: unknown[]
//   ) => Promise<T>
//     ? (...args: Parameters<Promise<T>[k]>) => ExtendedPromise<T> & Promise<T>
//     : Promise<T>[k] extends Promise<T>
//       ? ExtendedPromise<T> & Promise<T>
//       : Promise<T>[k];
// } & {
//   readonly knobs: true;
//   readonly reverse: () => ExtendedPromise<T>;
// };

// const ExtendedPromise:

// const

// // interface Knobs<T> {
// //   readonly knobs: true;
// //   readonly reverse: () => PromiseWithKnobsOn<T>;
// // }

// // const prototypeStack = (o: object): object[] => {
// //   const proto = Reflect.getPrototypeOf(o);
// //   if (proto === null) return [o];
// //   return [o, ...prototypeStack(proto)];
// // };
// // prototypeStack(prototypeStack);

// // const knobs: Knobs<unknown> = {
// //   knobs: true,
// //   reverse: function () {
// //     return (this as unknown as PromiseWithKnobsOn<unknown>).then((value) =>
// //       typeof value === "string" ? value.split("").toReversed().join("") : value,
// //     ) as PromiseWithKnobsOn<unknown>;
// //   },
// // };

// // Reflect.setPrototypeOf(knobs, Promise.prototype);
// // type PromiseWithKnobsOn<T> = Promise<T> & Knobs<T>;
// // const PromiseWithKnobsOn = knobs;

// // const aPromise = Promise.resolve("cat");

// // Reflect.setPrototypeOf(aPromise, PromiseWithKnobsOn);
// // const aPromiseWithKnobsOn = aPromise as PromiseWithKnobsOn<string>;

// // console.log(aPromiseWithKnobsOn.knobs);
// // aPromiseWithKnobsOn.then((v) => console.log({ v }));
// // console.log({ reversed: await aPromiseWithKnobsOn.reverse() });
