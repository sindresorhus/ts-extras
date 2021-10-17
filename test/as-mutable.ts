import test from 'ava';
import {asMutable} from '../source/index.js';

test('asMutable()', t => {
	type Fixture = {
		readonly a: number;
	};

	const fixture: Fixture = {a: 1};

	// @ts-expect-error
	fixture.a = 2;

	const mutableFixture = asMutable(fixture);
	mutableFixture.a = 2;
	t.is(mutableFixture.a, 2);
});
