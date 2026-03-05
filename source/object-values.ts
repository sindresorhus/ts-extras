import type {ArrayEntryValue} from './internal-types.js';

/**
A strongly-typed version of `Object.values()`.

This is useful since `Object.values()` always returns `T[]`. This function returns a strongly-typed array of the values of the given object.

- [TypeScript issues about this](https://github.com/microsoft/TypeScript/pull/12253)

@example
```
import {objectValues} from 'ts-extras';

const object: {a: number; b?: string} = {a: 1, b: 'hello'};

const stronglyTypedValues = objectValues(object);
//=> Array<number | string>

const untypedValues = Object.values(object);
//=> Array<string | number | undefined>
```

@category Improved builtin
*/
// eslint-disable-next-line @typescript-eslint/no-restricted-types -- We intentionally use `object` to accept interfaces.
// Intentionally unsafe cast to provide strongly-typed Object.values().
export const objectValues = Object.values as {
	<Type extends readonly unknown[]>(value: Type): Array<ArrayEntryValue<Type>>;
	<Type extends object>(value: Type): Array<Required<Type>[Extract<keyof Type, string | number>]>;
};
