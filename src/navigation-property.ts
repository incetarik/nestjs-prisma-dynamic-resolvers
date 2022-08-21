import { Type } from '@nestjs/common'

import { INavigationMap, registerNavigation } from './dynamic-navigations'
import { pluralizeBasic, toCamelCase } from './helpers'

/**
 * A Symbol for accessing the navigation map of a type.
 */
export const SYM_MAP = Symbol('[[NavigationMap]]')

interface INavigationPropertyParameters {
  /**
   * The target class.
   *
   * @type {Type}
   * @memberof IParams
   */
  target: Type

  /**
   * The name of the target class table.
   *
   * @type {string}
   * @memberof IParams
   */
  tableName?: string

  /**
   * The table name of the source class from the target class.
   * This property will be used for inverse selections.
   *
   * @type {string}
   * @memberof IParams
   */
  reverseNavigationName?: string
}

/**
 * Decorates a table property that is used for accessing another table object.
 * The navigation between the tables will be created automatically.
 *
 * @export
 * @param {Type} target The target class.
 * @param {string} [tableName] The name of the target table class in the
 * Prisma datatable objects.
 *
 * @return {PropertyDecorator} A {@link PropertyDecorator}.
 */
export function NavigationProperty(
  target: Type,
  tableName?: string
): PropertyDecorator


/**
 * Decorates a table property that is used for accessing another table object.
 * The navigation between the tables will be created automatically.
 *
 * @export
 * @param {INavigationPropertyParameters} params The parameters for navigation.
 * @return {PropertyDecorator} A {@link PropertyDecorator}.
 */
export function NavigationProperty(
  params: INavigationPropertyParameters
): PropertyDecorator


export function NavigationProperty(
  paramsOrTarget: INavigationPropertyParameters | Type,
  tableName?: string
): PropertyDecorator {

  let params: INavigationPropertyParameters
  if (typeof paramsOrTarget === 'function') {
    params = {
      target: paramsOrTarget,
      tableName
    }
  }
  else {
    params = paramsOrTarget
  }

  return function _NavigationProperty(source: Object, propertyName: string | symbol) {
    const type = Reflect.getMetadata('design:type', source, propertyName)
    const isArray = type === Array

    const {
      target,
      tableName = source.constructor.name,
      reverseNavigationName = isArray ? pluralizeBasic(tableName) : tableName
    } = params

    const sourceTableName = toCamelCase(tableName)
    const targetTableName = toCamelCase(target.name)

    const navigationMaps = _getOrCreateNavigationMap(source.constructor)
    const navigationMap = navigationMaps[ propertyName as string ] = {
      source: source.constructor,
      target,
      sourceTableName,
      targetTableName,
      sourceProperty: propertyName as string,
      reverseTableName: reverseNavigationName,
      relation: isArray ? '1:*' : '1:1',
    }

    registerNavigation({
      from: {
        source: navigationMap.source as Type,
        withProperty: navigationMap.sourceProperty,
        tableName: navigationMap.sourceTableName,
        reverseTableName: navigationMap.reverseTableName,
      },
      to: {
        target: navigationMap.target,
        tableName: navigationMap.targetTableName,
      },
      relation: navigationMap.relation,
    })
  }
}

function _getOrCreateNavigationMap(target: Object) {
  let maps: Record<string, INavigationMap>
    = Reflect.getMetadata(SYM_MAP, target)

  if (maps) return maps
  Reflect.defineMetadata(SYM_MAP, maps = {}, target)
  return maps
}
