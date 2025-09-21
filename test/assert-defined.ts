import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {assertDefined} from '../source/index.js';

test('assertDefined()', () => {
	assert.doesNotThrow(() => {
		assertDefined('defined');
	});

	assert.throws(() => {
		assertDefined(undefined);
	}, TypeError);

	const maybeDefined = 'defined' as string | undefined;
	assertDefined(maybeDefined);
	expectTypeOf(maybeDefined).toExtend<string>();
});
