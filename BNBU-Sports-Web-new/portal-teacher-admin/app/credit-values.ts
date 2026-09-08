/** An aggregate is known only when every contributing duration is known. */
export function sumKnownCredits(values: readonly (number | null | undefined)[]): number | null {
  let total = 0;
  for (const value of values) {
    if (value == null || !Number.isFinite(value) || value < 0) return null;
    total += value;
    if (!Number.isFinite(total)) return null;
  }
  return total;
}
