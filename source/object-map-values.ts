import type {IsTuple, Simplify} from 'type-fest';
import type {ArrayOwnKeys, ArrayEntryKey, ArrayEntryValue} from './internal-types.js';

type OptionalMappedKeys<Type extends object, Keys extends keyof Type, NewValue> = Simplify<{-readonly [Key in Keys as `${Extract<Key, string | number>}`]?: NewValue}>;
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
// Numeric tuple extra keys are the explicit widening boundary for this API.
// Once tuple extras look like array indices, we stop promising tuple shape and fall back to array results.
type NumericTupleExtraKeys<Type extends readonly unknown[]> = Extract<TupleExtraKeys<Type>, number | `${number}`>;
type MappedPlainTupleElement<Type extends readonly unknown[], Key extends keyof Type, NewValue> = number extends Extract<Key, number>
	? NewValue
	: {} extends Pick<Type, Key> ? NewValue | undefined : NewValue;
type MappedPlainTupleValues<Type extends readonly unknown[], NewValue> = {-readonly [Key in keyof Type]: MappedPlainTupleElement<Type, Key, NewValue>};
type NumericLiteralKeys<Type extends readonly unknown[]> = keyof {
	[Key in Extract<keyof MappedPlainTupleValues<Type, never>, number> as number extends Key ? never : Key]: unknown;
};
type VariadicTupleTupleKeys<Type extends readonly unknown[]> = FixedTupleIndexKeys<TupleStaticPart<Type>> | NumericLiteralKeys<Type>;
type VariadicTupleExtraKeys<Type extends readonly unknown[]> = Extract<Exclude<keyof Type, VariadicTupleTupleKeys<Type> | keyof unknown[] | 'length'> | Exclude<ArrayOwnKeys<Type>, VariadicTupleTupleKeys<Type>>, keyof Type>;
type MappedTupleElement<Type extends readonly unknown[], Index extends number, NewValue> = {} extends Pick<Type, Index> ? NewValue | undefined : NewValue;
type MappedTupleIntersectionElements<Type extends readonly unknown[], NewValue, Mapped extends unknown[] = []> = HasTupleIndex<Type, Mapped['length']> extends true
	? {} extends Pick<Type, Mapped['length']>
		? Mapped | MappedTupleIntersectionElements<Type, NewValue, [...Mapped, MappedTupleElement<Type, Mapped['length'], NewValue>]>
		: MappedTupleIntersectionElements<Type, NewValue, [...Mapped, MappedTupleElement<Type, Mapped['length'], NewValue>]>
	: Mapped;
type MappedFixedTupleBaseValues<Type extends readonly unknown[], NewValue> = TupleExtraKeys<Type> extends never
	? undefined extends Type[number]
		? MappedTupleIntersectionElements<Type, NewValue>
		: MappedPlainTupleValues<Type, NewValue>
	: MappedTupleIntersectionElements<Type, NewValue>;
type MappedTupleBaseValues<Type extends readonly unknown[], NewValue> = number extends Type['length']
	// Plain variadic tuples can keep their full mapped shape, including required suffix slots after the rest element.
	? TupleExtraKeys<Type> extends never
		? MappedPlainTupleValues<Type, NewValue>
		: [...MappedPlainTupleValues<TupleStaticPart<Type>, NewValue>, ...NewValue[]]
	: MappedFixedTupleBaseValues<Type, NewValue>;
// Tuples preserve their base shape plus named extra keys. Numeric extra keys are the explicit widening boundary.
// Once we widen to array results, we intentionally stop modeling sparse holes from positive numeric extra keys.
// This helper treats sparse-array precision as unsupported and only preserves the value/index shape at that point.
type MappedTupleValues<Type extends readonly unknown[], NewValue> = TupleExtraKeys<Type> extends never
	? MappedTupleBaseValues<Type, NewValue>
	: NumericTupleExtraKeys<Type> extends never
		? MappedTupleBaseValues<Type, NewValue> & OptionalMappedKeys<Type, TupleExtraKeys<Type>, NewValue>
		: NewValue[] & OptionalMappedKeys<Type, TupleExtraKeys<Type>, NewValue>;
// Non-tuple arrays use dense array typing on purpose.
// Sparse holes and far numeric writes are runtime behavior that this helper intentionally does not model precisely.
type MappedArrayValues<Type extends readonly unknown[], NewValue> = IsTuple<Type, {fixedLengthOnly: false}> extends true
	? MappedTupleValues<Type, NewValue>
	: NewValue[] & MappedArrayOwnValues<Type, NewValue>;
type IndexedCollectionElement<Type extends object> = Type extends ArrayLike<infer Element> ? Element : never;
type IndexedCollectionMappedValues<NewValue> = Partial<Record<number, NewValue>>;
type IsTypedArrayOrBuffer<Type extends object> = Type extends readonly unknown[]
	? false
	: Type extends ArrayBufferView
		? Type extends DataView
			? false
			: true
		: false;
type NormalizeStrict<IsStrict extends boolean | undefined> = IsStrict extends false ? false : true;
type ObjectSourceKeys<Type extends object> = Extract<keyof Type, string | number>;
type HasFunctionValues<Type extends object> = Extract<Type[ObjectSourceKeys<Type>], (...arguments_: never[]) => unknown> extends never ? false : true;
type HasLooseObjectCallbackShape<Type extends object> = Type extends Record<PropertyKey, unknown>
	? HasFunctionValues<Type> extends true
		? false
		: true
	: false;
type LooseObjectCallbackKey<Type extends object> = Type extends unknown ? HasLooseObjectCallbackShape<Type> extends true ? `${ObjectSourceKeys<Type>}` : string : never;
type StrictObjectCallbackKey<Type extends object> = Type extends unknown ? Type extends Record<PropertyKey, unknown> ? `${ObjectSourceKeys<Type>}` : string : never;
type LooseObjectCallbackValue<Type extends object> = Type extends unknown ? HasLooseObjectCallbackShape<Type> extends true ? Type[ObjectSourceKeys<Type>] : unknown : never;
type StrictObjectCallbackValue<Type extends object> = Type extends unknown ? Type extends Record<PropertyKey, unknown> ? Type[ObjectSourceKeys<Type>] : unknown : never;
type StrictObjectMappedValues<Type extends object, NewValue> = Type extends Record<PropertyKey, unknown>
	? Simplify<Partial<{-readonly [Key in keyof Type as `${Extract<Key, string | number>}`]: NewValue}>>
	: Partial<Record<string, NewValue>>;
// Non-array object results stay conservative in both modes because TypeScript cannot prove own-enumerable properties from static shape alone.
// Loose mode only switches callbacks to the data-object path for shapes without function-valued members.
type ObjectMappedValues<Type extends object, NewValue, _IsStrict extends boolean> = StrictObjectMappedValues<Type, NewValue>;
type MapFunctionKey<Type extends object, IsStrict extends boolean> = Type extends unknown
	? Type extends readonly unknown[]
		? ArrayEntryKey<Type>
		: IsTypedArrayOrBuffer<Type> extends true
			? `${number}`
		: IsStrict extends true
			? StrictObjectCallbackKey<Type>
			: LooseObjectCallbackKey<Type>
	: never;
type MapFunctionValue<Type extends object, IsStrict extends boolean> = Type extends unknown
	? Type extends readonly unknown[]
		? ArrayEntryValue<Type>
		: IsTypedArrayOrBuffer<Type> extends true
			? IndexedCollectionElement<Type>
		: IsStrict extends true
			? StrictObjectCallbackValue<Type>
			: LooseObjectCallbackValue<Type>
	: never;
type MappedValues<Type extends object, NewValue, IsStrict extends boolean> = Type extends readonly unknown[]
	? MappedArrayValues<Type, NewValue>
	: IsTypedArrayOrBuffer<Type> extends true
		? IndexedCollectionMappedValues<NewValue>
		: ObjectMappedValues<Type, NewValue, IsStrict>;

/**
A strongly-typed version of mapping over an object's values, preserving keys.

This avoids the common footgun where `objectFromEntries(objectKeys(obj).map(…))` produces optional keys because `.map()` returns a dynamic-length array.

For non-array objects, strict mode is the default and keeps the result conservative: declared keys become optional because TypeScript cannot know whether a property is an own enumerable property from static shape alone. Pass `{strict: false}` to use the data-object callback path for plain shapes without function-valued members. The non-array object result still stays conservative in both modes, including for interface, class, and structural aliases, because `Object.entries()` only returns own enumerable properties.

Array inputs follow `Object.entries()` semantics for elements: only present enumerable elements are mapped, so sparse holes are skipped at runtime. For non-tuple arrays, the types intentionally use a dense array model and do not try to represent sparse holes or far numeric writes precisely; only numeric entries are reflected in the types, and named custom properties on arrays are treated as unsupported. For tuple inputs, named extra keys are preserved when they do not shadow existing array members, but they stay optional in the result because static types cannot prove those properties are enumerable. Numeric extra keys are a widening boundary and produce array results instead of tuple-preserving ones. Typed arrays and `Buffer` are typed as numeric indexed collections too, but their mapped result stays a plain object with numeric keys because that matches the current runtime implementation.

@example
```
import {objectMapValues} from 'ts-extras';

const object = {a: 1, b: 2, c: 3};

const mapped = objectMapValues(object, value => String(value));
//=> {a?: string; b?: string; c?: string}

objectMapValues(object, (value, key) => {
	value satisfies 1 | 2 | 3;
	key satisfies 'a' | 'b' | 'c';
	return String(value);
}, {strict: false});
```

@category Improved builtin
*/
export function objectMapValues<Type extends object, NewValue, IsStrict extends boolean | undefined = true>(
	object: Type,
	mapFunction: (value: MapFunctionValue<Type, NormalizeStrict<IsStrict>>, key: MapFunctionKey<Type, NormalizeStrict<IsStrict>>) => NewValue,
	options?: {strict?: IsStrict},
): MappedValues<Type, NewValue, NormalizeStrict<IsStrict>>;
export function objectMapValues(
	object: any, // eslint-disable-line @typescript-eslint/no-explicit-any
	mapFunction: (value: any, key: string) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
	options?: {strict?: boolean},
): any { // eslint-disable-line @typescript-eslint/no-explicit-any
	void options;

	const result: Record<string, unknown> | unknown[] = Array.isArray(object)
		? []
		: Object.getPrototypeOf(object) === null ? Object.create(null) : {};

	// Intentionally follow `Object.entries()` key discovery semantics.
	// Do not walk prototypes or inspect property descriptors here.
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
