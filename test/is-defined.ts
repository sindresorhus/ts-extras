import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {isDefined} from '../source/index.js';

test('isDefined()', t => {
	t.false(isDefined(null));
	t.false(isDefined(undefined));
	t.true(isDefined(1));
	t.true(isDefined('x'));

	const fixture = [1, null].filter(x => isDefined(x));
	expectTypeOf(fixture).not.toBeNullable();
});
