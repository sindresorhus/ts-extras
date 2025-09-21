import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {assertPresent} from '../source/index.js';

test('assertPresent()', () => {
	assert.doesNotThrow(() => {
		assertPresent('present');
	});

	assert.throws(() => {
		assertPresent(null);
	}, TypeError);

	// eslint-disable-next-line @typescript-eslint/no-restricted-types
	const maybePresent = 'present' as string | undefined | null;
	assertPresent(maybePresent);
	expectTypeOf(maybePresent).toExtend<string>();
});
