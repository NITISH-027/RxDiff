import { describe, it } from 'vitest';
import { buildDiffReport } from '../diffEngine.js';
import { CASE_A, CASE_B, CASE_C } from '../../data/syntheticCases.js';

describe('Print Category Outputs', () => {
  it('outputs Case A, B, and C', () => {
    const reportA = buildDiffReport(CASE_A.beforeDoc, CASE_A.afterDoc);
    const reportB = buildDiffReport(CASE_B.beforeDoc, CASE_B.afterDoc);
    const reportC = buildDiffReport(CASE_C.beforeDoc, CASE_C.afterDoc);

    console.log('=== CASE A DIFFS ===');
    for (const d of reportA.diffs) {
      console.log(`[${d.category}] before: "${d.before_evidence || 'none'}" | after: "${d.after_evidence || 'none'}"`);
    }

    console.log('=== CASE B DIFFS ===');
    for (const d of reportB.diffs) {
      console.log(`[${d.category}] before: "${d.before_evidence || 'none'}" | after: "${d.after_evidence || 'none'}"`);
    }

    console.log('=== CASE C DIFFS ===');
    for (const d of reportC.diffs) {
      console.log(`[${d.category}] (basis: ${d.match_basis}) before: "${d.before_evidence || 'none'}" | after: "${d.after_evidence || 'none'}"`);
    }
  });
});
