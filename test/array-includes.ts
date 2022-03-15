import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {arrayIncludes} from '../source/index.js';

test('arrayIncludes()', t => {
	const values = ['a', 'b', 'c'] as const;
	const validValue: unknown = 'a';
	const invalidValue: unknown = 'd';
	const invalidTypedValue = 1;
	let testValueType: typeof values[number];

	expectTypeOf(values).items.toMatchTypeOf<typeof validValue>();
	expectTypeOf(values).items.toMatchTypeOf<typeof invalidValue>();
	expectTypeOf(values).items.not.toMatchTypeOf<typeof invalidTypedValue>();

	t.true(arrayIncludes(values, validValue));
	t.false(arrayIncludes(values, invalidValue));
	// @ts-expect-error
	t.false(arrayIncludes(values, invalidTypedValue));

	if (arrayIncludes(values, validValue)) {
		// @ts-expect-error
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		values.push(); // Ensure readonly array is still readonly.

		testValueType = validValue;
	} else {
		// @ts-expect-error
		testValueType = validValue;

		// @ts-expect-error
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		values.push(); // Ensure readonly array is still readonly.
	}

	t.is(testValueType, 'a');
});
