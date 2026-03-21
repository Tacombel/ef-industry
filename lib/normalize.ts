// Matches valid Roman numerals (I–MMMCMXCIX)
const ROMAN = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i;

function isRoman(word: string): boolean {
  return word.length > 0 && ROMAN.test(word);
}

/**
 * Normalizes a name for consistent storage:
 * - Trims and collapses whitespace
 * - Sentence case (first letter uppercase, rest lowercase)
 * - Roman numerals (II, III, IV…) are kept uppercase
 *
 * Examples:
 *   "iron ore"          → "Iron ore"
 *   "afterburner ii"    → "Afterburner II"
 *   "IRON ORE"          → "Iron ore"
 */
export function normalizeName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;

  const sentenced = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();

  // Uppercase any word that is a valid Roman numeral
  return sentenced.replace(/\b[ivxlcdm]+\b/gi, (word) =>
    isRoman(word) ? word.toUpperCase() : word
  );
}
