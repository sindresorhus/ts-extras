import type {IsTuple} from 'type-fest';

// Shared internal type helpers for Object.entries/values/keys-style utilities.

/**
Keys of a tuple/array that are NOT inherited from `Array.prototype` (i.e. own element indices and custom declared keys).
*/
type TupleArrayPrototype<Type extends readonly unknown[]> = Type extends unknown[] ? Array<Type[number]> : ReadonlyArray<Type[number]>;
type TupleOwnKey<Type extends readonly unknown[], Key extends keyof Type> = Key extends number
	? number extends Key
		? never
		: Key
	// Tuple keys that overlap existing array members are an intentional unsupported boundary.
	// TypeScript cannot model own-enumerable shadowing here without fragile method-specific heuristics.
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

// Non-tuple arrays only preserve numeric-like custom keys in typings.
// Named properties on arrays are treated as unsupported because they are indistinguishable from subclass prototype members.
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
export type ArrayOwnStringKeys<Type extends readonly unknown[]> = Extract<ArrayOwnKeys<Type>, string | number>;

/**
The string key union that `Object.entries()` would produce for a tuple/array.
*/
export type ArrayEntryKey<Type extends readonly unknown[]> = number extends Type['length']
	? `${number}` | `${ArrayOwnStringKeys<Type>}`
	: `${ArrayOwnStringKeys<Type>}`;

/**
The value union that `Object.entries()` / `Object.values()` would produce for a tuple/array.
*/
export type ArrayEntryValue<Type extends readonly unknown[]> = number extends Type['length']
	? Type[number] | Type[ArrayOwnStringKeys<Type>]
	: Type[ArrayOwnStringKeys<Type>];
