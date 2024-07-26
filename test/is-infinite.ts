import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {type NegativeInfinity, type PositiveInfinity} from 'type-fest';
import {isInfinite} from '../source/index.js';

test('isInfinite()', t => {
	t.false(isInfinite(123));
	t.true(isInfinite(Number.POSITIVE_INFINITY));
	t.true(isInfinite(Number.NEGATIVE_INFINITY));

	const number_ = 123 as number;

	if (isInfinite(number_)) {
		expectTypeOf<PositiveInfinity | NegativeInfinity>(number_);
	} else {
		expectTypeOf<number>(number_);
	}
});
