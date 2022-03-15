import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {setHas} from '../source/index.js';

test('setHas()', t => {
	const values = ['a', 'b', 'c'] as const;
	const valueSet = new Set(values);
	const validValue: unknown = 'a';
	const invalidValue: unknown = 'd';
	const invalidTypedValue = 1;
	let testValueType: typeof values[number];

	expectTypeOf(values).items.toMatchTypeOf<typeof validValue>();
	expectTypeOf(values).items.toMatchTypeOf<typeof invalidValue>();
	expectTypeOf(values).items.not.toMatchTypeOf<typeof invalidTypedValue>();

	t.true(setHas(valueSet, validValue));
	t.false(setHas(valueSet, invalidValue));
	// @ts-expect-error
	t.false(setHas(valueSet, invalidTypedValue));

	// eslint-disable-next-line unicorn/prefer-ternary
	if (setHas(valueSet, validValue)) {
		testValueType = validValue;
	} else {
		// @ts-expect-error
		testValueType = validValue;
	}

	t.is(testValueType, 'a');
});
