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

test('setHas() does not narrow in false branch (issue #59)', t => {
	const knownSet = new Set(['a', 'b', 'c'] as const);
	const value: unknown = 'd';

	if (setHas(knownSet, value)) {
		// Value is narrowed to 'a' | 'b' | 'c'
		expectTypeOf(value).toEqualTypeOf<'a' | 'b' | 'c'>();
	} else {
		// Value should remain unknown, not be narrowed
		// Before the fix, this would incorrectly be narrowed to never
		expectTypeOf(value).toEqualTypeOf<unknown>();
		t.pass(); // Value correctly remains unknown
	}

	// Test with union type
	const unionValue: string | number = 'not-in-set' as string | number;

	if (setHas(knownSet, unionValue)) {
		// Value is narrowed to the intersection
		expectTypeOf(unionValue).toEqualTypeOf<'a' | 'b' | 'c'>();
	} else {
		// Value should remain as string | number, not be incorrectly narrowed
		expectTypeOf(unionValue).toEqualTypeOf<string | number>();
		t.pass(); // Type correctly preserved
	}
});
