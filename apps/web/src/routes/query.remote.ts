import { Effect, Schedule, Data } from 'effect';
import { query } from '$app/server';
import type { QueryResult } from '$lib/types';

class LoadFailureError extends Data.TaggedError('LoadFailure')<{
	attempt: number;
}> {}

class NetworkError extends Data.TaggedError('NetworkError')<{
	attempt: number;
}> {}

export const queryTest = query(async (): Promise<QueryResult> => {
	let attemptCount = 0;

	const randomTask = Effect.gen(function* () {
		attemptCount++;
		yield* Effect.sleep(750);
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

	const effect = randomTask.pipe(
		Effect.retry(Schedule.recurs(1)),
		Effect.catchTags({
			LoadFailure: (error) =>
				Effect.succeed<QueryResult>({
					attempts: error.attempt,
					status: 'failed',
					message: `Load failed after ${error.attempt} attempts`,
					error: error._tag
				}),
			NetworkError: (error) =>
				Effect.succeed<QueryResult>({
					attempts: error.attempt,
					status: 'failed',
					message: `Load failed after ${error.attempt} attempts`,
					error: error._tag
				})
		})
	);

	return await Effect.runPromise(effect);
});
