import { Type } from '@nestjs/common'

import {
  IUseDynamicResolversParams,
  registerDynamicResolver,
} from './dynamic-resolver/dynamic-resolver-ops'

/**
 * Decorates a class by creating dynamic resolvers from the properties
 * decorated with {@link NavigationProperty}.
 *
 * @export
 * @param {IUseDynamicResolversParams} [params] The parameters for resolvers.
 * @return {ClassDecorator} A {@link ClassDecorator}.
 */
export function UseDynamicResolvers(params: IUseDynamicResolversParams = {}) {
  return function _UseDynamicResolvers(sourceClass: Type) {
    registerDynamicResolver({
      ...params,
      target: sourceClass,
    })
  }
}
