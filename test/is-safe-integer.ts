import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {isSafeInteger} from '../source/index.js';

test('isSafeInteger() keeps a broad number usable in both reachable branches', () => {
	const describe = (value: number) => {
		if (isSafeInteger(value)) {
			expectTypeOf(value).toEqualTypeOf<number>();
			return `safe: ${value.toString()}`;
		}

		expectTypeOf(value).toEqualTypeOf<number>();
		return `unsafe: ${value.toString()}`;
	};

	assert.equal(describe(1), 'safe: 1');
	assert.equal(describe(2.5), 'unsafe: 2.5');
	assert.equal(describe(Infinity), 'unsafe: Infinity');
	assert.equal(describe(NaN), 'unsafe: NaN');
});

test('isSafeInteger() rejects out-of-range integer literals in its predicate', () => {
	const unsafe = 9_007_199_254_740_992 as const;
	if (isSafeInteger(unsafe)) {
		expectTypeOf(unsafe).toBeNever();
		assert.fail('An integer outside the safe range must be rejected');
	} else {
		expectTypeOf(unsafe).toEqualTypeOf<9_007_199_254_740_992>();
		assert.equal(unsafe, Number.MAX_SAFE_INTEGER + 1);
	}
});

test('isSafeInteger() narrows literal unions at both safe boundaries', () => {
	const values = [0, -1, 9_007_199_254_740_991, -9_007_199_254_740_991, 9_007_199_254_740_992, -9_007_199_254_740_992, 1e21, -1e21, 1.5, 1e-7] as const;
	const safeValues: number[] = [];
	const unsafeValues: number[] = [];

	for (const value of values) {
		if (isSafeInteger(value)) {
			expectTypeOf(value).toEqualTypeOf<0 | -1 | 9_007_199_254_740_991 | -9_007_199_254_740_991>();
			safeValues.push(value);
		} else {
			expectTypeOf(value).toEqualTypeOf<9_007_199_254_740_992 | -9_007_199_254_740_992 | 1e21 | -1e21 | 1.5 | 1e-7>();
			unsafeValues.push(value);
		}
	}

	assert.deepEqual(safeValues, [0, -1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]);
	assert.deepEqual(unsafeValues, [9_007_199_254_740_992, -9_007_199_254_740_992, 1e21, -1e21, 1.5, 1e-7]);
});

test('isSafeInteger() accepts explicit and generic broad-number calls', () => {
	const describe = (value: number) => {
		if (isSafeInteger<number>(value)) {
			expectTypeOf(value).toEqualTypeOf<number>();
			return value.toString();
		}

		expectTypeOf(value).toEqualTypeOf<number>();
		return value.toString();
	};

	function check<Value extends number>(value: Value) {
		return isSafeInteger<Value>(value);
	}

	assert.equal(describe(1), '1');
	assert.equal(describe(Infinity), 'Infinity');
	assert.equal(check(Number.MAX_SAFE_INTEGER), true);
	assert.equal(check(1e21), false);
	assert.equal(check(-0), true);
});

test('isSafeInteger() filters a literal union without retaining unsafe members', () => {
	const values: Array<1 | 1.5 | 1e21 | -1e21> = [1, 1.5, 1e21, -1e21];
	const safe = values.filter(value => isSafeInteger(value));

	expectTypeOf(safe).toEqualTypeOf<1[]>();
	assert.deepEqual(safe, [1]);
});

test('isSafeInteger() leaves branded numbers unchanged in both branches', () => {
	type BrandedNumber = number & {readonly brand: unique symbol};
	const describe = (value: BrandedNumber) => {
		if (isSafeInteger(value)) {
			expectTypeOf(value).toEqualTypeOf<BrandedNumber>();
			return `safe: ${value.toString()}`;
		}

		expectTypeOf(value).toEqualTypeOf<BrandedNumber>();
		return `unsafe: ${value.toString()}`;
	};

	assert.equal(describe(1 as BrandedNumber), 'safe: 1');
	assert.equal(describe(1.5 as BrandedNumber), 'unsafe: 1.5');
});
