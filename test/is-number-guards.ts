import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import type {PositiveInfinity} from 'type-fest';
import {
	isFinite,
	isInteger,
	isSafeInteger,
	isInfinite,
} from '../source/index.js';

// These guards narrow plain numeric literal unions. Broad and branded numbers stay unchanged because either branch can run.

declare const literals: 1 | 2.5;
declare const anyNumber: number;
declare const outOfRange: 9_007_199_254_740_992;
declare const withInfinity: 1 | PositiveInfinity;

// The narrowing below is type-only and the declared values do not exist at runtime, so it lives in functions that are never called. That also keeps TypeScript's control flow intact, which it does not do inside an `if (false)` block.
void function isFiniteTypes() {
	// Both members of the union are finite, so `never` is the right false branch here.
	if (isFinite(literals)) {
		expectTypeOf(literals).toEqualTypeOf<1 | 2.5>();
	} else {
		expectTypeOf(literals).toEqualTypeOf<never>();
	}

	// A broad number can be finite, infinite, or NaN, so either branch remains a number.
	if (isFinite(anyNumber)) {
		expectTypeOf(anyNumber).toEqualTypeOf<number>();
	} else {
		expectTypeOf(anyNumber).toEqualTypeOf<number>();
	}
};

void function isIntegerTypes() {
	if (isInteger(literals)) {
		expectTypeOf(literals).toEqualTypeOf<1>();
	} else {
		expectTypeOf(literals).toEqualTypeOf<2.5>();
	}

	// A broad number can hold an integer or a fraction, so either branch remains a number.
	if (isInteger(anyNumber)) {
		expectTypeOf(anyNumber).toEqualTypeOf<number>();
	} else {
		expectTypeOf(anyNumber).toEqualTypeOf<number>();
	}
};

void function isSafeIntegerTypes() {
	if (isSafeInteger(literals)) {
		expectTypeOf(literals).toEqualTypeOf<1>();
	} else {
		expectTypeOf(literals).toEqualTypeOf<2.5>();
	}

	// An out-of-range literal cannot be a safe integer, so only its false branch is reachable.
	if (isSafeInteger(outOfRange)) {
		expectTypeOf(outOfRange).toEqualTypeOf<never>();
	} else {
		expectTypeOf(outOfRange).toEqualTypeOf<9_007_199_254_740_992>();
	}
};

void function isInfiniteTypes() {
	if (isInfinite(withInfinity)) {
		expectTypeOf(withInfinity).toEqualTypeOf<PositiveInfinity>();
	} else {
		expectTypeOf(withInfinity).toEqualTypeOf<1>();
	}
};

test('isFinite()', () => {
	assert.equal(isFinite(1), true);
	assert.equal(isFinite(2.5), true);
	assert.equal(isFinite(Infinity), false);
	assert.equal(isFinite(-Infinity), false);
	assert.equal(isFinite(NaN), false);
});

test('isInteger()', () => {
	assert.equal(isInteger(1), true);
	assert.equal(isInteger(2.5), false);
	assert.equal(isInteger(Infinity), false);
});

test('isSafeInteger()', () => {
	assert.equal(isSafeInteger(1), true);
	assert.equal(isSafeInteger(2.5), false);
	assert.equal(isSafeInteger(Infinity), false);
	// Out of the safe range, so both runtime and predicate reject it.
	assert.equal(isSafeInteger(9_007_199_254_740_992), false);
	assert.equal(isSafeInteger(Number.MAX_SAFE_INTEGER), true);
});

test('isInfinite()', () => {
	assert.equal(isInfinite(Infinity), true);
	assert.equal(isInfinite(-Infinity), true);
	assert.equal(isInfinite(1), false);
	assert.equal(isInfinite(NaN), false);
});

test('isFinite() narrows a union that contains an infinity member', () => {
	// `Finite<T>` is a distributive conditional, so literal infinity members are dropped, while a broad number gets a boolean result.
	const value = 1 as 1 | 2.5 | PositiveInfinity;

	if (isFinite(value)) {
		expectTypeOf(value).toEqualTypeOf<1 | 2.5>();
	} else {
		expectTypeOf(value).toEqualTypeOf<PositiveInfinity>();
	}

	assert.equal(isFinite(1), true);
	assert.equal(isFinite(Infinity), false);
});

// The builtins the guards wrap accept an `unknown` value, so the guards do too, and the ordinary narrowing pattern on an `unknown` value compiles.
test('the number guards accept an unknown value without claiming a narrower type', () => {
	const unknownValue: unknown = 1.5;

	if (isFinite(unknownValue)) {
		expectTypeOf(unknownValue).toEqualTypeOf<unknown>();
		assert.equal(isFinite(1.5), true);
		assert.equal(isFinite('x' as unknown), false);
	}

	// `Integer<number>` is `never`, so broad values need a boolean answer. The overload still accepts them, without claiming a branch is unreachable when it is not.
	if (isInteger(unknownValue)) {
		void unknownValue;
	}

	if (isSafeInteger(unknownValue)) {
		void unknownValue;
	}

	assert.equal(isInteger(1.5), false);
	assert.equal(isSafeInteger(1.5), false);

	// Literal narrowing is unchanged.
	const literal = 1 as const;
	if (isInteger(literal)) {
		expectTypeOf(literal).toEqualTypeOf<1>();
	}
});

test('number guards leave broad inputs usable in reachable branches', () => {
	const values: unknown[] = [1, 2.5, 'x'];
	const integers = values.filter(isInteger);
	const safeIntegers = values.filter(isSafeInteger);

	expectTypeOf(integers).toEqualTypeOf<unknown[]>();
	expectTypeOf(safeIntegers).toEqualTypeOf<unknown[]>();
	assert.deepEqual(integers, [1]);
	assert.deepEqual(safeIntegers, [1]);

	const checkFinite = (value: number | string) => {
		if (!isFinite(value)) {
			expectTypeOf(value).toEqualTypeOf<number | string>();
			assert.equal(Number.isNaN(value), true);
		}
	};

	checkFinite(NaN);
});

test('isFinite() leaves a broad number usable in both reachable branches', () => {
	const describe = (value: number) => {
		if (isFinite(value)) {
			expectTypeOf(value).toEqualTypeOf<number>();
			return `finite: ${value.toString()}`;
		}

		expectTypeOf(value).toEqualTypeOf<number>();
		return `non-finite: ${value.toString()}`;
	};

	assert.equal(describe(1.5), 'finite: 1.5');
	assert.equal(describe(Infinity), 'non-finite: Infinity');
	assert.equal(describe(-Infinity), 'non-finite: -Infinity');
	assert.equal(describe(NaN), 'non-finite: NaN');
});

test('isFinite() leaves a generic number unchanged and accepts an explicit type argument', () => {
	function describe<Value extends number>(value: Value) {
		if (isFinite(value)) {
			const retained: Value = value;
			return retained.toString();
		}

		const retained: Value = value;
		return retained.toString();
	}

	const checkExplicit = (value: number) => {
		if (isFinite<number>(value)) {
			expectTypeOf(value).toEqualTypeOf<number>();
		} else {
			expectTypeOf(value).toEqualTypeOf<number>();
		}
	};

	assert.equal(describe(2), '2');
	assert.equal(describe(Infinity), 'Infinity');
	checkExplicit(2);
	checkExplicit(NaN);
});

test('isFinite() returns booleans for a broad number collection', () => {
	const values: number[] = [1, 2.5, Infinity, -Infinity, NaN];
	const finite = values.filter(isFinite);
	const nonFinite = values.filter(value => !isFinite(value));

	expectTypeOf(finite).toEqualTypeOf<number[]>();
	expectTypeOf(nonFinite).toEqualTypeOf<number[]>();
	assert.deepEqual(finite, [1, 2.5]);
	assert.deepEqual(nonFinite, [Infinity, -Infinity, NaN]);
});

test('isInteger() leaves a broad number usable in both reachable branches', () => {
	const describe = (value: number) => {
		if (isInteger(value)) {
			expectTypeOf(value).toEqualTypeOf<number>();
			return `integer: ${value.toString()}`;
		}

		expectTypeOf(value).toEqualTypeOf<number>();
		return `non-integer: ${value.toString()}`;
	};

	assert.equal(describe(1), 'integer: 1');
	assert.equal(describe(0), 'integer: 0');
	assert.equal(describe(-1), 'integer: -1');
	assert.equal(describe(2.5), 'non-integer: 2.5');
	assert.equal(describe(Infinity), 'non-integer: Infinity');
	assert.equal(describe(NaN), 'non-integer: NaN');
});

test('isInteger() leaves a generic number unchanged and accepts an explicit type argument', () => {
	function describe<Value extends number>(value: Value) {
		if (isInteger(value)) {
			const retained: Value = value;
			return retained.toString();
		}

		const retained: Value = value;
		return retained.toString();
	}

	const checkExplicit = (value: number) => {
		if (isInteger<number>(value)) {
			expectTypeOf(value).toEqualTypeOf<number>();
		} else {
			expectTypeOf(value).toEqualTypeOf<number>();
		}
	};

	assert.equal(describe(2), '2');
	assert.equal(describe(2.5), '2.5');
	checkExplicit(2);
	checkExplicit(2.5);
});

test('isInteger() preserves numeric literal union narrowing', () => {
	for (const value of [-1, 0, 2.5, Infinity] as Array<-1 | 0 | 2.5 | PositiveInfinity>) {
		if (isInteger(value)) {
			expectTypeOf(value).toEqualTypeOf<-1 | 0>();
			assert.ok(value === -1 || value === 0);
		} else {
			expectTypeOf(value).toEqualTypeOf<2.5 | PositiveInfinity>();
			assert.ok(value === 2.5 || value === Infinity);
		}
	}
});

test('isInteger() keeps broad number collections typed as numbers', () => {
	const values: number[] = [0, -1, 2.5, Infinity, -Infinity, NaN];
	const integers = values.filter(isInteger);
	const nonIntegers = values.filter(value => !isInteger(value));

	expectTypeOf(integers).toEqualTypeOf<number[]>();
	expectTypeOf(nonIntegers).toEqualTypeOf<number[]>();
	assert.deepEqual(integers, [0, -1]);
	assert.deepEqual(nonIntegers, [2.5, Infinity, -Infinity, NaN]);
});

test('isInteger() leaves branded numbers unchanged in both branches', () => {
	type BrandedNumber = number & {readonly brand: unique symbol};
	const describe = (value: BrandedNumber) => {
		if (isInteger(value)) {
			expectTypeOf(value).toEqualTypeOf<BrandedNumber>();
			return `integer: ${value.toString()}`;
		}

		expectTypeOf(value).toEqualTypeOf<BrandedNumber>();
		return `fractional: ${value.toString()}`;
	};

	assert.equal(describe(1 as BrandedNumber), 'integer: 1');
	assert.equal(describe(1.5 as BrandedNumber), 'fractional: 1.5');
});

test('number guards never coerce boxed or object inputs', () => {
	const boxed = Object(1) as object;
	const hostile = {
		[Symbol.toPrimitive]() {
			assert.fail('A number guard must not coerce its input');
		},
	};

	for (const guard of [isFinite, isInteger, isSafeInteger, isInfinite]) {
		for (const value of [boxed, hostile, '1', 1n, true, null, undefined]) {
			assert.equal(guard(value), false);
		}
	}
});

test('number guards retain unions of literals and opaque numbers in both branches', () => {
	type BrandedNumber = number & {readonly brand: unique symbol};
	type Value = 1 | BrandedNumber;
	const values: Value[] = [1, 1.5 as BrandedNumber, Infinity as BrandedNumber];

	for (const guard of [isFinite, isInteger, isSafeInteger]) {
		for (const value of values) {
			if (guard(value)) {
				expectTypeOf(value).toEqualTypeOf<Value>();
			} else {
				expectTypeOf(value).toEqualTypeOf<Value>();
			}
		}
	}

	assert.equal(isInteger(values[1]), false);
	assert.equal(isFinite(values[2]), false);
});
