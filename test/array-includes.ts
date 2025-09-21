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

test('arrayIncludes() does not narrow in false branch (issue #59)', t => {
	const knownArray = ['a', 'b', 'c'] as const;
	const value: unknown = 'd';

	if (arrayIncludes(knownArray, value)) {
		// Value is narrowed to 'a' | 'b' | 'c'
		expectTypeOf(value).toEqualTypeOf<'a' | 'b' | 'c'>();
	} else {
		// Value should remain unknown, not be narrowed
		// Before the fix, this would incorrectly be narrowed to never
		expectTypeOf(value).toEqualTypeOf<unknown>();
		t.pass(); // Value correctly remains unknown
	}

	// Test with union type
	const unionValue: string | number = 'not-in-array' as string | number;

	if (arrayIncludes(knownArray, unionValue)) {
		// Value is narrowed to the intersection
		expectTypeOf(unionValue).toEqualTypeOf<'a' | 'b' | 'c'>();
	} else {
		// Value should remain as string | number, not be incorrectly narrowed
		expectTypeOf(unionValue).toEqualTypeOf<string | number>();
		t.pass(); // Type correctly preserved
	}
});
