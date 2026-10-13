import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {isDefined} from '../source/index.js';

test('isDefined()', () => {
	assert.equal(isDefined(undefined), false);
	assert.equal(isDefined(null), true);
	assert.equal(isDefined(1), true);
	assert.equal(isDefined('x'), true);

	const fixture = [1, undefined].filter(x => isDefined(x));
	expectTypeOf(fixture).not.toBeUndefined();

	const number: number | undefined = 1;

	if (isDefined(number)) {
		expectTypeOf(number).toBeNumber();
	}
});

test('isDefined() narrows both branches', () => {
	// Iterated bindings are not narrowed by control-flow analysis, so the guard is what decides.
	const nullableValues: Array<string | null | undefined> = ['x', null, undefined];
	for (const nullable of nullableValues) {
		if (isDefined(nullable)) {
			expectTypeOf(nullable).toEqualTypeOf<string | null>();
		} else {
			expectTypeOf(nullable).toEqualTypeOf<undefined>();
		}
	}

	expectTypeOf([1, undefined, 2].filter(isDefined)).toEqualTypeOf<number[]>();
});

test('isDefined() accepts an explicit type argument', () => {
	const maybe = 1 as number | undefined;
	assert.equal(isDefined<number>(maybe), true);

	const values: Array<string | undefined> = ['a', undefined];
	const defined = values.filter(isDefined<string>);
	expectTypeOf(defined).toEqualTypeOf<string[]>();
	assert.deepEqual(defined, ['a']);
});

test('isDefined() preserves an undefined-only false branch', () => {
	const value = undefined;
	if (isDefined(value)) {
		expectTypeOf(value).toBeNever();
		assert.fail('Undefined must not be defined');
	} else {
		expectTypeOf(value).toEqualTypeOf<undefined>();
		assert.equal(value, undefined);
	}
});

test('isDefined() filters undefined-only arrays', () => {
	const values: undefined[] = [undefined, undefined];
	const defined = values.filter(isDefined);
	expectTypeOf(defined).toEqualTypeOf<never[]>();
	assert.deepEqual(defined, []);
});

test('isDefined() excludes undefined from explicit union types', () => {
	const values: Array<string | null | undefined> = ['x', null, undefined];
	const defined = values.filter(isDefined<string | null | undefined>);
	expectTypeOf(defined).toEqualTypeOf<Array<string | null>>();
	assert.deepEqual(defined, ['x', null]);
});

test('isDefined() retains all other falsy values', () => {
	const values = [undefined, null, false, 0, '', NaN];
	const defined = values.filter(isDefined);
	expectTypeOf(defined).toEqualTypeOf<Array<string | number | boolean | null>>();
	assert.deepEqual(defined, [null, false, 0, '', NaN]);
});

test('isDefined() accepts unknown values', () => {
	const values: unknown[] = [undefined, null, 'x', 0];
	const defined = values.filter(isDefined);
	expectTypeOf(defined).toEqualTypeOf<Array<{} | null>>();
	assert.deepEqual(defined, [null, 'x', 0]);
});

test('isDefined() leaves the reachable unknown false branch usable', () => {
	const describe = (value: unknown) => {
		if (isDefined(value)) {
			expectTypeOf(value).toEqualTypeOf<{} | null>();
			return `defined: ${String(value)}`;
		}

		expectTypeOf(value).toEqualTypeOf<undefined>();
		return `undefined: ${typeof value}`;
	};

	assert.equal(describe(undefined), 'undefined: undefined');
	assert.equal(describe(null), 'defined: null');
	assert.equal(describe(1), 'defined: 1');
});

test('isDefined() narrows unknown values with an explicit type argument', () => {
	const values: unknown[] = [undefined, null, false, 0n, Symbol('defined'), {}, () => {}];
	const defined = values.filter(isDefined<unknown>);
	expectTypeOf(defined).toEqualTypeOf<Array<{} | null>>();
	assert.deepEqual(defined, values.slice(1));

	for (const value of values) {
		if (isDefined<unknown>(value)) {
			expectTypeOf(value).toEqualTypeOf<{} | null>();
			assert.notEqual(value, undefined);
		} else {
			expectTypeOf(value).toEqualTypeOf<undefined>();
			assert.equal(value, undefined);
		}
	}
});
