import { GraphQLResolveInfo } from 'graphql'

import { getNavigationMaps, INavigationMap } from '../dynamic-navigations'
import {
  extractGraphQLSelectionPath,
  extractGraphQLSelections,
  toCamelCase,
  updatePathInfoFromSchema,
} from '../helpers'

import type { Dictionary } from '../types'

export abstract class DynamicResolverBase {
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
    })

    const pathInfoList = selectionPath
    pathInfoList.forEach(pathInfo => {
      if (pathInfo.table) return

      const tableName = toCamelCase(pathInfo.tableName)
      const maps = getNavigationMaps()
        .filter(it => it.sourceTableName === tableName)

      pathInfo.table = maps[ 0 ]?.source
      pathInfo.navigationMaps = maps

      updatePathInfoFromSchema(pathInfo, info.schema)
    })

    const query = pathInfoList[ 0 ]

    if (pathInfoList.length < 3) {
      throw new Error(`The navigation source could not be extracted in (${query.propertyName})`)
    }

    const firstLink = pathInfoList[ 1 ]

    if (!firstLink.table) {
      throw new Error(`The navigation target could not be extracted in (${query.propertyName}): '${firstLink.propertyName}' → ?`)
    }

    const secondLink = pathInfoList[ 2 ]

    if (!secondLink.table) {
      throw new Error(`The navigation target could not be extracted in (${query.propertyName}): ${firstLink.propertyName} → ${secondLink.propertyName}' → ?`)
    }

    const sourceTableName
      = selectionMap?.[ firstLink.propertyName ]
      ?? toCamelCase(firstLink.table.name)

    const source = this.prisma[ sourceTableName ]
    if (!source) {
      throw new Error(`Unrecognized Prisma model: "${sourceTableName}". Failed to build resolver for navigation: '${sourceTableName} → ${secondLink.propertyName}'`)
    }

    return {
      to: secondLink,
      root: query,
      from: firstLink,
      source,
      selectionPath,
    }
  }

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
