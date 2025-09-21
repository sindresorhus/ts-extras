import {test} from 'node:test';
import assert from 'node:assert/strict';
import {asWritable} from '../source/index.js';

test('asWritable()', () => {
	type Fixture = {
		readonly a: number;
	};

	const fixture: Fixture = {a: 1};

	// @ts-expect-error
	fixture.a = 2;

	const writableFixture = asWritable(fixture);
	writableFixture.a = 2;
	assert.equal(writableFixture.a, 2);
});
