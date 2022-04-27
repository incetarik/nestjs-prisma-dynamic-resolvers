import { FieldNode, GraphQLResolveInfo, Kind } from 'graphql'

/**
 * Defines how the fields should be renamed/mapped.
 *
 * If given keys and values are strings, then whenever the key is matched,
 * the value will be placed in the object name.
 * If the given value is a function, then the function will contain the
 * parent keys as path as string array and the current field name and the
 * function should return a string to replace the key.
 *
 * @export
 * @interface IGraphQLExtractSelectionMap
 */
export interface IGraphQLExtractSelectionMap {
  [ k: string ]: string | ((parentKeys: string[], fieldName: string) => string)
}

export interface IParams {
  /**
   * The root node of the GraphQL request.
   *
   * @type {FieldNode}
   * @memberof IParams
   */
  node: FieldNode

  /**
   * The map for renaming the field names to database navigation keys.
   *
   * @type {IGraphQLExtractSelectionMap}
   * @memberof IParams
   */
  selectionMap?: IGraphQLExtractSelectionMap

  /**
   * The name array of the parent fields.
   *
   * @type {string[]}
   * @memberof IParams
   */
  parentFieldKeys?: string[]
}

/**
 * Extracts the GraphQL field selections into an object that is compatible with
 * the `select` property of Prisma queries.
 *
 * @export
 * @param {IParams} params The parameters for extraction.
 * @return {*} An object of `selected` field names.
 */
export function extractGraphQLSelections(params: IParams) {
  const { node, parentFieldKeys = [], selectionMap = {} } = params

  const { selectionSet } = node
  if (!selectionSet) return {}

  return selectionSet.selections.reduce((prev, curr) => {
    if (curr.kind !== Kind.FIELD) return prev
    const { name: { value: fieldName }, selectionSet } = curr

    if (selectionSet) {
      const data = extractGraphQLSelections({
        node: curr,
        selectionMap,
        parentFieldKeys: [ ...parentFieldKeys, fieldName ]
      })

      const mapper = selectionMap[ fieldName ]
      let mappedValue: string
      if (typeof mapper === 'string') {
        mappedValue = mapper
      }
      else if (typeof mapper === 'function') {
        mappedValue = mapper(parentFieldKeys, fieldName)
      }
      else {
        mappedValue = fieldName
      }

      prev[ fieldName ] = {
        include: {
          [ mappedValue ]: {
            select: data
          }
        }
      }
    }
    else {
      prev[ fieldName ] = true
    }

    return prev
  }, {} as Record<string, any>)
}

export interface IExtractGraphQLSelectionPathParams {
  /**
   * The initial path of the request.
   *
   * @type {GraphQLResolveInfo[ 'path' ]}
   * @memberof IExtractGraphQLSelectionPathParams
   */
  path?: GraphQLResolveInfo[ 'path' ]

  /**
   * The map for renaming the field names to database navigation keys.
   *
   * @type {IGraphQLExtractSelectionMap}
   * @memberof IParams
   * @default {}
   */
  selectionMap?: IGraphQLExtractSelectionMap

  /**
   * The initial root paths.
   *
   * @type {string[]}
   * @memberof IExtractGraphQLSelectionPathParams
   * @default []
   */
  rootPaths?: string[]
}

/**
 * Extracts the selection paths of a {@link GraphQLResolveInfo}.
 *
 * @export
 * @param {IExtractGraphQLSelectionPathParams} params The parameters for
 * extraction.
 * @return {string[]} An array containing field names from the outer level to
 * the inner level.
 */
export function extractGraphQLSelectionPath(params: IExtractGraphQLSelectionPathParams): string[] {
  const { path, selectionMap = {}, rootPaths = [] } = params
  if (typeof path !== 'object') return rootPaths

  const { key, prev } = path
  if (typeof key === 'number') return extractGraphQLSelectionPath({
    path: prev,
    selectionMap,
    rootPaths
  })

  const mapper = selectionMap[ key ]
  let mappedValue: string
  if (typeof mapper === 'string') {
    mappedValue = mapper
  }
  else if (typeof mapper === 'function') {
    mappedValue = mapper(rootPaths, key)
  }
  else {
    mappedValue = key
  }

  const newBase = [ mappedValue, ...rootPaths ]
  return extractGraphQLSelectionPath({
    path: prev,
    selectionMap,
    rootPaths: newBase
  })
}
