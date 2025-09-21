import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {type NegativeInfinity, type PositiveInfinity} from 'type-fest';
import {isInfinite} from '../source/index.js';

test('isInfinite()', () => {
	assert.equal(isInfinite(123), false);
	assert.equal(isInfinite(Number.POSITIVE_INFINITY), true);
	assert.equal(isInfinite(Number.NEGATIVE_INFINITY), true);

	const number_ = 123 as number;

	if (isInfinite(number_)) {
		expectTypeOf<PositiveInfinity | NegativeInfinity>(number_);
	} else {
		expectTypeOf<number>(number_);
	}
});
