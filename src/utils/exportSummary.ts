import type { PresentationModel } from '../adapters/presentationAdapter.js';

/**
 * Formats a clean, text-based clinical handoff note suitable for copying directly into an EHR/EMR.
 */
export function formatClinicalSummaryText(model: PresentationModel): string {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const actionItems = model.diffItems.filter((i) => i.diff.category !== 'unchanged');
  const continuingItems = model.diffItems.filter((i) => i.diff.category === 'unchanged');

  let output = `==========================================================\n`;
  output += `RXDIFF CLINICAL RECONCILIATION SUMMARY\n`;
  output += `Case: ${model.caseTitle} (${model.caseId.toUpperCase()})\n`;
  output += `Generated: ${timestamp} UTC\n`;
  output += `Safety Notice: Do not start, stop, or alter medications based solely on automated reconciliation.\n`;
  output += `==========================================================\n\n`;

  output += `--- 1. ITEMS REQUIRING CLINICAL REVIEW (${actionItems.length}) ---\n`;
  if (actionItems.length === 0) {
    output += `None. All medications match.\n`;
  } else {
    actionItems.forEach((item, idx) => {
      output += `${idx + 1}. [${item.userFacingCategory.toUpperCase()}] ${item.displayName}\n`;
      output += `   Change: ${item.transformationText}\n`;
      output += `   Clarification Question: "${item.patientQuestion}"\n`;
      if (item.beforeMention) {
        output += `   Previous Evidence: "${item.beforeMention.evidence_quote}"\n`;
      }
      if (item.afterMention) {
        output += `   Discharge Evidence: "${item.afterMention.evidence_quote}"\n`;
      }
      output += `   [ ] Pharmacist Verified    [ ] Clarified with Prescriber\n\n`;
    });
  }

  output += `--- 2. CONTINUING MEDICATIONS (${continuingItems.length}) ---\n`;
  continuingItems.forEach((item, idx) => {
    output += `${idx + 1}. [CONTINUING] ${item.displayName} - ${item.beforeMention?.frequency_raw || 'Current Regimen'}\n`;
  });

  output += `\n--- 3. SIGN-OFF ---\n`;
  output += `Reviewing Clinician: ___________________________  Date: ___________\n`;
  output += `==========================================================\n`;

  return output;
}
