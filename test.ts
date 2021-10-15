import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {isDefined, asMutable} from './index.js';

test('isDefined()', t => {
	t.false(isDefined(null));
	t.false(isDefined(undefined));
	t.true(isDefined(1));
	t.true(isDefined('x'));

	const fixture = [1, null].filter(x => isDefined(x));
	expectTypeOf(fixture).not.toBeNullable();
});

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
