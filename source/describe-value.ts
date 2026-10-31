// A description is one line in a log, not the value itself, so it is bounded at a thousand characters and an ellipsis marks where it was cut. Nothing else about the value is bounded: the message has to stay readable, and a megabyte of it is not.
const maximumLength = 1000;

// `JSON.stringify()` throws on a bigint, writes a non-finite number as `null`, and writes `undefined`, a function, or a symbol as `null` in an array and drops it from an object, so all of them are rendered here as their own text, quoted, and a function by its name. A message that names a value the caller never passed, or hides one that was, is worse than one that is slightly less canonical, and a throw would lose the contents of the whole object.
function renderUnserializable(_key: string, value: unknown): unknown {
	const isUnserializable = value === undefined
		|| typeof value === 'bigint'
		|| typeof value === 'function'
		|| typeof value === 'symbol'
		|| (typeof value === 'number' && !Number.isFinite(value));

	return isUnserializable ? primitiveOrFunctionText(value) : value;
}

// A function's source text can fill the whole message and says little about which value it was, so a function is named the way `util.inspect()` names a plain function. Reading `name` can throw, such as on a revoked proxy, so every caller must catch.
function primitiveOrFunctionText(value: unknown): string {
	return typeof value === 'function'
		? (value.name === '' ? '[Function (anonymous)]' : `[Function: ${value.name}]`)
		: String(value);
}

/**
Render an arbitrary value as a short readable string for a diagnostic message.

Never throws, whatever the value is: it can be a symbol, a null-prototype object, a revoked proxy, or have a `toJSON` or `Symbol.toStringTag` getter that throws.
*/
export function describeValue(value: unknown): string {
	return shorten(describe(value));
}

function describe(value: unknown): string {
	// A string is JSON-quoted, so the empty string and `'1'` stay visible and distinct from the number `1`. Do not switch it to `String()` again.
	if (typeof value === 'string') {
		return JSON.stringify(value);
	}

	// Any other primitive reads best through `String()`: a symbol works at all (a template literal throws on one), and `NaN` and the infinities keep their own text, which `JSON.stringify()` maps to `null`. A function also goes this way, and is named instead of shown as its source text.
	if (value === null || typeof value !== 'object') {
		return safeString(value);
	}

	// An error's own text names it. Serializing it would show only its extra own properties, such as `{"code":"E1"}`, and hide the message.
	if (isError(value)) {
		return safeString(value);
	}

	try {
		// Boundary: a `toJSON()` method is followed, as `JSON.stringify()` does, so a `Date` reads as its ISO form. The method decides what the value says about itself, at any depth, so skipping it only at the top level would lose information without preventing anything.
		const serialized = JSON.stringify(value, renderUnserializable);
		if (serialized === '{}') {
			return builtInText(value) ?? serialized;
		}

		// A `toJSON()` that returns `null`, such as an invalid `Date`'s, names a value the caller never passed, so the value's own text is used instead.
		if (serialized !== undefined && serialized !== 'null') {
			return serialized;
		}
	} catch {
		// A circular structure, a revoked proxy, or a `toJSON` that throws. Fall through.
	}

	return safeString(value);
}

// Whether a value is an `Error`, including one from another realm, which `instanceof` misses. Shared by `assertError()` and the descriptions here. Probing a value can itself throw: `instanceof` reads the prototype, and the brand read hits `Symbol.toStringTag`. A revoked proxy or a hostile getter would let that error escape instead of the documented `TypeError`, so a value we cannot inspect is not an `Error`.
export function isError(value: unknown): boolean {
	try {
		// `Object.prototype.toString` reports `[object Error]` for anything whose `Symbol.toStringTag` says so, so the brand alone proves nothing. Only an object can get past the brand check, since no primitive brand is `Error`. A real `Error` never defines that tag, and a tagged subclass is already caught by `instanceof`.
		// Every non-primitive is assignable to `object`, and only an object can carry a tag. `Reflect.has()` is the `in` operator, which reads the prototype chain too.
		return value instanceof Error || (Object.prototype.toString.call(value) === '[object Error]' && !Reflect.has(value as object, Symbol.toStringTag));
	} catch {
		return false;
	}
}

// `{}` is also what a `Map`, a `RegExp`, and every other built-in that keeps its state outside own enumerable properties serialize to, and it names none of them. Their own text does (`[object Map]`, `/a/g`), so it is preferred. A plain object of this realm keeps `{}`, since its text would only repeat a brand it may have forged with `Symbol.toStringTag`, and a class instance keeps it too, since its text is the generic `[object Object]`. Anything that throws keeps `{}`, which was already a correct description.
function builtInText(value: object): string | undefined {
	try {
		const prototype: unknown = Object.getPrototypeOf(value);
		if (prototype === null || prototype === Object.prototype) {
			return undefined;
		}

		const text = String(value); // eslint-disable-line @typescript-eslint/no-base-to-string -- `[object Object]` is checked for below.
		return text === '' || text === '[object Object]' ? undefined : text;
	} catch {
		return undefined;
	}
}

function shorten(text: string): string {
	// A slice cuts on code units, so a character outside the basic plane can be split in half. Replace lone surrogates in the truncated diagnostic instead of inspecting UTF-16 units ourselves; Unicode mode keeps complete pairs intact.
	return text.length > maximumLength
		? `${text.slice(0, maximumLength).replaceAll(/\p{Surrogate}/gv, '\u{FFFD}')}…`
		: text;
}

// `String()` succeeds on a self-referential array, since `Array#join` detects the cycle and returns an empty string, and an empty description names nothing. The brand is better than nothing.
function safeString(value: unknown): string {
	try {
		const text = primitiveOrFunctionText(value);
		if (text !== '') {
			return text;
		}
	} catch {
		// A value that cannot be stringified is described by its brand below, or not at all.
	}

	try {
		return Object.prototype.toString.call(value);
	} catch {
		return '<Unprintable value>';
	}
}
