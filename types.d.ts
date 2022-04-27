/**
 * Gets the keys of type `T` matching the `V` values.
 */
declare type KeysMatching<T, V> = { [ K in keyof T ]-?: T[ K ] extends V ? K : never }[ keyof T ]

/**
 * A Dictionary type for keeping `TValue` values.
 */
declare type Dictionary<TValue> = { [ key: string ]: TValue }
