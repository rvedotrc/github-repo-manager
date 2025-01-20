type Fn<I, O> = (value: I) => O;

export const pipe: {
  <A, B>(ab: Fn<A, B>): Fn<A, B>;

  <A, B, C>(ab: Fn<A, B>, bc: Fn<B, C>): Fn<A, C>;

  <A, B, C, D>(ab: Fn<A, B>, bc: Fn<B, C>, cd: Fn<C, D>): Fn<A, D>;

  <A, B, C, D, E>(
    ab: Fn<A, B>,
    bc: Fn<B, C>,
    cd: Fn<C, D>,
    de: Fn<D, E>,
  ): Fn<A, E>;

  <A, B, C, D, E, F>(
    ab: Fn<A, B>,
    bc: Fn<B, C>,
    cd: Fn<C, D>,
    de: Fn<D, E>,
    ef: Fn<E, F>,
  ): Fn<A, F>;

  <A, B, C, D, E, F, G>(
    ab: Fn<A, B>,
    bc: Fn<B, C>,
    cd: Fn<C, D>,
    de: Fn<D, E>,
    ef: Fn<E, F>,
    fg: Fn<F, G>,
  ): Fn<A, G>;

  <A, B, C, D, E, F, G, H>(
    ab: Fn<A, B>,
    bc: Fn<B, C>,
    cd: Fn<C, D>,
    de: Fn<D, E>,
    ef: Fn<E, F>,
    fg: Fn<F, G>,
    gh: Fn<G, H>,
  ): Fn<A, H>;

  <A, B, C, D, E, F, G, H, I>(
    ab: Fn<A, B>,
    bc: Fn<B, C>,
    cd: Fn<C, D>,
    de: Fn<D, E>,
    ef: Fn<E, F>,
    fg: Fn<F, G>,
    gh: Fn<G, H>,
    gi: Fn<H, I>,
  ): Fn<A, I>;

  <A, B, C, D, E, F, G, H, I, J>(
    ab: Fn<A, B>,
    bc: Fn<B, C>,
    cd: Fn<C, D>,
    de: Fn<D, E>,
    ef: Fn<E, F>,
    fg: Fn<F, G>,
    gh: Fn<G, H>,
    gi: Fn<H, I>,
    ij: Fn<I, J>,
  ): Fn<A, J>;

  <A, B, C, D, E, F, G, H, I, J, K>(
    ab: Fn<A, B>,
    bc: Fn<B, C>,
    cd: Fn<C, D>,
    de: Fn<D, E>,
    ef: Fn<E, F>,
    fg: Fn<F, G>,
    gh: Fn<G, H>,
    gi: Fn<H, I>,
    ij: Fn<I, J>,
    jk: Fn<J, K>,
  ): Fn<A, K>;

  <A, B, C, D, E, F, G, H, I, J, K, L>(
    ab: Fn<A, B>,
    bc: Fn<B, C>,
    cd: Fn<C, D>,
    de: Fn<D, E>,
    ef: Fn<E, F>,
    fg: Fn<F, G>,
    gh: Fn<G, H>,
    gi: Fn<H, I>,
    ij: Fn<I, J>,
    jk: Fn<J, K>,
    kl: Fn<K, L>,
  ): Fn<A, L>;

  <A, B, C, D, E, F, G, H, I, J, K, L, M>(
    ab: Fn<A, B>,
    bc: Fn<B, C>,
    cd: Fn<C, D>,
    de: Fn<D, E>,
    ef: Fn<E, F>,
    fg: Fn<F, G>,
    gh: Fn<G, H>,
    gi: Fn<H, I>,
    ij: Fn<I, J>,
    jk: Fn<J, K>,
    kl: Fn<K, L>,
    lm: Fn<L, M>,
  ): Fn<A, M>;

  <A, B, C, D, E, F, G, H, I, J, K, L, M, N>(
    ab: Fn<A, B>,
    bc: Fn<B, C>,
    cd: Fn<C, D>,
    de: Fn<D, E>,
    ef: Fn<E, F>,
    fg: Fn<F, G>,
    gh: Fn<G, H>,
    gi: Fn<H, I>,
    ij: Fn<I, J>,
    jk: Fn<J, K>,
    kl: Fn<K, L>,
    lm: Fn<L, M>,
    mn: Fn<M, N>,
  ): Fn<A, N>;

  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(
    ab: Fn<A, B>,
    bc: Fn<B, C>,
    cd: Fn<C, D>,
    de: Fn<D, E>,
    ef: Fn<E, F>,
    fg: Fn<F, G>,
    gh: Fn<G, H>,
    gi: Fn<H, I>,
    ij: Fn<I, J>,
    jk: Fn<J, K>,
    kl: Fn<K, L>,
    lm: Fn<L, M>,
    mn: Fn<M, N>,
    no: Fn<N, O>,
  ): Fn<A, O>;

  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(
    ab: Fn<A, B>,
    bc: Fn<B, C>,
    cd: Fn<C, D>,
    de: Fn<D, E>,
    ef: Fn<E, F>,
    fg: Fn<F, G>,
    gh: Fn<G, H>,
    gi: Fn<H, I>,
    ij: Fn<I, J>,
    jk: Fn<J, K>,
    kl: Fn<K, L>,
    lm: Fn<L, M>,
    mn: Fn<M, N>,
    no: Fn<N, O>,
    op: Fn<O, P>,
  ): Fn<A, P>;

  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(
    ab: Fn<A, B>,
    bc: Fn<B, C>,
    cd: Fn<C, D>,
    de: Fn<D, E>,
    ef: Fn<E, F>,
    fg: Fn<F, G>,
    gh: Fn<G, H>,
    gi: Fn<H, I>,
    ij: Fn<I, J>,
    jk: Fn<J, K>,
    kl: Fn<K, L>,
    lm: Fn<L, M>,
    mn: Fn<M, N>,
    no: Fn<N, O>,
    op: Fn<O, P>,
    pq: Fn<P, Q>,
  ): Fn<A, Q>;

  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(
    ab: Fn<A, B>,
    bc: Fn<B, C>,
    cd: Fn<C, D>,
    de: Fn<D, E>,
    ef: Fn<E, F>,
    fg: Fn<F, G>,
    gh: Fn<G, H>,
    gi: Fn<H, I>,
    ij: Fn<I, J>,
    jk: Fn<J, K>,
    kl: Fn<K, L>,
    lm: Fn<L, M>,
    mn: Fn<M, N>,
    no: Fn<N, O>,
    op: Fn<O, P>,
    pq: Fn<P, Q>,
    qr: Fn<Q, R>,
  ): Fn<A, R>;

  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(
    ab: Fn<A, B>,
    bc: Fn<B, C>,
    cd: Fn<C, D>,
    de: Fn<D, E>,
    ef: Fn<E, F>,
    fg: Fn<F, G>,
    gh: Fn<G, H>,
    gi: Fn<H, I>,
    ij: Fn<I, J>,
    jk: Fn<J, K>,
    kl: Fn<K, L>,
    lm: Fn<L, M>,
    mn: Fn<M, N>,
    no: Fn<N, O>,
    op: Fn<O, P>,
    pq: Fn<P, Q>,
    qr: Fn<Q, R>,
    rs: Fn<R, S>,
  ): Fn<A, S>;

  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(
    ab: Fn<A, B>,
    bc: Fn<B, C>,
    cd: Fn<C, D>,
    de: Fn<D, E>,
    ef: Fn<E, F>,
    fg: Fn<F, G>,
    gh: Fn<G, H>,
    gi: Fn<H, I>,
    ij: Fn<I, J>,
    jk: Fn<J, K>,
    kl: Fn<K, L>,
    lm: Fn<L, M>,
    mn: Fn<M, N>,
    no: Fn<N, O>,
    op: Fn<O, P>,
    pq: Fn<P, Q>,
    qr: Fn<Q, R>,
    rs: Fn<R, S>,
    st: Fn<S, T>,
  ): Fn<A, T>;
} =
  (...fns: Fn<unknown, unknown>[]): Fn<unknown, unknown> =>
  (value: unknown) =>
    fns.reduce((v, fn) => fn(v), value);

export default pipe;
