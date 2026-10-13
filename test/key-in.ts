import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import type {LiteralUnion} from 'type-fest';
import {keyIn} from '../source/index.js';

declare const brandedStringSymbol: unique symbol;
type BrandedString = string & {[brandedStringSymbol]: 'BrandedString'};

test('keyIn() narrows key type', () => {
	const object = {foo: 1, bar: 2};

	// Union type narrowing
	const key = 'foo' as 'foo' | 'bar' | 'baz';
	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<'foo' | 'bar'>();
		assert.equal(['foo', 'bar'].includes(key), true);
	}

	// String key stays string
	const string = 'foo' as string;
	if (keyIn(object, string)) {
		// When key is string type, keyIn keeps it as string
		expectTypeOf(string).toEqualTypeOf<string>();
	}

	assert.equal(keyIn(object, 'foo'), true);
	assert.equal(keyIn(object, 'baz'), false);
});

test('keyIn() does not narrow when key includes widened primitive', () => {
	const object = {foo: 1, 1: 'one'};
	const key = 1 as number | 'foo';

	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<number | 'foo'>();
		assert.equal(key === 'foo' || typeof key === 'number', true);
	}

	assert.equal(keyIn(object, 1), true);
});

test('keyIn() does not narrow with LiteralUnion', () => {
	const object = {foo: 1, bar: 2};
	const key = 'foo' as LiteralUnion<'foo' | 'bar', string>;

	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<LiteralUnion<'foo' | 'bar', string>>();
		assert.equal(typeof key, 'string');
	}
});

test('keyIn() does not narrow branded strings', () => {
	const object = {foo: 1};
	const key = 'foo' as BrandedString;

	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<BrandedString>();
		assert.equal(typeof key, 'string');
	}
});

test('keyIn() with prototype chain', () => {
	const object = {foo: 1};

	// ToString is inherited from Object.prototype
	assert.equal(keyIn(object, 'toString'), true);
	assert.equal(keyIn(object, 'valueOf'), true);
	assert.equal(keyIn(object, 'foo'), true);
	assert.equal(keyIn(object, 'bar'), false);
});

test('keyIn() guards against prototype pollution', () => {
	const object = {foo: 1};

	// These are always false for security
	assert.equal(keyIn(object, '__proto__'), false);
	assert.equal(keyIn(object, 'constructor'), false);

	// Even when the value really owns the name. `__proto__:` in an object literal is the prototype setter, not a property, so the own property is built the way a parsed body arrives.
	const objectWithProto = JSON.parse('{"__proto__":"value","constructor":"value"}') as Record<string, unknown>;
	assert.equal(Object.hasOwn(objectWithProto, '__proto__'), true);
	assert.equal(keyIn(objectWithProto, '__proto__'), false);
	assert.equal(keyIn(objectWithProto, 'constructor'), false);

	// Type narrowing excludes blocked keys. The branch is never entered at runtime, since the guard rejects both names whatever the value is, so only the type is checked here. The runtime half is the two assertions above.
	const key = '__proto__' as '__proto__' | 'foo';
	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<'foo'>();
	}

	// Also test with constructor
	const constructorKey = 'constructor' as 'constructor' | 'foo';
	if (keyIn(object, constructorKey)) {
		expectTypeOf(constructorKey).toEqualTypeOf<'foo'>();
	}
});

test('keyIn() with symbols', () => {
	const symbol1 = Symbol('test1');
	const symbol2 = Symbol('test2');
	const object = {[symbol1]: 'value'};

	assert.equal(keyIn(object, symbol1), true);
	assert.equal(keyIn(object, symbol2), false);

	const key = symbol1 as typeof symbol1 | typeof symbol2;
	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<typeof symbol1>();
	}
});

test('keyIn() with Object.create(null)', () => {
	const object = Object.create(null) as {foo?: number};
	object.foo = 1;

	assert.equal(keyIn(object, 'foo'), true);
	// No prototype, so no inherited properties
	assert.equal(keyIn(object, 'toString'), false);
});

test('keyIn() with index signatures', () => {
	const object: {[key: string]: unknown; specific: number} = {
		specific: 1,
		dynamic: 'test',
	};

	const key = 'specific' as 'specific' | 'other';

	// With index signature, all strings are valid keys
	if (keyIn(object, key)) {
		// Key is not narrowed much because of index signature
		expectTypeOf(key).toEqualTypeOf<'specific' | 'other'>();
	}

	assert.equal(keyIn(object, 'specific'), true);
	assert.equal(keyIn(object, 'dynamic'), true);
	// The index signature is a lookup type, not a set of keys, so an unnamed one is still absent.
	assert.equal(keyIn(object, 'other'), false);
});

test('keyIn() does not narrow away keys the prototype chain accepts', () => {
	// The runtime uses the `in` operator, so it returns `true` for anything `Object.prototype` contributes. `keyof` cannot see those, so they are not narrowed away, or the true branch would claim the key cannot be one of them while the runtime reports one.
	const object = {foo: 1};
	const key = 'toString' as 'foo' | 'toString';

	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<'foo' | 'toString'>();
		expectTypeOf(object[key]).toEqualTypeOf<number | (() => string)>();
		assert.equal(typeof object[key], 'function');
	}

	// A lone inherited name is not narrowed to `never` either.
	const inherited = 'valueOf' as const;
	if (keyIn(object, inherited)) {
		expectTypeOf(inherited).toEqualTypeOf<'valueOf'>();
		assert.equal(typeof object[inherited], 'function');
	}

	// Inherited names are not guaranteed to exist on every object, so this union uses the boolean overload even though the runtime rejects the guarded names.
	const guarded = '__proto__' as '__proto__' | 'foo' | 'toString';
	if (keyIn(object, guarded)) {
		expectTypeOf(guarded).toEqualTypeOf<'__proto__' | 'foo' | 'toString'>();
	}

	// Ordinary narrowing is unaffected.
	const plain = 'bar' as 'foo' | 'bar' | 'baz';
	if (keyIn(object, plain)) {
		expectTypeOf(plain).toEqualTypeOf<'foo'>();
	}
});

test('keyIn() narrows the key to the complement in the false branch', () => {
	// The documentation claims this, and once the key resolves to a concrete union TypeScript does narrow it, so the `else` branch is left with only the keys the object lacks.
	const object = {foo: 1, bar: 2};
	const key = 'foo' as 'foo' | 'bar' | 'baz';

	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<'foo' | 'bar'>();
	} else {
		// The branch is never entered at runtime, since the key really is one the object has, so only the type is checked. The runtime half of the complement is the `keyIn(object, 'baz')` below.
		expectTypeOf(key).toEqualTypeOf<'baz'>();
	}

	assert.equal(keyIn(object, 'foo'), true);
	assert.equal(keyIn(object, 'baz'), false);
});

// A factory rather than a literal, so control flow does not narrow the value to one member before the guard sees it.
const unionObject = (value: {a: number} | {b: string}) => value;
const unionKeyOf = (key: 'a' | 'b') => key;
const partialObject = (value: {common: number; a: 1} | {common: number; b: 2}) => value;
const partialKeyOf = (key: 'a' | 'b' | 'common') => key;

test('keyIn() does not narrow away keys a union object type hides', () => {
	// `keyof` a union is the intersection of its members' keys, so a key only one member has must still count, or the key would narrow to `never`, which is assignable to any type.
	const maybe = unionObject({a: 1});
	const key = unionKeyOf('a');

	if (keyIn(maybe, key)) {
		expectTypeOf(key).toEqualTypeOf<'a' | 'b'>();
		assert.equal((maybe as {a: number}).a, 1);
	}

	// A partially shared union keeps the shared key available and leaves the rest alone.
	const partial = partialObject({common: 1, a: 1});
	const partialKey = partialKeyOf('a');

	if (keyIn(partial, partialKey)) {
		expectTypeOf(partialKey).toEqualTypeOf<'a' | 'b' | 'common'>();
	}

	// A non-union object is unaffected: the narrowing still drops the absent key.
	const plain = {foo: 1, bar: 2};
	const plainKey = 'foo' as 'foo' | 'bar' | 'baz';

	if (keyIn(plain, plainKey)) {
		expectTypeOf(plainKey).toEqualTypeOf<'foo' | 'bar'>();
	}
});

// A numeric-literal key and its string form are the same runtime key, so the string form is provable.
test('keyIn() matches a numeric key by its string form', () => {
	const object = {1: 'one'};
	const key = '1' as '1' | '2';

	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<'1'>();
		expectTypeOf(object[key]).toEqualTypeOf<string>();
	}

	assert.equal(keyIn(object, key), true);

	// The same for a numeric index signature, where the runtime key is a string.
	const record: Record<number, string> = {0: 'zero'};
	const recordKey = '0' as '0' | '1';

	if (keyIn(record, recordKey)) {
		expectTypeOf(recordKey).toEqualTypeOf<'0' | '1'>();
	}

	// Ordinary narrowing is unaffected.
	const plain = {foo: 1, bar: 2};
	const plainKey = 'foo' as 'foo' | 'bar' | 'baz';

	if (keyIn(plain, plainKey)) {
		expectTypeOf(plainKey).toEqualTypeOf<'foo' | 'bar'>();
	}
});

// An interface with only a string index signature has no symbol index signature, and `keyof` reads it fine, so the guard accepts it.
interface WithIndex {
	readonly [key: string]: number;
}

interface Named {
	name: string;
}

class Point {
	x = 1;
}

const withIndex: WithIndex = {a: 1, b: 2};
const named: Named = {name: 'x'};
const point = new Point();

test('keyIn() leaves the else branch alone when the object declares none of the key members', () => {
	const config: {port: number} = {port: 1};
	const flagKey = 'debug' as 'debug' | 'verbose';

	if (keyIn(config, flagKey)) {
		expectTypeOf(flagKey).toEqualTypeOf<never>();
	} else {
		expectTypeOf(flagKey).toEqualTypeOf<'debug' | 'verbose'>();
		assert.equal(flagKey.length, 5);
	}

	// A value typed `object` declares no keys, so the key is left alone in the true branch.
	const value: object = {id: 1};
	const idKey = 'id' as 'id' | 'name';

	if (keyIn(value, idKey)) {
		expectTypeOf(idKey).toEqualTypeOf<'id' | 'name'>();
	}

	assert.equal(keyIn(value, idKey), true);
});

test('keyIn() accepts an interface with a string index signature', () => {
	// An interface with only a string index signature has no symbol index signature, and `keyof` reads it fine, so the guard accepts it.
	const key = 'a' as 'a' | 'b';

	if (keyIn(withIndex, key)) {
		expectTypeOf(withIndex[key]).toEqualTypeOf<number | undefined>();
		assert.equal(key, 'a');
	}
});

test('keyIn() accepts an interface and a class instance', () => {
	const nameKey = 'name' as 'name' | 'other';
	if (keyIn(named, nameKey)) {
		expectTypeOf(nameKey).toEqualTypeOf<'name'>();
		assert.equal(nameKey, 'name');
	}

	const pointKey = 'x' as 'x' | 'y';
	if (keyIn(point, pointKey)) {
		expectTypeOf(pointKey).toEqualTypeOf<'x'>();
		assert.equal(pointKey, 'x');
	}
});

// Values built elsewhere, so control-flow analysis cannot narrow them to the keys their initializer happens to set.
function shapedWithBoth(): {a?: number; b: string} {
	return {a: 1, b: 'x'};
}

function shapedWithoutA(): {a?: number; b: string} {
	return {b: 'x'};
}

test('keyIn() narrows an optional declared key', () => {
	// Regression guard: v1.3.0 narrowed the true branch for optional keys, and that is the point of `keyIn()`.
	// Boundary: a single type predicate also narrows the false branch, which then drops the optional key even though it may be absent at runtime. This is documented rather than gated.
	const object = shapedWithBoth();
	const key = 'a' as 'a' | 'b' | 'c';

	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<'a' | 'b'>();
	} else {
		expectTypeOf(key).toEqualTypeOf<'c'>();
	}

	// A value can really hold more than its type declares, so both keys answer `true` at runtime.
	const wider = {a: 1, b: 'x'} as {a?: number; b: string};
	assert.equal(keyIn(wider, 'a'), true);
	assert.equal(keyIn(wider, 'b'), true);

	// With only the optional key declared, the runtime decides the whole answer.
	const unset = shapedWithoutA();
	assert.equal(keyIn(unset, 'a'), false);
	assert.equal(keyIn(unset, 'b'), true);

	function onlyOptional(): {a?: number} {
		return {};
	}

	const optional = onlyOptional();
	const optionalKey = 'a' as 'a' | 'b';
	assert.equal(keyIn(optional, 'a'), false);
	if (keyIn(optional, optionalKey)) {
		expectTypeOf(optionalKey).toEqualTypeOf<'a'>();
	}
});

test('keyIn() does not treat an index signature as a narrowing key', () => {
	// An index signature is a lookup type, not a set of declared keys, so it proves nothing.
	const object: Record<string, unknown> = {a: 1};
	const key = 'a' as 'a' | 'b';

	assert.equal(keyIn(object, 'a'), true);
	assert.equal(keyIn(object, 'b'), false);

	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<'a' | 'b'>();
	} else {
		expectTypeOf(key).toEqualTypeOf<'a' | 'b'>();
	}
});

test('keyIn() does not narrow a key that mixes a literal with a widened type', () => {
	// The guard shares its widened-key check with `objectHasIn` and the property guards, which is where the `IsLiteral`-based answer comes from. Both answers end at the same place for this key, so the point of the test is that they stay the same one.
	type LogLevel = 'info' | (string & {});
	const object = {info: 1};
	const key = 'info' as LogLevel;

	assert.equal(keyIn(object, key), true);
	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<LogLevel>();
	}
});

test('keyIn() does not throw for a primitive the way its siblings do not', () => {
	// `ObjectType extends object`, so a primitive only reaches the guard through an `any` or a cast. The `in` operator throws for one, so the guard boxes the value and answers, as `objectHasIn()` and `objectHasOwn()` do, and the three siblings agree on the same input.
	const value = 'abc' as never;

	assert.equal(keyIn(value, 'length'), true);
	assert.equal(keyIn(value, 'toUpperCase'), true);
	assert.equal(keyIn(value, 'nope'), false);

	// An object is unaffected: boxing it is the same value.
	const object = {a: 1};
	assert.equal(keyIn(object, 'a'), true);
	assert.equal(keyIn(object, 'b'), false);
});

test('keyIn() answers false for null and undefined, which have no wrapper', () => {
	// Every other primitive has a wrapper object, and `in` reports the wrapper's names. `null` and `undefined` do not, so boxing them would give `in` an empty object that still inherits everything `Object.prototype` contributes, and the guard would claim `'toString'` is in a value that owns nothing. A `true` branch then hands back a property whose read throws, so the narrowing is the thing that breaks. A prototype name is the only one that tells the two apart: a name the object does not carry answers `false` either way. `objectHasOwn()` says the same for both.
	for (const value of [null, undefined]) {
		assert.equal(keyIn(value as never, 'toString'), false);
		assert.equal(keyIn(value as never, 'valueOf'), false);
	}
});

test('keyIn() answers false for a value it cannot inspect', () => {
	// `in` goes through the proxy's `has` trap, and a revoked proxy or a trap that throws takes the guard down with it. The guard catches that and answers `false`, as its two siblings do, so the same value gets the same answer from all three. Mocking libraries and resource wrappers revoke on teardown.
	const {proxy, revoke} = Proxy.revocable({a: 1}, {});
	revoke();
	assert.equal(keyIn(proxy, 'a'), false);

	const hostile = new Proxy({}, {
		has() {
			throw new Error('nope');
		},
	});
	assert.equal(keyIn(hostile, 'a'), false);

	// A working proxy is still inspected as usual.
	const working = new Proxy({a: 1}, {});
	assert.equal(keyIn(working, 'a'), true);

	const other = new Proxy({b: 1}, {});
	assert.equal(keyIn(other, 'a'), false);
});

test('keyIn() narrows an optional key in the true branch', () => {
	function inspect(object: {value?: number}, key: 'value' | 'missing') {
		if (keyIn(object, key)) {
			expectTypeOf(key).toEqualTypeOf<'value'>();
			return `present: ${key}`;
		}

		// Boundary: the false branch drops the optional key, although `{}` reaches it with `'value'`.
		expectTypeOf(key).toEqualTypeOf<'missing'>();
		return `missing: ${key.toUpperCase()}`;
	}

	assert.equal(inspect({}, 'value'), 'missing: VALUE');
	assert.equal(inspect({value: 1}, 'value'), 'present: value');
	assert.equal(inspect({}, 'missing'), 'missing: MISSING');
});

test('keyIn() keeps absent index signature keys usable in the false branch', () => {
	function inspect(object: Record<string, number>, key: 'first' | 'second') {
		if (keyIn(object, key)) {
			expectTypeOf(key).toEqualTypeOf<'first' | 'second'>();
			return `present: ${key}`;
		}

		expectTypeOf(key).toEqualTypeOf<'first' | 'second'>();
		return `missing: ${key.toUpperCase()}`;
	}

	assert.equal(inspect({first: 1}, 'first'), 'present: first');
	assert.equal(inspect({first: 1}, 'second'), 'missing: SECOND');
});

test('keyIn() keeps keys absent from one union member usable in the false branch', () => {
	function inspect(object: {first: number} | {second: number}, key: 'first' | 'second') {
		if (keyIn(object, key)) {
			expectTypeOf(key).toEqualTypeOf<'first' | 'second'>();
			return `present: ${key}`;
		}

		expectTypeOf(key).toEqualTypeOf<'first' | 'second'>();
		return `missing: ${key.toUpperCase()}`;
	}

	assert.equal(inspect({first: 1}, 'second'), 'missing: SECOND');
	assert.equal(inspect({second: 2}, 'first'), 'missing: FIRST');
	assert.equal(inspect({first: 1}, 'first'), 'present: first');
});

test('keyIn() preserves widened keys in both branches', () => {
	function inspect(object: Record<string, number>, key: string) {
		if (keyIn(object, key)) {
			expectTypeOf(key).toEqualTypeOf<string>();
			return `present: ${key}`;
		}

		expectTypeOf(key).toEqualTypeOf<string>();
		return `missing: ${key.toUpperCase()}`;
	}

	assert.equal(inspect({first: 1}, 'first'), 'present: first');
	assert.equal(inspect({first: 1}, 'second'), 'missing: SECOND');
});

test('keyIn() preserves keys of opaque objects in both branches', () => {
	function inspect(object: object, key: 'first' | 'second') {
		if (keyIn(object, key)) {
			expectTypeOf(key).toEqualTypeOf<'first' | 'second'>();
			return `present: ${key}`;
		}

		expectTypeOf(key).toEqualTypeOf<'first' | 'second'>();
		return `missing: ${key.toUpperCase()}`;
	}

	assert.equal(inspect({first: 1}, 'first'), 'present: first');
	assert.equal(inspect({first: 1}, 'second'), 'missing: SECOND');
});

test('keyIn() preserves undeclared prototype names in both branches', () => {
	function inspect(object: {value: number}, key: 'toString' | 'missing') {
		if (keyIn(object, key)) {
			expectTypeOf(key).toEqualTypeOf<'toString' | 'missing'>();
			return `present: ${key}`;
		}

		expectTypeOf(key).toEqualTypeOf<'toString' | 'missing'>();
		return `missing: ${key.toUpperCase()}`;
	}

	const withoutPrototype = Object.assign(Object.create(null) as {value: number}, {value: 1});
	assert.equal(inspect(withoutPrototype, 'toString'), 'missing: TOSTRING');
	assert.equal(inspect({value: 1}, 'toString'), 'present: toString');
	assert.equal(inspect({value: 1}, 'missing'), 'missing: MISSING');
});

test('keyIn() narrows required keys shared by every union member', () => {
	function inspect(object: {common: number; first: number} | {common: number; second: number}, key: 'common' | 'missing') {
		if (keyIn(object, key)) {
			expectTypeOf(key).toEqualTypeOf<'common'>();
			return object[key];
		}

		expectTypeOf(key).toEqualTypeOf<'missing'>();
		return key.toUpperCase();
	}

	assert.equal(inspect({common: 1, first: 2}, 'common'), 1);
	assert.equal(inspect({common: 1, second: 2}, 'missing'), 'MISSING');
});

test('keyIn() narrows numeric aliases and unique symbols in both branches', () => {
	const present = Symbol('present');
	const absent = Symbol('absent');

	function inspectNumeric(object: {'1': string}, key: 1 | 2) {
		if (keyIn(object, key)) {
			expectTypeOf(key).toEqualTypeOf<1>();
			return object[key];
		}

		expectTypeOf(key).toEqualTypeOf<2>();
		return key.toString();
	}

	function inspectSymbol(object: {[present]: number}, key: typeof present | typeof absent) {
		if (keyIn(object, key)) {
			expectTypeOf(key).toEqualTypeOf<typeof present>();
			return object[key];
		}

		expectTypeOf(key).toEqualTypeOf<typeof absent>();
		return key.description;
	}

	assert.equal(inspectNumeric({'1': 'one'}, 1), 'one');
	assert.equal(inspectNumeric({'1': 'one'}, 2), '2');
	assert.equal(inspectSymbol({[present]: 1}, present), 1);
	assert.equal(inspectSymbol({[present]: 1}, absent), 'absent');
});

test('keyIn() accepts explicit type arguments and retains generic keys', () => {
	function inspect<Key extends 'first' | 'second'>(object: {first?: number}, key: Key): Key {
		if (keyIn<{first?: number}, Key>(object, key)) {
			const retained: Key = key;
			return retained;
		}

		const retained: Key = key;
		return retained;
	}

	assert.equal(inspect({first: 1}, 'first'), 'first');
	assert.equal(inspect({}, 'second'), 'second');
});

// Type-checks in well under a second. Collecting the keys through `UnionToIntersection` made this call take over 20 seconds.
test('keyIn() type-checks a 1000-member union quickly', () => {
	type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
	type Index = `${Digit}${Digit}${Digit}`;
	type Member = {[I in Index]: {kind: I; shared?: string} & Record<`value${I}`, number>}[Index];

	const object = {kind: '123', value123: 1} as Member;
	const key = 'value123' as `value${Index}`;
	assert.equal(keyIn(object, key), true);
});
