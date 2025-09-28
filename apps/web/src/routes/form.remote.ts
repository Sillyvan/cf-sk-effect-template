import { Effect } from 'effect';
import { form, query } from '$app/server';
import * as v from 'valibot';

const formSchema = v.object({
	name: v.pipe(v.string(), v.minLength(2), v.maxLength(50)),
	age: v.pipe(
		v.string(),
		v.minLength(1),
		v.transform((input) => Number(input)),
		v.number(),
		v.minValue(0),
		v.maxValue(100)
	)
});

const list: { name: string; age: number }[] = [];

export const formValueTest = query(() => {
	return list;
});

export const formTest = form(formSchema, async ({ name, age }) => {
	const program = Effect.gen(function* () {
		yield* Effect.logInfo(`${name} ${age}`);
		list.push({ name, age });
	});

	await formValueTest().refresh();
	Effect.runFork(program);
});
