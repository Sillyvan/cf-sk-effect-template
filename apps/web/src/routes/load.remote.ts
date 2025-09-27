import { Effect, Schedule, Data } from 'effect';
import { effectQuery } from '$lib/effect-query';
import type { LoadResult } from '$lib/types';

class LoadFailureError extends Data.TaggedError('LoadFailure')<{
	attempt: number;
}> {}

class NetworkError extends Data.TaggedError('NetworkError')<{
	attempt: number;
}> {}

export const loadTest = effectQuery<LoadResult, LoadFailureError | NetworkError>(() => {
	let attemptCount = 0;

	const randomTask = Effect.gen(function* () {
		attemptCount++;
		const random = Math.random();

		if (random < 0.33) {
			// LoadFailure
			return yield* Effect.fail(new LoadFailureError({ attempt: attemptCount }));
		} else if (random < 0.66) {
			// NetworkError
			return yield* Effect.fail(new NetworkError({ attempt: attemptCount }));
		} else {
			// Success
			return {
				attempts: attemptCount,
				status: 'success' as const,
				message:
					attemptCount === 1 ? 'Success on first try!' : `Success after ${attemptCount} attempts!`
			};
		}
	});

	return randomTask.pipe(
		Effect.retry(Schedule.recurs(1)),
		Effect.catchTags({
			LoadFailure: (error) =>
				Effect.succeed<LoadResult>({
					attempts: error.attempt,
					status: 'failed',
					message: `Load failed after ${error.attempt} attempts`,
					error: error._tag
				}),
			NetworkError: (error) =>
				Effect.succeed<LoadResult>({
					attempts: error.attempt,
					status: 'failed',
					message: `Load failed after ${error.attempt} attempts`,
					error: error._tag
				})
		})
	);
});
