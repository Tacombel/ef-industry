/**
 * Normalizes a name for consistent storage:
 * - Trims leading/trailing whitespace
 * - Collapses internal whitespace to single spaces
 * - Sentence case: first letter uppercase, rest lowercase
 *
 * Examples:
 *   "iron ore"          → "Iron ore"
 *   "IRON ORE"          → "Iron ore"
 *   "  Iron  Ore  "     → "Iron  ore" (internal spaces collapsed first)
 */
export function normalizeName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}
