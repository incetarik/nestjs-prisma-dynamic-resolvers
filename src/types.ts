/**
 * The function interface.
 */
export type Func<A extends any[] = any[], R = any> = (...args: A) => R

/**
 * Gets the keys of type `T` matching the `V` values.
 */
export type KeysMatching<T, V> = { [ K in keyof T ]-?: T[ K ] extends V ? K : never }[ keyof T ]

/**
 * A Dictionary type for keeping `TValue` values.
 */
export type Dictionary<TValue> = { [ key: string | symbol ]: TValue }

/**
 * Maps the given type to its function keys.
 * If the given type is an array, then the function indices will be returned.
 * If the given type is an object, then the function keys will be returned.
 */
export type FunctionKeys<T>
  = T extends any[]
  ? Exclude<_FunctionKeys<T>, -1>
  : T extends { [ key: string ]: any }
  ? KeysMatching<T, Func>
  : never

/**
 * Defines the nullable version of given type.
 */
export type Nullable<T> = T | null | undefined

/**
 * Defines the nullable version of given type with `void` type.
 */
export type NullableReturn<T> = Nullable<T> | void

/**
 * Defines a type which can be in a promise or not.
 */
export type MaybePromise<T> = Promise<T> | T

/**
 * Gets the keys of an object whose values are objects.
 *
 * This does not include function keys.
 */
export type ObjectKeys<T extends object>
  = Exclude<KeysMatching<T, object>, FunctionKeys<T>>

/**
 * Removes the nullable keys from an object.
 */
export type RemoveNullables<T, K = undefined | null | void> = {
  [ P in keyof T as T[ P ] extends K ? never : P ]: T[ P ] extends object
  ? RemoveNullables<T[ P ], K>
  : T[ P ]
}

/**
 * Gets the length of an array.
 */
export type Length<T extends any[]> = T extends { length: infer L } ? L : never

/**
* Builds a tuple with given length.
*/
export type BuildTuple<L extends number, T extends any[] = []>
  = T extends { length: L } ? T : BuildTuple<L, [ ...T, any ]>

/**
 * Defines a recursive record of `T` values.
 */
export type RecursiveRecord<T> = {
  [ key in string ]: T | RecursiveRecord<T>
}

/**
 * Maps a record values to `NewValue`.
 */
export type MapRecordValues<T extends object, NewValue>
  = {
    [ K in keyof T ]: T[ K ] extends infer V
    ? (
      V extends object ? MapRecordValues<V, NewValue> : NewValue
    )
    : T[ K ]
  }


type _FunctionKeys<TArray extends any[], CurrentIndex extends number = 0, Index = -1>
  = TArray extends [ infer H, ...infer T ]
  ? H extends Func
  ? _FunctionKeys<T, Add<CurrentIndex, 1>, Index | CurrentIndex>
  : _FunctionKeys<T, Add<CurrentIndex, 1>, Index>
  : Index

type Add<A extends number, B extends number> =
  Length<[ ...BuildTuple<A>, ...BuildTuple<B> ]> & number
