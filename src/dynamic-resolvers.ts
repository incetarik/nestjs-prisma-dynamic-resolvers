import type { GraphQLResolveInfo } from 'graphql'

import { Inject, Type } from '@nestjs/common'
import {
  Context,
  GraphQLExecutionContext,
  Info,
  Parent,
  ResolveField,
  Resolver,
  Root,
} from '@nestjs/graphql'

import { SYM_PRISMA_CLIENT } from './constants'
import {
  getNavigationMapsOf,
  INavigationMap,
  removeNavigationMapsOf,
} from './dynamic-navigations'
import {
  extractGraphQLSelectionPath,
  extractGraphQLSelections,
  toCamelCase,
} from './helpers'

import type { Dictionary } from './types'

let _resolverParams: IRegisterDynamicResolverParams[] | undefined

export interface IOnResolvingParams<P extends object = object, TRoot extends object = object> {
  /**
   * The parent object.
   *
   * @type {P}
   * @memberof IOnResolvingParams
   */
  readonly parent: P

  /**
   * The graphql resolve info.
   *
   * @type {GraphQLResolveInfo}
   * @memberof IOnResolvingParams
   */
  readonly resolveInfo: GraphQLResolveInfo

  /**
   * The execution context.
   *
   * @type {GraphQLExecutionContext}
   * @memberof IOnResolvingParams
   */
  readonly context: GraphQLExecutionContext

  /**
   * The root object.
   *
   * @type {TRoot}
   * @memberof IOnResolvingParams
   */
  readonly root: TRoot
}

export interface IOnResolvedParams<R = any, P extends object = object, TRoot extends object = object> extends IOnResolvingParams<P, TRoot> {
  /**
   * The data resolved by the resolver.
   *
   * @type {R}
   * @memberof IOnResolvedParams
   */
  data: R

  /**
   * Indicates if the {@link data} is resolved from the database or not.
   * 
   * This property will be `false` if the {@link data} is got from the
   * {@link IUseDynamicResolversParams.onResolving} method.
   *
   * @type {boolean}
   * @memberof IOnResolvedParams
   */
  readonly fromDatabase: boolean
}

/**
 * An interface containing parameters for {@link UseDynamicResolvers} decorator.
 *
 * @export
 * @interface IUseDynamicResolversParams
 */
export interface IUseDynamicResolversParams {
  /**
   * The name of the module that will contain the resolver.
   *
   * This name is used for grouping the resolvers and then the grouped resolvers
   * can be acquired through {@link NavigationProperty.getDynamicResolvers}.
   *
   * If the name is not given, then they will be registered as global.
   *
   * @type {string}
   * @memberof IUseDynamicResolversParams
   */
  moduleName?: string

  /**
   * The name of the database table.
   *
   * This will be used for generating `select` / `include` clauses.
   *
   * @type {string}
   * @memberof IUseDynamicResolversParams
   */
  tableName?: string

  /**
   * The name of the property that is used as ID property of the database table.
   *
   * @type {string}
   * @memberof IUseDynamicResolversParams
   * @default 'id
   */
  primaryKeyName?: string

  /**
   * Indicates if the generated navigation map should be kept as metadata of the
   * target type.
   * 
   * Set this property to `true` to keep the navigation map and use
   * {@link getNavigationMapsOf} function to get the navigation map of the type.
   *
   * @type {boolean}
   * @memberof IUseDynamicResolversParams
   * @default false
   */
  keepNavigationMap?: boolean

  /**
   * An event function that will be triggered when the resolver is about to resolve the defined navigation.
   *
   * @param {IOnResolvingParams<P>} params The parameters.
   * @return {*} The
   * replace value.
   * 
   * If this function returns a value from this event function, then the
   * resolving will be cancelled and the data returned from this function will 
   * be used as the result of resolving.
   * 
   * @memberof IUseDynamicResolversParams
   */
  onResolving?<P extends object = object, TRoot extends object = object>(params: IOnResolvingParams<P, TRoot>): any

  /**
   * An event function that will be triggered when the resolved is resolved the defined navigation.
   *
   * @param {IOnResolvedParams<any, P>} params The parameters.
   * @return {*} The
   * replace value.
   * 
   * If this function returns a value from this event function, then the
   * resolving will be ignored and the data returned from this function will be
   * used as the result of the resolving.
   * 
   * @memberof IUseDynamicResolversParams
   */
  onResolved?<P extends object = object, TRoot extends object = object>(params: IOnResolvedParams<any, P, TRoot>): any
}

export interface IRegisterDynamicResolverParams extends IUseDynamicResolversParams {
  /**
   * The target class that uses the dynamic resolvers.
   *
   * @type {Type}
   * @memberof IUseDynamicResolversParams
   */
  target: Type
}

/**
 * Gets the resolvers that are created dynamically.
 *
 * @export
 * @param {string} [groupName='_global'] The name of the group.
 * @return {Type[]} An array of resolver classes of the group.
 */
export function getDynamicResolverParams(groupName = '_global') {
  if (!_resolverParams) return []
  return _resolverParams.filter(it => it.moduleName === groupName)
}

/**
 * Registers a type as dynamic resolver.
 *
 * @export
 * @param {IUseDynamicResolversParams} params The parameters.
 */
export function registerDynamicResolver(params: IRegisterDynamicResolverParams) {
  _resolverParams ??= []
  _resolverParams.push(params)
}

/**
 * Generates the registered dynamic resolvers and returns the resolver
 * classes.
 *
 * @export
 * @param {string} [groupName='_global'] The group name of the resolvers
 * that will be generated.
 *
 * @param {boolean} [freeMemory=true] Indicates if the memory should be freed
 * after the generation. If this is set to `false`, then
 * {@link getDynamicResolverParams} will still return the resolver parameters.
 *
 * @return {Type[]} An array of the resolver classes.
 */
export function generateDynamicResolvers(groupName = '_global', freeMemory = true) {
  const resolverParams = getDynamicResolverParams(groupName)
  const resolverClasses: Dictionary<Type[]> = {}

  for (const params of resolverParams) {
    const { target, keepNavigationMap = false } = params
    const [ navigationMaps, selectionMap ] = _generateMapsForType(target)
    if (!navigationMaps) continue

    const resolversOfTarget: Type[] = []

    for (const navigationMap of navigationMaps) {
      const dynamicResolver = _makeDynamicResolver({
        ...params,
        navigationMap,
        selectionMap
      })

      resolversOfTarget.push(dynamicResolver)
    }

    resolverClasses[ target.name ] = resolversOfTarget

    if (!keepNavigationMap) {
      removeNavigationMapsOf(target)
    }
  }

  if (freeMemory) {
    removeDynamicResolverParamsOfGroup(groupName)
  }

  return resolverClasses
}

/**
 * Removes the dynamic resolver parameters of a group.
 *
 * @export
 * @param {string} groupName The name of the groups.
 * @return {boolean} A boolean indicating the operation state. If `false`, then
 * nothing is done.
 */
export function removeDynamicResolverParamsOfGroup(groupName: string) {
  if (!_resolverParams) return false

  for (let i = _resolverParams.length - 1; i >= 0; --i) {
    const item = _resolverParams[ i ]
    if (item.moduleName === groupName) {
      _resolverParams.splice(i, 1)
    }
  }

  if (_resolverParams.length === 0) {
    _resolverParams = undefined
  }

  return true
}

function _generateMapsForType(sourceClass: Type): [ navigatioMaps?: INavigationMap[], selectionMap?: Dictionary<string> ] {
  const navigationMaps = getNavigationMapsOf(sourceClass)
  if (!navigationMaps.length) return []

  const selectionMap = navigationMaps.reduce((prev, { sourceProperty, sourceTableName, targetProperty, targetTableName, }) => {
    prev[ sourceProperty ] = sourceTableName

    if (targetProperty) {
      prev[ targetProperty ] = targetTableName
    }

    return prev
  }, {} as Dictionary<string>)

  return [ navigationMaps, selectionMap ]
}

interface IMakeDynamicResolverParams extends IRegisterDynamicResolverParams {
  selectionMap?: Dictionary<string>
  navigationMap: INavigationMap
}

function _makeDynamicResolver(params: IMakeDynamicResolverParams) {
  const {
    target,
    selectionMap,
    navigationMap,
    primaryKeyName = 'id',

    onResolving,
    onResolved,
  } = params

  @Resolver(() => target, {
    isAbstract: true
  })
  class DynamicResolver extends DynamicResolverBase {
    constructor(@Inject(SYM_PRISMA_CLIENT) protected readonly prisma: any) {
      super(prisma)
    }

    protected async fireOnResolvingEvent(parent: { id: string }, root: any, info: GraphQLResolveInfo, context: GraphQLExecutionContext) {
      if (typeof onResolving === 'function') {
        const replaceValue = await onResolving({
          root,
          parent,
          context,
          resolveInfo: info,
        })

        if (typeof replaceValue === 'object') {
          return [ true, replaceValue ]
        }
      }

      return [ false ]
    }

    protected async fireOnResolvedEvent(parent: { id: string }, root: any, info: GraphQLResolveInfo, data: any, context: GraphQLExecutionContext, fromDatabase: boolean) {
      if (typeof onResolved === 'function') {
        const replaceValue = await onResolved({
          data,
          root,
          parent,
          context,
          fromDatabase,
          resolveInfo: info,
        })

        if (typeof replaceValue === 'object') {
          return replaceValue
        }
      }

      return data
    }
  }

  const {
    source,
    relation,
    sourceProperty,
  } = navigationMap

  const isArray = relation.indexOf('*') >= 0
  const handlerMethodDescriptor: PropertyDescriptor = {
    async value(this: DynamicResolver, parent: { id: string }, root: any, info: GraphQLResolveInfo, context: GraphQLExecutionContext) {
      const [ shouldReturn, replaceValue ] = await this.fireOnResolvingEvent(parent, root, info, context)
      if (shouldReturn) {
        return this.fireOnResolvedEvent(parent, root, info, replaceValue, context, false)
      }

      const data = await this.resolve(parent, primaryKeyName, info, navigationMap, selectionMap)
      return this.fireOnResolvedEvent(parent, root, info, data, context, true)
    }
  }

  Object.defineProperty(DynamicResolver.prototype, sourceProperty, handlerMethodDescriptor)

  Parent()(DynamicResolver.prototype, sourceProperty, 0)
  Root()(DynamicResolver.prototype, sourceProperty, 1)
  Info()(DynamicResolver.prototype, sourceProperty, 2)
  Context()(DynamicResolver.prototype, sourceProperty, 3)

  const resolvedType = isArray ? [ target ] : target
  ResolveField(() => resolvedType, {
    description: `Resolves the ${sourceProperty} of the ${source.constructor.name}.`
  })(DynamicResolver.prototype, sourceProperty, handlerMethodDescriptor)

  return DynamicResolver
}

abstract class DynamicResolverBase {
  constructor(protected readonly prisma: any) {}

  protected getSelectionObject(info: GraphQLResolveInfo, selectionMap?: Dictionary<string>) {
    const select = extractGraphQLSelections({
      node: info.fieldNodes[ 0 ],
      selectionMap,
    })

    return select
  }

  protected getSelectionPath(info: GraphQLResolveInfo, selectionMap?: Dictionary<string>) {
    const selectionPath = extractGraphQLSelectionPath({
      path: info.path,
      selectionMap,
    })

    const [ root, to, from = toCamelCase(info.parentType.name) ] = selectionPath

    if (!from) {
      throw new Error(`The navigation source could not be extracted in (${root})`)
    }

    if (!to) {
      throw new Error(`The navigation target could not be extracted in (${root}): "${from}" → ?`)
    }

    const source = this.prisma[ to ]
    if (!(to in this.prisma)) {
      throw new Error(`Unrecognized Prisma model: "${to}". Failed to build resolver for navigation: "${from} → ${to}"`)
    }

    return {
      to,
      root,
      from,
      source,
      selectionPath,
    }
  }

  protected resolve(parent: any, primaryKeyName: string, info: GraphQLResolveInfo, navigationMap: INavigationMap, selectionMap?: Dictionary<string>) {
    const {
      relation,
      sourceProperty,
      sourceTableName,
      targetTableName,
      reverseTableName = sourceTableName,
    } = navigationMap

    const isArray = relation.indexOf('*') >= 0

    if (sourceProperty in parent) {
      const data = (parent as any)[ sourceProperty ]
      if (isArray) {
        return data.map((it: any) => it[ targetTableName ])
      }
      else {
        return data
      }
    }

    const {
      from,
      source: target,
    } = this.getSelectionPath(info, selectionMap)

    const select = this.getSelectionObject(info, selectionMap)

    if (isArray) {
      return target.findMany({
        select,
        where: {
          [ reverseTableName ]: {
            some: {
              [ from ]: {
                id: parent[ primaryKeyName ]
              }
            }
          }
        },
      })
    }
    else {
      return target.findFirst({
        select,
        where: {
          [ reverseTableName ]: {
            some: {
              [ from ]: {
                id: parent[ primaryKeyName ]
              }
            }
          }
        },
      })
    }
  }
}
