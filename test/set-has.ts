import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {setHas} from '../source/index.js';

test('setHas()', () => {
	const values = ['a', 'b', 'c'] as const;
	const valueSet = new Set(values);
	const validValue: unknown = 'a';
	const invalidValue: unknown = 'd';
	const invalidTypedValue = 1;
	let testValueType: typeof values[number];

	expectTypeOf(values).items.toExtend<typeof validValue>();
	expectTypeOf(values).items.toExtend<typeof invalidValue>();
	expectTypeOf(values).items.not.toExtend<typeof invalidTypedValue>();

	assert.equal(setHas(valueSet, validValue), true);
	assert.equal(setHas(valueSet, invalidValue), false);
	// @ts-expect-error
	assert.equal(setHas(valueSet, invalidTypedValue), false);

	if (setHas(valueSet, validValue)) {
		testValueType = validValue;
	} else {
		// @ts-expect-error
		testValueType = validValue;
	}

	assert.equal(testValueType, 'a');
});

test('setHas() does not narrow in false branch (issue #59)', () => {
	const knownSet = new Set(['a', 'b', 'c'] as const);
	const value: unknown = 'd';

	if (setHas(knownSet, value)) {
		// Value is narrowed to 'a' | 'b' | 'c'
		expectTypeOf(value).toEqualTypeOf<'a' | 'b' | 'c'>();
	} else {
		// Value should remain unknown, not be narrowed
		// Before the fix, this would incorrectly be narrowed to never
		expectTypeOf(value).toEqualTypeOf<unknown>();
		// The value really is the one that was not in the set, so the branch runs and the value is intact.
		assert.equal(value, 'd');
	}

	// Test with union type
	const unionValue: string | number = 'not-in-set' as string | number;

	if (setHas(knownSet, unionValue)) {
		// Value is narrowed to the intersection
		expectTypeOf(unionValue).toEqualTypeOf<'a' | 'b' | 'c'>();
	} else {
		// Value should remain as string | number, not be incorrectly narrowed
		expectTypeOf(unionValue).toEqualTypeOf<string | number>();
		assert.equal(unionValue, 'not-in-set');
	}
});

test('setHas() does not drop null from a nullable element type', () => {
	// A membership test that answers `true` proves the item is in the set, not that it is non-nullable, so the true branch must keep every member of the element type. `null` is the point of the test, so it is named once.
	type Nullable = string | null;

	const tags = new Set<Nullable>(['a', null]);
	const item = null as Nullable | undefined;
	const nullValue = null as Nullable;

	if (setHas(tags, item)) {
		expectTypeOf(item).toEqualTypeOf<Nullable>();

		if (false) {
			// @ts-expect-error - `item` can still be `null` here, so this must not compile.
			item.toUpperCase();
		}
	}

	assert.equal(setHas(tags, nullValue), true);
});

test('setHas() accepts an item narrower than the element type', () => {
	// The same inference as `arrayIncludes()`: a control-flow-narrowed item is a strict subtype of the element type, and `Type extends SuperType` cannot hold for that.
	const set = new Set(['a', 'b']);
	const candidate = 'a' as 'a' | 'b' | 'c';

	assert.equal(setHas(set, candidate), true);
	assert.equal(setHas(set, 'c' as 'a' | 'b' | 'c'), false);

	const values = new Set(['a', 'b', 'c'] as const);
	assert.equal(setHas(values, 'c' as 'a' | 'b' | 'c'), true);

	// A still-unrelated item stays rejected.
	// @ts-expect-error
	setHas(values, 1);
});

test('setHas() uses SameValueZero like the builtin', () => {
	// `Set#has` answers `true` for `NaN` and for `+0` against `-0`, so a guard that disagreed with it would narrow to a branch it never reaches.
	const set = new Set([NaN, 0]);

	assert.equal(setHas(set, NaN), true);
	assert.equal(setHas(set, -0), true);
	assert.equal(setHas(new Set(['a']), 'a' as string), true);
	assert.equal(setHas(new Set(['a']), 'b' as string), false);
});

test('setHas() keeps a narrower item in the false branch', () => {
	const check = (item: 2 | 3) => {
		if (!setHas(new Set<number>([1]), item)) {
			expectTypeOf(item).toEqualTypeOf<2 | 3>();
			assert.equal(item, 3);
		}
	};

	check(3);
});
