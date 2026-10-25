import type {
  CombinationPrompt,
  FlaggedResult,
  TestKey,
} from '../../types/labReport.js';
import { normalizeUnit } from './rangeParser.js';

interface RuleInput {
  key: TestKey;
  direction: 'high' | 'low';
  units: string[]; // normalized units this rule accepts
  requireFasting?: boolean; // glucose rule only
}

interface CombinationRule {
  id: string;
  title: string;
  inputs: [RuleInput, RuleInput];
  message: string; // must end with "may require further medical review."
  sourceUrl: string;
}

export const COMBINATION_RULES: CombinationRule[] = [
  {
    id: 'glucose-hba1c-high',
    title: 'Fasting glucose and HbA1c both above range',
    inputs: [
      { key: 'glucose', direction: 'high', units: ['mg/dl', 'mmol/l'], requireFasting: true },
      { key: 'hba1c', direction: 'high', units: ['%'] },
    ],
    message:
      'Fasting glucose and HbA1c are both above this report\u2019s printed ' +
      'ranges. These are related blood-glucose measures and may require ' +
      'further medical review.',
    sourceUrl: 'https://medlineplus.gov/lab-tests/hemoglobin-a1c-hba1c-test/',
  },
  {
    id: 'hemoglobin-mcv-low',
    title: 'Hemoglobin and MCV both below range',
    inputs: [
      { key: 'hemoglobin', direction: 'low', units: ['g/dl'] },
      { key: 'mcv', direction: 'low', units: ['fl'] },
    ],
    message:
      'Hemoglobin and MCV are both below this report\u2019s printed ranges. ' +
      'MCV is run with hemoglobin as red blood cell indices, and this ' +
      'combination may require further medical review.',
    sourceUrl: 'https://medlineplus.gov/lab-tests/mcv-mean-corpuscular-volume/',
  },
  {
    id: 'creatinine-bun-high',
    title: 'Creatinine and BUN both above range',
    inputs: [
      { key: 'creatinine', direction: 'high', units: ['mg/dl'] },
      { key: 'bun', direction: 'high', units: ['mg/dl'] },
    ],
    message:
      'Creatinine and BUN are both above this report\u2019s printed ranges. ' +
      'These tests are compared to assess kidney-related problems, and this ' +
      'combination may require further medical review.',
    sourceUrl: 'https://medlineplus.gov/lab-tests/creatinine-test/',
  },
];

function findInput(
  flagged: FlaggedResult[],
  spec: RuleInput
): FlaggedResult | null {
  for (const fr of flagged) {
    const r = fr.result;
    if (r.test_key !== spec.key) continue;
    if (fr.flag !== spec.direction) continue; // cant_assess never matches
    const unit = normalizeUnit(r.unit);
    if (!unit || !spec.units.includes(unit)) continue;
    if (spec.requireFasting && r.fasting !== true) continue; // explicit fasting only
    return fr;
  }
  return null;
}

export function evaluateCombinationRules(flagged: FlaggedResult[]): CombinationPrompt[] {
  const prompts: CombinationPrompt[] = [];
  for (const rule of COMBINATION_RULES) {
    const a = findInput(flagged, rule.inputs[0]);
    const b = findInput(flagged, rule.inputs[1]);
    if (a && b && a.result.result_id !== b.result.result_id) {
      prompts.push({
        rule_id: rule.id,
        title: rule.title,
        message: rule.message,
        evidence_result_ids: [a.result.result_id, b.result.result_id],
        source_url: rule.sourceUrl,
      });
    }
  }
  return prompts;
}
