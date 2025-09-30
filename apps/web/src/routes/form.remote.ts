import { Effect, Schema } from 'effect';
import { form, query } from '$app/server';
import { formSchema } from '$lib/schemas/form';

const list: { name: string; age: number }[] = [];

export const formValueTest = query(() => {
	return list;
});

export const formTest = form(Schema.standardSchemaV1(formSchema), async ({ name, age }) => {
	const program = Effect.gen(function* () {
		yield* Effect.logInfo(`${name} ${age}`);
		list.push({ name, age });
	});

	await formValueTest().refresh();
	Effect.runFork(program);
});
