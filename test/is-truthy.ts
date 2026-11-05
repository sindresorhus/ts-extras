import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {isTruthy} from '../source/index.js';

test('isTruthy() matches JavaScript truthiness', () => {
	for (const value of [false, 0, -0, 0n, '', null, undefined, NaN]) {
		assert.equal(isTruthy(value), false, String(value));
	}

	for (const value of [true, 1, -1, 1n, 'a', ' ', '0', 'false', [], {}, Symbol('s'), () => {}, Infinity]) {
		assert.equal(isTruthy(value), true, String(value));
	}
});

test('isTruthy() narrows when passed directly to filter', () => {
	const values = ['a', '', null, 'b', undefined, 0, 1, false];
	const direct = values.filter(isTruthy);
	const wrapped = values.filter(value => isTruthy(value));

	expectTypeOf(direct).toEqualTypeOf<Array<string | number | true>>();
	expectTypeOf(wrapped).toEqualTypeOf<Array<string | number | true>>();
	assert.deepEqual(direct, ['a', 'b', 1]);
	assert.deepEqual(wrapped, direct);
});

test('isTruthy() narrows literal types in both branches', () => {
	type Value = 'a' | '' | 0 | 1 | false | true | null | undefined;

	function check(value: Value) {
		if (isTruthy(value)) {
			expectTypeOf(value).toEqualTypeOf<'a' | 1 | true>();
			return 'truthy';
		}

		expectTypeOf(value).toEqualTypeOf<'' | 0 | false | null | undefined>();
		return 'falsy';
	}

	assert.equal(check('a'), 'truthy');
	assert.equal(check(''), 'falsy');
	assert.equal(check(null), 'falsy');
});

test('isTruthy() keeps the false branch of unknown usable', () => {
	function check(value: unknown) {
		if (isTruthy(value)) {
			expectTypeOf(value).toEqualTypeOf<string | number | bigint | true | symbol | object>();
			return 'truthy';
		}

		// `0`, `''`, and `false` take this branch too, so it cannot be narrowed to `null | undefined`.
		expectTypeOf(value).toEqualTypeOf<unknown>();
		return 'falsy';
	}

	assert.equal(check(0), 'falsy');
	assert.equal(check({}), 'truthy');

	const unknownValues: unknown[] = [0, 'a', null];
	expectTypeOf(unknownValues.filter(isTruthy)).toEqualTypeOf<Array<string | number | bigint | true | symbol | object>>();
});

test('isTruthy() keeps any usable', () => {
	const values: any[] = [0, {name: 'a'}];
	const truthy = values.filter(isTruthy);

	expectTypeOf(truthy).toEqualTypeOf<any[]>();
	assert.deepEqual(truthy, [{name: 'a'}]);
});

test('isTruthy() drops a wide primitive from the false branch', () => {
	// Boundary: a type cannot exclude `''`, so `string` is kept whole in the true branch, and the `else` branch drops it even though `''` takes that branch. This is documented.
	function check(value: string | undefined) {
		if (isTruthy(value)) {
			expectTypeOf(value).toEqualTypeOf<string>();
			return 'truthy';
		}

		expectTypeOf(value).toEqualTypeOf<undefined>();
		return value;
	}

	assert.equal(check(''), '');

	// The same for `{}`, which every value but `null` and `undefined` has, so the `else` branch is `never` though `0` takes it.
	function checkObject(value: {}) {
		if (isTruthy(value)) {
			expectTypeOf(value).toEqualTypeOf<{}>();
			return 'truthy';
		}

		expectTypeOf(value).toEqualTypeOf<never>();
		return 'falsy';
	}

	assert.equal(checkObject(0), 'falsy');

	// Inverting the guard has the same `else` branch, while `value => !value` keeps the falsy values.
	const values: Array<string | undefined> = ['', 'a', undefined];
	expectTypeOf(values.filter(value => !isTruthy(value))).toEqualTypeOf<undefined[]>();
	expectTypeOf(values.filter(value => !value)).toEqualTypeOf<Array<string | undefined>>();
	assert.deepEqual(values.filter(value => !value), ['', undefined]);
});

test('isTruthy() drops a wide number and bigint from the false branch', () => {
	// Boundary: `0` and `0n` are falsy and take the `else` branch, which the type cannot express, so it is `never`. This is documented.
	function checkNumber(value: number) {
		if (isTruthy(value)) {
			expectTypeOf(value).toEqualTypeOf<number>();
			return 'truthy';
		}

		expectTypeOf(value).toBeNever();
		return 'falsy';
	}

	function checkBigInt(value: bigint) {
		if (isTruthy(value)) {
			expectTypeOf(value).toEqualTypeOf<bigint>();
			return 'truthy';
		}

		expectTypeOf(value).toBeNever();
		return 'falsy';
	}

	assert.equal(checkNumber(0), 'falsy');
	assert.equal(checkBigInt(0n), 'falsy');
});

test('isTruthy() keeps void values that may be truthy', () => {
	// A callback typed `() => void` can return any value, so its result is not necessarily falsy.
	function check(value: void) {
		if (isTruthy(value)) {
			expectTypeOf(value).toEqualTypeOf<void>();
			return 'truthy';
		}

		expectTypeOf(value).toBeNever();
		return 'falsy';
	}

	const callback: () => void = () => ({name: 'truthy'});
	assert.equal(check(callback()), 'truthy');
	assert.equal(check(undefined), 'falsy');

	const values = [callback(), 1, undefined];
	const direct = values.filter(isTruthy);
	const wrapped = values.filter(value => isTruthy(value));

	expectTypeOf(direct).toEqualTypeOf<Array<void | number>>();
	expectTypeOf(wrapped).toEqualTypeOf<Array<void | number>>();
	assert.deepEqual(direct, [{name: 'truthy'}, 1]);
	assert.deepEqual(wrapped, direct);
});
