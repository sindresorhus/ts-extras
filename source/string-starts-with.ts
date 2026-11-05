import type {SingleStringLiteral} from './internal-types.js';

/**
A strongly-typed version of `String#startsWith()` that narrows the string to a template literal type.

When it returns `true`, the string is narrowed to `` `${Prefix}${string}` ``. A union of string literals is split between the branches.

@example
```
import {stringStartsWith} from 'ts-extras';

declare const name: 'onClick' | 'onHover' | 'href';

if (stringStartsWith(name, 'on')) {
	name;
	//=> 'onClick' | 'onHover'
} else {
	name;
	//=> 'href'
}

declare const key: string;

if (stringStartsWith(key, 'data-')) {
	key;
	//=> `data-${string}`
}
```

@note Only a search string that is a single unbranded string literal narrows. A wide `string`, a union, a template literal, a branded string, or a `position` gives a plain `boolean`.

@category Improved builtin
@category Type guard
*/
export function stringStartsWith<StringType extends string, Prefix extends string>(
	string: StringType,
	searchString: Prefix & SingleStringLiteral<Prefix>,
): string is StringType & `${Prefix}${string}`;

export function stringStartsWith(
	string: string,
	searchString: string,
	position?: number,
): boolean;

export function stringStartsWith(
	string: string,
	searchString: string,
	position?: number,
): boolean {
	return string.startsWith(searchString, position);
}
