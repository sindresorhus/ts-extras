import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {objectFromEntries} from '../source/index.js';

test('objectFromEntries()', t => {
	const symbolKey = Symbol('symbolKey');

	const objectFromEntries_ = objectFromEntries([
		[1, 123],
		['stringKey', 'someString'],
		[symbolKey, true],
	]);

	// Broad array literal → optional keys for soundness
	expectTypeOf<number | undefined>(objectFromEntries_[1]);
	expectTypeOf<string | undefined>(objectFromEntries_['stringKey']);
	expectTypeOf<boolean | undefined>(objectFromEntries_[symbolKey]);
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

	// Fixed tuple (as const) → required keys
	expectTypeOf<number>(objectFromReadonlyEntries_[1]);
	expectTypeOf<string>(objectFromReadonlyEntries_.stringKey);
	expectTypeOf<boolean>(objectFromReadonlyEntries_[symbolKey]);
	t.deepEqual(objectFromReadonlyEntries_, {
		1: 123,
		stringKey: 'someString',
		[symbolKey]: true,
	});

	// Duplicate keys → union of values for that key
	const duplicateKeys = objectFromEntries([
		['A', 1],
		['A', 3],
	] as const);
	expectTypeOf(duplicateKeys.A).toEqualTypeOf<1 | 3>();

	// Empty tuple → no keys
	const empty = objectFromEntries([] as const);
	expectTypeOf<keyof typeof empty>().toBeNever();

	// Broad array with key union → optional per key
	const unionArray: Array<['A', 1] | ['B', 2]> = [
		['A', 1],
		['B', 2],
	];
	const unionObject = objectFromEntries(unionArray);
	expectTypeOf<1 | undefined>(unionObject.A);
	expectTypeOf<2 | undefined>(unionObject.B);

	// Cannot assume presence when entries are a broad array
	// @ts-expect-error
	void (unionObject.A + unionObject.B);
	// @ts-expect-error - Key not present in the key union
	void unionObject.C;

	// Tuple literal ensures presence
	const tupleEntries = [
		['A', 1],
		['B', 2],
	] as const;
	const tupleObject = objectFromEntries(tupleEntries);
	expectTypeOf<1>(tupleObject.A);
	expectTypeOf<2>(tupleObject.B);
	void (tupleObject.A + tupleObject.B);

	// Broad array with duplicate keys → optional unioned values
	const duplicateBroad: Array<['A', 1] | ['A', 3]> = [];
	const duplicateBroadObject = objectFromEntries(duplicateBroad);
	expectTypeOf<1 | 3 | undefined>(duplicateBroadObject.A);
});
