import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {asWritable} from '../source/index.js';

test('asWritable()', () => {
	type Fixture = {
		readonly a: number;
	};

	const fixture: Fixture = {a: 1};

	// @ts-expect-error
	fixture.a = 2;

	const writableFixture = asWritable(fixture);
	writableFixture.a = 2;
	assert.equal(writableFixture.a, 2);
});

type Nested = {readonly a: {readonly b: number}};

function makeNested(): Nested {
	return {a: {b: 1}};
}

type Union = {readonly a: number} | {readonly b: number};

test('asWritable() removes readonly at the level it can reach', () => {
	// `Writable` is a homomorphic mapped type, so it strips a modifier from every property it can name and nothing deeper. A nested object keeps its own readonly members, which is the shallow behaviour type-fest's `Writable` documents.
	const shallow = asWritable(makeNested());
	shallow.a = {b: 2};
	assert.equal(shallow.a.b, 2);

	if (false) {
		// @ts-expect-error - `b` is two levels down, so the cast does not reach it.
		shallow.a.b = 3;
	}

	// A readonly tuple, a readonly array, and a mutable one all come back writable. A tuple declared `as const` keeps its element literals, so the cast removes the modifier and nothing else.
	const tuple = asWritable(['a', 'b'] as readonly [string, string]);
	tuple[0] = 'z';
	assert.deepEqual(tuple, ['z', 'b']);

	const literal = asWritable(['a', 'b'] as const);
	expectTypeOf(literal[0]).toEqualTypeOf<'a'>();

	const list = asWritable([] as readonly number[]);
	list.push(1);
	assert.deepEqual(list, [1]);

	// A readonly index signature loses its modifier too, so any key can be written.
	const indexed = asWritable({} as {readonly [key: string]: number});
	indexed['a'] = 1;
	assert.equal(indexed['a'], 1);

	// `Writable` makes the keys of the whole union writable, which is the intersection of the members' keys. Disjoint members share none, so neither loses its modifier.
	const union = asWritable({} as Union);
	expectTypeOf(union).toEqualTypeOf<Union>();

	// A key that every member has is writable in each member, and the other keys stay readonly.
	const shared = asWritable({a: 1} as {readonly a: number} | {readonly a: number; readonly b: 1});
	shared.a = 2;
	assert.equal(shared.a, 2);
	if ('b' in shared) {
		// @ts-expect-error - `b` is only in one member, so it keeps its modifier.
		shared.b = 1;
	}
});

test('asWritable() keeps the value itself, and cannot keep what a mapped type has no room for', () => {
	const value = {a: 1};
	assert.equal(asWritable(value), value);

	// A primitive, `null`, and a string all come back as the same value.
	assert.equal(asWritable(1 as number), 1);
	assert.equal(asWritable(null as null), null);
	assert.equal(asWritable('x' as string), 'x');

	// A mapped type has no room for a call signature, a construct signature, or a `#private` field, so a function and a private-field instance come back without them. The documentation says so, and the test is here so that a change to it is deliberate.
	const callback = (input: string) => input.length;
	const untypedCallback = asWritable(callback);
	if (false) {
		// @ts-expect-error - the call signature does not survive the cast.
		untypedCallback('a');
	}

	class Box {
		#secret = 1;
		read(): number {
			return this.#secret;
		}
	}

	// A public method does survive, since it is a named property.
	const instance = asWritable(new Box());
	assert.equal(instance.read(), 1);
});
