import test from 'ava';
import {setHas} from '../source/index.js';

test('setHas()', t => {
	const values = ['a', 'b', 'c'] as const;
	const valueSet = new Set(values);
	const validValue: unknown = 'a';
	const invalidValue: unknown = 'd';
	let testValueType: typeof values[number];

	t.true(setHas(valueSet, validValue));
	t.false(setHas(valueSet, invalidValue));

	// eslint-disable-next-line unicorn/prefer-ternary
	if (setHas(valueSet, validValue)) {
		testValueType = validValue;
	} else {
		// @ts-expect-error
		testValueType = validValue;
	}

	t.is(testValueType, 'a');
});
