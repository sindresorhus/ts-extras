import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {
	isInteger,
	isDefined,
	isPropertyDefined,
	isPropertyPresent,
	not,
} from '../source/index.js';

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
	const isNullish = (value: unknown): value is null | undefined =>
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

	// A defined value, so the guard is false and the assertion below really runs.
	const value: string | undefined = 'test';
	assert.equal(isNotDefined(value), false);

	if (!isNotDefined(value)) {
		assert.equal(value, 'test');
	}

	// The generic defined-value guard keeps its runtime behavior when inverted.
});

test('boolean property guard inversion preserves optional shapes', () => {
	// Negate the boolean at the actual input type, since property ownership and data descriptors cannot be represented by an inverse predicate.
	const isValueNotDefined = (value: {value?: number}): boolean => !isPropertyDefined('value')(value);
	for (const item of [{value: 1}, {}] as Array<{value?: number}>) {
		if (isValueNotDefined(item)) {
			// eslint-disable-next-line unicorn/prefer-hoisting-branch-code -- Each control-flow branch must retain the input shape.
			expectTypeOf(item).toEqualTypeOf<{value?: number}>();
			assert.equal(item.value, undefined);
		} else {
			expectTypeOf(item).toEqualTypeOf<{value?: number}>();
			assert.equal(item.value, 1);
		}
	}
});

test('boolean property guard inversion preserves required shapes', () => {
	// A property type that permits undefined still overlaps the property proof, so negate the boolean without promising a complement type.
	const isNotDefined = (value: {value: number | undefined}): boolean => !isPropertyDefined('value')(value);
	for (const item of [{value: 1}, {value: undefined}] as Array<{value: number | undefined}>) {
		if (isNotDefined(item)) {
			// eslint-disable-next-line unicorn/prefer-hoisting-branch-code -- Each control-flow branch must retain the input shape.
			expectTypeOf(item).toEqualTypeOf<{value: number | undefined}>();
			assert.equal(item.value, undefined);
		} else {
			expectTypeOf(item).toEqualTypeOf<{value: number | undefined}>();
			assert.equal(item.value, 1);
		}
	}
});

test('boolean property guard inversion keeps required accessor and inherited values usable', () => {
	type Item = {readonly value: number};
	for (const guard of [isPropertyDefined, isPropertyPresent]) {
		const inverse = (value: Item): boolean => !guard('value')(value);
		const accessor: Item = {
			get value() {
				return 1;
			},
		};
		const inherited = Object.create({value: 2}) as Item;
		const own: Item = {value: 3};
		for (const value of [accessor, inherited, own]) {
			if (inverse(value)) {
				// eslint-disable-next-line unicorn/prefer-hoisting-branch-code -- Each control-flow branch must retain the input shape.
				expectTypeOf(value).toEqualTypeOf<Item>();
				assert.equal(value.value === 1 || value.value === 2, true);
			} else {
				expectTypeOf(value).toEqualTypeOf<Item>();
				assert.equal(value.value, 3);
			}
		}
	}
});

test('not() rejects a numeric guard whose broad overload returns boolean', () => {
	// A broad number can be an integer or a fraction, so `isInteger` returns boolean for it and cannot supply the unknown-input predicate `not()` needs.
	if (false) {
		// @ts-expect-error - The broad overload is not a type predicate.
		not(isInteger);
	}

	// Invert the boolean directly, preserving the number in both reachable branches.
	const isNonInteger = (value: number) => !isInteger(value);
	for (const value of [1, 2.5]) {
		if (isNonInteger(value)) {
			expectTypeOf(value).toEqualTypeOf<number>();
		} else {
			expectTypeOf(value).toEqualTypeOf<number>();
		}

		assert.equal(isNonInteger(value), value === 2.5);
	}
});

test('not() keeps both unknown branches usable', () => {
	// Regression guard: `Exclude<unknown, string>` is `unknown`, and a predicate equal to its input narrows the false branch to `never`, so the inverse spells `unknown` out before excluding. TypeScript keeps the false branch as `{}`, which still holds every string.
	const isString = (value: unknown): value is string => typeof value === 'string';
	const isNotString = not(isString);
	const describe = (value: unknown) => {
		if (isNotString(value)) {
			expectTypeOf(value).toEqualTypeOf<number | bigint | boolean | symbol | object | null | undefined>();
			return ['other', value] as const;
		}

		expectTypeOf(value).toEqualTypeOf<{}>();
		return ['string', value] as const;
	};

	assert.deepEqual(describe('text'), ['string', 'text']);
	assert.deepEqual(describe(1), ['other', 1]);
	assert.deepEqual(describe(null), ['other', null]);
	assert.deepEqual(describe(undefined), ['other', undefined]);
});

test('not() drops overlapping supertypes from the false branch', () => {
	// Boundary: the inverse removes every input member the original guard's type matches by `Exclude`. A member that only overlaps that type, such as `unknown[]` against `string[]`, stays in the true branch and is also removed from the false branch, so a runtime value can reach a branch typed narrower than itself. This is documented rather than gated, since a boolean overload stops `.filter(not(guard))` from narrowing.
	const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');
	const isNotStringArray = not(isStringArray);
	const describe = (value: string | unknown[]) => {
		if (isNotStringArray(value)) {
			expectTypeOf(value).toEqualTypeOf<string | unknown[]>();
			return 'other';
		}

		expectTypeOf(value).toBeNever();
		return 'strings';
	};

	assert.equal(describe(['a', 'b']), 'strings');
	assert.equal(describe([1]), 'other');
	assert.equal(describe('a'), 'other');
});

test('not() preserves both branches of finite literal unions', () => {
	const isFirst = (value: unknown): value is 1 => value === 1;
	const isNotFirst = not(isFirst);
	const others: Array<2 | 'third'> = [];

	for (const value of [1, 2, 'third'] as Array<1 | 2 | 'third'>) {
		if (isNotFirst(value)) {
			expectTypeOf(value).toEqualTypeOf<2 | 'third'>();
			others.push(value);
		} else {
			expectTypeOf(value).toEqualTypeOf<1>();
			assert.equal(value, 1);
		}
	}

	assert.deepEqual(others, [2, 'third']);
});

test('not() narrows nullable unions without removing other falsy values', () => {
	const isNullish = (value: unknown): value is null | undefined => value === null || value === undefined;
	const isNotNullish = not(isNullish);
	const values: Array<0 | false | '' | null | undefined> = [0, false, '', null, undefined];
	const present: Array<0 | false | ''> = [];

	for (const value of values) {
		if (isNotNullish(value)) {
			expectTypeOf(value).toEqualTypeOf<0 | false | ''>();
			present.push(value);
		} else {
			expectTypeOf(value).toEqualTypeOf<null | undefined>();
			assert.equal(value === null || value === undefined, true);
		}
	}

	assert.deepEqual(present, [0, false, '']);
});

test('not() narrows when passed directly to filter', () => {
	// Regression guard: an overloaded predicate is inferred from its base signature when passed to `.filter()`, so `not()` must return a single generic signature.
	const isUndefined = (value: unknown): value is undefined => value === undefined;
	const isNotUndefined = not(isUndefined);
	const values: Array<number | undefined> = [1, undefined, 2];
	const direct = values.filter(isNotUndefined);
	const wrapped = values.filter(value => isNotUndefined(value));

	expectTypeOf(direct).toEqualTypeOf<number[]>();
	expectTypeOf(wrapped).toEqualTypeOf<number[]>();
	assert.deepEqual(direct, [1, 2]);
	assert.deepEqual(wrapped, [1, 2]);
});

test('not() narrows generic inputs by their constraint', () => {
	// Regression guard: v1.3.0 narrowed a constrained generic, so `Negated` must stay one distributive conditional over the input.
	const isString = (value: unknown): value is string => typeof value === 'string';
	const isNotString = not(isString);
	function describe<Value extends string | number>(value: Value): Exclude<Value, string> | undefined {
		if (isNotString(value)) {
			expectTypeOf(value.toFixed(0)).toEqualTypeOf<string>();
			return value;
		}

		return undefined;
	}

	function retain<Value>(value: Value) {
		if (isNotString(value)) {
			const retained: Value = value;
			return ['other', retained] as const;
		}

		const retained: Value = value;
		return ['string', retained] as const;
	}

	assert.equal(describe(1), 1);
	assert.equal(describe('text'), undefined);
	assert.deepEqual(retain('text'), ['string', 'text']);
	assert.deepEqual(retain(undefined), ['other', undefined]);
});

test('not() calls its source guard once and propagates its errors', () => {
	const visited: unknown[] = [];
	const isString = (value: unknown): value is string => {
		visited.push(value);
		return typeof value === 'string';
	};

	const isNotString = not(isString);

	assert.equal(isNotString('text'), false);
	assert.equal(isNotString(1), true);
	assert.deepEqual(visited, ['text', 1]);

	const failure = new Error('Guard failed');
	const throwingGuard = (_value: unknown): _value is never => {
		throw failure;
	};

	assert.throws(() => {
		not(throwingGuard)(1);
	}, error => error === failure);
});

test('not() preserves discriminated object unions through a filter callback', () => {
	type Item = {readonly kind: 'first'; readonly value: string} | {readonly kind: 'second'; readonly value: number};
	const isFirst = (value: unknown): value is {kind: 'first'} => typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'first';
	const isNotFirst = not(isFirst);
	const items: Item[] = [{kind: 'first', value: 'a'}, {kind: 'second', value: 1}];
	const filtered = items.filter(value => isNotFirst(value));

	expectTypeOf(filtered).toEqualTypeOf<Array<{readonly kind: 'second'; readonly value: number}>>();
	assert.deepEqual(filtered, [{kind: 'second', value: 1}]);

	if (false) {
		// @ts-expect-error - Inversion preserves the retained member's readonly properties.
		filtered[0]!.value = 2;
	}
});

test('not() keeps an any value usable in the true branch', () => {
	// Regression guard: v1.3.0 kept `any` in the true branch, so `json.items.filter(not(isNullish))` still reads its items. Boundary: TypeScript then types the false branch as `never`.
	const isNullish = (value: unknown): value is null | undefined => value === null || value === undefined;
	const json = JSON.parse('{"items": [{"name": "a"}, null]}');
	const {items}: {items: any[]} = json;
	const names = items.filter(not(isNullish)).map(item => item.name);

	expectTypeOf(items.filter(not(isNullish))).toEqualTypeOf<any[]>();
	assert.deepEqual(names, ['a']);
});
