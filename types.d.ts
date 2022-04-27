/**
 * Gets the keys of type `T` matching the `V` values.
 */
declare type KeysMatching<T, V> = { [ K in keyof T ]-?: T[ K ] extends V ? K : never }[ keyof T ]

/**
 * A Dictionary type for keeping `TValue` values.
 */
declare type Dictionary<TValue> = { [ key: string ]: TValue }

/**
 * Maps the given type to its function keys.
 * If the given type is an array, then the function indices will be returned.
 * If the given type is an object, then the function keys will be returned.
 */
declare type FunctionKeys<T>
  = T extends any[]
  ? Exclude<_FunctionKeys<T>, -1>
  : T extends { [ key: string ]: any }
  ? KeysMatching<T, Func>
  : never

/**
 * Defines the nullable version of given type.
 */
declare type Nullable<T> = T | null | undefined

/**
 * Defines the nullable version of given type with `void` type.
 */
declare type NullableReturn<T> = Nullable<T> | void

/**
 * Defines a type which can be in a promise or not.
 */
declare type MaybePromise<T> = Promise<T> | T

/**
 * Gets the keys of an object whose values are objects.
 *
 * This does not include function keys.
 */
declare type ObjectKeys<T extends object>
  = Exclude<KeysMatching<T, object>, FunctionKeys<T>>

/**
 * Gets the length of an array.
 */
declare type Length<T extends any[]> = T extends { length: infer L } ? L : never

/**
* Builds a tuple with given length.
*/
declare type BuildTuple<L extends number, T extends any[] = []>
  = T extends { length: L } ? T : BuildTuple<L, [ ...T, any ]>

type _FunctionKeys<TArray extends any[], CurrentIndex = 0, Index = -1>
  = TArray extends [ infer H, ...infer T ]
  ? H extends Func
  ? _FunctionKeys<T, Add<CurrentIndex, 1>, Index | CurrentIndex>
  : _FunctionKeys<T, Add<CurrentIndex, 1>, Index>
  : Index

type Add<A extends number, B extends number> =
  Length<[ ...BuildTuple<A>, ...BuildTuple<B> ]>
