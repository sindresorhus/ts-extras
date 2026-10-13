import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {objectHasOwn, objectHasIn} from '../source/index.js';

test('presence guards inspect property existence without reading getters', () => {
	const source = {
		get own(): never {
			throw new Error('The getter must not run');
		},
	};
	const inherited = Object.create(source) as typeof source;

	for (const guard of [objectHasOwn, objectHasIn]) {
		assert.equal(guard(source, 'own'), true);
		assert.equal(guard(source, 'missing'), false);
	}

	assert.equal(objectHasOwn(inherited, 'own'), false);
	assert.equal(objectHasIn(inherited, 'own'), true);
});

test('objectHasOwn()', () => {
	const symbolKey = Symbol('symbolKey');

	const object_: unknown = {
		1: 1,
		b: 2,
		[symbolKey]: 3,
	};

	assert.equal(objectHasOwn(object_, 1), true);
	assert.equal(objectHasOwn(object_, 'b'), true);
	assert.equal(objectHasOwn(object_, symbolKey), true);
	assert.equal(objectHasOwn(object_, 'hello'), false);

	// Test that inherited properties return false
	assert.equal(objectHasOwn(object_, 'toString'), false);
	assert.equal(objectHasOwn(object_, 'valueOf'), false);

	if (objectHasOwn(object_, 1) && objectHasOwn(object_, 'b') && objectHasOwn(object_, symbolKey)) {
		expectTypeOf<{
			1: unknown;
			b: unknown;
			[symbolKey]: unknown;
		}>(object_);
	}

	// Test that it narrows the object type
	const data: unknown = {foo: 'test'};
	if (objectHasOwn(data, 'foo')) {
		expectTypeOf(data).toExtend<{foo: unknown}>();
		// Should be able to access the property
		assert.equal(typeof data.foo, 'string');
	}
});

test('objectHasOwn() with Object.create(null)', () => {
	const object = Object.create(null) as {foo?: number};
	object.foo = 1;

	assert.equal(objectHasOwn(object, 'foo'), true);
	// No prototype, so no inherited properties
	assert.equal(objectHasOwn(object, 'toString'), false);
});

test('objectHasOwn() refuses no name, unlike objectHasIn()', () => {
	// `objectHasIn()` blocks `__proto__` and `constructor` because the `in` operator would report them on anything. `Object.hasOwn()` really does answer for both, so this blocks neither, and a narrowed type that dropped either would promise a key the guard can report.
	const own = JSON.parse('{"__proto__":{"a":1},"constructor":"own"}') as Record<string, unknown>;

	assert.equal(Object.hasOwn(own, '__proto__'), true);
	assert.equal(Object.hasOwn(own, 'constructor'), true);
	assert.equal(objectHasOwn(own, '__proto__'), true);
	assert.equal(objectHasOwn(own, 'constructor'), true);

	const data: unknown = own;
	if (objectHasOwn(data, '__proto__')) {
		expectTypeOf(data).toExtend<{__proto__: unknown}>();
	}

	if (objectHasOwn(data, 'constructor')) {
		expectTypeOf(data).toExtend<{constructor: unknown}>();
	}
});

test('objectHasOwn() with symbols', () => {
	const symbol1 = Symbol('test1');
	const symbol2 = Symbol('test2');
	const object: unknown = {[symbol1]: 'value'};

	assert.equal(objectHasOwn(object, symbol1), true);
	assert.equal(objectHasOwn(object, symbol2), false);

	if (objectHasOwn(object, symbol1)) {
		expectTypeOf(object).toExtend<{[symbol1]: unknown}>();
	}
});

test('objectHasOwn() with null and undefined', () => {
	// `Object.hasOwn()` throws for these, but `ObjectType` is unconstrained and the documented use is on an `unknown` value, so the guard has to answer rather than crash. `objectHasIn()` already boxes them and reports `false`.
	assert.equal(objectHasOwn(null, 'foo'), false);
	assert.equal(objectHasOwn(undefined, 'foo'), false);
	assert.equal(objectHasOwn({}, 'foo'), false);
});

test('objectHasOwn() does not claim every key of a union is present', () => {
	const data: unknown = {a: 1};
	const key = 'a' as 'a' | 'b';

	if (objectHasOwn(data, key)) {
		expectTypeOf(data).toEqualTypeOf<{a?: unknown; b?: unknown}>();
		assert.equal('b' in data, false);
	}
});

test('objectHasOwn() adds an optional index signature for a widened key', () => {
	// A `string` key names an unbounded set, so no single property is promised. The value is readable through the key as `unknown`.
	const data: unknown = {a: 1};
	const field: string = 'a';

	if (objectHasOwn(data, field)) {
		expectTypeOf(data).toEqualTypeOf<Partial<Record<string, unknown>>>();
		expectTypeOf(data[field]).toEqualTypeOf<unknown>();
	}

	if (objectHasOwn(data, 'a1' as `a${string}`)) {
		expectTypeOf(data).toEqualTypeOf<Partial<Record<`a${string}`, unknown>>>();
	}

	// A declared property keeps its own type.
	const typed: {a: number} = {a: 1};
	if (objectHasOwn(typed, field)) {
		expectTypeOf(typed.a).toEqualTypeOf<number>();
	}

	assert.equal(objectHasOwn(data, 'a' as string), true);
	assert.equal(objectHasOwn(data, 'zzz' as string), false);
});

// A factory rather than a literal, so control-flow analysis cannot have narrowed the value before the guard sees it. What an `any` key does is only observable here.
const unknownValue = () => ({known: 'x'} as unknown);

test('objectHasOwn() does not promise a key that mixes a literal with a widened type', () => {
	// The key mixes a literal with a widened member, so no member of it is promised as a required property.
	type MixedKey = 'alpha' | (string & {});
	const key = 'alpha' as MixedKey;

	const literalValue: unknown = {known: 'x'};
	if (objectHasOwn(literalValue, key)) {
		expectTypeOf(key).toEqualTypeOf<MixedKey>();
		// Every member, `alpha` included, is optional.
		expectTypeOf(literalValue).toEqualTypeOf<Partial<Record<MixedKey, unknown>>>();
	}

	// `any` takes the same path.
	const value: unknown = unknownValue();
	const anyKey = 'known' as any;
	if (objectHasOwn(value, anyKey)) {
		expectTypeOf(value).toEqualTypeOf<Partial<Record<any, unknown>>>();
	}

	// A plain literal union still narrows, and a literal key still proves its property.
	const literalUnion = 'a' as 'a' | 'b';
	if (objectHasOwn(value, literalUnion)) {
		expectTypeOf(value).toExtend<{a?: unknown; b?: unknown}>();
	}

	if (objectHasOwn(value, 'known')) {
		expectTypeOf(value.known).toEqualTypeOf<unknown>();
	}
});

test('objectHasOwn() answers false for a value whose keys cannot be read', () => {
	const {proxy, revoke} = Proxy.revocable({a: 1}, {});
	revoke();
	assert.equal(objectHasOwn(proxy, 'a'), false);

	const hostile = new Proxy({}, {
		getOwnPropertyDescriptor() {
			throw new Error('nope');
		},
	});
	assert.equal(objectHasOwn(hostile, 'a'), false);
	assert.equal(objectHasOwn(hostile, 'toString'), false);

	assert.equal(objectHasOwn(new Proxy({a: 1}, {}), 'a'), true);
});

test('objectHasOwn() keeps the value type of a key the value already declares', () => {
	const record: Record<string, number> = {a: 1};
	if (objectHasOwn(record, 'a')) {
		expectTypeOf(record['a']).toEqualTypeOf<number>();
	} else {
		expectTypeOf(record).toEqualTypeOf<Record<string, number>>();
	}

	const array = ['x', 'y'];
	if (objectHasOwn(array, 0)) {
		expectTypeOf(array[0]).toEqualTypeOf<string>();
	}
});

test('presence guards keep optional property inputs usable when the key is absent', () => {
	for (const guard of [objectHasOwn, objectHasIn]) {
		function inspect(value: {key?: number; label: string}) {
			if (guard(value, 'key')) {
				return `present: ${value.label}`;
			}

			expectTypeOf(value).toEqualTypeOf<{key?: number; label: string}>();
			return `missing: ${value.label}`;
		}

		assert.equal(inspect({label: 'row'}), 'missing: row');
		assert.equal(inspect({key: undefined, label: 'row'}), 'present: row');
		assert.equal(inspect({key: 1, label: 'row'}), 'present: row');
	}
});

test('presence guards narrow unions and nullable values like the in operator', () => {
	// Regression guard: a member that declares the key as required must not block narrowing. v1.3.0 narrowed these, and a boolean result here makes `value.key` unreadable.
	type Item = {kind: 'required'; key: number; label: string} | {kind: 'other'; label: string};
	for (const guard of [objectHasOwn, objectHasIn]) {
		function inspect(value: Item) {
			if (guard(value, 'key')) {
				expectTypeOf(value).branded.toEqualTypeOf<{kind: 'required'; key: number; label: string} | ({kind: 'other'; label: string} & Record<'key', unknown>)>();
				return `present: ${value.label}`;
			}

			expectTypeOf(value).toEqualTypeOf<{kind: 'other'; label: string}>();
			return `missing: ${value.label}`;
		}

		assert.equal(inspect({kind: 'other', label: 'row'}), 'missing: row');
		assert.equal(inspect({kind: 'required', key: 1, label: 'row'}), 'present: row');

		function read(value: {key: number} | undefined) {
			if (guard(value, 'key')) {
				expectTypeOf(value).toEqualTypeOf<{key: number}>();
				return value.key;
			}

			expectTypeOf(value).toEqualTypeOf<undefined>();
			return undefined;
		}

		assert.equal(read({key: 1}), 1);
		assert.equal(read(undefined), undefined);
	}
});

test('presence guards narrow generic inputs', () => {
	// Regression guard: v1.3.0 narrowed a generic input. The proof must not use a conditional on the object type, since it stays deferred for a generic and hides the property or its value type.
	for (const guard of [objectHasOwn, objectHasIn]) {
		function read<Value extends object>(value: Value): unknown {
			if (guard(value, 'key')) {
				return value.key;
			}

			return undefined;
		}

		// The index signature still supplies the value type, rather than `unknown`. `noUncheckedIndexedAccess` adds `undefined` to a generic read.
		function count<Value extends Record<string, number>>(value: Value): number {
			if (guard(value, 'key')) {
				expectTypeOf(value['key']).toEqualTypeOf<number | undefined>();
				return value['key'] ?? 0;
			}

			return 0;
		}

		assert.equal(read({key: 1}), 1);
		assert.equal(read({}), undefined);
		assert.equal(count({key: 2}), 2);
		assert.equal(count({}), 0);
	}
});

test('presence guards keep index-signature inputs usable for missing keys', () => {
	for (const guard of [objectHasOwn, objectHasIn]) {
		function inspect(value: Record<string, number>, key: string) {
			if (guard(value, key)) {
				expectTypeOf(value).toEqualTypeOf<Record<string, number>>();
				return value[key];
			}

			expectTypeOf(value).toEqualTypeOf<Record<string, number>>();
			return value['label'];
		}

		assert.equal(inspect({label: 1}, 'missing'), 1);
		assert.equal(inspect({label: 1, key: 2}, 'key'), 2);
	}
});

test('objectHasOwn() assumes a declared required property is own', () => {
	// Boundary: a declared required property narrows as if it were own, like the `in` operator's narrowing. A class method lives on the prototype, so the runtime answers `false` and reaches a branch typed `never`. This is documented rather than gated, since gating it also stops `{a: number} | {b: string}` from narrowing.
	class Item {
		method() {
			return 1;
		}
	}

	function inspect(value: Item) {
		if (objectHasOwn(value, 'method')) {
			expectTypeOf(value).toEqualTypeOf<Item & Record<'method', () => number>>();
			return 'own';
		}

		expectTypeOf(value).toBeNever();
		return 'inherited';
	}

	const value = new Item();
	assert.equal(objectHasOwn(value, 'method'), false);
	assert.equal(inspect(value), 'inherited');

	// A getter is a readonly property, and TypeScript keeps a readonly member in the false branch, so the inherited getter stays usable there.
	class WithGetter {
		get key() {
			return 1;
		}
	}

	function read(withGetter: WithGetter) {
		if (objectHasOwn(withGetter, 'key')) {
			return 'own';
		}

		expectTypeOf(withGetter).toEqualTypeOf<WithGetter>();
		return withGetter.key;
	}

	assert.equal(read(new WithGetter()), 1);
});

test('presence guards still narrow unknown inputs through filter wrappers', () => {
	for (const guard of [objectHasOwn, objectHasIn]) {
		const values: unknown[] = [{key: 1}, {}, null, undefined];
		const selected = values.filter(value => guard(value, 'key'));

		expectTypeOf(selected).branded.toEqualTypeOf<Array<Record<'key', unknown>>>();
		assert.deepEqual(selected, [{key: 1}]);
	}
});

test('presence guards narrow object and interface values with a widened key', () => {
	// Regression guard: an optional index signature is already satisfied by `object` and every interface, which turned this common pattern into a boolean result. The proof for a widened key is a required index signature.
	for (const guard of [objectHasOwn, objectHasIn]) {
		function read(data: unknown, field: string): unknown {
			if (typeof data === 'object' && data !== null && guard(data, field)) {
				return data[field];
			}

			return undefined;
		}

		assert.equal(read({a: 1}, 'a'), 1);
		assert.equal(read(null, 'a'), undefined);

		// A type literal narrows too. Its implicit index signature satisfies the proof, but TypeScript narrows with the subtype relation, which ignores it, so the false branch keeps the type.
		type Shape = {a: number};
		function keep(data: Shape, field: string): unknown {
			if (guard(data, field)) {
				return data[field];
			}

			expectTypeOf(data).toEqualTypeOf<Shape>();
			return undefined;
		}

		assert.equal(keep({a: 1}, 'a'), 1);
		assert.equal(keep({a: 1}, 'b'), undefined);
	}
});
