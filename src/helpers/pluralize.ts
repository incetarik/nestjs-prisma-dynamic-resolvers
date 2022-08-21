/**
 * Checks whether the input is ending with any of the given endings.
 *
 * @param {string} input The input string.
 * @param {...string[]} endings The possible endings.
 * @return {boolean} `true` if the string was ending with one of the passed
 * endings.
 */
function endsWithAny(input: string, ...endings: string[]) {
  return endings.some(ending => input.endsWith(ending))
}

/**
 * Finds the last vowel in the input.
 * 
 * The search starts from the end of the string.
 *
 * @param {string} input The input string.
 * @return {([ string | undefined, number ])} A tuple of the last vowel
 * string and its index. The index will be `-1` if not found and the string
 * will be `undefined`.
 */
function findLastVowel(input: string): [ string | undefined, number ] {
  for (let i = input.length - 1; i >= 0; --i) {
    const letter = input[ i ]
    if (isVowel(letter)) return [ letter, i ]
  }

  return [ , -1 ]
}

/**
 * Checks whether the given character is a vowel or not.
 * 
 * @param {string} char The character input.
 * @return {boolean} `true` if the given input was a vowel.
 */
function isVowel(char: string) {
  return 'aeiou'.indexOf(char) >= 0
}

/**
 * Pluralizes an input with basic English language rules.
 * 
 * @param {string} input - The input string to pluralize.
 * @return {string} A function that takes a string and returns a pluralized 
 * version of that string.
 */
export function pluralizeBasic(input: string) {
  if (endsWithAny(input, 's', 'x', 'sh', 'ch', 'ss', 'z')) {
    return `${input}es`
  }
  else if (endsWithAny(input, 'y')) {
    const [ _, index ] = findLastVowel(input)
    if (index < 0) return `${index}s`

    if (index == input.length - 2) {
      return `${index}s`
    }
    else {
      return `${input.slice(0, -1)}ies`
    }
  }
  else if (endsWithAny(input, 'ief', 'oof', 'eef', 'ff', 'rf')) {
    return `${input}s`
  }
  else if (endsWithAny(input, 'fe')) {
    return `${input.slice(0, -2)}ves`
  }
  else if (endsWithAny(input, 'f')) {
    return `${input.slice(0, -1)}ves`
  }
  else if (endsWithAny(input, 'o')) {
    if (isVowel(input[ input.length - 2 ])) return `${input}s`
    return `${input}es`
  }

  return `${input}s`
}
