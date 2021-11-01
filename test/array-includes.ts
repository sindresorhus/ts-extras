import test from 'ava';
import {arrayIncludes} from '../source/index.js';

test('arrayIncludes()', t => {
	const values = ['a', 'b', 'c'] as const;
	const validValue: unknown = 'a';
	const invalidValue: unknown = 'd';
	let testValueType: typeof values[number];

	t.true(arrayIncludes(values, validValue));
	t.false(arrayIncludes(values, invalidValue));

	// eslint-disable-next-line unicorn/prefer-ternary
	if (arrayIncludes(values, validValue)) {
		testValueType = validValue;
	} else {
		// @ts-expect-error
		testValueType = validValue;
	}

	t.is(testValueType, 'a');
});
