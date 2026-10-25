import type { LabReportDocument, LabReviewReport } from '../../types/labReport.js';
import { flagLabResult } from './rangeEngine.js';
import { evaluateCombinationRules } from './combinationRules.js';

const LIMITATIONS = [
  'Flags compare values only against the reference range printed on this report. Ranges differ between labs.',
  'Combination prompts are prototype co-abnormality review prompts, not clinically validated rules.',
  'Qualitative results and unsupported range formats are shown without assessment.',
  'This tool does not diagnose. Discuss flagged results with a qualified clinician.',
];

export function buildLabReviewReport(doc: LabReportDocument): LabReviewReport {
  const flagged = doc.results.map(flagLabResult);
  const counts = { high: 0, low: 0, within_range: 0, cant_assess: 0 };
  for (const fr of flagged) counts[fr.flag] += 1;
  return {
    flagged_results: flagged,
    counts,
    combination_prompts: evaluateCombinationRules(flagged),
    limitations: LIMITATIONS,
  };
}
