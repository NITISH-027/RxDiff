import { describe, it, expect } from 'vitest';
import {
  canonicalizeMedicationName,
  calculateSimilarity,
  detectAfterDuplicates,
  matchMedicationMentions,
  classifyMedicationPair,
  sortDiffsByReviewPriority,
  buildDiffReport,
} from '../diffEngine.js';
import { CASE_A, CASE_B, CASE_C } from '../../data/syntheticCases.js';
import type {
  MedicationMention,
  SourceDocument,
  MedicationDiff,
} from '../../types/medication.js';

const mockMention = (overrides: Partial<MedicationMention> = {}): MedicationMention => ({
  mention_id: 'mention-1',
  raw_text: 'Metformin 500 mg tablet once daily',
  raw_name: 'Metformin',
  normalized_name: 'metformin',
  strength_value: 500,
  strength_unit: 'mg',
  dose_quantity: 1,
  dose_form: 'tablet',
  route: 'oral',
  frequency_raw: 'once daily',
  frequency_per_day: 1,
  timing: null,
  duration: null,
  status_word: 'none',
  evidence_quote: 'Metformin 500 mg tablet once daily',
  confidence: 0.95,
  ...overrides,
});

const mockDoc = (id: 'before' | 'after', meds: MedicationMention[]): SourceDocument => ({
  document_id: id,
  document_type: id === 'before' ? 'prescription' : 'discharge_list',
  medications: meds,
  extraction_warnings: [],
});

describe('Deterministic Diff Engine - Bundled Synthetic Cases', () => {
  it('CASE A: correctly identifies frequency_changed, unchanged, explicitly_stopped, and started', () => {
    const report = buildDiffReport(CASE_A.beforeDoc, CASE_A.afterDoc);

    expect(report.counts.frequency_changed).toBe(1);
    expect(report.counts.unchanged).toBe(2); // amlodipine, pantoprazole
    expect(report.counts.explicitly_stopped).toBe(1); // atorvastatin
    expect(report.counts.started).toBe(1); // rosuvastatin

    const metforminDiff = report.diffs.find((d) =>
      d.after_evidence?.toLowerCase().includes('metformin')
    );
    expect(metforminDiff?.category).toBe('frequency_changed');
    expect(metforminDiff?.changed_fields).toContain('frequency');

    const amlodipineDiff = report.diffs.find((d) =>
      d.after_evidence?.toLowerCase().includes('amlodipine')
    );
    expect(amlodipineDiff?.category).toBe('unchanged');

    const atorvastatinDiff = report.diffs.find((d) =>
      d.after_evidence?.toLowerCase().includes('atorvastatin')
    );
    expect(atorvastatinDiff?.category).toBe('explicitly_stopped');

    const rosuvastatinDiff = report.diffs.find((d) =>
      d.after_evidence?.toLowerCase().includes('rosuvastatin')
    );
    expect(rosuvastatinDiff?.category).toBe('started');
    expect(rosuvastatinDiff?.explanation).toBe(
      'Appears on the new list; confirm whether to start.'
    );

    const pantoprazoleDiff = report.diffs.find((d) =>
      d.after_evidence?.toLowerCase().includes('pantoprazole')
    );
    expect(pantoprazoleDiff?.category).toBe('unchanged');
  });

  it('CASE B: absent medication becomes NEEDS_CONFIRMATION, NEVER stopped', () => {
    const report = buildDiffReport(CASE_B.beforeDoc, CASE_B.afterDoc);

    expect(report.counts.unchanged).toBe(1); // levothyroxine
    expect(report.counts.needs_confirmation).toBe(1); // calcium carbonate
    expect(report.counts.explicitly_stopped).toBe(0); // MUST be 0!

    const calciumDiff = report.diffs.find((d) =>
      d.before_evidence?.toLowerCase().includes('calcium carbonate')
    );
    expect(calciumDiff).toBeDefined();
    expect(calciumDiff?.category).toBe('needs_confirmation');
    expect(calciumDiff?.match_basis).toBe('unmatched');
    expect(calciumDiff?.before_evidence).toContain('Calcium carbonate 500 mg tablet, twice daily');
    expect(calciumDiff?.after_evidence).toBeNull();
    expect(calciumDiff?.explanation).toContain('Appears on the previous list but missing from the new list');
  });

  it('CASE C: transparent alias match and POSSIBLE_DUPLICATE detected among AFTER entries', () => {
    const report = buildDiffReport(CASE_C.beforeDoc, CASE_C.afterDoc);

    expect(report.counts.possible_duplicate).toBe(1);
    const aliasDiff = report.diffs.find((d) => d.match_basis === 'alias_table');
    expect(aliasDiff).toBeDefined();

    const duplicateDiff = report.diffs.find((d) => d.category === 'possible_duplicate');
    expect(duplicateDiff).toBeDefined();
    expect(duplicateDiff?.after_evidence).toContain('Glucophage 500 mg tablet');
  });
});

describe('Non-Negotiable Medical Safety Rules', () => {
  it('Safety Rule: Missing from AFTER is NEVER classified as stopped (Omission -> NEEDS_CONFIRMATION)', () => {
    const beforeMed = mockMention({
      mention_id: 'b-omitted',
      raw_name: 'Lisinopril',
      normalized_name: 'lisinopril',
      evidence_quote: 'Lisinopril 10 mg once daily',
    });
    const beforeDoc = mockDoc('before', [beforeMed]);
    const afterDoc = mockDoc('after', []);

    const report = buildDiffReport(beforeDoc, afterDoc);

    expect(report.diffs).toHaveLength(1);
    expect(report.diffs[0]?.category).toBe('needs_confirmation');
    expect(report.diffs[0]?.category).not.toBe('explicitly_stopped');
    expect(report.diffs[0]?.explanation).toBe(
      'Appears on the previous list but missing from the new list; confirm whether it was intentionally omitted or discontinued.'
    );
  });

  it('Safety Rule: Fuzzy name similarity never proves equivalence (Fuzzy -> NEEDS_CONFIRMATION)', () => {
    const beforeMed = mockMention({
      mention_id: 'b-pred',
      raw_name: 'Prednisone',
      normalized_name: 'prednisone',
      evidence_quote: 'Prednisone 10 mg oral tablet',
    });
    const afterMed = mockMention({
      mention_id: 'a-pred-l',
      raw_name: 'Prednisolone',
      normalized_name: 'prednisolone',
      evidence_quote: 'Prednisolone 10 mg oral tablet',
    });

    const similarity = calculateSimilarity('prednisone', 'prednisolone');
    expect(similarity).toBeGreaterThanOrEqual(0.8);

    const report = buildDiffReport(mockDoc('before', [beforeMed]), mockDoc('after', [afterMed]));
    const diff = report.diffs[0];

    expect(diff?.match_basis).toBe('fuzzy_candidate');
    expect(diff?.category).toBe('needs_confirmation');
    expect(diff?.explanation).toContain('Names are similar but drug equivalence cannot be assumed');
  });

  it('Safety Rule: Low confidence (< 0.8) becomes NEEDS_CONFIRMATION', () => {
    const beforeMed = mockMention({
      mention_id: 'b-low-conf',
      raw_name: 'Atorvastatin',
      normalized_name: 'atorvastatin',
      confidence: 0.75, // Below 0.8 threshold
      evidence_quote: 'Atorvastatin 20 mg',
    });
    const afterMed = mockMention({
      mention_id: 'a-high-conf',
      raw_name: 'Atorvastatin',
      normalized_name: 'atorvastatin',
      confidence: 0.95,
      evidence_quote: 'Atorvastatin 20 mg',
    });

    const report = buildDiffReport(mockDoc('before', [beforeMed]), mockDoc('after', [afterMed]));
    expect(report.diffs[0]?.category).toBe('needs_confirmation');
    expect(report.diffs[0]?.explanation).toContain('confidence is below the clinical threshold');
  });

  it('Safety Rule: Missing evidence quote becomes NEEDS_CONFIRMATION', () => {
    const beforeMed = mockMention({
      mention_id: 'b-no-quote',
      raw_name: 'Metoprolol',
      normalized_name: 'metoprolol',
      evidence_quote: '', // Empty quote
    });
    const afterMed = mockMention({
      mention_id: 'a-quote',
      raw_name: 'Metoprolol',
      normalized_name: 'metoprolol',
      evidence_quote: 'Metoprolol 25 mg once daily',
    });

    const report = buildDiffReport(mockDoc('before', [beforeMed]), mockDoc('after', [afterMed]));
    expect(report.diffs[0]?.category).toBe('needs_confirmation');
    expect(report.diffs[0]?.explanation).toContain('Missing source evidence quote');
  });

  it('Safety Rule: Null versus known value is NOT a change (becomes NEEDS_CONFIRMATION)', () => {
    // Before has known strength 500mg, After has null strength
    const beforeMed = mockMention({
      mention_id: 'b-strength',
      strength_value: 500,
      strength_unit: 'mg',
    });
    const afterMed = mockMention({
      mention_id: 'a-strength-null',
      strength_value: null,
      strength_unit: null,
    });

    const report = buildDiffReport(mockDoc('before', [beforeMed]), mockDoc('after', [afterMed]));
    expect(report.diffs[0]?.category).toBe('needs_confirmation');
    expect(report.diffs[0]?.category).not.toBe('strength_changed');
    expect(report.diffs[0]?.explanation).toContain('unspecified or missing fields');
  });

  it('Safety Rule: Multi-field conflict precedence (route > dose > strength > frequency)', () => {
    // Both route and frequency changed
    const beforeMed = mockMention({
      route: 'oral',
      frequency_per_day: 1,
      dose_quantity: 1,
      strength_value: 10,
    });
    const afterMed = mockMention({
      route: 'intravenous',
      frequency_per_day: 2,
      dose_quantity: 1,
      strength_value: 10,
    });

    const report = buildDiffReport(mockDoc('before', [beforeMed]), mockDoc('after', [afterMed]));
    const diff = report.diffs[0];

    expect(diff?.category).toBe('route_changed');
    expect(diff?.changed_fields).toContain('route');
    expect(diff?.changed_fields).toContain('frequency');

    // Both dose and strength changed
    const beforeMed2 = mockMention({
      dose_quantity: 1,
      strength_value: 10,
    });
    const afterMed2 = mockMention({
      dose_quantity: 2,
      strength_value: 20,
    });

    const report2 = buildDiffReport(mockDoc('before', [beforeMed2]), mockDoc('after', [afterMed2]));
    const diff2 = report2.diffs[0];

    expect(diff2?.category).toBe('dose_changed');
    expect(diff2?.changed_fields).toContain('dose');
    expect(diff2?.changed_fields).toContain('strength');
  });

  it('Safety Rule: EXPLICITLY_STOPPED requires explicit stop/hold wording', () => {
    const beforeMed = mockMention({
      mention_id: 'b-simva',
      raw_name: 'Simvastatin',
      normalized_name: 'simvastatin',
    });
    const afterMed = mockMention({
      mention_id: 'a-simva-stop',
      raw_name: 'Simvastatin',
      normalized_name: 'simvastatin',
      status_word: 'stop',
      evidence_quote: 'STOP Simvastatin 20 mg tablet',
    });

    const report = buildDiffReport(mockDoc('before', [beforeMed]), mockDoc('after', [afterMed]));
    expect(report.diffs[0]?.category).toBe('explicitly_stopped');
    expect(report.diffs[0]?.explanation).toContain('discontinued or held');
  });

  it('Safety Rule: Every result retains exact evidence lines and review_required = true', () => {
    const report = buildDiffReport(CASE_A.beforeDoc, CASE_A.afterDoc);

    for (const diff of report.diffs) {
      expect(diff.review_required).toBe(true);
      if (diff.before_mention_id) {
        expect(diff.before_evidence).toBeTruthy();
      }
      if (diff.after_mention_id) {
        expect(diff.after_evidence).toBeTruthy();
      }
    }
  });

  it('Safety Rule: Canonicalization strips form tokens while preserving drug names', () => {
    expect(canonicalizeMedicationName('Metformin 500 mg tablet')).toBe('metformin');
    expect(canonicalizeMedicationName('Amlodipine 5 mg capsules')).toBe('amlodipine');
    expect(canonicalizeMedicationName('Amoxicillin 250 mg / 5 ml syrup')).toBe('amoxicillin');
    expect(canonicalizeMedicationName('Albuterol inhaler')).toBe('albuterol');
    expect(canonicalizeMedicationName('CONTINUE Metformin 500 mg tablet')).toBe('metformin');
    expect(canonicalizeMedicationName('STOP Atorvastatin 10 mg tablet')).toBe('atorvastatin');
  });

  it('Direct pure function testing: detectAfterDuplicates, matchMedicationMentions, classifyMedicationPair', () => {
    const med1 = mockMention({ mention_id: 'd1', raw_name: 'Metformin', normalized_name: 'metformin' });
    const med2 = mockMention({ mention_id: 'd2', raw_name: 'Glucophage', normalized_name: 'glucophage' });
    
    // detectAfterDuplicates
    const dups = detectAfterDuplicates([med1, med2]);
    expect(dups).toHaveLength(1);
    expect(dups[0]?.duplicateId).toBe('d2');

    // matchMedicationMentions
    const pairs = matchMedicationMentions([med1], [med1]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.matchBasis).toBe('exact_name');

    // classifyMedicationPair
    const classified = classifyMedicationPair(pairs[0]!, 0);
    expect(classified.category).toBe('unchanged');
    expect(classified.review_required).toBe(true);
  });

  it('Priority sorting places safety-critical items first', () => {
    const createPartialDiff = (id: string, category: MedicationDiff['category']): MedicationDiff => ({
      diff_id: id,
      before_mention_id: null,
      after_mention_id: null,
      match_basis: 'unmatched',
      match_confidence: 1.0,
      category,
      changed_fields: [],
      explanation: 'test',
      before_evidence: null,
      after_evidence: null,
      review_required: true,
    });

    const unsorted: MedicationDiff[] = [
      createPartialDiff('1', 'unchanged'),
      createPartialDiff('2', 'needs_confirmation'),
      createPartialDiff('3', 'explicitly_stopped'),
      createPartialDiff('4', 'started'),
      createPartialDiff('5', 'route_changed'),
      createPartialDiff('6', 'possible_duplicate'),
    ];

    const sorted = sortDiffsByReviewPriority(unsorted);
    expect(sorted.map((s) => s.category)).toEqual([
      'explicitly_stopped',
      'route_changed',
      'possible_duplicate',
      'started',
      'needs_confirmation',
      'unchanged',
    ]);
  });
});
