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

	// eslint-disable-next-line @typescript-eslint/no-restricted-types
	const nullable: null | undefined = null;

	if (isPresent(nullable)) {
		expectTypeOf(nullable).toBeNever();
	}
});
