import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {objectEntries} from '../source/index.js';

test('objectEntries()', t => {
	type Entry = [1 | 'stringKey', number | string];
	const entries = objectEntries({
		1: 123,
		stringKey: 'someString',
		[Symbol('symbolKey')]: true,
	});

	expectTypeOf<Entry[]>(entries);
	t.deepEqual(entries, [['1', 123], ['stringKey', 'someString']]);
});
