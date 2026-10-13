import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {type NegativeInfinity, type PositiveInfinity} from 'type-fest';
import {isInfinite} from '../source/index.js';

test('isInfinite()', () => {
	assert.equal(isInfinite(123), false);
	assert.equal(isInfinite(Infinity), true);
	assert.equal(isInfinite(-Infinity), true);

	const number_ = 123 as number;

	if (isInfinite(number_)) {
		expectTypeOf(number_).toEqualTypeOf<PositiveInfinity | NegativeInfinity>();
	} else {
		expectTypeOf(number_).toEqualTypeOf<number>();
	}
});

test('isInfinite() narrows every value it can', () => {
	const values = [123, Infinity, -Infinity, null, 'x', undefined] as const;

	// Only the two infinities narrow, and the else branch keeps everything else.
	expectTypeOf(values.filter(isInfinite)).toEqualTypeOf<Array<PositiveInfinity | NegativeInfinity>>();

	const object = {a: 1} as {a: number} | unknown;
	if (isInfinite(object)) {
		expectTypeOf(object).toEqualTypeOf<PositiveInfinity | NegativeInfinity>();
	}

	// An `unknown` narrows to the infinities, which is all the guard can say about one.
	const unknownValue: unknown = Infinity;
	if (isInfinite(unknownValue)) {
		expectTypeOf(unknownValue).toEqualTypeOf<PositiveInfinity | NegativeInfinity>();
	} else {
		expectTypeOf(unknownValue).toEqualTypeOf<unknown>();
	}
});

test('isInfinite() answers only for the two infinities', () => {
	for (const value of [Infinity, -Infinity]) {
		assert.equal(isInfinite(value), true);
	}

	// Everything else is finite, including the values that are easy to confuse with one.
	for (const value of [0, -0, 1, -1, 1e308, -1e308, NaN, Number.MAX_VALUE, Number.MIN_VALUE, Number.EPSILON, 1n, 'Infinity', '-Infinity', null, undefined, {}, []]) {
		assert.equal(isInfinite(value), false);
	}
});
