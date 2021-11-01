import test from 'ava';
import {arrayIncludes} from '../source/index.js';

test('arrayIncludes()', t => {
	const values = ['a', 'b', 'c'] as const;
	const validValue: unknown = 'a';
	const invalidValue: unknown = 'd';
	let testValueType: typeof values[number];

	t.is(arrayIncludes(values, validValue), true);
	t.is(arrayIncludes(values, invalidValue), false);

	if (arrayIncludes(values, validValue)) {
		testValueType = validValue;
	} else {
		// @ts-expect-error
		testValueType = validValue;
	}
});
