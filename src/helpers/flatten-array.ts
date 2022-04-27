/**
 * Creates a generator which flattens a given array.
 *
 * @export
 * @template T The type of the items.
 * @param {T[]} array The array that will be flattened.
 * @param {number} [depth=Infinity] The depth of the flattening.
 * @return {Generator<T>} The generator instance of the given type.
 */
export function* flattenArray<T>(array: T[], depth: number = Infinity): Generator<T> {
  if (depth === undefined) {
    depth = 1
  }
  for (const item of array) {
    if (Array.isArray(item) && depth > 0) {
      yield* flattenArray(item, depth - 1)
    } else {
      yield item
    }
  }
}
