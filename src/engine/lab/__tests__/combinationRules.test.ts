import { describe, it, expect } from 'vitest';
import { evaluateCombinationRules } from '../combinationRules.js';
import { canonicalizeTestKey, deriveFasting, applyDeterministicIdentity } from '../labAliases.js';
import { buildLabReviewReport } from '../labReviewEngine.js';
import type { FlaggedResult, LabResult, LabReportDocument } from '../../../types/labReport.js';

function makeFlagged(overrides: Partial<LabResult> & { flag?: 'high' | 'low' | 'within_range' | 'cant_assess' } = {}): FlaggedResult {
  const { flag = 'within_range', ...resultOverrides } = overrides;
  const result: LabResult = {
    result_id: 'res-1',
    raw_text: 'Test 1.0',
    test_name_raw: 'Test',
    test_key: 'other',
    value_numeric: 1.0,
    value_text: null,
    unit: 'mg/dL',
    reference_range_raw: '0.5 - 1.5',
    fasting: null,
    evidence_quote: 'Test 1.0',
    user_edited: false,
    ...resultOverrides,
  };
  return {
    result,
    flag,
    flag_reason: 'reason',
    parsed_range_label: '0.5 - 1.5',
  };
}

describe('labAliases', () => {
  it('maps known aliases to canonical test keys', () => {
    expect(canonicalizeTestKey('Glycated Hemoglobin')).toBe('hba1c');
    expect(canonicalizeTestKey('Hb A1c')).toBe('hba1c');
    expect(canonicalizeTestKey('Hb')).toBe('hemoglobin');
    expect(canonicalizeTestKey('Mean Corpuscular Volume')).toBe('mcv');
    expect(canonicalizeTestKey('Serum Creatinine')).toBe('creatinine');
    expect(canonicalizeTestKey('Blood Urea Nitrogen')).toBe('bun');
    expect(canonicalizeTestKey('Random Unknown Lab Marker')).toBe('other');
  });

  it('derives fasting status tri-state deterministically', () => {
    expect(deriveFasting('Fasting Blood Sugar', 'FBS: 120 mg/dL')).toBe(true);
    expect(deriveFasting('Glucose', 'Fasting Blood Glucose 95 mg/dL')).toBe(true);
    expect(deriveFasting('Random Blood Sugar', 'RBS: 160 mg/dL')).toBe(false);
    expect(deriveFasting('Glucose', 'Post Prandial Blood Glucose: 180')).toBe(false);
    expect(deriveFasting('Glucose', 'Serum Glucose: 100 mg/dL')).toBeNull();
  });

  it('applies deterministic identity helper', () => {
    const raw = { test_name_raw: 'Fasting Plasma Glucose', raw_text: 'FPG 110 mg/dL' };
    const identified = applyDeterministicIdentity(raw);
    expect(identified.test_key).toBe('glucose');
    expect(identified.fasting).toBe(true);
  });
});

describe('combinationRules', () => {
  it('fires Rule 1: fasting glucose HIGH + HbA1c HIGH (mg/dL and %)', () => {
    const glucose = makeFlagged({
      result_id: 'g-1',
      test_key: 'glucose',
      fasting: true,
      unit: 'mg/dL',
      flag: 'high',
    });
    const hba1c = makeFlagged({
      result_id: 'h-1',
      test_key: 'hba1c',
      unit: '%',
      flag: 'high',
    });

    const prompts = evaluateCombinationRules([glucose, hba1c]);
    expect(prompts).toHaveLength(1);
    expect(prompts[0].rule_id).toBe('glucose-hba1c-high');
    expect(prompts[0].message).toContain('may require further medical review.');
    expect(prompts[0].evidence_result_ids).toEqual(['g-1', 'h-1']);
  });

  it('blocks Rule 1 if glucose fasting is false or null', () => {
    const randomGlucose = makeFlagged({
      result_id: 'g-1',
      test_key: 'glucose',
      fasting: false,
      unit: 'mg/dL',
      flag: 'high',
    });
    const unstatedGlucose = makeFlagged({
      result_id: 'g-2',
      test_key: 'glucose',
      fasting: null,
      unit: 'mg/dL',
      flag: 'high',
    });
    const hba1c = makeFlagged({
      result_id: 'h-1',
      test_key: 'hba1c',
      unit: '%',
      flag: 'high',
    });

    expect(evaluateCombinationRules([randomGlucose, hba1c])).toHaveLength(0);
    expect(evaluateCombinationRules([unstatedGlucose, hba1c])).toHaveLength(0);
  });

  it('blocks Rule 1 if either side is cant_assess or not high', () => {
    const glucoseCantAssess = makeFlagged({
      result_id: 'g-1',
      test_key: 'glucose',
      fasting: true,
      unit: 'mg/dL',
      flag: 'cant_assess',
    });
    const hba1c = makeFlagged({
      result_id: 'h-1',
      test_key: 'hba1c',
      unit: '%',
      flag: 'high',
    });
    expect(evaluateCombinationRules([glucoseCantAssess, hba1c])).toHaveLength(0);
  });

  it('blocks Rule 1 if unit is not in accepted set (e.g. glucose in g/L)', () => {
    const glucoseWrongUnit = makeFlagged({
      result_id: 'g-1',
      test_key: 'glucose',
      fasting: true,
      unit: 'g/L',
      flag: 'high',
    });
    const hba1c = makeFlagged({
      result_id: 'h-1',
      test_key: 'hba1c',
      unit: '%',
      flag: 'high',
    });
    expect(evaluateCombinationRules([glucoseWrongUnit, hba1c])).toHaveLength(0);
  });

  it('fires Rule 2 on low hemoglobin and low mcv, and blocks on unit mismatch', () => {
    const hb = makeFlagged({ result_id: 'hb-1', test_key: 'hemoglobin', unit: 'g/dL', flag: 'low' });
    const mcv = makeFlagged({ result_id: 'mcv-1', test_key: 'mcv', unit: 'fL', flag: 'low' });

    const prompts = evaluateCombinationRules([hb, mcv]);
    expect(prompts).toHaveLength(1);
    expect(prompts[0].rule_id).toBe('hemoglobin-mcv-low');

    // Blocked by wrong unit
    const hbWrongUnit = makeFlagged({ result_id: 'hb-2', test_key: 'hemoglobin', unit: 'mg/dL', flag: 'low' });
    expect(evaluateCombinationRules([hbWrongUnit, mcv])).toHaveLength(0);
  });

  it('fires Rule 3 on high creatinine and high bun, and blocks on unit mismatch', () => {
    const creat = makeFlagged({ result_id: 'cr-1', test_key: 'creatinine', unit: 'mg/dL', flag: 'high' });
    const bun = makeFlagged({ result_id: 'bun-1', test_key: 'bun', unit: 'mg/dL', flag: 'high' });

    const prompts = evaluateCombinationRules([creat, bun]);
    expect(prompts).toHaveLength(1);
    expect(prompts[0].rule_id).toBe('creatinine-bun-high');

    // Blocked by wrong unit
    const bunWrongUnit = makeFlagged({ result_id: 'bun-2', test_key: 'bun', unit: 'mmol/L', flag: 'high' });
    expect(evaluateCombinationRules([creat, bunWrongUnit])).toHaveLength(0);
  });

  it('asserts same-report property: never emits duplicate result ids', () => {
    // If a single result somehow matched both inputs (a.result_id === b.result_id)
    const mock = makeFlagged({
      result_id: 'same-id',
      test_key: 'glucose',
      fasting: true,
      unit: 'mg/dL',
      flag: 'high',
    });
    expect(evaluateCombinationRules([mock, mock])).toHaveLength(0);
  });
});

describe('labReviewEngine', () => {
  it('builds full review report with counts and limitations', () => {
    const doc: LabReportDocument = {
      document_id: 'lab-report',
      results: [
        {
          result_id: 'r1',
          raw_text: 'Hemoglobin 9.2 g/dL (13.0 - 17.0)',
          test_name_raw: 'Hemoglobin',
          test_key: 'hemoglobin',
          value_numeric: 9.2,
          value_text: null,
          unit: 'g/dL',
          reference_range_raw: '13.0 - 17.0',
          fasting: null,
          evidence_quote: 'Hemoglobin 9.2 g/dL (13.0 - 17.0)',
          user_edited: false,
        },
      ],
      extraction_warnings: [],
    };

    const report = buildLabReviewReport(doc);
    expect(report.flagged_results).toHaveLength(1);
    expect(report.counts.low).toBe(1);
    expect(report.counts.high).toBe(0);
    expect(report.limitations).toHaveLength(4);
  });
});
