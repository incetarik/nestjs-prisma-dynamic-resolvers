import {
  FieldNode,
  GraphQLResolveInfo,
  Kind,
  SelectionNode,
  SelectionSetNode,
} from 'graphql'

import type { ObjectKeys, KeysMatching, RecursiveRecord, MapRecordValues, RemoveNullables } from '../types'

/**
 * The disallowed types that should be skipped during the processing.
 */
type DisallowedTypes = Date | ((...args: any) => any)

/**
 * The disallowed keys whose values are matching with {@link DisallowedTypes}.
 */
type DisallowedKeys<T extends object> = KeysMatching<T, DisallowedTypes>

/**
 * A function that will return the new string key value of a key that is found
 * in the parents path.
 * 
 * @param {string[]} parents The parent keys.
 * @param {string} keyName The name of the key.
 * @return {string} The new key name.
 */
type SelectionNameMapperFn = (parents: string[], keyName: string) => string

/**
 * Selects the keys whose values are primitives (not object, not disallowed).
 */
type PrimitiveKeys<T extends object>
  = Exclude<keyof T, ObjectKeys<T> | DisallowedKeys<T>>

/**
 * Selects the keys that are allowed.
 */
type AllowedKeys<T extends object>
  = PrimitiveKeys<T>
  | Exclude<keyof T, DisallowedTypes>

/**
 * The value that selection could be.
 */
type SelectionOutput = string | SelectionNameMapperFn

/**
 * Selects the properties of an object that are allowed.
 */
type SelectObjectProperties<
  T extends object,
  K extends keyof T = AllowedKeys<T>
  > = {
    [ k in K ]?: T[ k ] extends infer U
    ? (U extends (infer V)[]
      ? (V extends DisallowedTypes
        ? never
        : (V extends object
          ? IGraphQLExtractSelectionMap<V, AllowedKeys<V>> | SelectionOutput
          : SelectionOutput
        )
      )
      : (U extends DisallowedTypes
        ? never
        : (U extends object
          ? IGraphQLExtractSelectionMap<U, AllowedKeys<U>> | SelectionOutput
          : SelectionOutput
        )
      )
    )
    : SelectionOutput
  }

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
export type IGraphQLExtractSelectionMap<
  T extends object = object,
  K extends keyof T = AllowedKeys<T>
  > = RemoveNullables<SelectObjectProperties<T, K>, void | undefined | null>

/**
 * A recursive type that supports partial `select` mapping of a `Prisma`
 * select.
 */
export type IGraphQLPrismaSelect<
  T extends object = object,
  K extends keyof T = AllowedKeys<T>
  > = {
    [ k in K ]?: T[ k ] extends DisallowedTypes
    ? boolean
    : T[ k ] extends any[]
    ? boolean
    : T[ k ] extends object ? ({
      select: IGraphQLPrismaSelect<T[ k ], AllowedKeys<T[ k ]>>
    }) | boolean
    : boolean
  }

interface IExtractGraphQLSelectionsParams<T extends object = object, K extends keyof T = AllowedKeys<T>> {
  /**
   * The root node of the GraphQL request.
   *
   * @type {FieldNode}
   * @memberof IParams
   */
  node: FieldNode | SelectionNode

  /**
   * The map for renaming the field names to database navigation keys.
   *
   * @type {IGraphQLExtractSelectionMap<T, K>}
   * @memberof IParams
   */
  selectionMap?: IGraphQLExtractSelectionMap<T, K>
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
export function extractGraphQLSelections<
  T extends object = object,
  K extends keyof T = AllowedKeys<T>
>(params: IExtractGraphQLSelectionsParams<T, K>) {
  const { node } = params

  const selectionObject
    = getGraphQLSelectionsObject(node) as MapRecordValues<T, string>

  const mappedSelections = modifyGraphQLSelections<T>(
    selectionObject,
    //@ts-ignore
    params.selectionMap
  )

  const values = intoPrismaSelection<T>(mappedSelections, {})

  let name: string
  if (node.kind === Kind.FIELD) {
    name = node.name.value
  }
  else {
    name = Object.keys(values)[ 0 ]
  }

  const returnValue = values[ name as keyof typeof values ]
  if ('select' in returnValue) {
    return returnValue[ 'select' ]
  }

  return returnValue
}

/**
 * Converts a selected keys object into prisma query selection object.
 *
 * @template T The type of the object.
 * @param {Record<string, any>} info The selection information object.
 * @param {RecursiveRecord<boolean>} [base={}] The base object for selections.
 * @return {IGraphQLPrismaSelect<T>} The prisma selections result.
 */
function intoPrismaSelection<T extends object>(info: Record<string, any>, base: RecursiveRecord<boolean> = {}) {
  for (const key in info) {
    const value = info[ key ]

    if (typeof value === 'object') {
      const data = intoPrismaSelection(value, {})
      base[ key ] = {
        select: data
      }
    }
    else {
      base[ key ] = true
    }
  }

  return base as IGraphQLPrismaSelect<T>
}

/**
 * Extracts the GraphQL selections into an object.
 *
 * @export
 * @param {SelectionNode} node The root node to start.
 * @return {RecursiveRecord<string>} A recursive record of string values.
 */
export function getGraphQLSelectionsObject(node: SelectionNode) {
  if (node.kind === Kind.FIELD) {
    const { name: { value: name }, selectionSet } = node
    const selections = selectionSet?.selections

    if (Array.isArray(selections)) {
      const { selections } = selectionSet as SelectionSetNode
      const collection: RecursiveRecord<string> = {}

      for (const selection of selections) {
        const data = getGraphQLSelectionsObject(selection)

        const previousValue = collection[ name ]
        if (typeof previousValue === 'object') {
          collection[ name ] = {
            ...previousValue,
            ...data
          }
        }
        else {
          collection[ name ] = data
        }
      }

      return collection
    }
    else {
      return { [ name ]: name }
    }
  }
  else {
    return {}
  }
}

/**
 * Applies given selection mappers object to given source.
 *
 * @export
 * @template T The type of the actual object.
 * @param {MapRecordValues<T, string>} source The source object.
 * @param {SelectionMapOf<T>} [selectionMap={}] The mapper functions object.
 * @param {string[]} [parentKeys=[]] The parent keys that will be passed to
 * the functions found in the `selectionMap` parameter.
 * 
 * @return {*} An object whose values are mapped with given mappers object.
 */
export function modifyGraphQLSelections<T extends object>(
  source: MapRecordValues<T, string>,
  selectionMap: Partial<IGraphQLExtractSelectionMap<T, AllowedKeys<T>>> = {},
  parentKeys: string[] = []
) {
  for (const key in source) {
    const value = source[ key ] as string | MapRecordValues<T, string>
    const newParentKeys = [ ...parentKeys, key ]

    if (typeof value === 'object') {
      //@ts-ignore
      const selMap = selectionMap[ key ] ?? {}

      //@ts-ignore
      source[ key ] = modifyGraphQLSelections(value, selMap, newParentKeys)
    }
    else if ((key as string) in selectionMap) {
      //@ts-ignore
      const mapper = selectionMap[ key ]

      if (typeof mapper === 'function') {
        const newValue = mapper(newParentKeys, value)
        //@ts-ignore
        source[ key ] = newValue
      }
      else if (typeof mapper === 'string') {
        //@ts-ignore
        source[ key ] = mapper
      }
    }
  }

  return source
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
