import type {RuntimePropertyKey} from './internal-types.js';

// `true` for some member when the type is a union. `IsUnion` compares the members with `IsEqual`, which is very slow for a long tuple, while checking the whole union against one member is fast.
type IsUnionMember<Type, AllTypes = Type> = Type extends unknown
	? [AllTypes] extends [Type] ? false : true
	: never;

// `true` for a member of the key that is not a literal, such as `string`, `number` or `x${string}`. Such a key names keys the runtime cannot list. It produces an index signature or nothing, never a required property, so an empty object satisfies its record.
// Performance boundary: this runs once for every entry key, so it must stay a single cheap conditional. `HasWidenedKey` gives the same answer here, but its `IsLiteral` costs about 100 instantiations per key, which made a long `as const` table several times slower to check.
type IsWidenedKey<Key extends PropertyKey> = Key extends unknown
	? {} extends Record<Key, unknown> ? true : false
	: never;

// A dynamic-length array can hold any subset of its keys, so those are optional. A `const` array has a fixed length, so every key it declares was written, and the keys are required. The exception is an entry whose key is a union: only the member the value happened to hold was written, so the keys have to be optional again even though the length is fixed. A widened key makes every key optional too, which the caller checks first.
// Each entry is checked on its own, since the union of all the keys is a union as soon as there is more than one entry. An entry typed as a union of tuples has a union key. A mapped type over the tuple does this without recursion, so a long table of entries does not hit the recursion limit.
type AnyEntryKeyIsUnion<Entries extends ReadonlyArray<readonly [PropertyKey, unknown]>> =
	true extends {[Index in keyof Entries]: IsUnionMember<Entries[Index][0]>}[number] ? true : false;

// A union of entry arrays writes only one of its branches, so no key any branch declares is guaranteed. The key check distributes over such a union and answers `boolean`, so the union is checked first.
type EntryKeysAreOptional<Entries extends ReadonlyArray<readonly [PropertyKey, unknown]>> =
	number extends Entries['length']
		? true
		: true extends IsUnionMember<Entries>
			? true
			: AnyEntryKeyIsUnion<Entries>;

// A widened entry key can overwrite a literal key. Gather every value that can be written to the key, including numeric keys in their string spelling.
// Performance boundary: this scans every entry for every key, so it is quadratic in the number of entries, and a table of about 800 entries fails with "Type instantiation is excessively deep". Only use it when some key is widened. Literal keys, including the numeric and string spelling of the same key, are merged by the mapped type itself, so `T[1]` is the full value there.
type EntryValueForKey<Entry, Key extends PropertyKey> = Entry extends readonly [infer EntryKey extends PropertyKey, infer Value]
	? [RuntimePropertyKey<Key> & RuntimePropertyKey<EntryKey>] extends [never] ? never : Value
	: never;

/**
A strongly-typed version of `Object.fromEntries()`.

This is useful since `Object.fromEntries()` loses the key and value types: it returns `any` for a plain array literal, and `{[key: string]: T}` for `as const` tuples. This function returns a strongly-typed object from the given array of entries either way.

- [TypeScript issues about this](https://github.com/microsoft/TypeScript/issues/35745)

Note: The parameter is narrowed to an array of entries, while `Object.fromEntries()` also accepts any `Iterable`, including a `Map`. The keys cannot be enumerated from an `Iterable`, so pass `Object.fromEntries()` directly for that.

Note: For non-const arrays the return type uses optional keys for soundness. Use `as const` tuples if you need required keys or assert at the call site, for example: `const result = objectFromEntries(entries) as Record<string, Value>`.

Note: If any `as const` entry has a union or widened key, such as `[condition ? 'a' : 'b', 1]` or `[string, 1]`, every key of the result is optional, including the keys of the other entries.

Be aware that `.map()` always returns a dynamic-length array even when called on a typed-keys result like `objectKeys()`, so `objectFromEntries(objectKeys(obj).map(…))` will produce optional keys. If you need required keys there, assert the entries or the result type at the call site.

@example
```
import {objectFromEntries} from 'ts-extras';

const stronglyTypedObjectFromEntries = objectFromEntries([
	['a', 123],
	['b', 'someString'],
	['c', true],
] as const);
//=> {a: 123; b: 'someString'; c: true}

// Without `as const` the result is `{[x: string]: string | number | boolean | undefined}`, while the builtin infers the entries as `any[][]` and returns `any`.
const untypedEntries = Object.fromEntries([['a', 123], ['b', 'someString'], ['c', true]]);
//=> any
```

@category Improved builtin
*/
export const objectFromEntries = Object.fromEntries as <Entries extends ReadonlyArray<readonly [PropertyKey, unknown]>>(values: Entries) => true extends IsWidenedKey<Entries[number][0]>
	? {[T in Entries[number] as T[0]]?: EntryValueForKey<Entries[number], T[0]>}
	: EntryKeysAreOptional<Entries> extends true
		? {[T in Entries[number] as T[0]]?: T[1]}
		: {[T in Entries[number] as T[0]]: T[1]};
