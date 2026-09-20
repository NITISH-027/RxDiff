import { describe, it, expect } from 'vitest';
import { formatClinicalSummaryText } from '../exportSummary.js';
import { CASE_A } from '../../data/syntheticCases.js';
import { buildDiffReport } from '../../engine/diffEngine.js';
import { createPresentationModel } from '../../adapters/presentationAdapter.js';

describe('formatClinicalSummaryText', () => {
  it('formats clinical summary with required safety notices, counts, and sign-off blocks', () => {
    const report = buildDiffReport(CASE_A.beforeDoc, CASE_A.afterDoc);
    const model = createPresentationModel(CASE_A, report);

    const summary = formatClinicalSummaryText(model);

    expect(summary).toContain('RXDIFF CLINICAL RECONCILIATION SUMMARY');
    expect(summary).toContain('Safety Notice: Do not start, stop, or alter medications based solely on automated reconciliation.');
    expect(summary).toContain('ITEMS REQUIRING CLINICAL REVIEW (3)');
    expect(summary).toContain('CONTINUING MEDICATIONS (2)');
    expect(summary).toContain('Reviewing Clinician:');
    expect(summary).toContain('Pharmacist Verified');
    expect(summary).toContain('Clarified with Prescriber');
  });
});
