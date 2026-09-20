import { describe, it, expect } from 'vitest';
import {
  createPresentationModel,
  mapUserFacingCategory,
  derivePatientQuestion,
} from '../presentationAdapter.js';
import { CASE_A, CASE_B, CASE_C } from '../../data/syntheticCases.js';
import { buildDiffReport } from '../../engine/diffEngine.js';

describe('Presentation Adapter', () => {
  it('maps all categories to strict safe clinical user-facing labels', () => {
    expect(mapUserFacingCategory('started')).toBe('APPEARS NEW');
    expect(mapUserFacingCategory('explicitly_stopped')).toBe('EXPLICIT STOP WORDING');
    expect(mapUserFacingCategory('strength_changed')).toBe('CHANGED');
    expect(mapUserFacingCategory('frequency_changed')).toBe('CHANGED');
    expect(mapUserFacingCategory('dose_changed')).toBe('CHANGED');
    expect(mapUserFacingCategory('route_changed')).toBe('CHANGED');
    expect(mapUserFacingCategory('possible_duplicate')).toBe('POSSIBLE DUPLICATE');
    expect(mapUserFacingCategory('needs_confirmation')).toBe('NEEDS CONFIRMATION');
    expect(mapUserFacingCategory('unchanged')).toBe('TEXT MATCHED');
  });

  it('Case A: maps rosuvastatin to APPEARS NEW and atorvastatin to EXPLICIT STOP WORDING', () => {
    const report = buildDiffReport(CASE_A.beforeDoc, CASE_A.afterDoc);
    const model = createPresentationModel(CASE_A, report);

    const rosuvastatin = model.diffItems.find((d) => d.displayName.toLowerCase().includes('rosuvastatin'));
    expect(rosuvastatin?.userFacingCategory).toBe('APPEARS NEW');
    expect(rosuvastatin?.actionBadge).toBe('CONFIRM');

    const atorvastatin = model.diffItems.find((d) => d.displayName.toLowerCase().includes('atorvastatin'));
    expect(atorvastatin?.userFacingCategory).toBe('EXPLICIT STOP WORDING');
    expect(atorvastatin?.actionBadge).toBe('CONFIRM');

    const metformin = model.diffItems.find((d) => d.displayName.toLowerCase().includes('metformin'));
    expect(metformin?.userFacingCategory).toBe('CHANGED');
    expect(metformin?.transformationText).toContain('Frequency');
  });

  it('Case B: omission is NEVER EXPLICIT STOP WORDING, strictly NEEDS CONFIRMATION', () => {
    const report = buildDiffReport(CASE_B.beforeDoc, CASE_B.afterDoc);
    const model = createPresentationModel(CASE_B, report);

    const calcium = model.diffItems.find((d) => d.displayName.toLowerCase().includes('calcium'));
    expect(calcium?.userFacingCategory).toBe('NEEDS CONFIRMATION');
    expect(calcium?.userFacingCategory).not.toBe('EXPLICIT STOP WORDING');
    expect(calcium?.userFacingCategory).not.toBe('CHANGED');
    expect(calcium?.actionBadge).toBe('CONFIRM');
    expect(calcium?.patientQuestion).toContain('Calcium carbonate');
    expect(calcium?.patientQuestion).not.toContain('diff #');
  });

  it('Case C: handles alias mapping and duplicate detection labels', () => {
    const report = buildDiffReport(CASE_C.beforeDoc, CASE_C.afterDoc);
    const model = createPresentationModel(CASE_C, report);

    const duplicate = model.diffItems.find((d) => d.userFacingCategory === 'POSSIBLE DUPLICATE');
    expect(duplicate).toBeDefined();
    expect(duplicate?.actionBadge).toBe('CONFIRM');

    const matched = model.diffItems.find((d) => d.userFacingCategory === 'TEXT MATCHED');
    expect(matched).toBeDefined();
    expect(matched?.actionBadge).toBe('MATCHED TEXT');
  });

  it('generates patient questions using real medication names and never raw diff IDs', () => {
    const q = derivePatientQuestion('Lisinopril', {
      diff_id: 'diff-42',
      before_mention_id: 'b1',
      after_mention_id: null,
      match_basis: 'unmatched',
      match_confidence: 0,
      category: 'needs_confirmation',
      changed_fields: [],
      explanation: 'omitted',
      before_evidence: 'Lisinopril 10 mg',
      after_evidence: null,
      review_required: true,
    }, null, null);

    expect(q).toContain('Lisinopril');
    expect(q).not.toContain('diff-42');
    expect(q).not.toContain('diff #');
  });

  it('derives correct summary count text', () => {
    const reportA = buildDiffReport(CASE_A.beforeDoc, CASE_A.afterDoc);
    const modelA = createPresentationModel(CASE_A, reportA);
    // 4 before, 5 after, 3 to confirm (atorvastatin, metformin, rosuvastatin)
    expect(modelA.summaryText).toBe('4 BEFORE / 5 AFTER / 3 TO CONFIRM');
  });
});
