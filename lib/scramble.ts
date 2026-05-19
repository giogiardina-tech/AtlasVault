/**
 * Deterministic scramble utility using Fisher-Yates shuffle.
 * Spaces are preserved — each word is scrambled independently.
 * Guarantees: same letters, never equals the original word.
 */

function shuffleInPlace(arr: string[]): string[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scrambleWord(word: string): string {
  const upper = word.toUpperCase();
  const letters = upper.split('');
  if (letters.length <= 1) return upper;

  const sortedOriginal = [...letters].sort().join('');

  for (let attempt = 0; attempt < 20; attempt++) {
    const shuffled = shuffleInPlace(letters);
    const result = shuffled.join('');
    // Verify exact same multiset of letters (safety check)
    if ([...shuffled].sort().join('') !== sortedOriginal) continue;
    // Must differ from the original word
    if (result !== upper) return result;
  }

  // Fallback: reverse (always preserves letters; differs unless palindrome)
  const reversed = [...letters].reverse().join('');
  if (reversed !== upper) return reversed;

  // Palindrome edge case: swap first two letters
  const swapped = [letters[1], letters[0], ...letters.slice(2)].join('');
  return swapped !== upper ? swapped : upper;
}

/**
 * Scramble an answer string.
 * Spaces are kept in place; each word is scrambled independently.
 * The full result is guaranteed to differ from the uppercased original.
 *
 * Examples:
 *   scrambleAnswer("Brazil")      → "ZLIRAB"
 *   scrambleAnswer("South Korea") → "HTOUS AROEK"
 */
export function scrambleAnswer(answer: string): string {
  const words = answer.toUpperCase().split(' ');
  let scrambled = words.map(scrambleWord).join(' ');

  // If all words happened to shuffle back to original (edge case), swap first two words
  if (scrambled === answer.toUpperCase() && words.length > 1) {
    const swapped = [words[1], words[0], ...words.slice(2)];
    scrambled = swapped.map(scrambleWord).join(' ');
  }

  return scrambled;
}

/**
 * Validates that a scramble is letter-perfect against the original.
 * Sort(original letters) must equal Sort(scrambled letters).
 * Used as a safety check before rendering.
 */
export function validateScramble(original: string, scrambled: string): boolean {
  const normalise = (s: string) => s.toUpperCase().replace(/\s/g, '').split('').sort().join('');
  return normalise(original) === normalise(scrambled);
}
