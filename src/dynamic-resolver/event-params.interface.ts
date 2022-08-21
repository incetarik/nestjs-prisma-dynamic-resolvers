import type { GraphQLExecutionContext } from "@nestjs/graphql"
import type { GraphQLResolveInfo } from "graphql"

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
