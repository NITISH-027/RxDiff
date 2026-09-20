import { BUNDLED_CASES, type SyntheticCase } from '../../data/syntheticCases.js';
import { buildDiffReport } from '../../engine/diffEngine.js';
import type { DiffReport } from '../../types/medication.js';
import type { ExtractionProvider } from './types.js';

export class BundledDemoProvider implements ExtractionProvider {
  readonly id = 'bundled-demo';
  readonly name = 'Bundled Synthetic Demo';

  getCase(caseId: 'case-a' | 'case-b' | 'case-c'): {
    caseBundle: SyntheticCase;
    report: DiffReport;
  } {
    const caseBundle = BUNDLED_CASES[caseId];
    const report = buildDiffReport(caseBundle.beforeDoc, caseBundle.afterDoc);
    return { caseBundle, report };
  }
}

export const bundledDemoProvider = new BundledDemoProvider();
