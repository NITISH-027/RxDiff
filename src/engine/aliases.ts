/**
 * Transparent demo alias table.
 *
 * NON-NEGOTIABLE MEDICAL RULE:
 * Brand/generic equivalence may come ONLY from a small transparent local alias table
 * used in synthetic demos. Never infer equivalence through generative AI or unverified lookups.
 */
export const DEMO_ALIAS_TABLE: Readonly<Record<string, string>> = Object.freeze({
  glucophage: 'metformin',
});

/**
 * Check whether two medication names are aliases according to the provided alias table.
 */
export function areAliases(
  nameA: string,
  nameB: string,
  aliasTable: Record<string, string> = DEMO_ALIAS_TABLE
): boolean {
  const a = nameA.toLowerCase().trim();
  const b = nameB.toLowerCase().trim();

  if (!a || !b) return false;
  if (a === b) return true;

  if (aliasTable[a] === b || aliasTable[b] === a) {
    return true;
  }

  const targetA = aliasTable[a];
  const targetB = aliasTable[b];
  if (targetA && targetB && targetA === targetB) {
    return true;
  }

  return false;
}
