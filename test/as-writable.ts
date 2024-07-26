import test from 'ava';
import {asWritable} from '../source/index.js';

test('asWritable()', t => {
	type Fixture = {
		readonly a: number;
	};

	const fixture: Fixture = {a: 1};

	// @ts-expect-error
	fixture.a = 2;

	const writableFixture = asWritable(fixture);
	writableFixture.a = 2;
	t.is(writableFixture.a, 2);
});
