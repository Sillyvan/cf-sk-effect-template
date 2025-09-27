import { query } from '$app/server';
import { Effect, Layer } from 'effect';

export const effectQuery = <A, E>(fn: () => Effect.Effect<A, E, never>) => {
	return query(async () => {
		return await Effect.runPromise(fn());
	});
};

export const effectQueryWithLayer = <A, E, R>(
	fn: () => Effect.Effect<A, E, R>,
	layer: Layer.Layer<R>
) => {
	return query(async () => {
		return await Effect.runPromise(Effect.provide(fn(), layer));
	});
};
