import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {not, isDefined} from '../source/index.js';

test('not() inverts type guards', () => {
	const isString = (value: unknown): value is string =>
		typeof value === 'string';

	const isNotString = not(isString);

	assert.equal(isNotString(123), true);
	assert.equal(isNotString(true), true);
	assert.equal(isNotString('hello'), false);

	const mixedValue: string | number | boolean = 123 as string | number | boolean;
	if (isNotString(mixedValue)) {
		expectTypeOf(mixedValue).toEqualTypeOf<number | boolean>();
	}
});

test('not() with nullable types', () => {
	const isNullish = (value: unknown): value is undefined =>
		value === null || value === undefined;

	const isNotNullish = not(isNullish);

	assert.equal(isNotNullish(0), true);
	assert.equal(isNotNullish(''), true);
	assert.equal(isNotNullish(null), false);
	assert.equal(isNotNullish(undefined), false);

	const nullableValue: string | undefined = 'test' as string | undefined;
	if (isNotNullish(nullableValue)) {
		expectTypeOf(nullableValue).toEqualTypeOf<string>();
	}
});

test('not() with array filtering', () => {
	const isUndefined = (value: unknown): value is undefined =>
		value === undefined;

	const isNotUndefined = not(isUndefined);

	const values = [1, undefined, 2, undefined, 3];
	const filtered = values.filter(value => isNotUndefined(value));

	expectTypeOf(filtered).toEqualTypeOf<number[]>();
	assert.deepEqual(filtered, [1, 2, 3]);
});

test('not() with union types', () => {
	const isPrimitive = (value: unknown): value is string | number | boolean =>
		typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

	const isNotPrimitive = not(isPrimitive);

	assert.equal(isNotPrimitive('hello'), false);
	assert.equal(isNotPrimitive({}), true);
	assert.equal(isNotPrimitive([]), true);

	const mixedValue: string | number | boolean | Record<string, unknown> = {};
	if (isNotPrimitive(mixedValue)) {
		expectTypeOf(mixedValue).toEqualTypeOf<Record<string, unknown>>();
	}
});

test('not() with complex array types', () => {
	const isStringArray = (value: unknown): value is string[] =>
		Array.isArray(value) && value.every(item => typeof item === 'string');

	const isNotStringArray = not(isStringArray);

	assert.equal(isNotStringArray(['a', 'b']), false);
	assert.equal(isNotStringArray([1, 2]), true);
	assert.equal(isNotStringArray('not array'), true);

	const value: string[] | number[] | string = ['a', 'b'] as string[] | number[] | string;
	if (isNotStringArray(value)) {
		expectTypeOf(value).toEqualTypeOf<number[] | string>();
	}
});

test('not() with library predicates', () => {
	// Test using not() with isDefined from the library
	const isNotDefined = not(isDefined);

	assert.equal(isNotDefined(undefined), true);
	assert.equal(isNotDefined(null), false);
	assert.equal(isNotDefined(0), false);

	const value: string | undefined = 'test' as string | undefined;
	if (isNotDefined(value)) {
		// Due to TypeScript's Exclude limitations, this doesn't narrow perfectly
		// @ts-expect-error - TypeScript's Exclude doesn't work well with not(isDefined)
		expectTypeOf(value).toExtend<string | undefined>();
		assert.equal(value, undefined);
	}
});
