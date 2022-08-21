import { GraphQLType } from 'graphql'

/**
 * Gets the actual GraphQLType that is wrapped by list or non-nullable
 * types.
 *
 * @param {GraphQLType} input The input.
 * @return {GraphQLType} The wrapped object type.
 */
export function getInnerType(input: GraphQLType): GraphQLType {
  if ('ofType' in input) {
    return getInnerType(input.ofType)
  }

  return input
}
