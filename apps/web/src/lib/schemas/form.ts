import { Schema } from 'effect';

export const formSchema = Schema.Struct({
	name: Schema.String.pipe(Schema.minLength(2), Schema.maxLength(50)),
	age: Schema.NumberFromString.pipe(Schema.greaterThanOrEqualTo(0), Schema.lessThanOrEqualTo(100))
});
