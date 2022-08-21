import type { Type } from "@nestjs/common"
import type { IOnResolvedParams, IOnResolvingParams } from "./event-params.interface"

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

let _resolverParams: IRegisterDynamicResolverParams[] | undefined

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
