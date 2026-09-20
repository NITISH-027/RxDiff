import { describe, it, expect } from 'vitest';
import {
  validateImageFiles,
  verifyVerbatimEvidence,
  auditStatusWord,
  auditNormalizedName,
  auditFrequencyPerDay,
  buildValidatedSourceDocuments,
  MAX_FILE_SIZE_BYTES,
  type ValidationFile,
  type RawGeminiResponse,
} from '../validation.js';

describe('Server Validation Pipeline (api/validation.ts)', () => {
  const dummyPng = Buffer.from('fake-png-bytes');

  describe('validateImageFiles', () => {
    it('rejects if before or after image is missing', () => {
      const file: ValidationFile = {
        name: 'test.png',
        type: 'image/png',
        size: 100,
        data: dummyPng,
      };

      expect(validateImageFiles({ before: file, after: null }).valid).toBe(false);
      expect(validateImageFiles({ before: null, after: file }).valid).toBe(false);
      expect(validateImageFiles({ before: null, after: null }).valid).toBe(false);
    });

    it('rejects unsupported MIME types (e.g. image/gif or application/pdf)', () => {
      const validFile: ValidationFile = {
        name: 'test.png',
        type: 'image/png',
        size: 100,
        data: dummyPng,
      };
      const gifFile: ValidationFile = {
        name: 'test.gif',
        type: 'image/gif',
        size: 100,
        data: dummyPng,
      };

      const res = validateImageFiles({ before: validFile, after: gifFile });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Invalid MIME type');
    });

    it('rejects files larger than 5 MB', () => {
      const validFile: ValidationFile = {
        name: 'test.png',
        type: 'image/png',
        size: 100,
        data: dummyPng,
      };
      const hugeFile: ValidationFile = {
        name: 'huge.jpg',
        type: 'image/jpeg',
        size: MAX_FILE_SIZE_BYTES + 1,
        data: dummyPng,
      };

      const res = validateImageFiles({ before: hugeFile, after: validFile });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('exceeds 5 MB limit');
    });

    it('accepts valid JPEG, PNG, and WebP images <= 5 MB', () => {
      const before: ValidationFile = {
        name: 'before.jpg',
        type: 'image/jpeg',
        size: 1024,
        data: dummyPng,
      };
      const after: ValidationFile = {
        name: 'after.webp',
        type: 'image/webp',
        size: 2048,
        data: dummyPng,
      };

      const res = validateImageFiles({ before, after });
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });
  });

  describe('verifyVerbatimEvidence', () => {
    it('passes when evidence quote and raw name match raw text', () => {
      const res = verifyVerbatimEvidence({
        raw_text: 'Metformin 500 mg tablet, once daily after dinner',
        raw_name: 'Metformin',
        evidence_quote: 'Metformin 500 mg tablet, once daily after dinner',
      });
      expect(res.valid).toBe(true);
    });

    it('fails closed when evidence quote is empty', () => {
      const res = verifyVerbatimEvidence({
        raw_text: 'Metformin 500 mg',
        raw_name: 'Metformin',
        evidence_quote: '',
      });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('empty');
    });

    it('fails closed when evidence quote does not match raw text', () => {
      const res = verifyVerbatimEvidence({
        raw_text: 'Metformin 500 mg tablet once daily',
        raw_name: 'Metformin',
        evidence_quote: 'Atorvastatin 10 mg tablet',
      });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('does not match raw text');
    });

    it('fails closed when raw name does not appear in raw text', () => {
      const res = verifyVerbatimEvidence({
        raw_text: 'Metformin 500 mg tablet once daily',
        raw_name: 'Lisinopril',
        evidence_quote: 'Metformin 500 mg tablet once daily',
      });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('does not occur in raw text');
    });
  });

  describe('auditStatusWord', () => {
    it('retains explicit stop when stop wording is visible', () => {
      const res = auditStatusWord('stop', 'STOP Atorvastatin 10 mg tablet', 'STOP Atorvastatin 10 mg');
      expect(res.statusWord).toBe('stop');
      expect(res.warning).toBeUndefined();
    });

    it('retains explicit continue when continue wording is visible', () => {
      const res = auditStatusWord('continue', 'CONTINUE Metformin 500 mg', 'CONTINUE Metformin 500 mg');
      expect(res.statusWord).toBe('continue');
      expect(res.warning).toBeUndefined();
    });

    it('resets to none with warning when explicit wording is missing', () => {
      const res = auditStatusWord('stop', 'Atorvastatin 10 mg tablet at night', 'Atorvastatin 10 mg tablet');
      expect(res.statusWord).toBe('none');
      expect(res.warning).toContain('lacked visible source wording');
    });

    it('resets start to none with warning when evidence contains "new medication list" without start/commence/initiate/begin', () => {
      const res = auditStatusWord('start', 'new medication list', 'new medication list');
      expect(res.statusWord).toBe('none');
      expect(res.warning).toContain('lacked visible source wording');
    });

    it('retains start when start, commence, initiate, or begin is explicitly present', () => {
      expect(auditStatusWord('start', 'START Metformin 500 mg', 'START Metformin').statusWord).toBe('start');
      expect(auditStatusWord('start', 'Commence Lisinopril 10 mg', 'Commence Lisinopril').statusWord).toBe('start');
      expect(auditStatusWord('start', 'Initiate Amlodipine 5 mg', 'Initiate Amlodipine').statusWord).toBe('start');
      expect(auditStatusWord('start', 'Begin Atorvastatin 20 mg', 'Begin Atorvastatin').statusWord).toBe('start');
    });
  });

  describe('auditNormalizedName', () => {
    it('allows deterministic lowercase and punctuation cleanup', () => {
      const res = auditNormalizedName('Metformin HCL, 500mg', 'metformin hcl 500mg');
      expect(res.normalizedName).toBe('metformin hcl 500mg');
      expect(res.warning).toBeUndefined();
    });

    it('strictly blocks brand-to-generic mapping and resets to raw name', () => {
      const res = auditNormalizedName('Glucophage', 'metformin');
      expect(res.normalizedName).toBe('glucophage');
      expect(res.warning).toContain('Brand-to-generic equivalence blocked');
    });
  });

  describe('auditFrequencyPerDay', () => {
    it('recognizes unambiguous frequencies', () => {
      expect(auditFrequencyPerDay('once daily', 1).frequencyPerDay).toBe(1);
      expect(auditFrequencyPerDay('twice daily', 2).frequencyPerDay).toBe(2);
      expect(auditFrequencyPerDay('bid', 2).frequencyPerDay).toBe(2);
      expect(auditFrequencyPerDay('tid', 3).frequencyPerDay).toBe(3);
      expect(auditFrequencyPerDay('qid', 4).frequencyPerDay).toBe(4);
      expect(auditFrequencyPerDay('every 12 hours', 2).frequencyPerDay).toBe(2);
    });

    it('resets ambiguous frequencies to null with a warning', () => {
      const res = auditFrequencyPerDay('take as needed for pain', 2);
      expect(res.frequencyPerDay).toBe(null);
      expect(res.warning).toContain('Ambiguous frequency pattern');
    });
  });

  describe('buildValidatedSourceDocuments', () => {
    it('produces valid SourceDocuments with server-assigned IDs and internal validation confidence', () => {
      const rawInput: RawGeminiResponse = {
        before: {
          document_type: 'prescription',
          medications: [
            {
              raw_text: 'Atorvastatin 10 mg tablet, 1 tablet at night',
              raw_name: 'Atorvastatin',
              normalized_name: 'atorvastatin',
              strength_value: 10,
              strength_unit: 'mg',
              dose_quantity: 1,
              dose_form: 'tablet',
              route: 'oral',
              frequency_raw: 'at night',
              frequency_per_day: 1,
              timing: 'night',
              duration: null,
              status_word: 'none',
              evidence_quote: 'Atorvastatin 10 mg tablet, 1 tablet at night',
            },
          ],
        },
        after: {
          document_type: 'discharge_list',
          medications: [
            {
              raw_text: 'STOP Atorvastatin 10 mg tablet',
              raw_name: 'Atorvastatin',
              normalized_name: 'atorvastatin',
              strength_value: 10,
              strength_unit: 'mg',
              dose_quantity: 1,
              dose_form: 'tablet',
              route: 'oral',
              frequency_raw: null,
              frequency_per_day: null,
              timing: null,
              duration: null,
              status_word: 'stop',
              evidence_quote: 'STOP Atorvastatin 10 mg tablet',
            },
          ],
        },
      };

      const result = buildValidatedSourceDocuments(rawInput);
      expect(result.before.document_id).toBe('before');
      expect(result.after.document_id).toBe('after');

      // Server assigned IDs
      expect(result.before.medications[0]?.mention_id).toBe('before-001');
      expect(result.after.medications[0]?.mention_id).toBe('after-001');

      // Internal confidence marker
      expect(result.before.medications[0]?.confidence).toBe(0.8);
      expect(result.after.medications[0]?.confidence).toBe(0.8);

      // Status preserved
      expect(result.after.medications[0]?.status_word).toBe('stop');
    });

    it('throws validation error and fails closed on invalid evidence quote', () => {
      const invalidInput: RawGeminiResponse = {
        before: {
          document_type: 'prescription',
          medications: [
            {
              raw_text: 'Lisinopril 10 mg tablet',
              raw_name: 'Lisinopril',
              normalized_name: 'lisinopril',
              evidence_quote: 'Wrong text quote',
            },
          ],
        },
        after: {
          document_type: 'discharge_list',
          medications: [],
        },
      };

      expect(() => buildValidatedSourceDocuments(invalidInput)).toThrowError(/Validation failed/);
    });
  });
});
