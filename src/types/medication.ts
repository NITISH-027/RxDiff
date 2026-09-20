import { z } from 'zod';

export const DocumentIdSchema = z.enum(['before', 'after']);
export type DocumentId = z.infer<typeof DocumentIdSchema>;

export const DocumentTypeSchema = z.enum([
  'prescription',
  'discharge_list',
  'unknown',
]);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export const StrengthUnitSchema = z
  .enum(['mg', 'mcg', 'g', 'ml', 'units'])
  .nullable();
export type StrengthUnit = z.infer<typeof StrengthUnitSchema>;

export const DoseFormSchema = z
  .enum(['tablet', 'capsule', 'syrup', 'injection', 'inhaler', 'other'])
  .nullable();
export type DoseForm = z.infer<typeof DoseFormSchema>;

export const RouteSchema = z
  .enum(['oral', 'topical', 'inhaled', 'subcutaneous', 'intravenous', 'other'])
  .nullable();
export type Route = z.infer<typeof RouteSchema>;

export const StatusWordSchema = z.enum([
  'start',
  'continue',
  'stop',
  'hold',
  'none',
]);
export type StatusWord = z.infer<typeof StatusWordSchema>;

export const MedicationMentionSchema = z.object({
  mention_id: z.string(),
  raw_text: z.string(),
  raw_name: z.string().nullable(),
  normalized_name: z.string().nullable(),
  strength_value: z.number().nullable(),
  strength_unit: StrengthUnitSchema,
  dose_quantity: z.number().nullable(),
  dose_form: DoseFormSchema,
  route: RouteSchema,
  frequency_raw: z.string().nullable(),
  frequency_per_day: z.number().nullable(),
  timing: z.string().nullable(),
  duration: z.string().nullable(),
  status_word: StatusWordSchema,
  evidence_quote: z.string(),
  confidence: z.number().min(0).max(1),
});
export type MedicationMention = z.infer<typeof MedicationMentionSchema>;

export const SourceDocumentSchema = z.object({
  document_id: DocumentIdSchema,
  document_type: DocumentTypeSchema,
  medications: z.array(MedicationMentionSchema),
  extraction_warnings: z.array(z.string()),
});
export type SourceDocument = z.infer<typeof SourceDocumentSchema>;

export const MatchBasisSchema = z.enum([
  'exact_name',
  'alias_table',
  'fuzzy_candidate',
  'unmatched',
]);
export type MatchBasis = z.infer<typeof MatchBasisSchema>;

export const DiffCategorySchema = z.enum([
  'started',
  'explicitly_stopped',
  'strength_changed',
  'frequency_changed',
  'dose_changed',
  'route_changed',
  'possible_duplicate',
  'unchanged',
  'needs_confirmation',
]);
export type DiffCategory = z.infer<typeof DiffCategorySchema>;

export const ChangedFieldSchema = z.enum([
  'strength',
  'dose',
  'frequency',
  'route',
  'status',
]);
export type ChangedField = z.infer<typeof ChangedFieldSchema>;

export const MedicationDiffSchema = z.object({
  diff_id: z.string(),
  before_mention_id: z.string().nullable(),
  after_mention_id: z.string().nullable(),
  match_basis: MatchBasisSchema,
  match_confidence: z.number(),
  category: DiffCategorySchema,
  changed_fields: z.array(ChangedFieldSchema),
  explanation: z.string(),
  before_evidence: z.string().nullable(),
  after_evidence: z.string().nullable(),
  review_required: z.literal(true),
});
export type MedicationDiff = z.infer<typeof MedicationDiffSchema>;

export const DiffReportSchema = z.object({
  diffs: z.array(MedicationDiffSchema),
  counts: z.record(DiffCategorySchema, z.number()),
  questions_for_professional: z.array(z.string()),
  limitations: z.array(z.string()),
});
export type DiffReport = z.infer<typeof DiffReportSchema>;
