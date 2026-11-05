import type {IsEqual, IsTuple, Simplify} from 'type-fest';
import type {
	ArrayOwnKeys,
	ArrayEntryKey,
	ArrayEntryValue,
	IndexedCollection,
	IndexedCollectionElement,
	InternalSlotObject,
	OwnEnumerableKeys,
} from './internal-types.js';

// A key with no string or number spelling remaps to nothing, so the mapped type would be `{}`, and intersecting it would leave a bare `& {}` in the public result. A symbol key reaches it, whether it is a declared own property or an index signature, since `Object.entries()` never reports a symbol key. Intersecting `unknown` keeps the result clean, and a key set that does remap is unaffected.
type OptionalMappedKeys<Type extends object, Keys extends keyof Type, NewValue> = [Exclude<Keys, symbol>] extends [never]
	? unknown
	: Simplify<{-readonly [Key in Keys as `${Extract<Key, string | number>}`]?: NewValue}>;
type MappedArrayOwnValues<Type extends readonly unknown[], NewValue> = OptionalMappedKeys<Type, ArrayOwnKeys<Type>, NewValue>;
type HasTupleIndex<Type extends readonly unknown[], Index extends number> = Index extends ArrayOwnKeys<Type>
	? true
	: `${Index}` extends ArrayOwnKeys<Type> ? true : false;
// Fixed tuples need their own index-key walk because `[...Type]` widens away the exact tuple slots we still want to preserve.
type FixedTupleIndexKeys<Type extends readonly unknown[], Keys extends string | number = never, Indices extends unknown[] = []> = HasTupleIndex<Type, Indices['length']> extends true
	? FixedTupleIndexKeys<Type, Keys | Indices['length'] | `${Indices['length']}`, [...Indices, unknown]>
	: Keys;
type TupleStaticPart<Type extends readonly unknown[], Result extends unknown[] = []> = number extends Type['length']
	? Type extends readonly [infer Head, ...infer Tail]
		? TupleStaticPart<Tail, [...Result, Head]>
		: Result
	: Type;
type TupleExtraKeys<Type extends readonly unknown[]> = number extends Type['length']
	? VariadicTupleExtraKeys<Type>
	: Extract<Exclude<ArrayOwnKeys<Type>, FixedTupleIndexKeys<Type>>, keyof Type>;
// Numeric tuple extra keys are the explicit widening boundary for this API. Once tuple extras look like array indices, we stop promising tuple shape and fall back to array results.
type NumericTupleExtraKeys<Type extends readonly unknown[]> = Extract<TupleExtraKeys<Type>, number | `${number}`>;
// A slot that is present holds what the callback returned, so it is never `undefined` on its own account. A slot that may be absent is described by the tuple's shape instead, such as a shorter member of `MappedTupleIntersectionElements`, so adding `| undefined` to the slot would only claim an explicit `undefined` that `exactOptionalPropertyTypes` rules out.
type MappedPlainTupleValues<Type extends readonly unknown[], NewValue> = {-readonly [Key in keyof Type]: NewValue};
type NumericLiteralKeys<Type extends readonly unknown[]> = keyof {
	[Key in Extract<keyof MappedPlainTupleValues<Type, never>, number> as number extends Key ? never : Key]: unknown;
};
type VariadicTupleTupleKeys<Type extends readonly unknown[]> = FixedTupleIndexKeys<TupleStaticPart<Type>> | NumericLiteralKeys<Type>;
type VariadicTupleExtraKeys<Type extends readonly unknown[]> = Extract<
	Exclude<keyof Type, VariadicTupleTupleKeys<Type> | keyof unknown[] | 'length'> | Exclude<ArrayOwnKeys<Type>, VariadicTupleTupleKeys<Type>>,
	keyof Type
>;
type MappedTupleIntersectionElements<Type extends readonly unknown[], NewValue, Mapped extends unknown[] = []> = HasTupleIndex<Type, Mapped['length']> extends true
	? {} extends Pick<Type, Mapped['length']>
		? Mapped | MappedTupleIntersectionElements<Type, NewValue, [...Mapped, NewValue]>
		: MappedTupleIntersectionElements<Type, NewValue, [...Mapped, NewValue]>
	: Mapped;

// Intersecting a tuple with an object that re-declares one of its own element keys, as in `[1, 2] & {0: number}`, stops TypeScript from treating the mapped result as a tuple, so it comes out as a plain object with a numeric index and a mistyped `length`. Widen to an array, which is what a numeric extra key already produces.
type MappedPlainTupleResult<Type extends readonly unknown[], NewValue> = MappedPlainTupleValues<Type, NewValue> extends infer Result
	? Result extends readonly unknown[] ? Result : NewValue[]
	: never;

type MappedFixedTupleBaseValues<Type extends readonly unknown[], NewValue> = TupleExtraKeys<Type> extends never
	? undefined extends Type[number]
		? MappedTupleIntersectionElements<Type, NewValue>
		: MappedPlainTupleResult<Type, NewValue>
	: MappedTupleIntersectionElements<Type, NewValue>;
type MappedTupleBaseValues<Type extends readonly unknown[], NewValue> = number extends Type['length']
	// Plain variadic tuples can keep their full mapped shape, including required suffix slots after the rest element.
	? TupleExtraKeys<Type> extends never
		? MappedPlainTupleValues<Type, NewValue>
		: [...MappedPlainTupleValues<TupleStaticPart<Type>, NewValue>, ...NewValue[]]
	: MappedFixedTupleBaseValues<Type, NewValue>;
// Tuples preserve their base shape plus named extra keys. Numeric extra keys are the explicit widening boundary. Once we widen to array results, we intentionally stop modeling sparse holes from positive numeric extra keys. This helper treats sparse-array precision as unsupported and only preserves the value/index shape at that point.
type MappedTupleValues<Type extends readonly unknown[], NewValue> = TupleExtraKeys<Type> extends never
	? MappedTupleBaseValues<Type, NewValue>
	: NumericTupleExtraKeys<Type> extends never
		? MappedTupleBaseValues<Type, NewValue> & OptionalMappedKeys<Type, TupleExtraKeys<Type>, NewValue>
		: NewValue[] & OptionalMappedKeys<Type, TupleExtraKeys<Type>, NewValue>;
// Non-tuple arrays use dense array typing on purpose. Sparse holes and far numeric writes are runtime behavior that this helper intentionally does not model precisely.
type MappedArrayValues<Type extends readonly unknown[], NewValue> = IsTuple<Type, {fixedLengthOnly: false}> extends true
	? MappedTupleValues<Type, NewValue>
	: NewValue[] & MappedArrayOwnValues<Type, NewValue>;
type IndexedCollectionMappedValues<NewValue> = Partial<Record<number, NewValue>>;
// `ArrayBufferView` is only `{buffer, byteLength, byteOffset}`, so a plain object with those three matches it, and the runtime hands its callback an `ArrayBuffer`, not a number. `IndexedCollection` requires the full typed-array type to separate a real view from an ordinary array-like object with buffer metadata. A value typed as the `ArrayBufferView` interface itself is still a view of some kind, so it keeps the indexed path too.
type IsTypedArrayOrBuffer<Type extends object> = Type extends readonly unknown[]
	? false
	: Type extends IndexedCollection
		? true
		: IsEqual<Type, ArrayBufferView>;
// `Object.entries()` reports own enumerable properties, so a function contributes only what was added to it, and a value typed as `Function` contributes nothing at all. `keyof` cannot see that, so it would promise the callback the prototype members the runtime never passes, and type its `value` as `any`, which removes every check inside the callback. `OwnEnumerableKeys` is the same helper `objectKeys`, `objectValues` and `objectEntries` use.
type ObjectSourceKeys<Type extends object> = Extract<OwnEnumerableKeys<Type>, string | number>;
// Indexing a type with the empty key set is not `never`, so a type with no own keys would answer with its index signature's value type. Distributing over the keys answers `never` for no keys, and it stays distributive so a generic `Type` still resolves through its constraint.
type SourceValues<Type extends object, Keys extends PropertyKey> = Keys extends unknown ? Type[Keys & keyof Type] : never;
// An interface and a class instance have no implicit index signature, so the callback types do not gate on `Record<PropertyKey, unknown>`. They use the same formulas as `objectKeys`, `objectValues` and `objectEntries`, so an interface narrows exactly as the same type written as an alias does.
// The result stays sound: every emitted key is optional, so a prototype getter that `Object.entries` never reads cannot be claimed as present. A wider callback would also be sound; the point is that a precise one is available.
// A type with no reportable string or number keys, such as `object`, `{}`, or `Function`, names nothing the callback can rely on, so its key falls back to the same broad `string` as an internal-slot built-in's. A `never` key would unsoundly accept any value for it. The value check below must keep its exact shape: an extra conditional around `SourceValues` stops a generic `Type` from resolving to its value type in the callback body.
type ObjectCallbackKey<Type extends object> = Type extends unknown
	? [ObjectSourceKeys<Type>] extends [never] ? string : `${ObjectSourceKeys<Type>}`
	: never;
type ObjectCallbackValue<Type extends object> = Type extends unknown ? (keyof Type extends never ? unknown : SourceValues<Type, ObjectSourceKeys<Type>>) : never;
// A numeric key is remapped to a numeric index signature, not to its template-literal form. The template form reads the same at runtime but cannot be indexed by a number, so `mapped[0]` would not compile on a `{[index: number]: …}` target, unlike every sibling path. The optionality is written on the mapped type itself, because wrapping it in `Partial` loses the index signature.
// A type with no reportable keys maps nothing, so it gets the same result shape as an internal-slot built-in.
type ObjectMappedValues<Type extends object, NewValue> = [ObjectSourceKeys<Type>] extends [never]
	? Partial<Record<string, NewValue>>
	: Simplify<{
		-readonly [Key in OwnEnumerableKeys<Type> as Key extends number ? Key : `${Extract<Key, string>}`]?: NewValue;
	}>;
// Boundary: a built-in that keeps its state in internal slots, such as a `Date` or a `Map`, has no own enumerable properties, so the callback never runs. Listing its prototype members as optional result keys is sound but buries the result, so it gets the v1.3.0 `Partial<Record<string, NewValue>>` and a callback of `(value: unknown, key: string)` instead. A class instance cannot be told apart from an interface, so it keeps its declared members, all optional.
type MapFunctionKey<Type extends object> = Type extends unknown
	? Type extends readonly unknown[]
		? ArrayEntryKey<Type>
		: IsTypedArrayOrBuffer<Type> extends true
			? `${number}`
			: Type extends InternalSlotObject
				? string
				: ObjectCallbackKey<Type>
	: never;
type MapFunctionValue<Type extends object> = Type extends unknown
	? Type extends readonly unknown[]
		? ArrayEntryValue<Type>
		: IsTypedArrayOrBuffer<Type> extends true
			? IndexedCollectionElement<Type>
			: Type extends InternalSlotObject
				? unknown
				: ObjectCallbackValue<Type>
	: never;
type MappedValues<Type extends object, NewValue> = Type extends readonly unknown[]
	? MappedArrayValues<Type, NewValue>
	: IsTypedArrayOrBuffer<Type> extends true
		? IndexedCollectionMappedValues<NewValue>
		: Type extends InternalSlotObject
			? Partial<Record<string, NewValue>>
			: ObjectMappedValues<Type, NewValue>;

type ObjectMapValuesOptions = {
	/**
	@deprecated Has no effect. The callback is always typed from the object's own keys and values.
	*/
	strict?: boolean | undefined;
};

// Mirroring a null prototype needs the prototype, but `Object.entries()` never reads it, so a proxy that refuses to hand it over must not make this function throw. A value whose prototype is unreadable is treated as a normal object.
// We intentionally use `object` to accept any value, including a proxy.
function hasNullPrototype(value: object): boolean {
	try {
		return Object.getPrototypeOf(value) === null;
	} catch {
		return false;
	}
}

/**
Map over an object's values while keeping the result's keys strongly typed.

The result is the one `objectFromEntries(objectKeys(obj).map(…))` produces, optional keys and all, since `.map()` returns a dynamic-length array there too. What this one saves is writing the map, and it types the callback's `value` against the object's own keys. The `key` is a separate parameter, so narrowing it does not narrow `value`.

For non-array objects, declared keys become optional in the result, because TypeScript cannot know whether a property is an own enumerable property from static shape alone. This includes interface, class, and structural aliases, because `Object.entries()` only returns own enumerable properties.

@note The `strict` option is deprecated and has no effect.

A null-prototype source gives a null-prototype result. Other non-array sources give an ordinary object, including when the prototype cannot be read, such as with a throwing proxy.

Arrays follow `Object.entries()`: sparse holes are skipped at runtime, but the types model arrays as dense. Named properties on non-tuple arrays are unsupported. On a tuple, named extra keys stay optional in the result, and a key that shadows an array member, such as `sort`, is left out of both the result and the callback's value type. Numeric extra keys widen the result to an array. A fixed tuple intersected with a string index signature causes TS2589, so narrow it to a plain tuple or array first. Typed arrays and `Buffer` map to a plain object with numeric keys.

@example
```
import {objectMapValues} from 'ts-extras';

const object = {a: 1, b: 2, c: 3} as const;

const mapped = objectMapValues(object, value => String(value));
//=> {a?: string; b?: string; c?: string}

// The callback reads the object's own keys and value types.
objectMapValues(object, (value, key) => {
	value satisfies 1 | 2 | 3;
	key satisfies 'a' | 'b' | 'c';
	return String(value);
});
```

@note `protected` and TypeScript-`private` members of a class instance are invisible to `keyof`, so they are missing from the callback's value type, but `Object.entries()` still reports them. The same applies to a value typed as a supertype of what it holds.

@note Built-ins that keep their state in internal slots, such as `Date`, `Map`, `Set`, `Promise`, and `RegExp`, have no own enumerable properties, so the callback never runs and the result is empty. They are typed as `Partial<Record<string, NewValue>>` with a `(value: unknown, key: string)` callback. Others, such as `URL`, cannot be recognized and are typed with their declared members.

@note A primitive string maps its characters by index. A boxed `String` is typed as an object with its whole interface.

@note Named own properties on a typed array or `Buffer` are passed to the callback and copied to the result, but are missing from the types.

@category Improved builtin
*/
// `_IsStrict` only keeps an explicit third type argument from v1.3.0 compiling, since the option it typed is deprecated.
export function objectMapValues<Type extends object, NewValue, _IsStrict extends boolean | undefined = true>(
	object: Type,
	mapFunction: (value: MapFunctionValue<Type>, key: MapFunctionKey<Type>) => NewValue,
	options?: ObjectMapValuesOptions,
): MappedValues<Type, NewValue>;

// A primitive string stores its characters as indexed own properties, which is the one value the object overload cannot describe, and the result is the plain object the object path already builds. The callback's return is unconstrained, as it is on the object overload.
export function objectMapValues<NewValue>(
	object: string,
	mapFunction: (value: string, key: `${number}`) => NewValue,
	options?: ObjectMapValuesOptions,
): Partial<Record<`${number}`, NewValue>>;

// The implementation forwards both values straight to the caller's callback and the result to `Object.entries()`, and the overloads carry the types.
export function objectMapValues(
	object: object | string,
	mapFunction: (value: any, key: any) => unknown,
	_options?: ObjectMapValuesOptions,
): unknown {
	const result: Record<string, unknown> | unknown[] = Array.isArray(object)
		? []
		: (typeof object !== 'string' && hasNullPrototype(object) ? Object.create(null) as Record<string, unknown> : {});

	// Intentionally follow `Object.entries()` key discovery semantics. Do not walk prototypes or inspect property descriptors here.
	for (const [key, value] of Object.entries(object)) {
		Object.defineProperty(result, key, {
			value: mapFunction(value, key),
			enumerable: true,
			writable: true,
			configurable: true,
		});
	}

	return result;
}
