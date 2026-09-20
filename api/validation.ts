import { z } from 'zod';
import {
  SourceDocumentSchema,
  type SourceDocument,
  type MedicationMention,
  type StatusWord,
  type StrengthUnit,
  type DoseForm,
  type Route,
} from '../src/types/medication.js';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export interface ValidationFile {
  name: string;
  type: string;
  size: number;
  data: Uint8Array | Buffer;
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates request files before calling Gemini
 */
export function validateImageFiles(files: {
  before?: ValidationFile | null;
  after?: ValidationFile | null;
}): ImageValidationResult {
  if (!files.before || !files.after) {
    return {
      valid: false,
      error: 'Exactly two images are required: "before" and "after".',
    };
  }

  for (const [key, file] of Object.entries(files)) {
    if (!file) continue;

    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return {
        valid: false,
        error: `Invalid MIME type for ${key} image ("${file.type}"). Supported formats: JPEG, PNG, WebP.`,
      };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File size for ${key} image (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 5 MB limit.`,
      };
    }

    if (file.size === 0) {
      return {
        valid: false,
        error: `${key} image is empty.`,
      };
    }
  }

  return { valid: true };
}

// Narrow Model Schema for Raw Gemini Output
export const RawModelMentionSchema = z.object({
  raw_text: z.string(),
  raw_name: z.string().nullable().optional(),
  normalized_name: z.string().nullable().optional(),
  strength_value: z.number().nullable().optional(),
  strength_unit: z.string().nullable().optional(),
  dose_quantity: z.number().nullable().optional(),
  dose_form: z.string().nullable().optional(),
  route: z.string().nullable().optional(),
  frequency_raw: z.string().nullable().optional(),
  frequency_per_day: z.number().nullable().optional(),
  timing: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  status_word: z.string().nullable().optional(),
  evidence_quote: z.string(),
});

export const RawModelDocumentSchema = z.object({
  document_type: z.enum(['prescription', 'discharge_list', 'unknown']).default('unknown'),
  medications: z.array(RawModelMentionSchema),
});

export const RawGeminiResponseSchema = z.object({
  before: RawModelDocumentSchema,
  after: RawModelDocumentSchema,
});

export type RawModelMention = z.infer<typeof RawModelMentionSchema>;
export type RawGeminiResponse = z.infer<typeof RawGeminiResponseSchema>;

export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Audit verbatim evidence:
 * 1. Evidence quote must be non-empty
 * 2. Evidence quote must match raw_text after whitespace normalization
 * 3. raw_name must occur in raw_text
 */
export function verifyVerbatimEvidence(mention: RawModelMention): {
  valid: boolean;
  reason?: string;
} {
  if (!mention.evidence_quote || !mention.evidence_quote.trim()) {
    return { valid: false, reason: 'Evidence quote is empty' };
  }

  const normQuote = normalizeWhitespace(mention.evidence_quote);
  const normRaw = normalizeWhitespace(mention.raw_text);

  if (!normRaw.includes(normQuote) && !normQuote.includes(normRaw)) {
    return {
      valid: false,
      reason: `Evidence quote "${mention.evidence_quote}" does not match raw text "${mention.raw_text}"`,
    };
  }

  if (mention.raw_name && mention.raw_name.trim()) {
    const normName = normalizeWhitespace(mention.raw_name);
    if (!normRaw.includes(normName)) {
      return {
        valid: false,
        reason: `Raw medication name "${mention.raw_name}" does not occur in raw text "${mention.raw_text}"`,
      };
    }
  }

  return { valid: true };
}

/**
 * Audit explicit status word.
 * Requires visible source wording; otherwise resets to 'none' and warns.
 */
export function auditStatusWord(
  statusWordRaw: string | null | undefined,
  evidenceQuote: string,
  rawText: string
): { statusWord: StatusWord; warning?: string } {
  if (!statusWordRaw || statusWordRaw === 'none') {
    return { statusWord: 'none' };
  }

  const combined = (evidenceQuote + ' ' + rawText).toLowerCase();
  const lowerStatus = statusWordRaw.toLowerCase().trim();

  if (lowerStatus === 'stop') {
    if (/\b(stop|discontinue|d\/c|withhold|cease|held|discontinued)\b/i.test(combined)) {
      return { statusWord: 'stop' };
    }
  } else if (lowerStatus === 'hold') {
    if (/\b(hold|withhold|pause|suspend)\b/i.test(combined)) {
      return { statusWord: 'hold' };
    }
  } else if (lowerStatus === 'start') {
    if (/\b(start|commence|initiate|new|begin)\b/i.test(combined)) {
      return { statusWord: 'start' };
    }
  } else if (lowerStatus === 'continue') {
    if (/\b(continue|cont|ongoing|resume|maintain)\b/i.test(combined)) {
      return { statusWord: 'continue' };
    }
  }

  return {
    statusWord: 'none',
    warning: `Status "${statusWordRaw}" lacked visible source wording; reset to 'none'.`,
  };
}

/**
 * Normalized name must be deterministic lowercase/alphanumeric cleanup of raw_name ONLY.
 * NEVER brand-to-generic mapping (e.g. Glucophage -> metformin is strictly forbidden).
 */
export function auditNormalizedName(
  rawName: string | null | undefined,
  normalizedName: string | null | undefined
): { normalizedName: string | null; warning?: string } {
  if (!rawName || !rawName.trim()) {
    return { normalizedName: null };
  }

  const deterministic = rawName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim();

  if (!normalizedName || !normalizedName.trim()) {
    return { normalizedName: deterministic };
  }

  const cleanedNorm = normalizedName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim();

  // If the model changed the brand name to a completely different generic name, block it!
  if (cleanedNorm !== deterministic) {
    return {
      normalizedName: deterministic,
      warning: `Brand-to-generic equivalence blocked in extraction ("${normalizedName}" -> "${deterministic}").`,
    };
  }

  return { normalizedName: deterministic };
}

/**
 * Recognized unambiguous frequency patterns only.
 * Ambiguous patterns return null with a warning.
 */
export function auditFrequencyPerDay(
  frequencyRaw: string | null | undefined,
  modelFreqPerDay: number | null | undefined
): { frequencyPerDay: number | null; warning?: string } {
  if (!frequencyRaw || !frequencyRaw.trim()) {
    return { frequencyPerDay: null };
  }

  const freq = frequencyRaw.toLowerCase().trim();

  // Explicit unambiguous patterns (check higher frequencies before single daily)
  if (
    /\b(four times daily|four times a day|qid|q\.i\.d\.|q6h|every 6 hours|4 times daily|4x daily)\b/i.test(
      freq
    )
  ) {
    return { frequencyPerDay: 4 };
  }
  if (
    /\b(three times daily|three times a day|tid|t\.i\.d\.|q8h|every 8 hours|3 times daily|3x daily)\b/i.test(
      freq
    )
  ) {
    return { frequencyPerDay: 3 };
  }
  if (
    /\b(twice daily|twice a day|bid|b\.i\.d\.|q12h|every 12 hours|2 times daily|2x daily|two times daily)\b/i.test(
      freq
    )
  ) {
    return { frequencyPerDay: 2 };
  }
  if (
    /\b(once daily|once a day|every day|daily|qday|qd|q24h|every 24 hours|at bedtime|qhs)\b/i.test(
      freq
    )
  ) {
    return { frequencyPerDay: 1 };
  }

  // Ambiguous patterns: prn, as needed, weekly, monthly, alternate days
  if (modelFreqPerDay !== null && modelFreqPerDay !== undefined) {
    return {
      frequencyPerDay: null,
      warning: `Ambiguous frequency pattern "${frequencyRaw}"; frequency_per_day set to null.`,
    };
  }

  return { frequencyPerDay: null };
}

export function sanitizeStrengthUnit(unit: string | null | undefined): StrengthUnit {
  if (!unit) return null;
  const lower = unit.toLowerCase().trim();
  if (['mg', 'mcg', 'g', 'ml', 'units'].includes(lower)) {
    return lower as StrengthUnit;
  }
  return null;
}

export function sanitizeDoseForm(form: string | null | undefined): DoseForm {
  if (!form) return null;
  const lower = form.toLowerCase().trim();
  if (['tablet', 'capsule', 'syrup', 'injection', 'inhaler', 'other'].includes(lower)) {
    return lower as DoseForm;
  }
  return 'other';
}

export function sanitizeRoute(route: string | null | undefined): Route {
  if (!route) return null;
  const lower = route.toLowerCase().trim();
  if (['oral', 'topical', 'inhaled', 'subcutaneous', 'intravenous', 'other'].includes(lower)) {
    return lower as Route;
  }
  return 'other';
}

/**
 * Transforms and strictly validates raw model extraction into certified SourceDocument pairs
 */
export function buildValidatedSourceDocuments(rawOutput: RawGeminiResponse): {
  before: SourceDocument;
  after: SourceDocument;
  warnings: string[];
} {
  const globalWarnings: string[] = [];

  function processDoc(
    doc: z.infer<typeof RawModelDocumentSchema>,
    docId: 'before' | 'after'
  ): SourceDocument {
    const docWarnings: string[] = [];
    const validMeds: MedicationMention[] = [];

    doc.medications.forEach((med, idx) => {
      // 1. Verbatim evidence check
      const evidenceCheck = verifyVerbatimEvidence(med);
      if (!evidenceCheck.valid) {
        throw new Error(
          `Validation failed for ${docId} mention #${idx + 1}: ${evidenceCheck.reason}`
        );
      }

      // 2. Status word check
      const statusRes = auditStatusWord(med.status_word, med.evidence_quote, med.raw_text);
      if (statusRes.warning) {
        docWarnings.push(statusRes.warning);
        globalWarnings.push(statusRes.warning);
      }

      // 3. Normalized name check (no brand-to-generic conversion)
      const nameRes = auditNormalizedName(med.raw_name, med.normalized_name);
      if (nameRes.warning) {
        docWarnings.push(nameRes.warning);
        globalWarnings.push(nameRes.warning);
      }

      // 4. Frequency per day check
      const freqRes = auditFrequencyPerDay(med.frequency_raw, med.frequency_per_day);
      if (freqRes.warning) {
        docWarnings.push(freqRes.warning);
        globalWarnings.push(freqRes.warning);
      }

      const mentionId = `${docId}-${String(idx + 1).padStart(3, '0')}`;

      // 5. Build typed mention with internal validation confidence marker (0.80)
      const validatedMention: MedicationMention = {
        mention_id: mentionId,
        raw_text: med.raw_text.trim(),
        raw_name: med.raw_name?.trim() ?? null,
        normalized_name: nameRes.normalizedName,
        strength_value: med.strength_value !== undefined ? med.strength_value : null,
        strength_unit: sanitizeStrengthUnit(med.strength_unit),
        dose_quantity: med.dose_quantity !== undefined ? med.dose_quantity : null,
        dose_form: sanitizeDoseForm(med.dose_form),
        route: sanitizeRoute(med.route),
        frequency_raw: med.frequency_raw?.trim() ?? null,
        frequency_per_day: freqRes.frequencyPerDay,
        timing: med.timing?.trim() ?? null,
        duration: med.duration?.trim() ?? null,
        status_word: statusRes.statusWord,
        evidence_quote: med.evidence_quote.trim(),
        confidence: 0.8, // Internal validation marker (never displayed)
      };

      validMeds.push(validatedMention);
    });

    const sourceDoc: SourceDocument = {
      document_id: docId,
      document_type: doc.document_type ?? (docId === 'before' ? 'prescription' : 'discharge_list'),
      medications: validMeds,
      extraction_warnings: docWarnings,
    };

    return SourceDocumentSchema.parse(sourceDoc);
  }

  const beforeDoc = processDoc(rawOutput.before, 'before');
  const afterDoc = processDoc(rawOutput.after, 'after');

  return {
    before: beforeDoc,
    after: afterDoc,
    warnings: globalWarnings,
  };
}
