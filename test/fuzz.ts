/* eslint-disable no-bitwise, unicorn/numeric-separators-style, @stylistic/array-element-newline, @stylistic/function-call-argument-newline, @stylistic/object-curly-newline, unicorn/no-nested-ternary, unicorn/prefer-global-number-constants, unicorn/prefer-spread -- A test harness for a runtime library: the PRNG needs bitwise operators, the casts mirror the library's own loose signatures, the comparisons are deliberately native calls, and one loop walks every helper. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Buffer} from 'node:buffer';
import {isDeepStrictEqual} from 'node:util';
import {
	arrayConcat,
	isInfinite,
	isPropertyDefined,
	isPropertyPresent,
	keyIn,
	objectAssign,
	objectHasIn,
	objectHasOwn,
	objectMapValues,
	objectUpdate,
	stringSplit,
} from '../source/index.js';

// A seeded generative fuzz. The hand-written suites cover the cases I thought of; this walks combinations of them that I did not. The seed is fixed so a failure is reproducible.

let seed = 0x2F6E2B1;
function random(): number {
	seed ^= seed << 13;
	seed ^= seed >>> 17;
	seed ^= seed << 5;
	seed >>>= 0;
	return seed / 0x1_00_00_00_00;
}

function pick<Value>(values: readonly Value[]): Value {
	return values[Math.floor(random() * values.length)]!;
}

const scalars: unknown[] = [
	undefined, null, 0, -0, 1, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
	Number.MAX_SAFE_INTEGER, 2 ** 53, '', 'a', 'b', '1', true, false, 10n, Symbol.for('fuzz'),
];

const keyNames = ['a', 'b', 'c', '0', '1', '2', 'length', 'toString', 'constructor', 'label'];

function isObjectLike(value: unknown): boolean {
	return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

function randomObject(depth: number): Record<string, unknown> {
	const object: Record<string, unknown> = {};

	for (let index = 0, count = Math.floor(random() * 4); index < count; index++) {
		object[pick(keyNames)] = depth > 0 && random() < 0.2 ? randomObject(depth - 1) : pick(scalars);
	}

	return object;
}

// Shapes the plain object walk cannot produce on its own, so the comparison has something to say.
class Fuzz {
	readonly id = 1;
}

function randomArray(): unknown[] {
	const array: unknown[] = [];
	array.length = Math.floor(random() * 4);

	for (let index = 0; index < array.length; index++) {
		// A skipped index leaves a hole, which is a different `Object.entries()` walk.
		if (random() >= 0.2) {
			array[index] = random() < 0.2 ? randomObject(1) : pick(scalars);
		}
	}

	if (random() < 0.15) {
		Object.assign(array, {label: 'x'});
	}

	return array;
}

function randomBuiltin(): unknown {
	// `__proto__` is the one name `Object.assign()` writes with `[[Set]]` rather than creating, so a source carrying it needs building in a way that really produces an own property. An object literal sets the prototype instead, and `JSON.parse` is the way a parsed body arrives.
	if (random() < 0.12) {
		return JSON.parse(`{"__proto__":{"polluted":1},"a":${Math.floor(random() * 3)}}`) as unknown;
	}

	const symbol = Symbol.for('fuzz-builtin');

	switch (Math.floor(random() * 18)) {
		case 0: {
			return new Uint8Array([1, 2, 3]);
		}

		case 1: {
			return Buffer.from([1, 2, 3]);
		}

		case 2: {
			// A proxy that reports more than it holds, which the wrappers must not invent a key for.
			return new Proxy({a: 1}, {
				ownKeys() {
					return ['a', 'extra'];
				},
				getOwnPropertyDescriptor(target, key) {
					return Reflect.getOwnPropertyDescriptor(target, key) ?? {value: String(key), enumerable: true, configurable: true, writable: true};
				},
				has(target, key) {
					return Reflect.has(target, key) || key === 'extra';
				},
			});
		}

		case 3: {
			// A self-referencing object, which `JSON.stringify()` refuses.
			const self: Record<string, unknown> = {a: 1};
			self['self'] = self;
			return self;
		}

		case 4: {
			return new DataView(new ArrayBuffer(8));
		}

		case 5: {
			return new Map([['a', 1]]);
		}

		case 6: {
			return new Set([1, 2]);
		}

		case 7: {
			return new Date(0);
		}

		case 8: {
			return /fuzz/giv;
		}

		case 9: {
			return new Error('fuzz');
		}

		case 10: {
			// eslint-disable-next-line no-new-wrappers -- A boxed primitive stores its elements as indexed own properties.
			return new String('ab');
		}

		case 11: {
			return Object.freeze(randomObject(1));
		}

		case 12: {
			return Object.assign(Object.create(null), randomObject(1));
		}

		case 13: {
			return new Fuzz();
		}

		case 14: {
			const target = randomObject(0) as Record<PropertyKey, unknown>;
			target[0] = 'zero';
			target[symbol] = 'symbol';
			target['1'] = 'one';
			return target;
		}

		case 15: {
			// An own `__proto__` on a function, which the same `[[Set]]` path would spread.
			const target = function named() {};
			Object.defineProperty(target, '__proto__', {value: {polluted: true}, enumerable: true, writable: true, configurable: true});
			return target;
		}

		case 16: {
			const target = {get lazy() {
				return 'value';
			}};
			return target;
		}

		default: {
			const target = function named() {};
			return Object.assign(target, {extra: 1});
		}
	}
}

function randomInput(): unknown {
	const roll = random();
	if (roll < 0.25) {
		return pick(scalars);
	}

	if (roll < 0.6) {
		return randomObject(2);
	}

	return roll < 0.85 ? randomArray() : randomBuiltin();
}

// Renders a value for the comparison and the failure message. The rendering cannot tell every pair of values apart (for example `{a: undefined}` and `{}`), so `isDeepStrictEqual()` is checked as well.
function show(value: unknown): string {
	// `JSON.stringify()` writes every non-finite number as `null` and `0` and `-0` alike, so a primitive is rendered directly to keep those values distinct.
	if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
		return typeof value === 'number' && Object.is(value, -0) ? '-0' : String(value);
	}

	const seen = new WeakSet<object>();

	try {
		const text = JSON.stringify(value, (_key, item: unknown) => {
			if (typeof item === 'bigint') {
				return `${item}n`;
			}

			if (typeof item === 'number' && (!Number.isFinite(item) || Object.is(item, -0))) {
				return `#${String(item)}`;
			}

			if (typeof item === 'object' && item !== null) {
				if (seen.has(item)) {
					return '<cycle>';
				}

				seen.add(item);
			}

			return item;
		}) ?? String(value);

		const symbols = typeof value === 'object' && value !== null
			? Object.getOwnPropertySymbols(value).map(String)
			: [];

		// A swapped prototype is the one thing `JSON.stringify()` cannot show, and it is the whole point of the guard both merge helpers apply. A null prototype is a real shape rather than a swapped one, so only a prototype that is neither is called out.
		const prototype = typeof value === 'object' && value !== null
			&& Object.getPrototypeOf(value) !== null
			&& Object.getPrototypeOf(value) !== Object.prototype
			? ' <swapped prototype>'
			: '';

		return `${text}${prototype}${symbols.length > 0 ? ` ${symbols.join(' ')}` : ''}`;
	} catch {
		return '<unprintable>';
	}
}

// A throw on either side is a result worth comparing, not a crash in the harness.
function attempt(action: () => unknown): unknown {
	try {
		return action();
	} catch (error: any) {
		return `threw ${error.constructor.name}`;
	}
}

/*
`Object.assign()` writes with `[[Set]]`, so an own `__proto__` on a source invokes the inherited setter and replaces the target's prototype instead of writing a property. Both merge helpers skip that name, so the bare native is the wrong reference and the comparison is made against the documented contract instead, written by dropping the name from the entry list rather than by copying and deleting it.
*/
function assignReference(target: Record<PropertyKey, unknown>, source: unknown): Record<PropertyKey, unknown> {
	if (source === null || (typeof source !== 'object' && typeof source !== 'function')) {
		return Object.assign(target as object, source as object) as Record<PropertyKey, unknown>;
	}

	// `Object.entries()` cannot see a symbol key, and `Object.assign()` does copy one, so they are gathered separately. Only the enumerable ones are, which is what the native copies.
	const entries: [PropertyKey, unknown][] = Object.entries(source as object).filter(([key]) => key !== '__proto__');

	for (const symbol of Object.getOwnPropertySymbols(source as object)) {
		if (Object.getOwnPropertyDescriptor(source, symbol)?.enumerable) {
			entries.push([symbol, (source as Record<PropertyKey, unknown>)[symbol]]);
		}
	}

	return Object.assign(target, Object.fromEntries(entries));
}

// The builtin the wrapper forwards to. Its type definitions do not declare an absent separator, which the runtime reads as "no separator", so the call is suppressed here the same way it is in the source.
function nativeSplit(text: string, delimiter: string | undefined, limit: number | undefined): string[] {
	// @ts-expect-error -- The builtin takes an absent separator and reads it as "no separator", which its type definitions do not declare.
	return text.split(delimiter, limit);
}

// The same `Object.entries()` walk `objectMapValues` performs, keeping the array or object shape.
function mappedReference(input: unknown, map: (value: unknown) => unknown): unknown {
	const result: Record<string, unknown> | unknown[] = Array.isArray(input as unknown[])
		? []
		: Object.getPrototypeOf(input as object) === null ? Object.create(null) : {};

	for (const [key, value] of Object.entries(input as object)) {
		Object.defineProperty(result, key, {value: map(value), enumerable: true, writable: true, configurable: true});
	}

	return result;
}

function ownDescriptorIs(input: unknown, key: PropertyKey, acceptable: (value: unknown) => boolean): boolean {
	if (!isObjectLike(input)) {
		return false;
	}

	const descriptor = Object.getOwnPropertyDescriptor(input, key);
	return descriptor !== undefined && 'value' in descriptor && acceptable(descriptor.value);
}

test('every helper with its own logic matches its native reference across generated inputs', () => {
	const failures: string[] = [];
	const record = (name: string, input: unknown, actual: unknown, expected: unknown) => {
		// `isDeepStrictEqual()` does not compare prototypes in every case on Node.js 22 and later, so the rendering, which reports a swapped prototype, is compared too.
		if (!isDeepStrictEqual(actual, expected) || show(actual) !== show(expected)) {
			failures.push(`${name}\n    wrapper: ${show(actual)}\n    native:  ${show(expected)}\n    input:   ${show(input)}`);
		}
	};

	for (let iteration = 0; iteration < 5000; iteration++) {
		const input = randomInput();

		record('objectAssign', input, attempt(() => objectAssign({z: 0} as object, input as object)), attempt(() => assignReference({z: 0}, input)));

		if (isObjectLike(input)) {
			record('objectMapValues', input, attempt(() => objectMapValues(input as object, value => value)), attempt(() => mappedReference(input, value => value)));
			record('objectUpdate', input, attempt(() => objectUpdate({z: 0} as Record<string, unknown>, input as Record<string, unknown>)), attempt(() => assignReference({z: 0}, input)));
		}

		// Boundary: wrappers that are the native function cast to a stronger type (`objectKeys`, `isInteger`, and the like), or that forward their arguments to one native call (`arrayAt`, `setHas`, and the like), are not compared here. The comparison would be the native against itself. Only helpers with their own logic or argument mapping are.
		record('isInfinite', input, isInfinite(input as number), input === Number.POSITIVE_INFINITY || input === Number.NEGATIVE_INFINITY);

		if (Array.isArray(input)) {
			record('array.concat', input, attempt(() => arrayConcat(input as never)), input.concat());
			// `concat` spreads an array item one level and appends anything else as it is.
			for (const items of [[pick(scalars)], [[pick(scalars), pick(scalars)]], [[[pick(scalars)]], pick(scalars)]]) {
				record('array.concat(items)', input, attempt(() => (arrayConcat as (...arguments_: unknown[]) => unknown)(input, ...items)), input.concat(...items));
			}
		}

		const text: string = input as string;
		if (typeof text === 'string') {
			// A limit and an absent separator are separate arguments to the builtin, and swapping them is invisible on a string that holds no digit, so both are walked here.
			for (const delimiter of ['-', '', 'a', '1', undefined]) {
				for (const limit of [undefined, 0, 1, 2]) {
					record(`string.split(${JSON.stringify(delimiter)}, ${limit})`, input, attempt(() => stringSplit(text, delimiter, limit)), attempt(() => nativeSplit(text, delimiter, limit)));
				}
			}

			// A regular expression with a capture group puts the captures in the result, and an unmatched one puts `undefined` there.
			for (const delimiter of [/-/v, /(a)|(b)/v, /x*/v]) {
				record(`string.split(${delimiter})`, input, attempt(() => stringSplit(text, delimiter)), attempt(() => text.split(delimiter)));
			}
		}

		for (const key of ['a', 'b', '0', 'length', 'toString', 'missing', 'lazy', '__proto__', 'constructor']) {
			record(`isPropertyDefined(${key})`, input,
				attempt(() => isPropertyDefined(key)(input)),
				ownDescriptorIs(input, key, value => value !== undefined));
			record(`isPropertyPresent(${key})`, input,
				attempt(() => isPropertyPresent(key)(input)),
				ownDescriptorIs(input, key, value => value !== null && value !== undefined));

			// `objectHasOwn` deliberately answers `false` where the native throws, so only compare where the native is defined.
			if (isObjectLike(input)) {
				record(`objectHasOwn(${key})`, input, attempt(() => objectHasOwn(input, key)), Object.hasOwn(input as object, key));
			}

			// `keyIn` and `objectHasIn` both refuse `__proto__` and `constructor` for security, and both box a primitive because the `in` operator throws for one. `null` and `undefined` are the exception: they have no wrapper object, so they answer `false` rather than inheriting every name `Object.prototype` contributes.
			const blocked = key === '__proto__' || key === 'constructor';
			record(`objectHasIn(${key})`, input,
				attempt(() => objectHasIn(input, key)),
				attempt(() => blocked || input === null || input === undefined ? false : key in (Object(input) as Record<PropertyKey, unknown>)));

			if (isObjectLike(input)) {
				record(`keyIn(${key})`, input, attempt(() => keyIn(input as object, key)), blocked ? false : key in (input as object));
			}
		}
	}

	assert.deepEqual(failures, []);
});
