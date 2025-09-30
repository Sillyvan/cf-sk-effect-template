import { Effect, Data } from 'effect';
import type { RateLimit, RateLimitOutcome } from '@cloudflare/workers-types';

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitExceededError extends Data.TaggedError('RateLimitExceeded')<{
	key: string;
	limit?: number;
	period?: number;
}> {}

/**
 * Error thrown when rate limit check fails (e.g., network error, binding not available)
 */
export class RateLimitCheckError extends Data.TaggedError('RateLimitCheckError')<{
	key: string;
	reason: string;
}> {}

/**
 * Result of a rate limit check that doesn't fail on exceeded limit
 */
export interface RateLimitResult {
	success: boolean;
	key: string;
}

/**
 * Checks rate limit and returns an Effect that fails with RateLimitExceededError if exceeded
 *
 * @param limiter - The Cloudflare RateLimit binding
 * @param key - The key to rate limit on (e.g., user ID, API key, path)
 * @returns Effect that succeeds with RateLimitOutcome or fails with typed error
 *
 * @example
 * ```ts
 * import { checkRateLimit } from '@repo/rate-limiter';
 *
 * const effect = checkRateLimit(platform.env.MY_RATE_LIMITER, userId).pipe(
 *   Effect.catchTag('RateLimitExceeded', (error) =>
 *     Effect.succeed({ error: 'Rate limit exceeded' })
 *   )
 * );
 * ```
 */
export const checkRateLimit = (
	limiter: RateLimit,
	key: string
): Effect.Effect<RateLimitOutcome, RateLimitExceededError | RateLimitCheckError> =>
	Effect.gen(function* () {
		const result = yield* Effect.tryPromise({
			try: () => limiter.limit({ key }),
			catch: (error) =>
				new RateLimitCheckError({
					key,
					reason: error instanceof Error ? error.message : 'Unknown error'
				})
		});

		if (!result.success) {
			return yield* Effect.fail(new RateLimitExceededError({ key }));
		}

		return result;
	});