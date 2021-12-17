/**

@example
```
import {isEqualType} from 'ts-extras';

const isEqual = isEqualType<ExpectedType, ActualType>();
```

*/
export type IsEqual<ExpectedType, ActualType> =
	(<T>() => T extends ExpectedType ? 1 : 2) extends
	(<T>() => T extends ActualType ? 1 : 2)
		? true
		: false;

function assertType<T extends boolean>() {
}

export function isEqualType<T, G>(): boolean;
export function isEqualType<T, G>(value : G): boolean;
export function isEqualType<T, G>(a: T, b: G){
	return assertType<IsEqual<IsEqual<T, G>, true>>();
}