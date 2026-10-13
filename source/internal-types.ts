import type {
	IsAny,
	IsLiteral,
	IsTuple,
	IsUnion,
	OmitIndexSignature,
	ReadonlyKeysOf,
	RequiredKeysOf,
} from 'type-fest';

// Shared internal type helpers for Object.entries/values/keys-style utilities.

/**
Keys of a tuple/array that are NOT inherited from `Array.prototype` (i.e. own element indices and custom declared keys).
*/
type TupleArrayPrototype<Type extends readonly unknown[]> = Type extends unknown[] ? Array<Type[number]> : ReadonlyArray<Type[number]>;
type TupleOwnKey<Type extends readonly unknown[], Key extends keyof Type> = Key extends number
	? number extends Key
		? never
		: Key
	// Tuple keys that overlap existing array members are an intentional unsupported boundary. TypeScript cannot model own-enumerable shadowing here without fragile method-specific heuristics.
	: Key extends 'length' | keyof TupleArrayPrototype<Type>
		? never
		: Key;
type ArrayNumericOwnKey<Key> = Key extends keyof unknown[]
	? Key extends number
		? number extends Key
			? never
			: Key
		: never
	: Key extends number | `${number}` ? Key : never;

// Non-tuple arrays only preserve numeric-like custom keys in typings, and only the ones that fit `${number}`: a `Number`-typed key and a key spelled in exponent form are not recognised, while the runtime reports them. Named properties on arrays are treated as unsupported because they are indistinguishable from subclass prototype members.
export type ArrayOwnKeys<Type extends readonly unknown[]> = IsTuple<Type, {fixedLengthOnly: false}> extends true
	? keyof {
		[Key in keyof Type as TupleOwnKey<Type, Key>]: unknown;
	}
	: keyof {
		[Key in keyof Type as ArrayNumericOwnKey<Key>]: unknown;
	};

/**
Like `ArrayOwnKeys` but narrowed to `string | number` (excludes symbols).
*/
type ArrayOwnStringKeys<Type extends readonly unknown[]> = Extract<ArrayOwnKeys<Type>, string | number>;

// An `ArrayBufferView` that also stores its elements as indexed own properties, which is a typed array or `Buffer`. The extra `ArrayLike` requirement is what separates them from a plain object that happens to have `buffer`, `byteLength` and `byteOffset`, and from a `DataView`, which is an `ArrayBufferView` but has no indices. Both of those keep the conservative object typing instead.
export type IndexedCollection = ArrayBufferView & ArrayLike<unknown>;

/**
The element type of an indexed collection, such as a typed array or `Buffer`. A view that is not indexable still holds numbers or bigints, since only a `DataView` is excluded from the paths that reach here, and it has no elements to map.
*/
export type IndexedCollectionElement<Type> = Type extends ArrayLike<infer Element> ? Element : number | bigint;

/**
The string key union that `Object.entries()` would produce for a tuple, array, or typed array.
*/
export type ArrayEntryKey<Type extends readonly unknown[] | IndexedCollection> = Type extends readonly unknown[]
	? number extends Type['length']
		? `${number}` | `${ArrayOwnStringKeys<Type>}`
		: `${ArrayOwnStringKeys<Type>}`
	// Typed arrays and `Buffer` keep their elements as indexed own properties, so only the indices are own keys. Everything else in their `keyof` is a prototype member, except for a property the value declares itself, which is the same unsupported boundary arrays have.
	: `${number}`;

/**
The value union that `Object.entries()` / `Object.values()` would produce for a tuple, array, or typed array.
*/
export type ArrayEntryValue<Type extends readonly unknown[] | IndexedCollection> = Type extends readonly unknown[]
	? number extends Type['length']
		? Type[number] | Type[ArrayOwnStringKeys<Type>]
		: Type[ArrayOwnStringKeys<Type>]
	: IndexedCollectionElement<Type>;

// Shared internal type helpers for isPropertyDefined/isPropertyPresent.

// Proving a property's value must preserve readonly declarations and index signatures, including the string spelling of a numeric key.
export type ProvedProperty<ObjectValue extends object, Key extends PropertyKey, Value> = Key extends ReadonlyKeysOf<ObjectValue> | `${Extract<ReadonlyKeysOf<ObjectValue>, number>}`
	? Readonly<Record<Key, Value>>
	: Record<Key, Value>;

// A key is narrowable only when it names a finite set of string literals. Anything else is an infinite set, so the guard must leave the value type alone: `string`, `Uppercase<string>` and `` `foo${string}` `` all accept keys the object may not have. Reading a template literal for its placeholder segments does not work, because TypeScript's inference puts any leading literal into the first segment and leaves the second empty, so `` `foo${string}` `` looks like it has no placeholder at all. `IsLiteral` separates the two cases directly.
export type HasWidenedKey<Key extends PropertyKey> =
	Key extends string
		? IsLiteral<Key> extends true ? false
			: true
		: Key extends number
			? number extends Key ? true
				: Extract<Key, object> extends never ? false
					: true
			: Key extends symbol
				? symbol extends Key ? true
					: Extract<Key, object> extends never ? false
						: true
				: false;

// Each union member supplies its own value type. A member that does not declare the key may still hold it at runtime, so the proof only applies the guard's nullish exclusion to its unknown value rather than borrowing another member's type.
type ProvedValue<ObjectValue extends object, Key extends PropertyKey, AllowedValue> = Key extends keyof ObjectValue
	? ObjectValue[Key] & AllowedValue
	: [StringFormKey<ObjectValue, Key>] extends [never]
		? IndexSignatureValue<ObjectValue, Key> & AllowedValue
		: ObjectValue[StringFormKey<ObjectValue, Key> & keyof ObjectValue] & AllowedValue;

// The proved key is intersected into each member on its own, and into one member of a union key on its own: a guard proves a single key at a time and TypeScript cannot express "at least one of", so no member of a union key may be required. Flattening either dimension would claim keys that are not there; a flattened result is not even a subtype of its input, which is what `Array#filter`'s own constraint needs, and the narrowing then vanishes without a diagnostic.
type WithProvedKey<ObjectValue extends object, Key extends PropertyKey, AllowedValue> = [Key] extends [never]
	// A `never` key names nothing, and distributing it over the empty union would claim the guard proves every value away.
	? ObjectValue
	: ObjectValue extends unknown
		? Key extends unknown
			// The required proved property retains its original readonly modifier.
			? ObjectValue & ProvedProperty<ObjectValue, Key, ProvedValue<ObjectValue, Key, AllowedValue>>
			: never
		: never;

/**
Refine a checked property by its permitted nullish values while preserving object and key unions.
*/
export type WithProvedProperty<Value, Key extends PropertyKey, AllowedValue> = ObjectType<Value> extends infer ObjectValue
	? [ObjectValue] extends [object]
		// `HasWidenedKey` distributes, so a key that mixes a literal with a widened member, such as the `'info' | (string & {})` a `LiteralUnion` expands to, answers `boolean`. Asking whether the answer is exactly `false` sends such a key down the widened path, which leaves the value alone, since narrowing would promise the literal member as a required property the runtime never proved. `objectHasIn()` and `objectHasOwn()` also treat such a key as widened, but they add an optional index signature with `unknown` values (see `ProvedKeys`), while both property guards leave the value as it is.
		? [HasWidenedKey<Key>] extends [false]
			? WithProvedKey<ObjectValue, Key, AllowedValue>
			: ObjectValue
		: never
	: never;

// A key the value already declares, directly or through an index signature, keeps its own value type, since presence says nothing about a value. The mapped part carries that type, and it is empty for an undeclared key, which `Record<Key, unknown>` covers. A declared property also keeps its `readonly` modifier. A readonly index signature does not, which is the same as v1.3.0.
// Do not use a conditional on the object type here. For a generic input it stays deferred and hides the property or its value type, so `object.key` is an error, or `unknown` for `T extends Record<string, number>`, in the true branch.
// A guard proves a single key at a time, so a union key cannot make all of its members required properties. TypeScript cannot express "at least one of", so none of them is promised.
// A widened key names an unbounded set, so the proof is an index signature with `unknown` values, which keeps `data[field]` readable as `unknown`. It must be required: `object` and every interface already satisfy an optional one, so `BlocksNarrowing` would turn the common `typeof data === 'object' && data !== null && objectHasOwn(data, field)` into a boolean result. A type with an explicit index signature, such as a `Record`, does satisfy it, so that stays a boolean, which keeps its false branch usable.
// `HasWidenedKey` distributes, so a key that mixes a literal with a widened member, such as the `'alpha' | (string & {})` a `LiteralUnion` expands to, answers `boolean`. A required signature would then promise `alpha`, so such a key, and `any`, get an optional one.
export type ProvedKeys<ObjectValue, Key extends PropertyKey> = [HasWidenedKey<Key>] extends [false]
	? IsUnion<Key> extends true
		? Partial<Record<Key, unknown>>
		: Record<Key, unknown> & {[Property in Key & keyof ObjectValue]: ObjectValue[Property]}
	: [HasWidenedKey<Key>] extends [true]
		? Record<Key, unknown>
		: Partial<Record<Key, unknown>>;

// The keys of every union member, distributed so each member contributes its own `keyof`.
// Performance: do not use type-fest's `KeysOfUnion` for this. It goes through `UnionToIntersection`, which relates every member to the intersection of all members, so the check time grows superlinearly with the union size (a 600-member union took about 5s and a 1000-member union about 27s, versus well under 1s with this form).
export type KeysOfMembers<Type> = Type extends unknown ? keyof Type : never;

// `keyof` a union is the intersection of its members' keys, so every key that only some members have is invisible to a key analysis, and the result keeps the target type for a key the source can overwrite. Merge the union into one shape holding every key, each with the union of the values that key can take across the members that actually declare it, so a key absent from some members does not add `undefined`.
type UnionKeysAsOne<Source> = {
	[Key in KeysOfMembers<Source>]: Source extends unknown
		? Key extends keyof Source ? Source[Key] : never
		: never;
};

// Only a union whose every member is an object is merged. A union with a primitive member is left alone, since merging would pull in that primitive's whole key surface and hide the "no shared keys" fallback.
type OnlyObjects<Source> = Source extends object ? true : false;

export type MergedUnion<Source> = IsUnion<Source> extends true
	? [OnlyObjects<Source>] extends [true] ? UnionKeysAsOne<Source> : Source
	: Source;

// `Object.keys()` and friends return own enumerable properties. A function's own properties are `length`, `name` and `prototype`, none of which are enumerable by default, and every other member of the `Function` interface is on `Function.prototype`. So a value typed as `Function` has no own enumerable keys at all, and a function type with extra keys reports only those extras. A plain object is deliberately unaffected, because a function-valued or `length` property on one really is an own key.
// `name` and `length` are configurable, so `Object.defineProperty(fn, 'name', {enumerable: true})` does make one an own enumerable key, and this reports none of them. That is an under-approximation, which is the safe direction: `Object.keys()`, `Object.values()`, `Object.entries()` and `ObjectKeys` report a subset of what `Object.entries()` can return for a function, and `objectMapValues`' callback sees the same subset. It is the same boundary as a named key shadowing an array member.
type FunctionOwnKeys<Type extends object> = Exclude<keyof Type, keyof Function | 'name'>; // eslint-disable-line @typescript-eslint/no-unsafe-function-type -- The `Function` interface is the set of keys to remove.

export type OwnEnumerableKeys<Type extends object> = Type extends Function ? FunctionOwnKeys<Type> : keyof Type; // eslint-disable-line @typescript-eslint/no-unsafe-function-type -- Any callable value, which is what `Function` matches.

// `keyof` a union is the intersection of its members' keys, so the values are gathered one member at a time. Indexing the whole union with that key set gives `unknown`.
// An empty key set answers `never` explicitly, because indexing a type with it is not `never`: for a type whose only keys are symbols, it gives the symbol index signature's value type, which `Object.values()` never returns.
// Boundary: values are read through `PresentValues`, so an optional property does not add the `undefined` its `?` implies. `Object.values()` skips an absent key, so that `undefined` is never returned, and keeping it breaks the common `objectValues(partialRecord).reduce((sum, n) => sum + n, 0)`, which v1.3.0 accepted. With `exactOptionalPropertyTypes`, an explicit `| undefined` is kept, since the property can then really hold `undefined`. Without it, TypeScript cannot tell `a?: string` from `a?: string | undefined`, so an explicit `undefined` value is not described. Do not read through `Type` directly to fix that.
export type OwnEnumerableValues<Type> = Type extends readonly unknown[] | IndexedCollection
	? ArrayEntryValue<Type>
	: Type extends object
		? [Extract<OwnEnumerableKeys<Type>, string | number>] extends [never]
			? never
			: PresentValues<Type>[Extract<OwnEnumerableKeys<Type>, string | number>]
		: never;

// A homomorphic `-?` mapping removes only the `undefined` that optionality adds, and it stays readable for a generic input, which `Required<Type>[keyof Type]` does not.
type PresentValues<Type> = {[Key in keyof Type]-?: Type[Key]};

// Built-ins that keep their state in internal slots, so `Object.entries()` reports none of the members their types declare, and `keyof` would list every prototype member instead.
export type InternalSlotObject =
	| Date
	| RegExp
	| Promise<unknown>
	| ReadonlyMap<unknown, unknown>
	| WeakMap<WeakKey, unknown>
	| ReadonlySet<unknown>
	| WeakSet<WeakKey>;

// `unknown` only for `any`, so an overload gated by it matches nothing else. A generic input leaves it deferred and skips the overload too. Without the gate, `any` matches the array overload of `objectKeys()` and `objectEntries()` first and reports only numeric keys.
export type AnyOnly<Type> = IsAny<Type> extends true ? unknown : never;

export type ObjectType<Value> = unknown extends Value ? object : Extract<Value, object>;

// The key a type declares for `Key`'s string form, when the two name the same runtime key. A numeric-literal key and its string form are the same key, and `Object.getOwnPropertyDescriptor()` finds the very same property for both, but `'0' extends keyof {0: …}` is false, so a direct lookup of the string spelling finds nothing. This maps the string spelling back to the declared key. `never` when the type declares no matching key, so an unknown key keeps its own path.
export type StringFormKey<ObjectValue extends object, Key extends PropertyKey> = {
	[Property in Extract<keyof ObjectValue, string | number>]: `${Property & (string | number)}` extends `${Key & (string | number)}`
		? Property
		: never;
}[Extract<keyof ObjectValue, string | number>];

// A numeric string literal names a numeric index only when parsing and printing it leaves the spelling unchanged. A widened numeric template key, such as `` `${number}` ``, is treated as a numeric index on a best-effort basis.
export type CanonicalNumericString<Key extends string> = Key extends `${infer NumericValue extends number}`
	? `${NumericValue}` extends Key ? Key : never
	: never;

// A key outside `keyof` is still covered when the type has an index signature, and then that signature's value type is known. A plain object's declared properties do not imply an index signature. Canonical numeric strings can read a number index signature, while every string can read a string index signature.
export type IndexSignatureValue<ObjectValue extends object, Key extends PropertyKey> = Key extends symbol
	? symbol extends keyof ObjectValue ? ObjectValue[symbol & keyof ObjectValue] : unknown
	: Key extends number | CanonicalNumericString<Key & string>
		? number extends keyof ObjectValue ? ObjectValue[number & keyof ObjectValue]
			: string extends keyof ObjectValue ? ObjectValue[string & keyof ObjectValue] : unknown
		: string extends keyof ObjectValue ? ObjectValue[string & keyof ObjectValue] : unknown;

// Only plain numeric literals can be decided statically. Branded numeric intersections still represent broad or opaque values.
export type LiteralNumber<Type extends number> = number extends Type ? never
	: [Extract<Type, object>] extends [never] ? Type : never;

// Broad and opaque numbers can stringify to Infinity or NaN, so only plain numeric literals retain an exact spelling.
export type RuntimePropertyKey<Key extends PropertyKey> = Key extends number
	? [LiteralNumber<Key>] extends [never] ? string : `${Key}`
	: Key;

// The keys a member declares as required properties, ignoring index signatures.
type RequiredDeclaredKeys<Member> = Member extends object ? RequiredKeysOf<OmitIndexSignature<Member>> : never;

/*
Whether one input member stops an object guard from narrowing. A member blocks when it already satisfies the proof without declaring every checked key as a required property: the runtime check can still answer `false` for it, and a type predicate would wrongly drop it from the false branch. The guard then returns a plain boolean. In practice that is a widened key on a type with an index signature, such as a `Record`, or a union key on an object type. A single literal key proves a required property, which a declared optional key or an index signature does not satisfy, so those narrow and keep the member in the false branch.

Boundary: a member that declares every checked key as required does not block. Narrowing assumes such a property is present at runtime (for `objectHasOwn()`, as an own property), which is what the `in` operator's own narrowing assumes. Do not widen this rule to every satisfying member. That turns ordinary unions such as `{a: number} | {b: string}` and nullable values such as `{a: number} | null` into a boolean result, and v1.3.0 narrowed both.

Callers distribute over the input and pass each member's own proof. Checking every member against the proof of the whole union is quadratic and made a 200-member union take seconds to check.
*/
export type BlocksNarrowing<Member, Key extends PropertyKey, MemberProof> = Member extends MemberProof
	? [HasWidenedKey<Key>] extends [false]
		? [Key] extends [RequiredDeclaredKeys<Member>] ? false : true
		// A widened key only blocks a member with an explicit index signature for it. A type literal also satisfies the proof, through an implicit index signature, but TypeScript narrows with the subtype relation, which ignores implicit signatures, so its false branch stays usable and it can narrow.
		: [Key] extends [keyof Member] ? true : false
	: false;
