import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {isPresent} from '../source/index.js';

test('isPresent()', () => {
	assert.equal(isPresent(null), false);
	assert.equal(isPresent(undefined), false);
	assert.equal(isPresent(1), true);
	assert.equal(isPresent('x'), true);

	const fixture = [1, null].filter(x => isPresent(x));
	expectTypeOf(fixture).not.toBeNullable();

	const nullable: null | undefined = null;

	if (isPresent(nullable)) {
		expectTypeOf(nullable).toBeNever();
	}
});

test('isPresent() narrows every value it can', () => {
	const values = [0, '', false, NaN, null, undefined, 1, 'x', true] as const;

	// Only the two nullish values are removed, so every falsy one stays.
	expectTypeOf(values.filter(isPresent)).toEqualTypeOf<Array<0 | '' | false | number | 1 | 'x' | true>>();

	const object = {a: 1} as {a: number} | null | undefined;
	if (isPresent(object)) {
		expectTypeOf(object).toEqualTypeOf<{a: number}>();
	} else {
		expectTypeOf(object).toEqualTypeOf<null | undefined>();
	}

	// An `unknown` becomes an object in the true branch, which is what narrowing an unknown can say.
	const unknownValue: unknown = 1;
	if (isPresent(unknownValue)) {
		expectTypeOf(unknownValue).toEqualTypeOf<{}>();
	} else {
		expectTypeOf(unknownValue).toEqualTypeOf<null | undefined>();
	}

	// A generic comes through as itself.
	function narrow<Value>(value: Value) {
		return isPresent(value) ? value : undefined;
	}

	assert.equal(narrow(1), 1);
	assert.equal(narrow(null), undefined);

	// A bigint and a symbol are not nullish, so they survive.
	const bigintValue = 1n as bigint | null;
	if (isPresent(bigintValue)) {
		expectTypeOf(bigintValue).toEqualTypeOf<bigint>();
	}
});

test('isPresent() answers false only for null and undefined', () => {
	for (const value of [null, undefined]) {
		assert.equal(isPresent(value), false);
	}

	for (const value of [0, -0, NaN, '', '0', false, 1n, Symbol('s'), {}, [], () => {}]) {
		assert.equal(isPresent(value), true);
	}
});
