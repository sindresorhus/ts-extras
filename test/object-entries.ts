import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {objectEntries} from '../source/index.js';

test('objectEntries()', t => {
	type Entry = ['1' | 'stringKey', number | string];

	const entries = objectEntries({
		1: 123,
		stringKey: 'someString',
		[Symbol('symbolKey')]: true,
	});

	expectTypeOf<Entry[]>(entries);
	t.deepEqual(entries, [['1', 123], ['stringKey', 'someString']]);
});

// Optional property
{
	type Foo = {
		a?: string;
	};

	const x: Foo = {};
	const entries = objectEntries(x);
	expectTypeOf<Array<['a', string]>>(entries);

	expectTypeOf<['a', string] | undefined>(entries[0]);
}
