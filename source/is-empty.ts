/**
Check whether an array is empty.

This is useful because doing `array.length === 0` on its own won't work as a type-guard.

@example
```
import {isEmpty} from 'ts-extras';

isEmpty([1, 2, 3]);
//=> false

isEmpty([]);
//=> true
```
*/
/* eslint-disable @typescript-eslint/ban-types */
export function isEmpty(array: unknown[]): array is [];
export function isEmpty(array: readonly unknown[]): array is readonly [];
export function isEmpty(array: readonly unknown[]): array is [] | readonly [] {
	return array.length === 0;
}
