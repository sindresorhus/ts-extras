import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {isFinite} from '../source/index.js';

test('isFinite() leaves branded numbers unchanged in both branches', () => {
	type BrandedNumber = number & {readonly brand: unique symbol};
	const describe = (value: BrandedNumber) => {
		if (isFinite(value)) {
			expectTypeOf(value).toEqualTypeOf<BrandedNumber>();
			return `finite: ${value.toString()}`;
		}

		expectTypeOf(value).toEqualTypeOf<BrandedNumber>();
		return `non-finite: ${value.toString()}`;
	};

	assert.equal(describe(1 as BrandedNumber), 'finite: 1');
	assert.equal(describe(Infinity as BrandedNumber), 'non-finite: Infinity');
	assert.equal(describe(NaN as BrandedNumber), 'non-finite: NaN');
});
