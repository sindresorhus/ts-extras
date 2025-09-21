import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {not, isDefined} from '../source/index.js';

test('not() inverts type guards', t => {
	const isString = (value: unknown): value is string =>
		typeof value === 'string';

	const isNotString = not(isString);

	t.true(isNotString(123));
	t.true(isNotString(true));
	t.false(isNotString('hello'));

	const mixedValue: string | number | boolean = 123 as string | number | boolean;
	if (isNotString(mixedValue)) {
		expectTypeOf(mixedValue).toEqualTypeOf<number | boolean>();
	}
});

test('not() with nullable types', t => {
	const isNullish = (value: unknown): value is undefined =>
		value === null || value === undefined;

	const isNotNullish = not(isNullish);

	t.true(isNotNullish(0));
	t.true(isNotNullish(''));
	t.false(isNotNullish(null));
	t.false(isNotNullish(undefined));

	const nullableValue: string | undefined = 'test' as string | undefined;
	if (isNotNullish(nullableValue)) {
		expectTypeOf(nullableValue).toEqualTypeOf<string>();
	}
});

test('not() with array filtering', t => {
	const isUndefined = (value: unknown): value is undefined =>
		value === undefined;

	const isNotUndefined = not(isUndefined);

	const values = [1, undefined, 2, undefined, 3];
	const filtered = values.filter(value => isNotUndefined(value));

	expectTypeOf(filtered).toEqualTypeOf<number[]>();
	t.deepEqual(filtered, [1, 2, 3]);
});

test('not() with union types', t => {
	const isPrimitive = (value: unknown): value is string | number | boolean =>
		typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

	const isNotPrimitive = not(isPrimitive);

	t.false(isNotPrimitive('hello'));
	t.true(isNotPrimitive({}));
	t.true(isNotPrimitive([]));

	const mixedValue: string | number | boolean | Record<string, unknown> = {};
	if (isNotPrimitive(mixedValue)) {
		expectTypeOf(mixedValue).toEqualTypeOf<Record<string, unknown>>();
	}
});

test('not() with complex array types', t => {
	const isStringArray = (value: unknown): value is string[] =>
		Array.isArray(value) && value.every(item => typeof item === 'string');

	const isNotStringArray = not(isStringArray);

	t.false(isNotStringArray(['a', 'b']));
	t.true(isNotStringArray([1, 2]));
	t.true(isNotStringArray('not array'));

	const value: string[] | number[] | string = ['a', 'b'] as string[] | number[] | string;
	if (isNotStringArray(value)) {
		expectTypeOf(value).toEqualTypeOf<number[] | string>();
	}
});

test('not() with library predicates', t => {
	// Test using not() with isDefined from the library
	const isNotDefined = not(isDefined);

	t.true(isNotDefined(undefined));
	t.false(isNotDefined(null));
	t.false(isNotDefined(0));

	const value: string | undefined = 'test' as string | undefined;
	if (isNotDefined(value)) {
		// Due to TypeScript's Exclude limitations, this doesn't narrow perfectly
		// @ts-expect-error - TypeScript's Exclude doesn't work well with not(isDefined)
		expectTypeOf(value).toMatchTypeOf<string | undefined>();
		// @ts-expect-error - value is never in this branch according to TypeScript
		t.is(value, undefined);
	}
});
