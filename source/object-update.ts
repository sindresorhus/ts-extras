// We intentionally use `object` to accept interfaces.
import type {IsUnion, ReadonlyKeysOf, WritableKeysOf} from 'type-fest';
import {assignWithoutOwnProto} from './internal-proto.js';
import type {CanonicalNumericString} from './internal-types.js';

// Source keys that would set a required target property to `undefined`: keys whose source value admits `undefined` while the writable target property does not. `WritableValue` also recognizes numeric keys written as strings. `UpdatableShape` maps these to `never` so the update is rejected, just as TypeScript forbids assigning `undefined` to a required property.
// Each side is asked whether its property can hold an explicit `undefined`, not whether reading it can give one. Reading an optional property always can, but only the written value matters here, and the answer follows `exactOptionalPropertyTypes`: without it every optional property can hold `undefined`, and with it only one that declares `| undefined` can. So `Partial<User>` is rejected without the setting and accepted with it, and a target property the source names directly accepts `undefined` only where TypeScript itself would.
type UnsafeUndefinedKeys<Target extends object, Source extends object> = {
	[Key in keyof Source]-?: Record<Key, undefined> extends Pick<Source, Key>
		? TargetAcceptsUndefined<Target, Key> extends true
			? never
			: Key
		: never;
}[keyof Source];

// A key the target declares, under this spelling or the other numeric one, is checked on that property, so its optional modifier counts. A key the target only covers through an index signature has no property of its own to ask, so its value type decides.
// The string spelling of a numeric key cannot match `keyof` when the target has a numeric index signature, since that key set is the broad `number`, and `MatchedWritableKey` cannot match it either. Converting the spelling first lets `Pick` read the declared property, and the signature only when the target declares no such key, so both spellings get the same verdict.
type DeclaredTargetKey<Target extends object, Key> = Key extends keyof Target
	? Key
	: Key extends CanonicalNumericString<Key & string>
		? Key extends `${infer NumericKey extends number}`
			? NumericKey extends keyof Target ? NumericKey : MatchedWritableKey<Target, Key>
			: MatchedWritableKey<Target, Key>
		: MatchedWritableKey<Target, Key>;

type TargetAcceptsUndefined<
	Target extends object,
	Key,
	DeclaredKey = DeclaredTargetKey<Target, Key>,
> = [DeclaredKey] extends [never]
	? undefined extends WritableValue<Target, Key> ? true : false
	: Record<DeclaredKey & keyof Target, undefined> extends Pick<Target, DeclaredKey & keyof Target> ? true : false;

// The shape a source may have: only the writable properties of the target, each typed as the target's own value type. `readonly` properties map to `never` so the compiler rejects updating them, just as it rejects a direct `target.id = …` assignment. Union targets are rejected outright; narrow to a specific variant first.
// A numeric-literal key and its string form are the same runtime key, so the string forms are compared. Comparing the types directly would reject a valid update: `{0: true}` against a `Record<string, …>` target, because `0` does not extend `string`.
type MatchedWritableKey<Target extends object, Key> = WritableKeysOf<Target> extends infer Writable
	? Writable extends string | number
		? `${Writable & (string | number)}` extends `${Key & (string | number)}` ? Writable : never
		: never
	: never;

// Read the value through the key the update names, not through the target's index signature. A type-literal target has an implicit index signature whose value type is the union of every property type, so reading through it would accept a value the target rejects, and an interface, which has no implicit index signature at all, would reject the string spelling of a key it declares.
// A target whose key set is not enumerable has no such key to match, so the index signature is the only thing that can name the value. Only a canonical numeric spelling is checked against a declared numeric index, so `'1'` is checked against a declared `1`; `'1.0'` and `'01'` are different runtime keys and require their own property or a string index signature.
// A target may declare a numeric-literal key beside its own index signature, and `Target[0]` is the property the target declares while `Target[number]` is the signature. Reading the signature would widen `{[k: number]: string; 0: 'a' | 'b'}` to `string` for the string spelling of `0`, so the declared key wins, and an index signature still answers through the same read.
type NumericKeyValue<Target extends object, Key> =
	Key extends `${infer Index extends number}`
		? Target[Index & keyof Target]
		: Target extends Record<number, infer Value>
			? Value
			: Target extends Record<string, infer Value>
				? Value
				: never;

// A `readonly` property maps to `never`, so the compiler rejects updating it, just as it rejects a direct `target.id = …` assignment. Asking what is writable instead does not work for that: `WritableKeysOf` subtracts a literal from a target's own key set, and for a target that also has an index signature that key set is just `string`, so the subtraction cannot remove it.
// The key set is also compared by string form, which is what covers a numeric-literal key: `ReadonlyKeysOf` names `{readonly 1: …}` as the number `1`, and `'1' extends 1` is false, so a type comparison alone would let the string spelling of that key write through a `readonly` property. A symbol has no string form, so it is compared by type alone.
type IsReadonlyKey<Target extends object, Key, Readonly extends keyof Target> = Key extends Readonly
	? true
	: Key extends symbol
		? false
		: `${Key & (string | number)}` extends `${Extract<Readonly, string | number>}` ? true
			: false;

// Only a numeric key has two spellings, so only a number or a canonically spelled numeric string may fall through to the other form. Any other key must be one the target names, or an unknown key would slip through against a number index target.
type WritableValue<Target extends object, Key, Readonly extends keyof Target = ReadonlyKeysOf<Target>> = Key extends unknown
	? IsReadonlyKey<Target, Key, Readonly> extends true
		? never
		: Key extends keyof Target
			? Target[Key]
			: Key extends number | CanonicalNumericString<Key & string>
				? `${Key & (string | number)}` extends `${Extract<keyof Target, string | number>}`
					? [MatchedWritableKey<Target, Key>] extends [never]
						? NumericKeyValue<Target, Key>
						: Target[MatchedWritableKey<Target, Key> & keyof Target]
					: never
				: never
	: never;

// The readonly key set is passed in rather than recomputed per key. `ReadonlyKeysOf` is an expensive mapped type, and the target is fixed across the keys of one source, so asking for it once is the same answer for a fraction of the work.
type UpdatableShape<Target extends object, Source extends object> = IsUnion<Target> extends true ? never : {
	[Key in keyof Source]: WritableValue<Target, Key, ReadonlyKeysOf<Target>>;
} & Record<UnsafeUndefinedKeys<Target, Source>, never>;

type KnownKeySource<Source extends object> = keyof Source extends never ? never : Source;

// `keyof` a union is the intersection of its members' keys, so a source union would hide every key that only some members have. Only one member is applied at runtime, so each member is checked on its own, and every one of them must be valid.
// There is no separate excess-property check. A mapped type over `keyof Source` names every source key already, so the shape below rejects an unknown key on its own, and a separate check would only reach inside a nested value: a pre-typed `const deep: {x, y, z}` is accepted by `node.position = deep` against a `{x, y}` target, so `objectUpdate(node, {position: deep})` has to compile too. A nested value typed as a union is the same case. A fresh literal still diverges, in the other direction: a direct assignment rejects the extra property as an excess one, and the update accepts it.
type CheckedSource<Target extends object, Source extends object> = Source extends unknown
	? KnownKeySource<Source> & UpdatableShape<Target, Source>
	: never;

/**
Apply a type-checked partial update to an object in place.

This is useful since `Object.assign()` accepts any source and silently allows typos and type mismatches. This constrains the source to a partial of the target, so the compiler rejects a property that does not exist on the target — even when the source is a pre-typed variable rather than an object literal — one with an incompatible type, and a `readonly` property. The target is mutated and returned.

Unlike `objectAssign`, this cannot change an existing property's type, and it adds a new property only where the target declares one: a named key, or any key of an index signature it has.

Union-typed targets are intentionally unsupported. Narrow to a specific union variant before updating it.

The source type must expose at least one known key. Broad `object`/`{}` sources and empty no-op updates are unsupported because their keys and values cannot be checked.

@note A source that may write `undefined` to a required property is rejected. Without `exactOptionalPropertyTypes`, an optional property may hold `undefined`, so `Partial<Pick<User, 'name'>>` does not compile when `name` is required, but `Pick<User, 'name'>` does. With the setting, only a property that declares `| undefined` may hold it, so both compile, and writing `undefined` to an optional target property is rejected, as TypeScript itself does.

@note A source with an index signature, such as `Record<string, number>`, is best-effort, since it may overwrite a `readonly` property.

@note A source typed `any`, such as from `JSON.parse()`, is not checked. A generic source is rejected.

@note An own `__proto__` key on the source is skipped to prevent prototype pollution.

@note `protected` and TypeScript-`private` members of a class instance source are not checked, but are still copied. `#private` fields are not copied.

@note A generic target is rejected. Narrow it first, such as with `object as Record<string, unknown>`. `object as object` does not work, since it has no keys.

@example
```
import {objectUpdate} from 'ts-extras';

const user = {name: 'Sindre', age: 41};

objectUpdate(user, {age: 42}); // => {name: string; age: number}

// @ts-expect-error - 'email' does not exist on the target
objectUpdate(user, {email: 'sindre@example.com'});

// @ts-expect-error - 'age' must be a number
objectUpdate(user, {age: '42'});
```

@category General
*/
export function objectUpdate<Target extends object, Source extends object>(
	target: Target,
	source: Source & CheckedSource<Target, Source>,
): Target {
	// A partial update, so a name that would swap the target's prototype instead of writing a property is skipped, and the rest of the source still applies. Writing it would give the target a foreign prototype instead of the `__proto__` property the call site asked for.
	return assignWithoutOwnProto(target, source);
}
