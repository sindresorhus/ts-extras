// We intentionally use `object` to accept interfaces.
import type {
	IsLiteral,
	ObjectMerge,
	ReadonlyKeysOf,
	Simplify,
} from 'type-fest';
import type {InternalSlotObject, MergedUnion} from './internal-types.js';
import {assignWithoutOwnProto} from './internal-proto.js';

// Fold the sources onto the target left-to-right. Each step uses `ObjectMerge` so overlapping keys are unioned instead of intersected (which would turn conflicting types into `never`).
type ReadonlyTargetKeys<Target extends object, Result extends object> =
	Extract<ReadonlyKeysOf<Target>, keyof Result>;

type PreserveReadonlyTargetKeys<Target extends object, Result extends object> =
	Result extends unknown
		? [ReadonlyTargetKeys<Target, Result>] extends [never]
			? Result
			: Simplify<
				Omit<Result, ReadonlyTargetKeys<Target, Result>>
				& Readonly<Pick<Result, ReadonlyTargetKeys<Target, Result>>>
			>
		: never;

type NonPlainSource = InternalSlotObject | readonly unknown[];

// Keys are compared exactly as `keyof` names them, like TypeScript compares them for `Object.assign`'s own intersection. A source that shares no key with the target contributes nothing, so a broad source such as an array leaves the target's own type alone. Conservative sources only describe existing target key domains, preserving their spelling and modifiers.
type SharedKeys<Target extends object, Source extends object> =
	| Extract<keyof Target, keyof Source>
	| Extract<keyof Source, keyof Target>;

type ConservativeSource<Target extends object, Source extends object> =
	Partial<Record<SharedKeys<Target, Source>, unknown>>;

type ObjectAssignSource = unknown;
type NoOpObjectAssignSource = null | undefined | boolean | number | bigint | symbol;
type RuntimeObjectAssignSource<Source> = Exclude<Source, NoOpObjectAssignSource>;

// A shared key may be missing from the result when either side declares it optional. Otherwise it is required.
// Boundary: a key the target covers only through an index signature counts as declared and required, which is how TypeScript already reads it (`record.a` is `number` for a `Record<string, number>`), and what v1.3.0 did. Making it optional gave `objectAssign(record, {a: 1}).a` a type that is less precise than `record.a` before the call, and its `undefined` leaked into the index signature's value type. Like any index signature read, this does not prove the property is there, for example when a class-instance source has the key as a prototype getter. With `noUncheckedIndexedAccess`, the result also reads the key without the `undefined` that reading it from the target adds. Do not make it optional again to fix either case. A key is only shared when both sides spell it the same way, so a source key written as `'0'` against a numeric target key is source-only and optional, like any other unshared key. Type-fest's `ObjectMerge` then matches the two spellings, so the result has the target's key with both value types.
type SharedOptionalKeys<Target extends object, Source extends object> = {
	// A broad index-signature key, such as `string`, describes a domain rather than an individual property, so it is never optional here.
	[Key in Extract<keyof Source, keyof Target>]-?: IsLiteral<Key> extends false
		? never
		: {} extends Pick<Target, Key>
			? Key
			: {} extends Pick<Source, Key> ? Key : never;
}[Extract<keyof Source, keyof Target>];

type SharedRequiredKeys<Target extends object, Source extends object> =
	Exclude<Extract<keyof Source, keyof Target>, SharedOptionalKeys<Target, Source>>;

// Declared source keys are not guaranteed to be own enumerable runtime keys: pre-typed values may be class instances with prototype accessors/methods or non-enumerable properties. Source-only keys are therefore optional, while keys already present on the target are typed as target-or-source because they may or may not be overwritten. Readonly target keys are preserved later by `PreserveReadonlyTargetKeys`.
// Two intersection members that disagree about a key read back as `never`, and `never` drops out of the union with the target's own type, so the result would claim something the runtime violates, since the runtime keeps whichever value it copied. `NamedValue` widens such a key to `unknown`: a value that cannot be named is better than none here, and a property already typed `never` means it can hold nothing, so widening it stays sound.
type NamedValue<Value> = [Value] extends [never] ? unknown : Value;
type Uncollapsed<Type extends object> = {[Key in keyof Type]: NamedValue<Type[Key]>};
type SourceValue<Source extends object, Key> = Key extends keyof Source ? NamedValue<Source[Key]> : never;
type SourceOnlyShape<Source extends object, Target extends object> = Uncollapsed<Omit<Source, keyof Target>>;

type MaybeCopiedSource<Target extends object, Source extends object> = Simplify<
	{[Key in SharedRequiredKeys<Target, Source>]: Target[Key] | SourceValue<Source, Key>}
	& {[Key in SharedOptionalKeys<Target, Source>]?: Target[Key] | SourceValue<Source, Key>}
	& Partial<SourceOnlyShape<Source, Target>>
>;

type IsRecordSource<Source extends object> =
	false extends (Source extends unknown ? Source extends Record<PropertyKey, unknown> ? true : false : never)
		? false
		: true;

type MergeKnownSource<Target extends object, Source extends object> =
	ObjectMerge<Target, Source> extends infer Result extends object
		? PreserveReadonlyTargetKeys<Target, Result>
		: object;

// The runtime skips this source key, so it cannot introduce a property or widen an existing target value. Normalize copied keys once for both merge paths, while keeping the original source when classifying its shape.
type ObjectAssignMerge<Target extends object, Source extends object, CopiedSource extends object = {[Key in keyof Source as Key extends '__proto__' ? never : Key]: Source[Key]}> =
	[Source] extends [NonPlainSource]
		? MergeKnownSource<Target, ConservativeSource<Target, CopiedSource>>
		: IsRecordSource<Source> extends true
			? MergeKnownSource<Target, MaybeCopiedSource<Target, CopiedSource>>
			: MergeKnownSource<Target, ConservativeSource<Target, CopiedSource>>;

type ObjectAssignSourceResult<Target extends object, Source extends ObjectAssignSource> = MergedUnion<RuntimeObjectAssignSource<Source>> extends infer RuntimeSource
	? [RuntimeSource] extends [never]
		? Target
		: [keyof RuntimeSource] extends [never]
			? object
			: [RuntimeSource] extends [object]
				? ObjectAssignMerge<Target, RuntimeSource>
				: object
	: Target;

type ObjectAssignResult<Target extends object, Sources extends readonly ObjectAssignSource[]> =
	Sources extends readonly []
		? Target
		: Sources extends readonly [infer First extends ObjectAssignSource, ...infer Rest extends readonly ObjectAssignSource[]]
			? ObjectAssignResult<ObjectAssignSourceResult<Target, First>, Rest>
			: Sources extends ReadonlyArray<infer Source extends ObjectAssignSource>
				? ObjectAssignSourceResult<Target, Source>
				: Target;

type PlainObjectTarget<Target extends object> =
	Target extends (...arguments_: never[]) => unknown
		? never
		: Target extends abstract new (...arguments_: never[]) => unknown
			? never
			: Target;

/**
A strongly-typed version of `Object.assign()`.

This is useful since `Object.assign()` returns the intersection `Target & Source`, which is unsound: conflicting property types are intersected (for example, `{a: number} & {a: string}` makes `a` become `never`), and unsafe access through index signatures is not caught. This function returns a conservative merged type instead, where source-only keys are optional and overlapping keys include the target and source value types.

@note An own `__proto__` key on a source is skipped to prevent prototype pollution.

@note `protected` and TypeScript-`private` members of a class instance source are not checked, but are still copied. `#private` fields are not copied.

@note A generic target is rejected. Narrow it, or pass `target as object`.

@note With a target typed `object`, each source key is typed from the source alone.

@note A source key that a target index signature covers is typed as present on the result, the same way TypeScript types reading it from the target, even though a getter on a class-instance source is not copied. Its value unions with the signature's value type.

@note For a source with no implicit index signature, such as an interface or a class instance, keys are compared exactly as `keyof` names them. A source key spelled `'0'` is a different key from a target key spelled `0`, a numeric enum key is not matched by its plain numeric value, and a numeric index signature source shares no key with a string-indexed target, so the source contributes nothing for these keys. The runtime still copies every property. Match the target's spelling, or handle such a source manually.

@example
```
import {objectAssign} from 'ts-extras';

const merged = objectAssign({a: 1}, {b: 2}); // => {a: number; b?: number}

const overridden = objectAssign({a: 1}, {a: 'x'}); // => {a: number | string}

const intersected = Object.assign({a: 1}, {a: 'x'}); // => {a: number} & {a: string}, so `a` is never
```

@category Improved builtin
*/
export function objectAssign<Target extends object, Sources extends readonly ObjectAssignSource[]>(
	target: PlainObjectTarget<Target>,
	...sources: Sources
): ObjectAssignResult<Target, Sources> {
	const result = Object.assign(target) as Target;

	// Copy sources in order so later getters observe earlier writes, as with Object.assign().
	for (const source of sources) {
		assignWithoutOwnProto(result, source);
	}

	return result as unknown as ObjectAssignResult<Target, Sources>;
}
