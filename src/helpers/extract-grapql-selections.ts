import { FieldNode, GraphQLResolveInfo, Kind } from 'graphql'

import type { ObjectKeys, KeysMatching } from '../types'

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
 * @template T The type of the source.
 * @template K The keys included of the source.
 */
export type IGraphQLExtractSelectionMap<T extends object = object, K extends keyof T = Exclude<ObjectKeys<T>, KeysMatching<T, Date>>> = {
  [ k in K ]?: string | ((parentKeys: string[], fieldName: K) => string)
}

/**
 * A recursive type that supports partial `select` mapping of a `Prisma`
 * select.
 */
export type IGraphQLPrismaSelect<T extends object = object, K extends keyof T = Exclude<ObjectKeys<T>, KeysMatching<T, Date | Function>>> = {
  [ k in K ]?: T[ k ] extends object
  ? (T[ k ] extends Date
    ? boolean
    : (
      T[ k ] extends any[]
      ? boolean
      : (T[ k ] extends (...args: any[]) => any
        ? never
        : (boolean | {
          select?: IGraphQLPrismaSelect<T[ k ], keyof T[ k ]>
        })
      )
    )
  )
  : boolean
}

interface IExtractGraphQLSelectionsParams<T extends object = object, K extends keyof T = Exclude<ObjectKeys<T>, KeysMatching<T, Date>>> {
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
   * @type {IGraphQLExtractSelectionMap<T, K>}
   * @memberof IParams
   */
  selectionMap?: IGraphQLExtractSelectionMap<T, K>

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
 * @param {IExtractGraphQLSelectionsParams} params The parameters for
 * extraction.
 * 
 * @return {*} An object of `selected` field names.
 * @template T The type of the source.
 * @template K The keys included of the source.
 */
export function extractGraphQLSelections<T extends object = object, K extends keyof T = Exclude<ObjectKeys<T>, KeysMatching<T, Date>>>(params: IExtractGraphQLSelectionsParams<T, K>) {
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

      const mapper = selectionMap[ fieldName as keyof typeof selectionMap ] as any
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

interface IExtractGraphQLSelectionPathParams<T extends object = object, K extends keyof T = Exclude<ObjectKeys<T>, KeysMatching<T, Date>>> {
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
   * @type {IGraphQLExtractSelectionMap<T, K>}
   * @memberof IParams
   * @default {}
   */
  selectionMap?: IGraphQLExtractSelectionMap<T, K>

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
 * 
 * @return {string[]} An array containing field names from the outer level to
 * the inner level.
 * 
 * @template T The type of the source.
 * @template K The keys included of the source.
 */
export function extractGraphQLSelectionPath<T extends object = object, K extends keyof T = Exclude<ObjectKeys<T>, KeysMatching<T, Date>>>(params: IExtractGraphQLSelectionPathParams<T, K>): string[] {
  const { path, selectionMap = {}, rootPaths = [] } = params
  if (typeof path !== 'object') return rootPaths

  const { key, prev } = path
  if (typeof key === 'number') return extractGraphQLSelectionPath({
    path: prev,
    selectionMap,
    rootPaths
  })

  const mapper = selectionMap[ key as keyof typeof selectionMap ] as any
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
