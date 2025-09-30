import { Effect } from 'effect';
import { command, getRequestEvent } from '$app/server';
import { checkRateLimit } from '@repo/rate-limiter';

export const commandTest = command(async () => {
	const { platform } = getRequestEvent();

	const program = Effect.gen(function* () {
		console.log(platform!.cf);
		yield* checkRateLimit(platform!.env.MY_RATE_LIMITER, 'command_test');
		yield* Effect.logInfo(platform!.cf.colo, 'command_test');

		return {
			success: true,
			message: 'Command executed successfully!',
			timestamp: Date.now()
		};
	}).pipe(
		Effect.catchTags({
			RateLimitExceeded: (error) => {
				return Effect.succeed({
					success: false,
					message: `Rate limit exceeded for key: ${error.key}`,
					error: error._tag
				});
			},
			RateLimitCheckError: (error) =>
				Effect.succeed({
					success: false,
					message: `Rate limit check failed: ${error.reason}`,
					error: error._tag
				})
		})
	);

	return await Effect.runPromise(program);
});
