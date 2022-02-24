import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {objectFromEntries} from '../source/index.js';

test('objectFromEntries()', t => {
	type ObjectFromEntries = {
		[x: symbol]: boolean;
		1: number;
		stringKey: string;
	};

	const symbolKey = Symbol('symbolKey');

	const objectFromEntries_ = objectFromEntries([
		[1, 123],
		['stringKey', 'someString'],
		[symbolKey, true],
	]);

	expectTypeOf<ObjectFromEntries>(objectFromEntries_);
	t.deepEqual(objectFromEntries_, {
		1: 123,
		stringKey: 'someString',
		[symbolKey]: true,
	});

	const objectFromReadonlyEntries_ = objectFromEntries([
		[1, 123],
		['stringKey', 'someString'],
		[symbolKey, true],
	] as const);

	expectTypeOf<ObjectFromEntries>(objectFromReadonlyEntries_);
	t.deepEqual(objectFromReadonlyEntries_, {
		1: 123,
		stringKey: 'someString',
		[symbolKey]: true,
	});
});
