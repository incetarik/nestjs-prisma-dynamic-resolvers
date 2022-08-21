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

import { SYM_PRISMA_CLIENT } from '../constants'
import {
  getNavigationMapsOf,
  INavigationMap,
  removeNavigationMapsOf,
} from '../dynamic-navigations'
import { DynamicResolverBase } from './dynamic-resolver-base'
import {
  getDynamicResolverParams,
  IRegisterDynamicResolverParams,
  removeDynamicResolverParamsOfGroup,
} from './dynamic-resolver-ops'

import type { GraphQLResolveInfo } from "graphql"
import type { Dictionary } from "../types"

interface IMakeDynamicResolverParams extends IRegisterDynamicResolverParams {
  selectionMap?: Dictionary<string>
  navigationMap: INavigationMap
}

function _makeDynamicResolver(params: IMakeDynamicResolverParams) {
  const {
    target,
    navigationMap,
    primaryKeyName = 'id',

    onResolving,
    onResolved,
  } = params

  @Resolver(() => target, { isAbstract: true })
  class DynamicResolver extends DynamicResolverBase {
    constructor(@Inject(SYM_PRISMA_CLIENT) protected readonly prisma: any) {
      super(prisma)
    }

    protected async fireOnResolvingEvent(
      parent: { id: string },
      root: any,
      info: GraphQLResolveInfo,
      context: GraphQLExecutionContext
    ) {
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

    protected async fireOnResolvedEvent(
      parent: { id: string },
      root: any,
      info: GraphQLResolveInfo,
      data: any,
      context: GraphQLExecutionContext,
      fromDatabase: boolean
    ) {
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
    async value(
      this: DynamicResolver,
      parent: { id: string },
      root: any,
      info: GraphQLResolveInfo,
      context: GraphQLExecutionContext
    ) {
      const [
        shouldReturn,
        replaceValue
      ] = await this.fireOnResolvingEvent(parent, root, info, context)

      if (shouldReturn) {
        return this.fireOnResolvedEvent(
          parent,
          root,
          info,
          replaceValue,
          context,
          false
        )
      }

      const data = await this.resolve(
        parent,
        primaryKeyName,
        info,
        navigationMap,
        params.selectionMap
      )

      return this.fireOnResolvedEvent(parent, root, info, data, context, true)
    }
  }

  Object.defineProperty(
    DynamicResolver.prototype,
    sourceProperty,
    handlerMethodDescriptor
  )

  Parent()(DynamicResolver.prototype, sourceProperty, 0)
  Root()(DynamicResolver.prototype, sourceProperty, 1)
  Info()(DynamicResolver.prototype, sourceProperty, 2)
  Context()(DynamicResolver.prototype, sourceProperty, 3)

  const resolvedType = isArray ? [ target ] : target

  ResolveField(() => resolvedType, {
    description:
      `Resolves the ${sourceProperty} of the ${source.constructor.name}.`
  })(DynamicResolver.prototype, sourceProperty, handlerMethodDescriptor)

  return DynamicResolver
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
export function generateDynamicResolvers(
  groupName = '_global',
  freeMemory = true
) {
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

function _generateMapsForType(sourceClass: Type): [
  navigatioMaps?: INavigationMap[],
  selectionMap?: Dictionary<string>
] {
  const navigationMaps = getNavigationMapsOf(sourceClass)
  if (!navigationMaps.length) return []

  const selectionMap = navigationMaps.reduce((prev, current) => {
    const {
      sourceProperty,
      sourceTableName,
      targetProperty,
      targetTableName
    } = current

    prev[ sourceProperty ] = sourceTableName

    if (targetProperty) {
      prev[ targetProperty ] = targetTableName
    }

    return prev
  }, {
    sourceClass: sourceClass as any
  } as Dictionary<string>)

  return [ navigationMaps, selectionMap ]
}
