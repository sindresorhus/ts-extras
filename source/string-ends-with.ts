import type {SingleStringLiteral} from './internal-types.js';

/**
A strongly-typed version of `String#endsWith()` that narrows the string to a template literal type.

When it returns `true`, the string is narrowed to `` `${string}${Suffix}` ``. A union of string literals is split between the branches.

@example
```
import {stringEndsWith} from 'ts-extras';

declare const file: 'index.ts' | 'index.js' | 'readme.md';

if (stringEndsWith(file, '.ts')) {
	file;
	//=> 'index.ts'
} else {
	file;
	//=> 'index.js' | 'readme.md'
}

declare const id: string;

if (stringEndsWith(id, 'Id')) {
	id;
	//=> `${string}Id`
}
```

@note Only a search string that is a single unbranded string literal narrows. A wide `string`, a union, a template literal, a branded string, or an `endPosition` gives a plain `boolean`.

@category Improved builtin
@category Type guard
*/
export function stringEndsWith<StringType extends string, Suffix extends string>(
	string: StringType,
	searchString: Suffix & SingleStringLiteral<Suffix>,
): string is StringType & `${string}${Suffix}`;

export function stringEndsWith(
	string: string,
	searchString: string,
	endPosition?: number,
): boolean;

export function stringEndsWith(
	string: string,
	searchString: string,
	endPosition?: number,
): boolean {
	return string.endsWith(searchString, endPosition);
}
