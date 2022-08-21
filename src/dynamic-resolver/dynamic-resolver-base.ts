import type { GraphQLResolveInfo } from 'graphql'
import type { INavigationMap } from '../dynamic-navigations'
import type { Dictionary } from '../types'

export abstract class DynamicResolverBase {
  constructor(protected readonly prisma: any) {}

  protected resolve(parent: any, _primaryKeyName: string, _info: GraphQLResolveInfo, navigationMap: INavigationMap, _selectionMap?: Dictionary<string>) {
    const {
      relation,
      sourceProperty,
      sourceTableName,
      targetTableName,
    } = navigationMap

    const [ _left, right ] = relation.split(':')
    const isArray = right.indexOf('*') >= 0

    // The `parent` is the loaded instance
    // If the source we are looking for is loaded, then process it.
    if (sourceProperty in parent) {
      const data = (parent as any)[ sourceProperty ]
      if (isArray) {
        return data.map((it: any) => it[ targetTableName ])
      }
      else {
        return data
      }
    }
    else {
      throw new Error(`Could not resolve from ${sourceTableName}: ${sourceProperty}`)
    }
  }
}
