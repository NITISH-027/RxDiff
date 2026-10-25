import { z } from 'zod';

// Canonical test identity is assigned deterministically from an alias
// table (section 5), never trusted from the model.
export const TestKeySchema = z.enum([
  'glucose',
  'hba1c',
  'hemoglobin',
  'mcv',
  'creatinine',
  'bun',
  'other',
]);
export type TestKey = z.infer<typeof TestKeySchema>;

export const LabResultSchema = z.object({
  result_id: z.string(),
  raw_text: z.string(), // exact source line as printed
  test_name_raw: z.string(), // test name as printed
  test_key: TestKeySchema, // deterministic, from alias table
  value_numeric: z.number().nullable(), // null for qualitative results
  value_text: z.string().nullable(), // e.g. "Positive", "Trace", "<5"
  unit: z.string().nullable(), // as printed, e.g. "mg/dL"
  reference_range_raw: z.string().nullable(), // exactly as printed; null if not printed
  fasting: z.boolean().nullable(), // true only if explicitly marked fasting
  evidence_quote: z.string(), // verbatim quote supporting this row
  user_edited: z.boolean(), // set by confirmation UI on any edit
});
export type LabResult = z.infer<typeof LabResultSchema>;

export const LabReportDocumentSchema = z.object({
  document_id: z.literal('lab-report'),
  results: z.array(LabResultSchema),
  extraction_warnings: z.array(z.string()),
});
export type LabReportDocument = z.infer<typeof LabReportDocumentSchema>;

export const RangeFlagSchema = z.enum([
  'high',
  'low',
  'within_range',
  'cant_assess',
]);
export type RangeFlag = z.infer<typeof RangeFlagSchema>;

export const FlaggedResultSchema = z.object({
  result: LabResultSchema,
  flag: RangeFlagSchema,
  flag_reason: z.string(), // human-readable, includes the printed range used
  parsed_range_label: z.string().nullable(), // e.g. "70 - 99 mg/dL"
});
export type FlaggedResult = z.infer<typeof FlaggedResultSchema>;

export const CombinationPromptSchema = z.object({
  rule_id: z.string(),
  title: z.string(),
  message: z.string(), // always ends "may require further medical review"
  evidence_result_ids: z.array(z.string()),
  source_url: z.string(), // page establishing the tests are clinically related
});
export type CombinationPrompt = z.infer<typeof CombinationPromptSchema>;

export const LabReviewReportSchema = z.object({
  flagged_results: z.array(FlaggedResultSchema),
  counts: z.object({
    high: z.number(),
    low: z.number(),
    within_range: z.number(),
    cant_assess: z.number(),
  }),
  combination_prompts: z.array(CombinationPromptSchema),
  limitations: z.array(z.string()),
});
export type LabReviewReport = z.infer<typeof LabReviewReportSchema>;
