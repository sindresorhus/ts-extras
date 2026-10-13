import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {arrayIncludes} from '../source/index.js';

test('arrayIncludes()', () => {
	const values = ['a', 'b', 'c'] as const;
	const validValue: unknown = 'a';
	const invalidValue: unknown = 'd';
	const invalidTypedValue = 1;
	let testValueType: typeof values[number];

	expectTypeOf(values).items.toExtend<typeof validValue>();
	expectTypeOf(values).items.toExtend<typeof invalidValue>();
	expectTypeOf(values).items.not.toExtend<typeof invalidTypedValue>();

	assert.equal(arrayIncludes(values, validValue), true);
	assert.equal(arrayIncludes(values, invalidValue), false);
	// @ts-expect-error
	assert.equal(arrayIncludes(values, invalidTypedValue), false);

	if (arrayIncludes(values, validValue)) {
		// @ts-expect-error
		values.push(); // Ensure readonly array is still readonly.

		testValueType = validValue;
	} else {
		// @ts-expect-error
		testValueType = validValue;

		// @ts-expect-error
		values.push(); // Ensure readonly array is still readonly.
	}

	assert.equal(testValueType, 'a');
});

test('arrayIncludes() does not narrow in false branch (issue #59)', () => {
	const knownArray = ['a', 'b', 'c'] as const;
	const value: unknown = 'd';

	if (arrayIncludes(knownArray, value)) {
		// Value is narrowed to 'a' | 'b' | 'c'
		expectTypeOf(value).toEqualTypeOf<'a' | 'b' | 'c'>();
	} else {
		// Value should remain unknown, not be narrowed
		// Before the fix, this would incorrectly be narrowed to never
		expectTypeOf(value).toEqualTypeOf<unknown>();
		// The value really is the one that was not in the array, so the branch runs and the value is intact.
		assert.equal(value, 'd');
	}

	// Test with union type
	const unionValue: string | number = 'not-in-array' as string | number;

	if (arrayIncludes(knownArray, unionValue)) {
		// Value is narrowed to the intersection
		expectTypeOf(unionValue).toEqualTypeOf<'a' | 'b' | 'c'>();
	} else {
		// Value should remain as string | number, not be incorrectly narrowed
		expectTypeOf(unionValue).toEqualTypeOf<string | number>();
		assert.equal(unionValue, 'not-in-array');
	}
});

test('arrayIncludes() narrows the else branch when the item is a union the array holds', () => {
	// The `& {}` trick keeps an `unknown` item unchanged in the `else` branch, but it relies on the item being wider than the element type. Here the item union contains the element type, so TypeScript subtracts it and leaves only `undefined`, even though a `string` that is simply not in the array also takes this branch.
	const list: Array<string | number> = ['a', 1];
	const item = 'nope' as string | number | undefined;

	assert.equal(arrayIncludes(list, item), false);

	if (arrayIncludes(list, item)) {
		expectTypeOf(item).toEqualTypeOf<string | number>();
	} else {
		expectTypeOf(item).toEqualTypeOf<undefined>();
	}
});

test('arrayIncludes() does not drop null from a nullable element type', () => {
	// A membership test that answers `true` proves the item is in the array, not that it is non-nullable, so the true branch must keep every member of the element type. `null` is the point of the test, so it is named once.
	type Nullable = string | null;

	const rows: Nullable[] = ['a', null];
	const item = null as Nullable | undefined;
	const nullValue = null as Nullable;

	if (arrayIncludes(rows, item)) {
		expectTypeOf(item).toEqualTypeOf<Nullable>();

		if (false) {
			// @ts-expect-error - `item` can still be `null` here, so this must not compile.
			item.toUpperCase();
		}
	}

	assert.equal(arrayIncludes(rows, nullValue), true);
});

test('arrayIncludes() accepts an item narrower than the element type', () => {
	// A control-flow-narrowed item is a strict subtype of the element type, and `Type extends SuperType` cannot hold for that. The item is fully compatible, so the call has to compile.
	const allowed: ReadonlyArray<string> = ['x', 'y', 'a'];
	const candidate = 'a' as 'a' | 'b';

	assert.equal(arrayIncludes(allowed, candidate), true);
	assert.equal(arrayIncludes(allowed, 'b' as 'a' | 'b'), false);

	const values = ['a', 'b', 'c'] as const;
	const inValues = 'a' as 'a' | 'b';
	assert.equal(arrayIncludes(values, inValues), true);

	if (arrayIncludes(values, inValues)) {
		expectTypeOf(inValues).toEqualTypeOf<'a' | 'b'>();
	}

	// A still-unrelated item stays rejected.
	// @ts-expect-error
	arrayIncludes(values, 1);
	// @ts-expect-error
	arrayIncludes(allowed, 1);
});

test('arrayIncludes() honours fromIndex', () => {
	// The guard stays sound with a `fromIndex`: the true branch only ever proves the item is in the array, and a later start can only make the guard less likely to fire, never wrong.
	const values = ['a', 'b', 'c'] as const;
	const value: unknown = 'a';

	assert.equal(arrayIncludes(values, value, 1), false);
	if (arrayIncludes(values, value, 1)) {
		expectTypeOf(value).toEqualTypeOf<'a' | 'b' | 'c'>();
	} else {
		expectTypeOf(value).toEqualTypeOf<unknown>();
	}

	assert.equal(arrayIncludes(values, 'a', 0), true);
	// A negative `fromIndex` counts back from the end, so it starts at the last slot.
	assert.equal(arrayIncludes(values, 'c', -1), true);
	assert.equal(arrayIncludes(values, 'a', -1), false);
});

test('arrayIncludes() uses SameValueZero like the builtin', () => {
	// `Array#includes` answers `true` for `NaN`, which no `===` does, and treats `+0` and `-0` as the same entry. A guard that disagreed with it would narrow to a branch it never reaches.
	const values = [NaN, 0] as const;

	assert.equal(arrayIncludes(values, NaN), true);
	assert.equal(arrayIncludes(values, -0), true);
	assert.equal(arrayIncludes([0], -0), true);
});

test('arrayIncludes() keeps a narrower item in the false branch', () => {
	const check = (item: 2 | 3) => {
		if (!arrayIncludes([1] as number[], item)) {
			expectTypeOf(item).toEqualTypeOf<2 | 3>();
			assert.equal(item, 3);
		}
	};

	check(3);
});
