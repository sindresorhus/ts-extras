/**
Cast the type of a variable to a subtype.

This is useful in cases where the typescript engine is unable to catch certain implicit assertions.

If a impossible type conversion is performed the result will be never.

You cannot expand a type; you may only reduce or translate to a similar type.

@example
```
// This is particularly useful in async actions and
// other modern framework applications (for example, React)

let isDefined = true;
const foo = 'bar' as string | null;

if (foo === null) {
	isDefined = false;
}

if (!isDefined) {
	//=> foo === string | null
	asSubtype<string>(foo);
	//=> foo === string
}

// You can also change between similar types
const bar = ['bar']
//=> string[]
asSubtype<[string]>(bar)
//=> [string]
asSubtype<['bar']>(bar)
//=> ['bar']

// This can also break TypeScript invariants
asSubtype<['string']>(bar)
//=> ['string']
// but only to a certain degree
asSubtype<string>(bar)
//=> never
asSubtype<number>('string')
//=> never
asSubtype<undefined>('string' as string | null)
//=> never

// You can only increase precision
const baz = 'baz' as string | null;
asSubtype<string>(baz)
//=> string
asSubtype<null | string>(baz)
//=> string
```
*/
export function asSubtype<T>(value: any): asserts value is T {
	if (!(value || !value)) {
		console.log('this is to assuage the linter');
	}
}
