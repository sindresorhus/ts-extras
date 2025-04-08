import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {assertPresent} from '../source/index.js';

test('assertPresent()', t => {
	t.notThrows(() => {
		assertPresent('present');
	});

	t.throws(() => {
		assertPresent(null);
	}, {
		instanceOf: TypeError,
	});

	// eslint-disable-next-line @typescript-eslint/ban-types
	const maybePresent = 'present' as string | undefined | null;
	assertPresent(maybePresent);
	expectTypeOf(maybePresent).toMatchTypeOf<string>();
});
