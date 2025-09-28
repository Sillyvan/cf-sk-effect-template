import { Effect } from 'effect';
import { command } from '$app/server';

export const commandTest = command(() => {
	const program = Effect.gen(function* () {
		yield* Effect.logInfo('Command received');
	});

	Effect.runFork(program);
});
