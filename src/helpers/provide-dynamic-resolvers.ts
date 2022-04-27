import { Type } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

import { SYM_PRISMA_CLIENT } from '../constants'
import { generateDynamicResolvers } from '../dynamic-resolvers'
import { flattenArray } from './flatten-array'

/**
 * Returns the {@link Type} array of dynamic resolvers.
 *
 * @export
 * @param {Type<PrismaClient>} prismaService The prisma service used for
 * reaching the database by the resolvers.
 * 
 * @param {string} [moduleName='_global'] The name of the module which will be
 * loaded.
 * 
 * @return {Type<any>[]} The array of dynamic resolvers.
 */
export function provideDynamicResolvers(prismaService: Type<PrismaClient>, moduleName = '_global'): Type<any>[] {
  return [
    { provide: SYM_PRISMA_CLIENT, useExisting: prismaService } as any,
    ...buildDynamicResolversArray(moduleName)
  ]
}

function buildDynamicResolversArray(moduleName: string) {
  const resolversByClasses = generateDynamicResolvers(moduleName)
  const resolvers: Type[] = []
  for (const className in resolversByClasses) {
    const classResolvers = resolversByClasses[ className ]
    resolvers.push(...flattenArray(classResolvers))
  }

  return resolvers
}
