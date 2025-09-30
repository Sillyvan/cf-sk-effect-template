import * as v from 'valibot';

export const formSchema = v.object({
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
