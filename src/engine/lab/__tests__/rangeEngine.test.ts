import { describe, it, expect } from 'vitest';
import { flagLabResult } from '../rangeEngine.js';
import type { LabResult } from '../../../types/labReport.js';

function makeResult(overrides: Partial<LabResult> = {}): LabResult {
  return {
    result_id: 'test-1',
    raw_text: 'Hemoglobin 14.5 g/dL (13.0 - 17.0)',
    test_name_raw: 'Hemoglobin',
    test_key: 'hemoglobin',
    value_numeric: 14.5,
    value_text: null,
    unit: 'g/dL',
    reference_range_raw: '13.0 - 17.0',
    fasting: null,
    evidence_quote: 'Hemoglobin 14.5 g/dL (13.0 - 17.0)',
    user_edited: false,
    ...overrides,
  };
}

describe('rangeEngine', () => {
  describe('Interval evaluations', () => {
    it('flags low when below min', () => {
      const res = flagLabResult(makeResult({ value_numeric: 9.2 }));
      expect(res.flag).toBe('low');
      expect(res.flag_reason).toContain('LOW: value 9.2 g/dL vs printed range "13.0 - 17.0"');
    });

    it('flags high when above max', () => {
      const res = flagLabResult(makeResult({ value_numeric: 18.1 }));
      expect(res.flag).toBe('high');
      expect(res.flag_reason).toContain('HIGH: value 18.1 g/dL vs printed range "13.0 - 17.0"');
    });

    it('flags within_range on exact min and exact max', () => {
      const atMin = flagLabResult(makeResult({ value_numeric: 13.0 }));
      expect(atMin.flag).toBe('within_range');

      const atMax = flagLabResult(makeResult({ value_numeric: 17.0 }));
      expect(atMax.flag).toBe('within_range');
    });
  });

  describe('Equality at bounds for inequalities', () => {
    // Normal < 200: normal is strictly below 200. Value 200 itself is OUT (high). 199 is within.
    it('evaluates < bound correctly', () => {
      const base = { reference_range_raw: '< 200', unit: 'mg/dL' };
      const outOfRange = flagLabResult(makeResult({ ...base, value_numeric: 200 }));
      expect(outOfRange.flag).toBe('high');

      const inRange = flagLabResult(makeResult({ ...base, value_numeric: 199 }));
      expect(inRange.flag).toBe('within_range');
    });

    // Normal <= 200: 200 is within, 201 is high.
    it('evaluates <= bound correctly', () => {
      const base = { reference_range_raw: '<= 200', unit: 'mg/dL' };
      const inRange = flagLabResult(makeResult({ ...base, value_numeric: 200 }));
      expect(inRange.flag).toBe('within_range');

      const outOfRange = flagLabResult(makeResult({ ...base, value_numeric: 201 }));
      expect(outOfRange.flag).toBe('high');
    });

    // Normal > 40: normal is strictly above 40. 40 itself is OUT (low). 41 is within.
    it('evaluates > bound correctly', () => {
      const base = { reference_range_raw: '> 40', unit: 'mg/dL' };
      const outOfRange = flagLabResult(makeResult({ ...base, value_numeric: 40 }));
      expect(outOfRange.flag).toBe('low');

      const inRange = flagLabResult(makeResult({ ...base, value_numeric: 41 }));
      expect(inRange.flag).toBe('within_range');
    });

    // Normal >= 40: 40 is within, 39 is low.
    it('evaluates >= bound correctly', () => {
      const base = { reference_range_raw: '>= 40', unit: 'mg/dL' };
      const inRange = flagLabResult(makeResult({ ...base, value_numeric: 40 }));
      expect(inRange.flag).toBe('within_range');

      const outOfRange = flagLabResult(makeResult({ ...base, value_numeric: 39 }));
      expect(outOfRange.flag).toBe('low');
    });
  });

  describe('Fail-closed cases', () => {
    it('fails closed on missing value', () => {
      const res = flagLabResult(makeResult({ value_numeric: null, value_text: null }));
      expect(res.flag).toBe('cant_assess');
      expect(res.flag_reason).toBe('No numeric value extracted.');
    });

    it('fails closed on qualitative value', () => {
      const res = flagLabResult(makeResult({ value_numeric: null, value_text: 'Positive' }));
      expect(res.flag).toBe('cant_assess');
      expect(res.flag_reason).toContain('Qualitative result "Positive" - not range-checkable.');
    });

    it('fails closed on missing reference range', () => {
      const res = flagLabResult(makeResult({ reference_range_raw: null }));
      expect(res.flag).toBe('cant_assess');
      expect(res.flag_reason).toBe('No reference range printed on the report.');
    });

    it('fails closed on unparsable reference range', () => {
      const res = flagLabResult(makeResult({ reference_range_raw: 'see attached lab notes' }));
      expect(res.flag).toBe('cant_assess');
      expect(res.flag_reason).toContain('is not in a supported format.');
    });

    it('fails closed when range unit is specified but result has no unit', () => {
      const res = flagLabResult(makeResult({ unit: null, reference_range_raw: '13 - 17 g/dL' }));
      expect(res.flag).toBe('cant_assess');
      expect(res.flag_reason).toContain('Range is printed in g/dl but the result has no unit.');
    });

    it('fails closed on unit mismatch', () => {
      const res = flagLabResult(makeResult({ unit: 'mg/dL', reference_range_raw: '13 - 17 g/dL' }));
      expect(res.flag).toBe('cant_assess');
      expect(res.flag_reason).toContain('Unit mismatch: result in mg/dL, range printed in g/dl.');
    });
  });

  describe('Evidence and User Edited note', () => {
    it('preserves evidence_quote and raw_text', () => {
      const r = makeResult({ raw_text: 'Raw 1', evidence_quote: 'Quote 1' });
      const res = flagLabResult(r);
      expect(res.result.raw_text).toBe('Raw 1');
      expect(res.result.evidence_quote).toBe('Quote 1');
    });

    it('appends user corrected note when user_edited is true', () => {
      const res = flagLabResult(makeResult({ user_edited: true, value_numeric: 9.0 }));
      expect(res.flag_reason).toContain('Based on your corrected value.');
    });
  });
});
