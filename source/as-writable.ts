import {type Writable} from 'type-fest';

/**
Cast the given value to be [`Writable`](https://github.com/sindresorhus/type-fest/blob/main/source/writable.d.ts).

This is useful because of a [TypeScript limitation](https://github.com/microsoft/TypeScript/issues/45618#issuecomment-908072756).

@example
```
import {asWritable} from 'ts-extras';

const writableContext = asWritable((await import('x')).context);
```

@category General
*/
export function asWritable<T>(value: T): Writable<T> {
	return value as any; // eslint-disable-line @typescript-eslint/no-unsafe-return
}
