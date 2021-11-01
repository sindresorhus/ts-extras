import test from 'ava';
import {arrayIncludes} from '../source/index.js';

test('arrayIncludes()', t => {
	const values = ['a', 'b', 'c'] as const;
	const validValue: unknown = 'a';
	const invalidValue: unknown = 'd';
	let testValueType: typeof values[number];

	t.true(arrayIncludes(values, validValue));
	t.false(arrayIncludes(values, invalidValue));

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
