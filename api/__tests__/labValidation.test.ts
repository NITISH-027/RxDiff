import { describe, it, expect } from 'vitest';
import {
  verifyLabEvidence,
  auditNumericValue,
  buildValidatedLabReport,
  validateLabImageFile,
} from '../labValidation.js';

describe('labValidation pipeline', () => {
  describe('verifyLabEvidence', () => {
    it('passes when evidence quote matches raw text and contains test name', () => {
      const res = verifyLabEvidence({
        raw_text: 'Hemoglobin: 14.5 g/dL (13.0 - 17.0)',
        test_name_raw: 'Hemoglobin',
        evidence_quote: 'Hemoglobin: 14.5 g/dL',
      });
      expect(res.valid).toBe(true);
    });

    it('rejects when evidence quote is empty', () => {
      const res = verifyLabEvidence({
        raw_text: 'Hemoglobin: 14.5 g/dL',
        test_name_raw: 'Hemoglobin',
        evidence_quote: '   ',
      });
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('Evidence quote is empty');
    });

    it('rejects when evidence quote does not match raw text', () => {
      const res = verifyLabEvidence({
        raw_text: 'Hemoglobin: 14.5 g/dL',
        test_name_raw: 'Hemoglobin',
        evidence_quote: 'Potassium 4.2 mmol/L',
      });
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('Evidence quote does not match raw text');
    });

    it('rejects when test name does not occur in raw text', () => {
      const res = verifyLabEvidence({
        raw_text: 'Hb: 14.5 g/dL',
        test_name_raw: 'Platelets',
        evidence_quote: 'Hb: 14.5 g/dL',
      });
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('Test name does not occur in raw text');
    });
  });

  describe('auditNumericValue', () => {
    it('accepts numeric value found in raw text or evidence quote', () => {
      const res = auditNumericValue({
        raw_text: 'Glucose: 105 mg/dL',
        test_name_raw: 'Glucose',
        value_numeric: 105,
        evidence_quote: 'Glucose: 105 mg/dL',
      });
      expect(res.value).toBe(105);
      expect(res.warning).toBeUndefined();
    });

    it('drops hallucinated numeric value not visible in text', () => {
      const res = auditNumericValue({
        raw_text: 'Glucose: High',
        test_name_raw: 'Glucose',
        value_numeric: 180,
        evidence_quote: 'Glucose: High',
      });
      expect(res.value).toBeNull();
      expect(res.warning).toContain('Value 180 for "Glucose" not visible in source line; value dropped.');
    });
  });

  describe('buildValidatedLabReport', () => {
    it('derives test_key and fasting deterministically from alias table', () => {
      const raw = {
        results: [
          {
            raw_text: 'Glycated Hemoglobin: 7.2 %',
            test_name_raw: 'Glycated Hemoglobin',
            value_numeric: 7.2,
            unit: '%',
            reference_range_raw: '4.0 - 5.6',
            evidence_quote: 'Glycated Hemoglobin: 7.2 %',
          },
          {
            raw_text: 'Hb: 12.0 g/dL',
            test_name_raw: 'Hb',
            value_numeric: 12.0,
            unit: 'g/dL',
            reference_range_raw: '13.0 - 17.0',
            evidence_quote: 'Hb: 12.0 g/dL',
          },
          {
            raw_text: 'Fasting Blood Sugar: 130 mg/dL',
            test_name_raw: 'Fasting Blood Sugar',
            value_numeric: 130,
            unit: 'mg/dL',
            reference_range_raw: '70 - 99',
            evidence_quote: 'Fasting Blood Sugar: 130 mg/dL',
          },
          {
            raw_text: 'Random Blood Sugar: 155 mg/dL',
            test_name_raw: 'Random Blood Sugar',
            value_numeric: 155,
            unit: 'mg/dL',
            reference_range_raw: '< 140',
            evidence_quote: 'Random Blood Sugar: 155 mg/dL',
          },
        ],
      };

      const { report } = buildValidatedLabReport(raw);
      expect(report.results).toHaveLength(4);
      expect(report.results[0].test_key).toBe('hba1c');
      expect(report.results[1].test_key).toBe('hemoglobin');
      expect(report.results[2].test_key).toBe('glucose');
      expect(report.results[2].fasting).toBe(true);
      expect(report.results[3].test_key).toBe('glucose');
      expect(report.results[3].fasting).toBe(false);
    });

    it('drops rows with evidence quote mismatch and records warnings', () => {
      const raw = {
        results: [
          {
            raw_text: 'Platelets: 250 x10^9/L',
            test_name_raw: 'Platelets',
            value_numeric: 250,
            evidence_quote: 'Different unrelated line',
          },
          {
            raw_text: 'Hemoglobin: 14 g/dL',
            test_name_raw: 'Hemoglobin',
            value_numeric: 14,
            evidence_quote: 'Hemoglobin: 14 g/dL',
          },
        ],
      };

      const { report, warnings } = buildValidatedLabReport(raw);
      expect(report.results).toHaveLength(1);
      expect(report.results[0].test_name_raw).toBe('Hemoglobin');
      expect(warnings.some((w) => w.includes('Dropped row "Platelets"'))).toBe(true);
    });

    it('throws error when empty after audit', () => {
      const raw = {
        results: [
          {
            raw_text: 'Invalid 1',
            test_name_raw: 'Invalid 1',
            evidence_quote: 'Mismatch 1',
          },
        ],
      };
      expect(() => buildValidatedLabReport(raw)).toThrow('No verifiable test rows extracted.');
    });
  });

  describe('validateLabImageFile', () => {
    it('accepts valid JPEG/PNG/WebP image within 5MB', () => {
      const res = validateLabImageFile({
        name: 'report.png',
        type: 'image/png',
        size: 1024 * 500,
        data: Buffer.from('test'),
      });
      expect(res.valid).toBe(true);
    });

    it('rejects unsupported mime types', () => {
      const res = validateLabImageFile({
        name: 'report.pdf',
        type: 'application/pdf',
        size: 1024,
        data: Buffer.from('test'),
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Invalid MIME type');
    });

    it('rejects empty or missing file', () => {
      expect(validateLabImageFile(null).valid).toBe(false);
      const res = validateLabImageFile({
        name: 'empty.png',
        type: 'image/png',
        size: 0,
        data: Buffer.from(''),
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('empty');
    });
  });
});
