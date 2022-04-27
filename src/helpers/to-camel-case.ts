/**
 * Creates another string where the first letter of it is uncapitalized.
 *
 * @export
 * @param {string} value The input string.
 * @return {string} A string which is camel-cased.
 */
export function toCamelCase(value: string) {
  return value.replace(/\b(\p{Alpha})(.*?)\b/u, (_string, match, rest) => {
    return match.toLowerCase() + rest
  })
}
