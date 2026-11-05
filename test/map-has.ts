import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {mapHas} from '../source/index.js';

test('mapHas()', () => {
	const labels = new Map([['a', 'Alpha'], ['b', 'Beta']] as const);
	const validKey: unknown = 'a';
	const invalidKey: unknown = 'c';

	assert.equal(mapHas(labels, validKey), true);
	assert.equal(mapHas(labels, invalidKey), false);

	// @ts-expect-error - a key that can never be in the map
	assert.equal(mapHas(labels, 1), false);
});

test('mapHas() uses SameValueZero like the builtin', () => {
	// `Map#has` answers `true` for `NaN` and for `+0` against `-0`, so a guard that disagreed with it would narrow to a branch it never reaches.
	const numbers = new Map<number, string>([[NaN, 'nan'], [0, 'zero']]);

	assert.equal(mapHas(numbers, NaN), true);
	assert.equal(mapHas(numbers, -0), true);
	assert.equal(mapHas(numbers, 1), false);
});

test('mapHas() narrows the key and leaves the false branch of unknown alone', () => {
	const labels = new Map<'a' | 'b', string>([['a', 'Alpha']]);
	const key: unknown = 'c';

	if (mapHas(labels, key)) {
		expectTypeOf(key).toEqualTypeOf<'a' | 'b'>();
		expectTypeOf(labels.get(key)).toEqualTypeOf<string | undefined>();
	} else {
		expectTypeOf(key).toEqualTypeOf<unknown>();
		assert.equal(key, 'c');
	}

	// Boundary: a key typed as a union the map's key type covers part of loses that part in the false branch, though the map may not hold every value of its key type. This is documented.
	const unionKey = 'b' as 'a' | 'b' | 'c';
	if (!mapHas(labels, unionKey)) {
		expectTypeOf(unionKey).toEqualTypeOf<'c'>();
		assert.equal(unionKey, 'b');
	}

	// A wider key keeps its own type in the false branch.
	const wideKey = 'z' as string | number;
	if (mapHas(labels, wideKey)) {
		expectTypeOf(wideKey).toEqualTypeOf<'a' | 'b'>();
	} else {
		expectTypeOf(wideKey).toEqualTypeOf<string | number>();
	}
});

test('mapHas() returns a boolean for a key the key type already covers', () => {
	// A missing key can still have the map's key type, so the false branch must not exclude it.
	const labels = new Map<string, number>([['a', 1]]);
	const key = 'b' as string;

	expectTypeOf(mapHas(labels, key)).toEqualTypeOf<boolean>();
	if (!mapHas(labels, key)) {
		expectTypeOf(key).toEqualTypeOf<string>();
	}
});

test('mapHas() works with a readonly map and object keys', () => {
	const first = {id: 1};
	const second = {id: 2};
	const lookup: ReadonlyMap<{id: number}, string> = new Map([[first, 'one']]);

	assert.equal(mapHas(lookup, first), true);
	// Keys are compared by identity, as with `Map#has()`.
	assert.equal(mapHas(lookup, {id: 1}), false);
	assert.equal(mapHas(lookup, second), false);
});

test('mapHas() narrows in a filter callback', () => {
	const labels = new Map<'a' | 'b', string>([['a', 'Alpha'], ['b', 'Beta']]);
	const keys: unknown[] = ['a', 'c', 'b'];
	const known = keys.filter(key => mapHas(labels, key));

	expectTypeOf(known).toEqualTypeOf<Array<'a' | 'b'>>();
	assert.deepEqual(known, ['a', 'b']);
});
