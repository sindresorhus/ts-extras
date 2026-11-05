// Type-only tests for `objectUpdate()` with `exactOptionalPropertyTypes` on. There, an optional property can hold `undefined` only when it declares `| undefined`, so the check for writing `undefined` follows that, as TypeScript itself does.
import {objectUpdate} from '../../source/index.js';

type User = {name: string; age: number};
declare const user: User;

// A `Partial` over required keys cannot hold `undefined`, so it is a safe update.
declare const partialUser: Partial<User>;
objectUpdate(user, partialUser);

// One that declares `| undefined` can, so it is rejected for a required key.
declare const explicitPartial: {age?: number | undefined};
// @ts-expect-error - `age` may hold `undefined`, which the required target property does not allow.
objectUpdate(user, explicitPartial);

// An optional target property that does not declare `| undefined` cannot hold it, and TypeScript rejects `target.a = undefined` too.
declare const optionalTarget: {a?: number; b: string};
// @ts-expect-error - `a` cannot hold `undefined`.
objectUpdate(optionalTarget, {a: undefined});
objectUpdate(optionalTarget, {a: 1});

// One that declares `| undefined` accepts it.
declare const explicitTarget: {a?: number | undefined};
objectUpdate(explicitTarget, {a: undefined});

// A required target property that declares `| undefined` accepts an explicit undefined, from a literal or a pre-typed source.
declare const requiredUndefinedTarget: {a: number | undefined};
declare const explicitSource: {a?: number | undefined};
objectUpdate(requiredUndefinedTarget, explicitSource);
objectUpdate(requiredUndefinedTarget, {a: undefined});

// The same through the other spelling of a numeric key.
declare const numericTarget: {0?: number};
// @ts-expect-error - `0` cannot hold `undefined`.
objectUpdate(numericTarget, {'0': undefined});

declare const stringTarget: {'0'?: number};
// @ts-expect-error - `'0'` cannot hold `undefined`.
objectUpdate(stringTarget, {0: undefined});

declare const explicitNumericTarget: {0?: number | undefined};
objectUpdate(explicitNumericTarget, {'0': undefined});

// Beside a numeric index signature, the string spelling is still checked on the declared property, not on the signature's wider value type.
declare const mixedTarget: {[key: number]: number | undefined; 0?: number};
// @ts-expect-error - `0` cannot hold `undefined`, even though the index signature's value can.
objectUpdate(mixedTarget, {'0': undefined});

declare const mixedStrictTarget: {[key: number]: number; 0?: number};
// @ts-expect-error - `0` cannot hold `undefined`.
objectUpdate(mixedStrictTarget, {'0': undefined});

// One that declares `| undefined` accepts it, even beside an index signature.
declare const mixedExplicitTarget: {[key: number]: number | undefined; 0?: number | undefined};
objectUpdate(mixedExplicitTarget, {'0': undefined});

// A record whose values cannot be `undefined` rejects it, whatever the setting.
declare const recordTarget: Record<string, number>;
// @ts-expect-error - the index signature's value cannot be `undefined`.
objectUpdate(recordTarget, {a: undefined});
