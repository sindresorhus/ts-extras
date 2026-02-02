import {type ObjectKeys} from './object-keys.js';

type ArrayOwnKeys<Type extends readonly unknown[]> = Exclude<keyof Type, keyof unknown[]>;
type ArrayOwnStringKeys<Type extends readonly unknown[]> = Extract<ArrayOwnKeys<Type>, string | number>;
type ArrayEntryKey<Type extends readonly unknown[]> = number extends Type['length']
	? `${number}` | `${ArrayOwnStringKeys<Type>}`
	: `${ArrayOwnStringKeys<Type>}`;
type ArrayEntryValue<Type extends readonly unknown[]> = number extends Type['length']
	? Type[number] | Type[ArrayOwnStringKeys<Type>]
	: Type[ArrayOwnStringKeys<Type>];

/**
A strongly-typed version of `Object.entries()`.

This is useful since `Object.entries()` always returns an array of `Array<[string, T]>`. This function returns a strongly-typed array of the entries of the given object.

- [TypeScript issues about this](https://github.com/microsoft/TypeScript/pull/12253)

@example
```
import {objectEntries} from 'ts-extras';

const stronglyTypedEntries = objectEntries({a: 1, b: 2, c: 3});
//=> Array<['a' | 'b' | 'c', number]>

const untypedEntries = Object.entries({a: 1, b: 2, c: 3});
//=> Array<[string, number]>
```

@category Improved builtin
*/
// eslint-disable-next-line @typescript-eslint/no-restricted-types -- We intentionally use `object` to accept interfaces.
// Intentionally unsafe cast to provide strongly-typed Object.entries().
export const objectEntries = Object.entries as {
	<Type extends readonly unknown[]>(value: Type): Array<[ArrayEntryKey<Type>, ArrayEntryValue<Type>]>;
	<Type extends object>(value: Type): Array<[ObjectKeys<Type>, Required<Type>[Extract<keyof Type, string | number>]]>;
};
