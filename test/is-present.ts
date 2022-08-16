import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {isPresent} from '../source/index.js';

test('isPresent()', t => {
	t.false(isPresent(null));
	t.false(isPresent(undefined));
	t.true(isPresent(1));
	t.true(isPresent('x'));

	const fixture = [1, null].filter(x => isPresent(x));
	expectTypeOf(fixture).not.toBeNullable();

	// eslint-disable-next-line @typescript-eslint/ban-types
	const nullable: null | undefined = null;

	if (isPresent(nullable)) {
		expectTypeOf(nullable).toBeNever();
	}
});
