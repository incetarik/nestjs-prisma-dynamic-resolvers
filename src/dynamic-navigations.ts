import { Type } from '@nestjs/common'

import { toCamelCase } from './helpers'

let _navigations: INavigationMap[] | undefined

/**
 * The relation string.
 */
type RelationString = '1:1' | '1:*' | '*:1' | '*:*'

/**
 * Contains the information about a navigation link from a table object to
 * another.
 *
 * @export
 * @interface INavigationMap
 */
export interface INavigationMap {
  /**
   * The prototype of the source class.
   *
   * @type {Object}
   * @memberof INavigationMap
   */
  source: Object

  /**
   * The target type constructor.
   *
   * @type {Type}
   * @memberof INavigationMap
   */
  target: Type

  /**
   * The table name of the source class.
   *
   * @type {string}
   * @memberof INavigationMap
   */
  sourceTableName: string

  /**
   * The table name of the source class, used for navigating back from the
   * target class.
   *
   * This property is useful for finding all rows if the property is an array.
   * By default, this will be equal to {@link sourceTableName} if not passed.
   *
   * @type {string}
   * @memberof INavigationMap
   * @default `${sourceTableName}`
   */
  reverseTableName?: string

  /**
   * The property name of the source class.
   *
   * @type {string}
   * @memberof INavigationMap
   */
  sourceProperty: string

  /**
   * The table name of the target class.
   *
   * @type {string}
   * @memberof INavigationMap
   */
  targetTableName: string

  /**
   * The property name of the target class.
   *
   * Required if {@link relation} is `*:*`.
   *
   * @type {string}
   * @memberof INavigationMap
   */
  targetProperty?: string

  /**
   * The relation between two classes.
   *
   * @type {RelationString}
   * @memberof INavigationMap
   */
  relation: RelationString
}

/**
 * Defines a type of information of a type of a database table model that
 * is used for navigation.
 *
 * @interface INavigationTableInfo
 * @template A The type of the first database table model.
 * @template B The type of the second database table model.
 */
interface INavigationTableInfo<A extends Type, B extends Type> {
  /**
   * The name of the model in the database.
   *
   * @type {string}
   * @memberof INavigationTableInfo
   */
  tableName?: string

  /**
   * The name of the property of the database table in the model.
   *
   * @type {(string & (
   *   KeysMatching<InstanceType<A>, InstanceType<B> | InstanceType<B>[]>
   * ))}
   * @memberof INavigationTableInfo
   */
  withProperty: string & (
    KeysMatching<InstanceType<A>, InstanceType<B> | InstanceType<B>[]>
  )
}

type INavigationSourceTableInfo<A extends Type, B extends Type>
  = INavigationTableInfo<A, B> & {
    /**
     * The source database table model.
     *
     * @type {A}
     */
    source: A

    /**
     * The table name of the source class, used for navigating back from the
     * target class.
     *
     * This property is useful for finding all rows if the property is an array.
     * By default, this will be equal to {@link sourceTableName} if not passed.
     *
     * @type {string}
     * @default `${sourceTableName}`
     */
    reverseTableName?: string
  }

type INavigationTargetTableInfo<A extends Type, B extends Type>
  = Omit<INavigationTableInfo<A, B>, 'withProperty'> & {
    /**
     * The target database table model.
     *
     * @type {B}
     */
    target: B

    /**
     * The name of the property of the database table in the model.
     *
     * @type {(string & (
     *   KeysMatching<InstanceType<A>, InstanceType<B> | InstanceType<B>[]>
     * ))}
     * @memberof INavigationTableInfo
     */
    withProperty?: string & (
      KeysMatching<InstanceType<B>, InstanceType<A> | InstanceType<A>[]>
    )
  }

/**
 * Represents the type of a navigation definition between two tables.
 *
 * @export
 * @interface INavigationDefinitonParams
 * @template A The type of the first database table model.
 * @template B The type of the second database table model.
 */
export interface INavigationDefinitonParams<A extends Type, B extends Type> {
  /**
   * The source information of the database navigation.
   *
   * @type {INavigationSourceTableInfo<A, B>}
   * @memberof INavigationDefinitonParams
   */
  from: INavigationSourceTableInfo<A, B>

  /**
   * The target information of the database navigation.
   *
   * @type {INavigationTargetTableInfo<A, B>}
   * @memberof INavigationDefinitonParams
   */
  to: INavigationTargetTableInfo<A, B>

  /**
   * The relationship between two tables.
   *
   * @type {RelationString}
   * @memberof INavigationDefinitonParams
   */
  relation: RelationString
}

/**
 * Registers a database table navigation between models.
 *
 * @export
 * @template A The type of the first/source database table model.
 * @template B The type of the second/target database table model.
 * @param {INavigationDefinitonParams<A, B>} params The navigation definition
 * parameters.
 *
 */
export function registerNavigation<A extends Type, B extends Type>(params: INavigationDefinitonParams<A, B>) {
  _navigations ??= []
  const { from, to, relation } = params

  const sourceTableName = toCamelCase(from.tableName ?? from.source.name)
  const targetTableName = toCamelCase(to.tableName ?? to.target.name)

  const navigationMap: INavigationMap = {
    relation,
    sourceTableName,
    targetTableName,
    target: to.target,
    source: from.source,
    targetProperty: to.withProperty,
    sourceProperty: from.withProperty!,
  }

  if (relation === '*:*') {
    const left: INavigationMap = {
      ...navigationMap,
      relation: '1:*'
    }

    if (!left.targetProperty) {
      throw new Error(`[registerNavigation targetProperty] - Property is required when the relation is '*:*'`)
    }

    const right: INavigationMap = {
      source: left.target,
      target: left.source as Type,
      sourceProperty: left.targetProperty,
      targetProperty: left.sourceProperty,
      sourceTableName: left.targetTableName,
      targetTableName: left.sourceTableName,
      relation: '1:*'
    }

    _navigations.push(left, right)
  }
  else {
    _navigations.push({
      relation,
      sourceTableName,
      targetTableName,
      target: to.target,
      source: from.source,
      targetProperty: to.withProperty,
      sourceProperty: from.withProperty,
    })
  }
}

/**
 * Gets the all navigation maps registered through {@link registerNavigation}.
 *
 * @export
 * @return {INavigationMap[]} An array of navigation map definitions.
 */
export function getNavigationMaps() {
  return _navigations ? [ ..._navigations ] : []
}

/**
 * Gets the navigation maps defined **from** the given database table model
 * type.
 *
 * @export
 * @template A The type of the source database table model.
 * @param {A} type The source database table model.
 * @return {INavigationMap[]} An array of the navigation map definitions.
 */
export function getNavigationMapsOf<A extends Type>(type: A) {
  return _navigations?.filter(it => it.source === type) ?? []
}

/**
 * Removes the registered navigation maps of given database table model.
 *
 * @export
 * @template A The type of the source database table model.
 * @param {A} type The source database table model.
 * @return {boolean} A boolean indicating the operation state. If `false`, then
 * nothing is done.
 */
export function removeNavigationMapsOf<A extends Type>(type: A) {
  if (!_navigations) return false

  for (let i = _navigations.length - 1; i >= 0; --i) {
    const item = _navigations[ i ]
    if (item.source === type) {
      _navigations.splice(i, 1)
    }
  }

  if (_navigations.length === 0) {
    _navigations = undefined
  }

  return true
}
