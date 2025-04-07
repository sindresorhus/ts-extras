import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {assertIsPresent} from '../source/index.js';

test('assertIsPresent()', t => {
	t.notThrows(() => {
		assertIsPresent('present');
	});

	t.throws(() => {
		assertIsPresent(null);
	}, {
		instanceOf: TypeError,
	});

	// eslint-disable-next-line @typescript-eslint/ban-types
	const maybePresent = 'present' as string | undefined | null;
	assertIsPresent(maybePresent);
	expectTypeOf(maybePresent).toMatchTypeOf<string>();
});
