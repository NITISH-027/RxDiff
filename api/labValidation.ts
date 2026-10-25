import { z } from 'zod';
import {
  LabReportDocumentSchema,
  type LabReportDocument,
} from '../src/types/labReport.js';
import { applyDeterministicIdentity } from '../src/engine/lab/labAliases.js';
import {
  normalizeWhitespace,
  normalizeStructuralTokens,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  type ValidationFile,
} from './validation.js';

export const RawLabResultSchema = z.object({
  raw_text: z.string(),
  test_name_raw: z.string(),
  value_numeric: z.number().nullable().optional(),
  value_text: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  reference_range_raw: z.string().nullable().optional(),
  evidence_quote: z.string(),
});

export const RawLabReportSchema = z.object({
  results: z.array(RawLabResultSchema),
});

export type RawLabResult = z.infer<typeof RawLabResultSchema>;

export function validateLabImageFile(file?: ValidationFile | null): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Report image file is required (form field "report").' };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: `Invalid MIME type for report image ("${file.type}"). Supported formats: JPEG, PNG, WebP.`,
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size for report image (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 5 MB limit.`,
    };
  }
  if (file.size === 0) {
    return { valid: false, error: 'Report image is empty.' };
  }
  return { valid: true };
}

// 1. Verbatim evidence audit, same two-normalization containment test
// as verifyVerbatimEvidence in api/validation.ts.
export function verifyLabEvidence(r: RawLabResult): { valid: boolean; reason?: string } {
  if (!r.evidence_quote.trim()) return { valid: false, reason: 'Evidence quote is empty' };
  const checks: [string, string][] = [
    [normalizeWhitespace(r.evidence_quote), normalizeWhitespace(r.raw_text)],
    [normalizeStructuralTokens(r.evidence_quote), normalizeStructuralTokens(r.raw_text)],
  ];
  const quoteMatches = checks.some(
    ([q, t]) => t.includes(q) || q.includes(t)
  );
  if (!quoteMatches) return { valid: false, reason: 'Evidence quote does not match raw text' };
  if (!normalizeWhitespace(r.raw_text).includes(normalizeWhitespace(r.test_name_raw))) {
    return { valid: false, reason: 'Test name does not occur in raw text' };
  }
  return { valid: true };
}

// 2. Numeric value must literally appear in the source line. Blocks the
// model from producing a number that is not printed.
export function auditNumericValue(r: RawLabResult): { value: number | null; warning?: string } {
  if (r.value_numeric === null || r.value_numeric === undefined) return { value: null };
  const token = String(r.value_numeric);
  const haystacks = [r.raw_text, r.evidence_quote].map((s) =>
    s.replace(/,/g, '.')
  );
  if (haystacks.some((h) => h.includes(token))) return { value: r.value_numeric };
  return {
    value: null,
    warning: `Value ${token} for "${r.test_name_raw}" not visible in source line; value dropped.`,
  };
}

export function buildValidatedLabReport(raw: unknown): {
  report: LabReportDocument;
  warnings: string[];
} {
  const parsed = RawLabReportSchema.parse(raw);
  const warnings: string[] = [];
  const results = [];
  let i = 0;
  for (const r of parsed.results) {
    i += 1;
    const ev = verifyLabEvidence(r);
    if (!ev.valid) {
      warnings.push(`Dropped row "${r.test_name_raw}": ${ev.reason}.`);
      continue; // rows failing evidence audit are dropped, never flagged
    }
    const val = auditNumericValue(r);
    if (val.warning) warnings.push(val.warning);
    const withIdentity = applyDeterministicIdentity({
      result_id: `lab-${String(i).padStart(3, '0')}`,
      raw_text: r.raw_text,
      test_name_raw: r.test_name_raw,
      value_numeric: val.value,
      value_text: r.value_text ?? null,
      unit: r.unit ?? null,
      reference_range_raw: r.reference_range_raw ?? null,
      evidence_quote: r.evidence_quote,
      user_edited: false,
    });
    results.push(withIdentity);
  }
  if (results.length === 0) {
    throw new Error('No verifiable test rows extracted.');
  }
  const report = LabReportDocumentSchema.parse({
    document_id: 'lab-report',
    results,
    extraction_warnings: warnings,
  });
  return { report, warnings };
}
