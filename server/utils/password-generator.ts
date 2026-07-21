const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const NUMBERS = '0123456789'
const SPECIAL = '!@#$%^&*'

const WORDS = [
  'apple', 'river', 'cloud', 'stone', 'light', 'bridge', 'forest', 'ocean',
  'meadow', 'silver', 'golden', 'winter', 'summer', 'anchor', 'compass',
  'crystal', 'ember', 'falcon', 'garden', 'harbor', 'island', 'journey',
  'kernel', 'lantern', 'mirror', 'north', 'oracle', 'planet', 'quartz',
  'rocket', 'shadow', 'thunder', 'union', 'valley', 'willow', 'zenith',
]

function randomChar(pool: string): string {
  return pool[Math.floor(Math.random() * pool.length)]!
}

export function generatePassword(options: {
  length: number
  uppercase: boolean
  lowercase: boolean
  number: boolean
  special: boolean
}): string {
  let pool = ''
  const required: string[] = []

  if (options.uppercase) {
    pool += UPPER
    required.push(randomChar(UPPER))
  }
  if (options.lowercase) {
    pool += LOWER
    required.push(randomChar(LOWER))
  }
  if (options.number) {
    pool += NUMBERS
    required.push(randomChar(NUMBERS))
  }
  if (options.special) {
    pool += SPECIAL
    required.push(randomChar(SPECIAL))
  }

  if (!pool) {
    pool = LOWER + NUMBERS
  }

  const length = Math.max(options.length, required.length)
  const chars = [...required]

  while (chars.length < length) {
    chars.push(randomChar(pool))
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[chars[i], chars[j]] = [chars[j]!, chars[i]!]
  }

  return chars.join('')
}

export function generatePassphrase(
  words: number,
  separator: string,
  capitalize: boolean,
): string {
  const count = Math.max(3, Math.min(words, 12))
  const selected: string[] = []

  while (selected.length < count) {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)]!
    if (!selected.includes(word)) {
      selected.push(capitalize ? word.charAt(0).toUpperCase() + word.slice(1) : word)
    }
  }

  return selected.join(separator)
}
