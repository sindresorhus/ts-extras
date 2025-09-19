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
	const isNullish = (value: unknown): value is null | undefined =>
		value == null;

	const isNotNullish = not(isNullish);

	t.true(isNotNullish(0));
	t.true(isNotNullish(''));
	t.false(isNotNullish(null));
	t.false(isNotNullish(undefined));

	const nullableValue: string | null | undefined = 'test' as string | null | undefined;
	if (isNotNullish(nullableValue)) {
		expectTypeOf(nullableValue).toEqualTypeOf<string>();
	}
});

test('not() with array filtering', t => {
	const isNull = (value: unknown): value is null =>
		value === null;

	const isNotNull = not(isNull);

	const values = [1, null, 2, null, 3];
	const filtered = values.filter(isNotNull);

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

	const mixedValue: string | number | boolean | object = {} as string | number | boolean | object;
	if (isNotPrimitive(mixedValue)) {
		expectTypeOf(mixedValue).toEqualTypeOf<object>();
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
		expectTypeOf(value).toEqualTypeOf<undefined>();
	}
});
