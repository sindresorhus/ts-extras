import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {isDefined, assertError, asMutable, isEmpty} from './index.js';

test('isDefined()', t => {
	t.false(isDefined(null));
	t.false(isDefined(undefined));
	t.true(isDefined(1));
	t.true(isDefined('x'));

	const fixture = [1, null].filter(x => isDefined(x));
	expectTypeOf(fixture).not.toBeNullable();
});

test('assertError()', t => {
	t.notThrows(() => {
		assertError(new Error('x'));
	});

	t.throws(() => {
		assertError('x');
	}, {
		instanceOf: TypeError,
	});
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

test('isEmpty()', t => {
	t.false(isEmpty([1, 2, 3]));
	t.true(isEmpty([]));
});
