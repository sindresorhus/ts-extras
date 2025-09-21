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
