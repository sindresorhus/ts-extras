import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Buffer} from 'node:buffer';
import {expectTypeOf} from 'expect-type';
import {objectFromEntries, objectKeys, objectMapValues} from '../source/index.js';

test('objectMapValues() captures entry values before running callbacks', () => {
	const events: string[] = [];
	const source = {
		get first() {
			events.push('read first');
			return 1;
		},
		get second() {
			events.push('read second');
			return 2;
		},
	};

	const mapped = objectMapValues(source, (value, key) => {
		events.push(`map ${key}`);
		Object.defineProperty(source, 'second', {value: 99});
		return value * 2;
	});

	assert.deepEqual(events, ['read first', 'read second', 'map first', 'map second']);
	assert.deepEqual(mapped, {first: 2, second: 4});
	assert.equal(source.second, 99);
});

test('objectMapValues() maps values with correct types', () => {
	const object = {a: 1, b: 2, c: 3} as const;

	const mapped = objectMapValues(object, value => String(value));

	expectTypeOf(mapped).toEqualTypeOf<{a?: string; b?: string; c?: string}>();
	assert.deepEqual(mapped, {a: '1', b: '2', c: '3'});
});

test('objectMapValues() keeps string indices optional', () => {
	const mapped = objectMapValues('', value => value);

	expectTypeOf(mapped).toEqualTypeOf<Partial<Record<`${number}`, string>>>();
	assert.deepEqual(mapped, {});
});

test('objectMapValues() keeps object result keys conservative with {strict: false}', () => {
	const object = {a: 1, b: 2};

	const mapped = objectMapValues(object, value => value * 2, {strict: false});

	expectTypeOf(mapped).toEqualTypeOf<{a?: number; b?: number}>();
	assert.deepEqual(mapped, {a: 2, b: 4});
});

test('objectMapValues() accepts boolean strict options', () => {
	for (const strict of [true, false]) {
		const mapped = objectMapValues({a: 1}, value => String(value), {strict});
		const expectedMapped: {a?: string} | {a: string} = mapped;

		void expectedMapped;
		assert.deepEqual(mapped, {a: '1'});
	}
});

test('objectMapValues() accepts optional boolean strict options objects', () => {
	const options: {strict?: boolean} = {};
	const mapped = objectMapValues({a: 1}, value => String(value), options);
	const expectedMapped: {a?: string} | {a: string} = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, {a: '1'});
});

test('objectMapValues() provides key to callback', () => {
	const object = {x: 10, y: 20};

	const mapped = objectMapValues(object, (value, key) => `${key}=${value}`);

	expectTypeOf(mapped).toEqualTypeOf<{x?: string; y?: string}>();
	assert.deepEqual(mapped, {x: 'x=10', y: 'y=20'});
});

test('objectMapValues() with mixed value types', () => {
	const object = {name: 'hello', count: 42};

	const mapped = objectMapValues(object, value => typeof value);
	const expectedMapped: {name?: string; count?: string} = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, {name: 'string', count: 'number'});
});

test('objectMapValues() with empty object', () => {
	const object = {} as const;

	const mapped = objectMapValues(object, value => value);

	assert.deepEqual(mapped, {});
});

test('objectMapValues() is conservative about object keys by default', () => {
	const object = {a: 1, b: 2};

	const mapped = objectMapValues(object, value => value * 2);

	expectTypeOf(mapped.a).toEqualTypeOf<number | undefined>();
	expectTypeOf(mapped.b).toEqualTypeOf<number | undefined>();
	assert.deepEqual(mapped, {a: 2, b: 4});
});

test('objectMapValues() preserves optionality', () => {
	const object: {a: number; b?: string} = {a: 1, b: 'hello'};

	const mapped = objectMapValues(object, value => String(value));

	expectTypeOf(mapped).toEqualTypeOf<{a?: string; b?: string}>();
	assert.deepEqual(mapped, {a: '1', b: 'hello'});

	// Missing optional key is not in the result
	const partial: {a: number; b?: string} = {a: 1};
	const mappedPartial = objectMapValues(partial, value => String(value));
	assert.deepEqual(mappedPartial, {a: '1'});
});

test('objectMapValues() callback preserves undefined for optional keys', () => {
	const object = {value: undefined} as {value?: string};

	objectMapValues(object, value => {
		expectTypeOf(value).toEqualTypeOf<string | undefined>();
		return value?.toUpperCase() ?? '';
	});
});

test('objectMapValues() with numeric keys', () => {
	const object = {1: 'a', 2: 'b'} as const;

	const mapped = objectMapValues(object, value => value.toUpperCase());

	expectTypeOf(mapped).toEqualTypeOf<{'1'?: string; '2'?: string}>();
	assert.deepEqual(mapped, {1: 'A', 2: 'B'});
});

test('objectMapValues() excludes symbol keys', () => {
	const symbolKey = Symbol('sym');
	const object: {a: number; [key: symbol]: string} = {a: 1, [symbolKey]: 'hello'};

	const mapped = objectMapValues(object, value => String(value));

	expectTypeOf(mapped).toEqualTypeOf<{a?: string}>();
	assert.deepEqual(mapped, {a: '1'});
});

test('objectMapValues() callback key type is correct', () => {
	const object = {x: 1, y: 2};

	objectMapValues(object, (_value, key) => {
		expectTypeOf(key).toEqualTypeOf<'x' | 'y'>();
		return key;
	});
});

test('objectMapValues() rejects non-existent keys', () => {
	const object = {a: 1, b: 2};
	const mapped = objectMapValues(object, value => value);

	// @ts-expect-error - Key not present
	void mapped.c;
});

test('objectMapValues() with interface', () => {
	interface User {
		name: string;
		age: number;
	}

	const user: User = {name: 'Alice', age: 30};

	const mapped = objectMapValues(user, value => String(value));
	const expectedMapped: Partial<Record<string, string>> = mapped;

	void expectedMapped;
	expectTypeOf(mapped['name']).toEqualTypeOf<string | undefined>();
	expectTypeOf(mapped['age']).toEqualTypeOf<string | undefined>();
	assert.deepEqual(mapped, {name: 'Alice', age: '30'});
});

test('objectMapValues() preserves declared interface result keys in loose mode', () => {
	// Loose mode widens the callback for an interface, but the result still keeps its declared keys.
	interface User {
		name: string;
		age: number;
	}

	const user: User = {name: 'Alice', age: 30};
	const mapped = objectMapValues(user, value => String(value), {strict: false});

	expectTypeOf(mapped).toEqualTypeOf<{name?: string; age?: string}>();
	assert.deepEqual(mapped, {name: 'Alice', age: '30'});
});

test('objectMapValues() returns an empty result for a built-in that keeps its state internally', () => {
	// A `Map` keeps its entries in an internal slot, so `Object.entries()` reports nothing and the callback never runs. The type still promises the callback every declared member, which is the boundary the note in the source names, and `size` is one of the names it does promise.
	const mapped = objectMapValues(new Map([['a', 1]]), value => String(value));

	assert.deepEqual(mapped, {});
	assert.equal(Object.keys(mapped).length, 0);
	expectTypeOf(mapped).toExtend<Partial<Record<string, string>>>();

	// The callback really is reached for nothing, which is what makes the over-promise quiet.
	let called = 0;
	objectMapValues(new Map([['a', 1]]), value => {
		called++;
		return String(value);
	});
	assert.equal(called, 0);

	// `Date` and `Set` are the same, and a plain object beside them is not.
	assert.deepEqual(objectMapValues(new Date(0), value => String(value)), {});
	assert.deepEqual(objectMapValues(new Set([1]), value => String(value)), {});
	assert.deepEqual(objectMapValues({a: 1}, value => String(value)), {a: '1'});
});

test('objectMapValues() preserves callback typing for interface inputs', () => {
	interface User {
		name: string;
		age: number;
	}

	const user: User = {name: 'Alice', age: 30};

	const mapped = objectMapValues(user, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<string | number>();
		expectTypeOf(key).toEqualTypeOf<'name' | 'age'>();
		return `${key}=${String(value)}`;
	});

	assert.deepEqual(mapped, {name: 'name=Alice', age: 'age=30'});
});

test('objectMapValues() ignores the deprecated strict option for interface inputs', () => {
	interface User {
		name: string;
		age: number;
	}

	const user: User = {name: 'Alice', age: 30};

	// `{strict: false}` used to widen this callback to `(value: unknown, key: string)`. It is deprecated and has no effect, so the callback stays precise.
	objectMapValues(user, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<string | number>();
		expectTypeOf(key).toEqualTypeOf<'name' | 'age'>();
		return `${key}=${String(value)}`;
	}, {strict: false});
});

test('objectMapValues() types internal-slot built-ins as an empty record', () => {
	// Regression: a `Date` or `Map` has no own enumerable properties, so listing every prototype member as an optional key only buried the result.
	const date = new Date(0);
	const mapped = objectMapValues(date, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<unknown>();
		expectTypeOf(key).toEqualTypeOf<string>();
		return 1;
	});
	expectTypeOf(mapped).toEqualTypeOf<Partial<Record<string, number>>>();
	assert.deepEqual(mapped, {});

	const map = new Map([['a', 1]]);
	expectTypeOf(objectMapValues(map, () => 1)).toEqualTypeOf<Partial<Record<string, number>>>();
	assert.deepEqual(objectMapValues(map, () => 1), {});
});

test('objectMapValues() callback typing is conservative for class inputs', () => {
	class Example {
		value = 1;

		method(): number {
			return 2;
		}
	}

	objectMapValues(new Example(), (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number | (() => number)>();
		expectTypeOf(key).toEqualTypeOf<'value' | 'method'>();
		return `${key}=${String(value)}`;
	});
});

test('objectMapValues() callback includes own function-valued object properties', () => {
	const object = {
		count: 1,
		fn() {
			return 2;
		},
	};

	objectMapValues(object, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number | (() => number)>();
		expectTypeOf(key).toEqualTypeOf<'count' | 'fn'>();
		return key;
	});
});

test('objectMapValues() does not map prototype methods at runtime', () => {
	const object = new class {
		value = 1;

		method(): void {}
	}();

	const mapped = objectMapValues(object, value => String(value));

	assert.deepEqual(mapped, {value: '1'});
	assert.equal('method' in mapped, false);
});

test('objectMapValues() does not map prototype getters at runtime', () => {
	const object = new class {
		get value(): number {
			return 1;
		}
	}();

	const mapped = objectMapValues(object, value => String(value));

	expectTypeOf(mapped['value']).toEqualTypeOf<string | undefined>();
	assert.deepEqual(mapped, {});
	assert.equal('value' in mapped, false);
});

test('objectMapValues() stays conservative for structurally typed getter aliases', () => {
	const user: {name: string} = new class {
		get name(): string {
			return 'Alice';
		}
	}();

	const mapped = objectMapValues(user, value => String(value));

	expectTypeOf(mapped['name']).toEqualTypeOf<string | undefined>();
	assert.deepEqual(mapped, {});
	assert.equal('name' in mapped, false);
});

test('objectMapValues() stays conservative for structurally typed getter aliases in loose mode', () => {
	const user: {name: string} = new class {
		get name(): string {
			return 'Alice';
		}
	}();

	const mapped = objectMapValues(user, value => String(value), {strict: false});
	expectTypeOf(mapped).toEqualTypeOf<{name?: string}>();

	assert.deepEqual(mapped, {});
	assert.equal('name' in mapped, false);
});

test('objectMapValues() stays conservative for structural method aliases in loose mode', () => {
	const value: {name: string; method(): number} = new class {
		name = 'Alice';

		method(): number {
			return 1;
		}
	}();

	const mapped = objectMapValues(value, entry => String(entry), {strict: false});
	expectTypeOf(mapped).toEqualTypeOf<{name?: string; method?: string}>();

	assert.deepEqual(mapped, {name: 'Alice'});
	assert.equal('method' in mapped, false);
});

test('objectMapValues() keeps plain data-object results conservative in loose mode', () => {
	const user = {name: 'Alice', age: 30};

	const mapped = objectMapValues(user, value => String(value), {strict: false});

	expectTypeOf(mapped).toEqualTypeOf<{name?: string; age?: string}>();
	assert.deepEqual(mapped, {name: 'Alice', age: '30'});
});

test('objectMapValues() does not map writable prototype accessors at runtime', () => {
	class Example {
		get value(): number {
			return 1;
		}

		set value(newValue: number) {
			void newValue;
		}
	}

	const mapped = objectMapValues(new Example(), value => String(value));

	expectTypeOf(mapped['value']).toEqualTypeOf<string | undefined>();
	assert.deepEqual(mapped, {});
	assert.equal('value' in mapped, false);
});

test('objectMapValues() distributes over disjoint union objects', () => {
	for (const object of [{a: 1}, {b: 2}] as Array<{a: 1} | {b: 2}>) {
		objectMapValues(object, (value, key) => {
			expectTypeOf(value).toEqualTypeOf<1 | 2>();
			expectTypeOf(key).toEqualTypeOf<'a' | 'b'>();
			return String(value);
		});

		const mapped = objectMapValues(object, value => String(value));

		expectTypeOf(mapped).toEqualTypeOf<{a?: string} | {b?: string}>();
		assert.ok(('a' in mapped && mapped.a === '1') || ('b' in mapped && mapped.b === '2'));
	}
});

test('objectMapValues() distributes over array or object unions', () => {
	for (const object of [['x'], {a: 1}] as Array<string[] | {a: number}>) {
		objectMapValues(object, (value, key) => {
			expectTypeOf(value).toEqualTypeOf<string | number>();
			expectTypeOf(key).toEqualTypeOf<`${number}` | 'a'>();
			return String(value);
		});

		const mapped = objectMapValues(object, value => String(value));

		const expectedMapped: string[] | {a?: string} = mapped;

		void expectedMapped;
		assert.ok((Array.isArray(mapped) && mapped[0] === 'x') || (!Array.isArray(mapped) && mapped.a === '1'));
	}
});

test('objectMapValues() - array', () => {
	const mapped = objectMapValues([1, 2], value => value * 2);

	expectTypeOf(mapped).toEqualTypeOf<number[]>();
	assert.deepEqual(mapped, [2, 4]);
});

test('objectMapValues() - array callback types', () => {
	objectMapValues([1, 2], (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number>();
		expectTypeOf(key).toEqualTypeOf<`${number}`>();
		return value;
	});
});

test('objectMapValues() - typed arrays use indexed callback typing', () => {
	const array = new Uint8Array([1, 2]);
	const mapped = objectMapValues(array, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number>();
		expectTypeOf(key).toEqualTypeOf<`${number}`>();
		return value + 1;
	});
	const expectedMapped: Partial<Record<number, number>> = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, {0: 2, 1: 3});
});

test('objectMapValues() - Buffer uses indexed callback typing', () => {
	const buffer = Buffer.from([1, 2]);
	const mapped = objectMapValues(buffer, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number>();
		expectTypeOf(key).toEqualTypeOf<`${number}`>();
		return value.toString();
	});
	const expectedMapped: Partial<Record<number, string>> = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, {0: '1', 1: '2'});
});

test('objectMapValues() - array-like objects with extra keys stay on the object path', () => {
	const value: {readonly length: number; readonly [index: number]: string; kind: string} = {0: 'a', length: 1, kind: 'letters'};
	const mapped = objectMapValues(value, (entry, key) => {
		expectTypeOf(entry).toEqualTypeOf<string | number>();
		expectTypeOf(key).toEqualTypeOf<`${number}` | 'length' | 'kind'>();
		return String(entry).toUpperCase();
	});
	const expectedMapped: {0?: string; length?: string; kind?: string} = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, {0: 'A', length: '1', kind: 'LETTERS'});
});

test('objectMapValues() - array treats declared non-index keys as unsupported in the types', () => {
	const array = [1, 2] as number[] & {foo: number};
	array.foo = 3;

	const mapped = objectMapValues(array, value => String(value));

	expectTypeOf(mapped).toEqualTypeOf<string[]>();
	// @ts-expect-error - Named array properties are intentionally not preserved in the typing.
	void mapped.foo;
	assert.deepEqual(mapped, Object.assign(['1', '2'], {foo: '3'}));
	assert.equal((mapped as string[] & {foo: string}).foo, '3');
});

test('objectMapValues() - array subclass own named keys remain unsupported in the types', () => {
	class ExtendedArray extends Array<number> {
		foo = 3;
	}

	const mapped = objectMapValues(new ExtendedArray(1, 2), value => String(value));

	expectTypeOf(mapped).toEqualTypeOf<string[]>();
	// @ts-expect-error - Named array properties are intentionally not preserved in the typing.
	void mapped.foo;
	assert.deepEqual(mapped, Object.assign(['1', '2'], {foo: '3'}));
	assert.equal((mapped as string[] & {foo: string}).foo, '3');
});

test('objectMapValues() - array preserves declared numeric own keys', () => {
	const array = [1] as number[] & {42: string};
	array[42] = 'hello';

	const mapped = objectMapValues(array, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number | string>();
		expectTypeOf(key).toEqualTypeOf<`${number}`>();
		return typeof value === 'number' ? value.toFixed(0) : value.toUpperCase();
	});

	expectTypeOf(mapped[42]).toEqualTypeOf<string | undefined>();
	assert.equal(mapped[0], '1');
	assert.equal(mapped[42], 'HELLO');
});

test('objectMapValues() - array preserves declared negative numeric own keys', () => {
	const array = [1] as number[] & {'-1': string};
	array['-1'] = 'hello';

	const mapped = objectMapValues(array, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number | string>();
		expectTypeOf(key).toEqualTypeOf<`${number}`>();
		return typeof value === 'number' ? value.toFixed(0) : value.toUpperCase();
	});

	expectTypeOf(mapped['-1']).toEqualTypeOf<string | undefined>();
	assert.equal(mapped[0], '1');
	assert.equal(mapped['-1'], 'HELLO');
	assert.equal(mapped.length, 1);
});

test('objectMapValues() maps own function-valued array entries', () => {
	const mapped = objectMapValues([() => 1] as const, value => value());
	const expectedMapped: [number] = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, [1]);
});

test('objectMapValues() handles large tuples without recursive instantiation blowups', () => {
	const mapped = objectMapValues([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49] as const, value => String(value)); // eslint-disable-line @stylistic/max-len -- A 50-element tuple is the point of this test.
	const expectedLast: string = mapped[49];

	void expectedLast;
	assert.equal(mapped[49], '49');
});

test('objectMapValues() preserves variadic tuple shape', () => {
	const tuple = [1, 2] as [1, ...number[]];
	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [string, ...string[]] = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, ['1', '2']);
});

test('objectMapValues() preserves variadic tuple shape with only the required prefix', () => {
	const tuple = [1] as [1, ...number[]];
	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [string, ...string[]] = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, ['1']);
});

test('objectMapValues() preserves variadic tuple shape with a required suffix', () => {
	const tuple = [1, 2, 3] as [1, ...number[], 3];
	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [string, ...string[], string] = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, ['1', '2', '3']);
});

test('objectMapValues() preserves variadic tuple shape with only a required suffix', () => {
	const tuple = [1, 2] as [...number[], 2];
	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [...string[], string] = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, ['1', '2']);
});

test('objectMapValues() preserves variadic tuple non-index keys', () => {
	const tuple = Object.assign([1, 2] as [1, ...number[]], {foo: 3});

	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [string, ...string[]] & {foo?: string} = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, Object.assign(['1', '2'], {foo: '3'}));
	assert.equal(mapped.foo, '3');
});

test('objectMapValues() variadic tuple callback includes named extra keys', () => {
	const tuple = Object.assign([1, 2] as [1, ...number[]], {foo: 'hello'});

	objectMapValues(tuple, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number | string>();
		expectTypeOf(key).toEqualTypeOf<`${number}` | 'foo'>();
		return typeof value === 'number' ? value.toFixed(0) : value.toUpperCase();
	});
});

test('objectMapValues() widens variadic tuples for numeric extra keys', () => {
	const tuple = Object.assign([1, 2] as [1, ...number[]], {'-1': 'hello'});

	const mapped = objectMapValues(tuple, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number | string>();
		expectTypeOf(key).toEqualTypeOf<`${number}`>();
		return typeof value === 'number' ? value.toFixed(0) : value.toUpperCase();
	});
	const expectedMapped: string[] & {'-1'?: string} = mapped;

	void expectedMapped;
	assert.equal(mapped[0], '1');
	assert.equal(mapped[1], '2');
	assert.equal(mapped['-1'], 'HELLO');
	assert.equal(mapped.length, 2);
});

test('objectMapValues() variadic tuple callback includes numeric-like extra keys', () => {
	const tuple = Object.assign([1, 2] as [1, ...number[]], {'-1': 'hello'});

	objectMapValues(tuple, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number | string>();
		expectTypeOf(key).toEqualTypeOf<`${number}`>();
		return typeof value === 'number' ? value.toFixed(0) : value.toUpperCase();
	});
});

test('objectMapValues() preserves required variadic tuple prefix elements that may include undefined', () => {
	const tuple = [undefined, 2] as [string | undefined, ...number[]];
	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [string, ...string[]] = mapped;

	void expectedMapped;
	expectTypeOf(mapped[0]).toBeString();
	assert.deepEqual(mapped, ['undefined', '2']);
});

test('objectMapValues() - array subclass produces a plain Array, not a subclass instance', () => {
	class ExtendedArray extends Array<number> {}

	const mapped = objectMapValues(new ExtendedArray(1, 2), value => String(value));

	assert.ok(Array.isArray(mapped));
	assert.equal(mapped instanceof ExtendedArray, false);
	assert.equal(Object.getPrototypeOf(mapped), Array.prototype);
	assert.deepEqual(mapped, ['1', '2']);
});

test('objectMapValues() does not map array subclass prototype accessors at runtime', () => {
	class ExtendedArray extends Array<number> {
		get value(): number {
			return 3;
		}
	}

	const array = new ExtendedArray(1, 2);
	const mapped = objectMapValues(array, value => String(value));

	expectTypeOf(mapped).toEqualTypeOf<string[]>();
	// @ts-expect-error - Subclass prototype properties are intentionally not reflected in the typing.
	void mapped.value;
	assert.deepEqual(mapped, ['1', '2']);
	assert.equal((mapped as unknown as {value?: string}).value, undefined);
});

test('objectMapValues() compacts sparse arrays like Object.entries()', () => {
	const array = Array(3);
	const mapped = objectMapValues(array, value => value);

	assert.equal(mapped.length, 0);
	assert.deepEqual(Object.keys(mapped), []);
	assert.equal(0 in mapped, false);
	assert.equal(2 in mapped, false);
});

test('objectMapValues() drops trailing sparse array holes', () => {
	const array = [1, , ,] as number[];
	const mapped = objectMapValues(array, value => value * 2);

	assert.equal(mapped.length, 1);
	assert.deepEqual(mapped, [2]);
	assert.equal(1 in mapped, false);
	assert.equal(2 in mapped, false);
});

test('objectMapValues() - tuple', () => {
	const mapped = objectMapValues([1, 'a'] as const, value => String(value));
	const expectedMapped: [string, string] = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, ['1', 'a']);
});

test('objectMapValues() - optional tuple preserves trailing optional element', () => {
	const tuple = [1, 2] as [1, 2?];
	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [string, string?] = mapped;
	const expectedLength: 1 | 2 = mapped.length;

	// A present slot holds the callback's result, so it is never `undefined`. The shorter member covers the absent slot.
	expectTypeOf(mapped).toEqualTypeOf<[string] | [string, string]>();

	void expectedMapped;
	void expectedLength;
	assert.deepEqual(mapped, ['1', '2']);
	assert.equal(mapped.length, 2);
});

test('objectMapValues() - required tuple elements may include undefined without widening the result slot', () => {
	const tuple = ['a'] as [string | undefined];
	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [string] = mapped;

	void expectedMapped;
	expectTypeOf(mapped[0]).toBeString();
	assert.deepEqual(mapped, ['a']);
});

test('objectMapValues() - required undefined tuple elements do not widen the result slot', () => {
	const mapped = objectMapValues([undefined] as const, value => String(value));
	const expectedMapped: [string] = mapped;

	void expectedMapped;
	expectTypeOf(mapped[0]).toBeString();
	assert.deepEqual(mapped, ['undefined']);
});

test('objectMapValues() - sparse tuple', () => {
	// A hole in a tuple literal is typed as a required slot holding `undefined`, so it cannot be told apart from an explicit `undefined` element. The result therefore types the hole as a present string, while the runtime keeps it as a hole. This is a documented boundary.
	const mapped = objectMapValues([1, , 3] as const, value => String(value));

	expectTypeOf(mapped[0]).toEqualTypeOf<string>();
	expectTypeOf(mapped[1]).toEqualTypeOf<string>();
	expectTypeOf(mapped[2]).toEqualTypeOf<string>();

	assert.deepEqual(mapped, ['1', , '3']);
	assert.equal(1 in mapped, false);
	assert.equal(mapped[1], undefined);
});

test('objectMapValues() - tuple callback types', () => {
	objectMapValues([1, 'a'] as const, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<1 | 'a'>();
		expectTypeOf(key).toEqualTypeOf<'0' | '1'>();
		return value;
	});
});

test('objectMapValues() - tuple preserves declared non-index keys', () => {
	const tuple = [1, 2] as [1, 2] & {foo: number};
	tuple.foo = 3;

	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [string, string] & {foo?: string} = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, Object.assign(['1', '2'], {foo: '3'}));
	assert.equal(mapped.length, 2);
	assert.equal(mapped.foo, '3');
});

test('objectMapValues() - tuple extra keys stay optional when non-enumerable', () => {
	const tuple = [1, 2] as [1, 2] & {foo: number};
	Object.defineProperty(tuple, 'foo', {
		value: 3,
		enumerable: false,
		configurable: true,
		writable: true,
	});

	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [string, string] & {foo?: string} = mapped;

	void expectedMapped;
	expectTypeOf(mapped.foo).toEqualTypeOf<string | undefined>();
	assert.deepEqual(mapped, ['1', '2']);
	assert.equal('foo' in mapped, false);
});

test('objectMapValues() - runtime still maps unsupported Array member-name shadows', () => {
	const tuple = Object.assign([1, 2] as [1, 2], {map: Array.prototype.map});

	const mapped = objectMapValues(tuple, value => typeof value);

	assert.deepEqual(mapped, Object.assign(['number', 'number'], {map: 'function'}));
	assert.equal(typeof (mapped as [string, string] & {map: string}).map, 'string');
});

test('objectMapValues() - runtime still maps unsupported mutable Array member-name shadows', () => {
	const tuple = Object.assign([1, 2] as [1, 2], {sort: 'hello', fill: 'world', copyWithin: 'again'});

	const mapped = objectMapValues(tuple, value => String(value));

	assert.deepEqual(mapped, Object.assign(['1', '2'], {sort: 'hello', fill: 'world', copyWithin: 'again'}));
	assert.equal(mapped.length, 2);
	assert.equal((mapped as string[] & {sort: string}).sort, 'hello');
	assert.equal((mapped as string[] & {fill: string}).fill, 'world');
	assert.equal((mapped as string[] & {copyWithin: string}).copyWithin, 'again');
});

test('objectMapValues() - tuple widens for negative numeric extra keys', () => {
	const tuple = [1] as [1] & {'-1': string};
	tuple['-1'] = 'hello';

	const mapped = objectMapValues(tuple, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<1 | string>();
		expectTypeOf(key).toEqualTypeOf<'0' | '-1'>();
		return typeof value === 'number' ? value.toFixed(0) : value.toUpperCase();
	});
	const expectedMapped: string[] & {'-1'?: string} = mapped;
	const expectedLength: number = mapped.length;

	void expectedMapped;
	void expectedLength;
	expectTypeOf(mapped['-1']).toEqualTypeOf<string | undefined>();
	assert.equal(mapped[0], '1');
	assert.equal(mapped['-1'], 'HELLO');
	assert.equal(mapped.length, 1);
});

test('objectMapValues() - tuple widens when numeric extra keys grow the array length', () => {
	const tuple = [1] as [1] & {42: string};
	tuple[42] = 'hello';

	const mapped = objectMapValues(tuple, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<1 | string>();
		expectTypeOf(key).toEqualTypeOf<'0' | '42'>();
		return typeof value === 'number' ? value.toFixed(0) : value.toUpperCase();
	});
	const expectedMapped: string[] & {'42'?: string} = mapped;
	const expectedLength: number = mapped.length;

	void expectedMapped;
	void expectedLength;
	// @ts-expect-error - Growing numeric keys widen fixed tuples away from an exact length.
	const exactLength: 1 = mapped.length;

	void exactLength;
	expectTypeOf(mapped[42]).toEqualTypeOf<string | undefined>();
	assert.equal(mapped[0], '1');
	assert.equal(mapped[42], 'HELLO');
	assert.equal(mapped.length, 43);
});

test('objectMapValues() - tuple widens for numeric-looking string keys with leading zeroes', () => {
	const tuple = [1] as [1] & {'01': string};
	tuple['01'] = 'hello';

	const mapped = objectMapValues(tuple, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<1 | string>();
		expectTypeOf(key).toEqualTypeOf<'0' | '01'>();
		return typeof value === 'number' ? value.toFixed(0) : value.toUpperCase();
	});
	const expectedMapped: string[] & {'01'?: string} = mapped;
	const expectedLength: number = mapped.length;

	void expectedMapped;
	void expectedLength;
	assert.equal(mapped[0], '1');
	assert.equal(mapped['01'], 'HELLO');
	assert.equal(mapped.length, 1);
});

test('objectMapValues() - tuple widens for decimal numeric extra keys', () => {
	const tuple = [1] as [1] & {'1.5': string};
	tuple['1.5'] = 'hello';

	const mapped = objectMapValues(tuple, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<1 | string>();
		expectTypeOf(key).toEqualTypeOf<'0' | '1.5'>();
		return typeof value === 'number' ? value.toFixed(0) : value.toUpperCase();
	});
	const expectedMapped: string[] & {'1.5'?: string} = mapped;
	const expectedLength: number = mapped.length;

	void expectedMapped;
	void expectedLength;
	assert.equal(mapped[0], '1');
	assert.equal(mapped['1.5'], 'HELLO');
	assert.equal(mapped.length, 1);
});

test('objectMapValues() keeps "__proto__" as a data property', () => {
	const object = JSON.parse('{"__proto__":{"polluted":true},"safe":1}') as Record<string, unknown>;
	const mapped = objectMapValues(object, value => value);

	const protoPropertyDescriptor = Object.getOwnPropertyDescriptor(mapped, '__proto__');

	assert.equal(Object.getPrototypeOf(mapped), Object.prototype);
	assert.deepEqual(protoPropertyDescriptor?.value, {polluted: true});
	assert.equal(mapped['safe'], 1);
	assert.equal((mapped as Record<string, unknown>)['polluted'], undefined);
});

test('objectMapValues() returns a new object', () => {
	const object = {a: 1, b: 2};
	const mapped = objectMapValues(object, value => value);

	assert.notEqual(mapped, object);
});

test('objectMapValues() skips non-enumerable own properties', () => {
	const object = Object.defineProperty({a: 1}, 'hidden', {
		value: 99,
		enumerable: false,
		configurable: true,
		writable: true,
	});
	const mapped = objectMapValues(object as {a: number}, value => String(value));

	expectTypeOf(mapped.a).toEqualTypeOf<string | undefined>();
	assert.deepEqual(mapped, {a: '1'});
	assert.equal('hidden' in mapped, false);
});

test('objectMapValues() with Record<string, T>', () => {
	const object: Record<string, number> = {a: 1, b: 2};
	const mapped = objectMapValues(object, value => String(value));

	expectTypeOf(mapped).toEqualTypeOf<Record<string, string | undefined>>();
	assert.deepEqual(mapped, {a: '1', b: '2'});
});

test('objectMapValues() keeps index signatures partial in loose mode', () => {
	const object: Record<string, number> = {a: 1, b: 2};
	const mapped = objectMapValues(object, value => String(value), {strict: false});
	const expectedMapped: Record<string, string | undefined> = mapped;

	void expectedMapped;
	expectTypeOf(mapped['missingKey']).toEqualTypeOf<string | undefined>();
	assert.deepEqual(mapped, {a: '1', b: '2'});
});

test('objectMapValues() preserves null prototypes', () => {
	const object = Object.assign(Object.create(null) as Record<string, number>, {safe: 1});
	const mapped = objectMapValues(object, value => String(value));

	assert.equal(Object.getPrototypeOf(mapped), null);
	assert.equal(mapped['safe'], '1');
	assert.equal('toString' in mapped, false);
});

test('objectMapValues() matches the documented example', () => {
	// Mirrors the `@example` block in `source/object-map-values.ts` so it cannot drift.
	const object = {a: 1, b: 2, c: 3} as const;

	const mapped = objectMapValues(object, value => String(value));
	expectTypeOf(mapped).toEqualTypeOf<{a?: string; b?: string; c?: string}>();

	const withKeys = objectMapValues(object, (value, key) => {
		value satisfies 1 | 2 | 3;
		key satisfies 'a' | 'b' | 'c';
		return String(value);
	});

	expectTypeOf(withKeys).toEqualTypeOf<{a?: string; b?: string; c?: string}>();
	assert.deepEqual(withKeys, {a: '1', b: '2', c: '3'});

	// `{strict: false}` is accepted and changes nothing, which the note in the source says.
	expectTypeOf(objectMapValues(object, value => String(value), {strict: false})).toEqualTypeOf(mapped);
});

test('objectMapValues() tolerates a value whose prototype cannot be read', () => {
	// Deciding between `{}` and a null-prototype result needs the prototype, but `Object.entries()` never reads it, so a proxy that refuses to hand it over must not make this function throw.
	const hostile = new Proxy({a: 1}, {
		getPrototypeOf() {
			throw new Error('getPrototypeOf trap fired');
		},
	});

	const mapped = objectMapValues(hostile, String);

	assert.deepEqual(mapped, {a: '1'});
	assert.equal(Object.getPrototypeOf(mapped), Object.prototype);
});

test('objectMapValues() - a tuple intersected with a re-declared element key', () => {
	// `[1, 2] & {0: number}` is still an array at runtime, but TypeScript stops treating the mapped result as a tuple, so it is typed as an array rather than a plain object with a numeric index and a `length` typed as the mapped value. `Object.assign` writes index 0, so the runtime result is `['10', '2']`.
	const tuple = Object.assign([1, 2] as [1, 2], {0: 10});
	const mapped = objectMapValues(tuple, value => String(value));

	expectTypeOf(mapped).toEqualTypeOf<string[]>();
	expectTypeOf(mapped.length).toEqualTypeOf<number>();
	assert.deepEqual(mapped, ['10', '2']);

	// The control, without the intersection, still keeps the tuple shape.
	const control = objectMapValues([1, 2] as [1, 2], value => String(value));
	expectTypeOf(control).toEqualTypeOf<[string, string]>();
	expectTypeOf(control.length).toEqualTypeOf<2>();
});

test('objectMapValues() - a shadowing named key is missing from the callback value type', () => {
	// Documented boundary: the key is dropped from the result and from the callback's value type. The runtime still passes it to the callback, so the callback has to treat an unexpected value as possible.
	const tuple = Object.assign([1, 2] as [1, 2], {sort: 'hello'});
	const seen: string[] = [];

	const mapped = objectMapValues(tuple, value => {
		expectTypeOf(value).toEqualTypeOf<1 | 2>();
		const asString = String;
		seen.push(asString(value));
		return asString(value);
	});

	// The callback really is handed the shadowing value, and the result really is an array.
	assert.deepEqual(seen, ['1', '2', 'hello']);
	assert.equal(Array.isArray(mapped), true);
	assert.equal((mapped as unknown as {sort: string}).sort, 'hello');
});

test('objectMapValues() - a bare ArrayBufferView is not never', () => {
	// A value typed as `ArrayBufferView` is some typed array at runtime, so the callback receives numbers or bigints. The callback's value is typed that way and not as `never`, which would make the callback unusable without a cast.
	const view = new Float64Array([1.5, 2.5]) as ArrayBufferView;
	const seen: number[] = [];

	const mapped = objectMapValues(view, value => {
		expectTypeOf(value).toEqualTypeOf<number | bigint>();
		seen.push(Number(value));
		return String(value);
	});

	assert.deepEqual(seen, [1.5, 2.5]);
	assert.deepEqual(mapped, {0: '1.5', 1: '2.5'});
});

test('objectMapValues() narrows an interface as precisely as a type alias', () => {
	// An interface has no implicit index signature, but the callback and the result are as precise as for the identical type written as an alias, and as in all three sibling functions, rather than `(unknown, string)` and `Partial<Record<string, string>>`.
	interface AsInterface {
		name: string;
		age: number;
	}

	type AsAlias = {name: string; age: number};

	const viaInterface: AsInterface = {name: 'Alice', age: 30};
	const viaAlias: AsAlias = {name: 'Alice', age: 30};

	// `Simplify` keeps this result from comparing equal to the plain shape, so the shape is checked structurally instead.
	const fromInterface: {name?: string | number; age?: string | number} = objectMapValues(viaInterface, value => value);
	const fromAlias: {name?: string | number; age?: string | number} = objectMapValues(viaAlias, value => value);

	void fromInterface;
	void fromAlias;
	assert.deepEqual(fromInterface, {name: 'Alice', age: 30});
	assert.deepEqual(fromAlias, {name: 'Alice', age: 30});
});

test('objectMapValues() narrows a class instance', () => {
	class Point {
		x = 1;
		y = 2;
	}

	const mapped = objectMapValues(new Point(), (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number>();
		expectTypeOf(key).toEqualTypeOf<'x' | 'y'>();
		return value;
	});

	expectTypeOf(mapped).toEqualTypeOf<{x?: number; y?: number}>();
	assert.deepEqual(mapped, {x: 1, y: 2});
});

test('objectMapValues() is not poisoned by one non-record member of a union', () => {
	// A `DataView` member must not widen the whole union's callback to `unknown`, which would absorb the other members.
	const union: {a: number} | number[] | DataView = [1];
	const mapped = objectMapValues(union, value => {
		expectTypeOf(value).toEqualTypeOf<number>();
		return value;
	});

	assert.deepEqual(mapped, [1]);
});

test('objectMapValues() keeps a numeric index signature numeric', () => {
	// A numeric index signature is not remapped to `{[x: `${number}`]: …}`, which cannot be indexed by a number. Every sibling path produces an indexable result too: an array gives `NewValue[]` and a typed array gives `Partial<Record<number, NewValue>>`.
	const object: {[index: number]: string} = {0: 'a', 1: 'b'};
	const mapped = objectMapValues(object, value => value.toUpperCase());
	expectTypeOf(mapped[0]).toEqualTypeOf<string | undefined>();
	expectTypeOf(mapped[1]).toEqualTypeOf<string | undefined>();
	assert.deepEqual(mapped, {0: 'A', 1: 'B'});

	// A record is the same shape written as a mapped type.
	const record: Record<number, number> = {0: 1};
	const mappedRecord = objectMapValues(record, value => value * 2);
	expectTypeOf(mappedRecord[0]).toEqualTypeOf<number | undefined>();
	assert.deepEqual(mappedRecord, {0: 2});

	// An object with both a numeric index signature and named keys keeps both.
	const mixed: {[index: number]: string; label: string} = {0: 'a', label: 'x'};
	const mappedMixed = objectMapValues(mixed, value => value);
	expectTypeOf(mappedMixed[0]).toEqualTypeOf<string | undefined>();
	expectTypeOf(mappedMixed.label).toEqualTypeOf<string | undefined>();
	assert.deepEqual(mappedMixed, {0: 'a', label: 'x'});
});

// A value typed as `Function`, whose built-in names are all on `Function.prototype`. The value does not exist, so this is a type-only check. `declare const` cannot live inside a function body.
declare const anyFunction: Function;

test('objectMapValues() does not promise prototype members as callback keys for a function', () => {
	// A function's own properties are `length`, `name` and `prototype`, none of which are enumerable, and every other member of the `Function` interface is on `Function.prototype`, so the callback is promised none of those names. A function type has no reportable own keys, so its key falls back to the broad `string`, the same as an internal-slot built-in. At runtime the callback is handed only what was added to the function, like `'extra'` and `'other'` below, and its `value` is not `any`, so the code inside is checked.
	if (false) {
		const mapped = objectMapValues(anyFunction, (value, key) => {
			expectTypeOf(key).toEqualTypeOf<string>();
			expectTypeOf(value).toEqualTypeOf<never>();
			return 'mapped';
		});
		expectTypeOf(mapped).toEqualTypeOf<Partial<Record<string, string>>>();
	}

	// A function type that declares its own key keeps it, and its value type is not `any`.
	const typed = Object.assign((a: number) => a, {extra: 1});
	const typedResult = objectMapValues(typed, (value, key) => {
		expectTypeOf(key).toEqualTypeOf<'extra'>();
		expectTypeOf(value).toEqualTypeOf<number>();
		return value * 2;
	});
	expectTypeOf(typedResult).toEqualTypeOf<{extra?: number}>();
	assert.deepEqual(typedResult, {extra: 2});

	// The runtime only ever reports what was added to the function.
	const added = Object.assign(function () {}, {extra: 1, other: 'x'});
	const reported: Array<[string, unknown]> = [];
	objectMapValues(added, (value, key) => {
		reported.push([key, value]);
		return value;
	});
	assert.deepEqual(reported, [['extra', 1], ['other', 'x']]);
});

test('objectMapValues() preserves null prototypes and uses ordinary objects otherwise', () => {
	// A null-prototype source produces a null-prototype result, so `instanceof` and the inherited methods are unavailable on it, exactly as on the source.
	const bare = Object.assign(Object.create(null), {a: 1});
	const mapped = objectMapValues(bare, value => value * 2);

	assert.equal(Object.getPrototypeOf(mapped), null);
	assert.deepEqual(Object.keys(mapped), ['a']);

	// An ordinary source produces an ordinary object.
	const plain = objectMapValues({a: 1}, value => value * 2);
	assert.equal(Object.getPrototypeOf(plain), Object.prototype);
	assert.deepEqual(plain, {a: 2});

	const inherited = Object.assign(Object.create({inherited: true}) as {a: number}, {a: 1});
	const fromCustomPrototype = objectMapValues(inherited, value => value * 2);
	assert.equal(Object.getPrototypeOf(fromCustomPrototype), Object.prototype);
	assert.deepEqual(fromCustomPrototype, {a: 2});
	assert.equal('inherited' in fromCustomPrototype, false);

	// A proxy that refuses to hand over its prototype must not make this throw.
	const {proxy, revoke} = Proxy.revocable({a: 1}, {
		getPrototypeOf() {
			throw new Error('nope');
		},
	});
	const fromProxy = objectMapValues(proxy, value => value * 2);
	assert.equal(Object.getPrototypeOf(fromProxy), Object.prototype);
	assert.deepEqual(fromProxy, {a: 2});
	revoke();
});

test('objectMapValues() follows Object.entries for what it visits', () => {
	// Symbol keys, non-enumerable own properties, prototype-chain properties and internal slots are all invisible to `Object.entries()`, so they are invisible here too.
	const key = Symbol('hidden');
	const source = Object.create({inherited: 'no'}) as Record<string | symbol, unknown>;
	source['own'] = 'yes';
	source[key] = 'no';
	Object.defineProperty(source, 'nonEnumerable', {value: 'no', enumerable: false});

	const visited: Array<[string, unknown]> = [];
	const mapped = objectMapValues(source, (value, visitedKey) => {
		visited.push([visitedKey, value]);
		return value;
	});

	assert.deepEqual(visited, [['own', 'yes']]);
	assert.deepEqual(mapped, {own: 'yes'});

	// A built-in that keeps its state in an internal slot has no own enumerable properties, so the callback is never invoked at all.
	for (const empty of [new Date(), new Map(), new Set(), /x/gv, new Error('x'), new DataView(new ArrayBuffer(8))]) {
		let called = false;
		const result = objectMapValues(empty, value => {
			called = true;
			return value;
		});
		assert.equal(called, false);
		assert.deepEqual(result, {});
	}
});

test('objectMapValues() - a plain object with the view properties is not a typed array', () => {
	// `ArrayBufferView` is just `{buffer, byteLength, byteOffset}`, so any object with those three matches it. Such an object must not take the indexed path, where the callback is promised a number and is handed an `ArrayBuffer`. The full typed-array type required by `IndexedCollection` separates a real view from an ordinary object with buffer metadata.
	type Header = {buffer: ArrayBuffer; byteLength: number; byteOffset: number};
	const header: Header = {buffer: new ArrayBuffer(8), byteLength: 8, byteOffset: 0};

	const mapped = objectMapValues(header, value => value.toString());
	expectTypeOf(mapped).toEqualTypeOf<{buffer?: string; byteLength?: string; byteOffset?: string}>();
	assert.deepEqual(Object.keys(mapped), ['buffer', 'byteLength', 'byteOffset']);

	objectMapValues(header, (value, key) => {
		expectTypeOf(key).toEqualTypeOf<'buffer' | 'byteLength' | 'byteOffset'>();
		expectTypeOf(value).toEqualTypeOf<ArrayBuffer | number>();
		return value;
	});

	// A real typed array still takes the indexed path.
	const bytes = new Uint8Array([1, 2]);
	objectMapValues(bytes, (value, key) => {
		expectTypeOf(key).toEqualTypeOf<`${number}`>();
		expectTypeOf(value).toEqualTypeOf<number>();
		return value;
	});
	assert.deepEqual(objectMapValues(bytes, value => value * 2), {0: 2, 1: 4});
});

test('objectMapValues() types a plain array result as a plain array', () => {
	// A non-tuple array has no own keys beyond its indices, so the result is a clean array type with no meaningless `& {}`, which is not the same type to a strict comparison. Every sibling path answers a clean type too.
	expectTypeOf(objectMapValues([1, 2], value => String(value))).toEqualTypeOf<string[]>();
	expectTypeOf(objectMapValues(['a', 'b'] as string[], value => value)).toEqualTypeOf<string[]>();

	// A numeric-looking own key on a non-tuple is still kept, as an optional property. Asserting the whole result rather than a read of it, because an index signature answers the read either way and would not show the declared key at all.
	const indexed = Object.assign([1, 2], {3: 9});
	const mapped = objectMapValues(indexed, value => value);
	expectTypeOf(mapped).toEqualTypeOf<number[] & {3?: number}>();
	assert.deepEqual(Object.keys(mapped).toSorted(), ['0', '1', '3']);

	// A fixed tuple and an object are unaffected.
	expectTypeOf(objectMapValues([1, 2] as const, value => String(value))).toEqualTypeOf<[string, string]>();
	expectTypeOf(objectMapValues({x: 1}, value => String(value))).toEqualTypeOf<{x?: string | undefined}>();
});

test('objectMapValues() does not leave an empty intersection in a tuple result', () => {
	// A symbol index signature is an "extra key" that remaps to nothing, since `Object.entries()` never reports a symbol key. The result must not carry a bare `& {}` from that empty mapped type, which is not even the same type to a strict comparison.
	const tuple = [1, 2] as [1, 2] & {[key: symbol]: string};
	const mapped = objectMapValues(tuple, value => String(value));

	expectTypeOf(mapped).toEqualTypeOf<[string, string]>();
	assert.deepEqual(mapped, ['1', '2']);
	assert.deepEqual(Object.getOwnPropertySymbols(mapped), []);
});

test('objectMapValues() gives the same result as the map form it replaces', () => {
	// This and the `objectFromEntries(objectKeys(obj).map(…))` form both produce optional keys. What this one adds is that the callback's `value` is typed against the object's own keys.
	const object: {count: number; label: string} = {count: 1, label: 'x'};

	const mapped = objectMapValues(object, value => String(value));
	const viaMap = objectFromEntries(objectKeys(object).map(key => [key, String(object[key])] as const));

	expectTypeOf(mapped).toEqualTypeOf<{count?: string | undefined; label?: string | undefined}>();
	expectTypeOf(mapped).toEqualTypeOf<typeof viaMap>();
	assert.deepEqual(mapped, {count: '1', label: 'x'});
	assert.deepEqual(viaMap, mapped);

	// The `key` is a separate parameter, so narrowing it does not narrow the value.
	if (false) {
		// @ts-expect-error - `value` is `string | number` whatever `key` is narrowed to.
		objectMapValues(object, (value, key) => (key === 'count' ? value.toFixed(0) : value));
	}
});

test('objectMapValues() takes a primitive string the way the builtin does', () => {
	// `Object.entries()` reports a string's characters at their indices, and the result is the plain object the object path already builds.
	const seen: Array<[string, string]> = [];
	const mapped = objectMapValues('ab', (value, key) => {
		seen.push([key, value]);
		return value.toUpperCase();
	});

	expectTypeOf(mapped).toEqualTypeOf<Partial<Record<`${number}`, string>>>();
	assert.deepEqual(seen, [['0', 'a'], ['1', 'b']]);
	assert.deepEqual(mapped, {0: 'A', 1: 'B'});
	assert.deepEqual(objectMapValues('', value => value), {});
});

test('objectMapValues() leaves the string callback as unconstrained as the object one', () => {
	// The object overload puts no constraint on the callback's return, and neither does the builtin, so a string argument must not either. The option is accepted for the same reason it is there.
	const lengths = objectMapValues('ab', value => value.length);
	expectTypeOf(lengths).toEqualTypeOf<Partial<Record<`${number}`, number>>>();
	assert.deepEqual(lengths, {0: 1, 1: 1});

	const mixed = objectMapValues('ab', value => (value === 'a' ? 1 : 'x'));
	expectTypeOf(mixed).toEqualTypeOf<Partial<Record<`${number}`, 1 | 'x'>>>();

	assert.deepEqual(objectMapValues('ab', value => value, {strict: false}), {0: 'a', 1: 'b'});
});

test('objectMapValues() reports a class member that keyof cannot see', () => {
	// The note in the source says a `private` or `protected` member is invisible to `keyof`, so it is missing from the callback's value type, while `Object.entries()` still reports it as an own property. A `#private` field is not an own property and never appears. A value typed as a supertype of what it really holds has the same problem, since a `Base` can be a `Derived` with more own properties.
	/* eslint-disable unicorn/prefer-class-fields -- The rule wants a class field for a static assignment, and a literal-valued field invites a getter, which is a prototype accessor. Own data properties are the whole subject here. */
	// Assigned in the constructor rather than initialised inline, because a class field here would want a getter, and a getter is a prototype accessor rather than the own data property this test is about.
	class Source {
		readonly #secret = 'hidden';
		readonly visible: number;
		private readonly written: number;
		protected readonly guarded: number;

		constructor() {
			this.visible = 1;
			this.written = 2;
			this.guarded = 3;
		}

		readSecret(): string {
			return this.#secret;
		}

		readWritten(): number {
			return this.written;
		}

		readGuarded(): number {
			return this.guarded;
		}
	}

	const seen: unknown[] = [];
	const mapped = objectMapValues(new Source() as unknown as Record<string, unknown>, value => {
		seen.push(value);
		return value;
	});

	assert.deepEqual(seen.toSorted((a, b) => Number(a) - Number(b)), [1, 2, 3], 'every own enumerable member reaches the callback, the private ones included');
	assert.deepEqual({...mapped}, {visible: 1, written: 2, guarded: 3}, 'and all of them are in the result');
	assert.equal(Object.hasOwn(mapped, '#secret'), false, 'a #private field is not an own property and is not reported');

	// A value typed as a supertype of what it really holds has the same gap, for the same reason.
	class Base {
		readonly base: number;

		constructor() {
			this.base = 1;
		}
	}

	class Derived extends Base {
		readonly extra: number;

		constructor() {
			super();
			this.extra = 2;
		}
	}

	const typedAsBase: Base = new Derived();
	const fromSupertype = objectMapValues(typedAsBase, value => value);

	assert.deepEqual({...fromSupertype}, {base: 1, extra: 2}, 'the runtime reports the derived own property');
	assert.equal(Object.hasOwn(fromSupertype, 'extra'), true, 'which the result type does not name');
	/* eslint-enable unicorn/prefer-class-fields -- Ends the disable above. */
});

test('objectMapValues() types the callback value through the constraint of a generic object', () => {
	function double<Type extends Record<string, number>>(object: Type) {
		return objectMapValues(object, value => value * 2);
	}

	function sum<Type extends {a: number; b: number}>(object: Type) {
		return objectMapValues(object, value => value + 1, {strict: false});
	}

	assert.deepEqual({...double({a: 1, b: 2})}, {a: 2, b: 4});
	assert.deepEqual({...sum({a: 1, b: 2})}, {a: 2, b: 3});
});

test('objectMapValues() types the callback broadly for a keyless object type', () => {
	// The value you get from the common `typeof data === 'object' && data !== null` check has no known keys. The key falls back to `string` instead of `never`, which would unsoundly accept any value for it, and the result is the built-in fallback shape instead of `{}`, which would hide the mapped values.
	const value: object = {a: 1};
	const mapped = objectMapValues(value, (item, key) => {
		expectTypeOf(item).toEqualTypeOf<unknown>();
		expectTypeOf(key).toEqualTypeOf<string>();
		return String(item);
	});
	expectTypeOf(mapped).toEqualTypeOf<Partial<Record<string, string>>>();
	assert.deepEqual({...mapped}, {a: '1'});

	const empty: {} = {a: 1};
	objectMapValues(empty, (item, key) => {
		expectTypeOf(item).toEqualTypeOf<unknown>();
		expectTypeOf(key).toEqualTypeOf<string>();
		return 1;
	});
});
