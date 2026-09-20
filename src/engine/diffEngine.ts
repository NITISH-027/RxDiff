import type {
  SourceDocument,
  MedicationMention,
  MedicationDiff,
  DiffReport,
  MatchBasis,
  DiffCategory,
  ChangedField,
} from '../types/medication.js';
import { DiffReportSchema } from '../types/medication.js';
import { DEMO_ALIAS_TABLE, areAliases } from './aliases.js';

const FORM_TOKENS_REGEX =
  /\b(tablets?|tabs?|capsules?|caps?|syrups?|solutions?|suspensions?|injections?|inhalers?|creams?|ointments?|gels?|drops?|patches?|suppositor(y|ies))\b/gi;

/**
 * Normalizes a medication name by removing dosage-form tokens, punctuation,
 * and excess whitespace while preserving the underlying drug identity.
 */
export function canonicalizeMedicationName(
  name: string | null | undefined
): string {
  if (!name) return '';
  let cleaned = name.toLowerCase();
  // Remove common action/status prefixes
  cleaned = cleaned.replace(/\b(continue|start|stop|hold|take)\b/gi, ' ');
  // Remove dosage form tokens
  cleaned = cleaned.replace(FORM_TOKENS_REGEX, ' ');
  // Remove strength numbers with units if embedded in the name
  cleaned = cleaned.replace(/\b\d+(\.\d+)?\s*(mg|mcg|g|ml|units)\b/gi, ' ');
  // Remove non-alphanumeric characters
  cleaned = cleaned.replace(/[^a-z0-9\s]/gi, ' ');
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Calculates string similarity using Levenshtein distance ratio.
 */
export function calculateSimilarity(strA: string, strB: string): number {
  const a = strA.toLowerCase().trim();
  const b = strB.toLowerCase().trim();
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j]! + 1
        );
      }
    }
  }
  const distance = matrix[b.length]![a.length]!;
  const maxLen = Math.max(a.length, b.length);
  return Number((1 - distance / maxLen).toFixed(2));
}

export interface DuplicateGroup {
  primaryId: string;
  duplicateId: string;
  basis: 'exact_name' | 'alias_table';
}

/**
 * Detects duplicate mentions in the AFTER list based on exact canonical name
 * or verified transparent alias table equivalence.
 */
export function detectAfterDuplicates(
  afterList: MedicationMention[],
  aliasTable: Record<string, string> = DEMO_ALIAS_TABLE
): DuplicateGroup[] {
  const duplicates: DuplicateGroup[] = [];

  for (let i = 0; i < afterList.length; i++) {
    const medA = afterList[i]!;
    const nameA = canonicalizeMedicationName(
      medA.normalized_name || medA.raw_name || medA.raw_text
    );

    for (let j = i + 1; j < afterList.length; j++) {
      const medB = afterList[j]!;
      const nameB = canonicalizeMedicationName(
        medB.normalized_name || medB.raw_name || medB.raw_text
      );

      if (nameA && nameB) {
        if (nameA === nameB) {
          duplicates.push({
            primaryId: medA.mention_id,
            duplicateId: medB.mention_id,
            basis: 'exact_name',
          });
        } else if (areAliases(nameA, nameB, aliasTable)) {
          duplicates.push({
            primaryId: medA.mention_id,
            duplicateId: medB.mention_id,
            basis: 'alias_table',
          });
        }
      }
    }
  }

  return duplicates;
}

export interface MatchPair {
  beforeMention: MedicationMention | null;
  afterMention: MedicationMention | null;
  matchBasis: MatchBasis;
  matchConfidence: number;
  isDuplicateAfter?: boolean;
}

/**
 * Matches BEFORE and AFTER medication mentions deterministically.
 * Order: Exact canonical name -> Transparent alias table -> Fuzzy candidate.
 */
export function matchMedicationMentions(
  beforeList: MedicationMention[],
  afterList: MedicationMention[],
  aliasTable: Record<string, string> = DEMO_ALIAS_TABLE,
  duplicateAfterIds: Set<string> = new Set()
): MatchPair[] {
  const matchedPairs: MatchPair[] = [];
  const matchedBeforeIds = new Set<string>();
  const matchedAfterIds = new Set<string>();

  // Helper to extract canonical name
  const getCanonName = (m: MedicationMention) =>
    canonicalizeMedicationName(m.normalized_name || m.raw_name || m.raw_text);

  // 1. Exact Canonical Name matching (excluding duplicate AFTER items)
  for (const before of beforeList) {
    if (matchedBeforeIds.has(before.mention_id)) continue;
    const beforeName = getCanonName(before);

    for (const after of afterList) {
      if (
        matchedAfterIds.has(after.mention_id) ||
        duplicateAfterIds.has(after.mention_id)
      ) {
        continue;
      }
      const afterName = getCanonName(after);

      if (beforeName && afterName && beforeName === afterName) {
        matchedPairs.push({
          beforeMention: before,
          afterMention: after,
          matchBasis: 'exact_name',
          matchConfidence: 1.0,
        });
        matchedBeforeIds.add(before.mention_id);
        matchedAfterIds.add(after.mention_id);
        break;
      }
    }
  }

  // 2. Local transparent alias table matching
  for (const before of beforeList) {
    if (matchedBeforeIds.has(before.mention_id)) continue;
    const beforeName = getCanonName(before);

    for (const after of afterList) {
      if (
        matchedAfterIds.has(after.mention_id) ||
        duplicateAfterIds.has(after.mention_id)
      ) {
        continue;
      }
      const afterName = getCanonName(after);

      if (
        beforeName &&
        afterName &&
        areAliases(beforeName, afterName, aliasTable)
      ) {
        matchedPairs.push({
          beforeMention: before,
          afterMention: after,
          matchBasis: 'alias_table',
          matchConfidence: 0.95,
        });
        matchedBeforeIds.add(before.mention_id);
        matchedAfterIds.add(after.mention_id);
        break;
      }
    }
  }

  // 3. Fuzzy similarity candidate matching (Similarity >= 0.80)
  // NON-NEGOTIABLE MEDICAL RULE: Fuzzy similarity NEVER proves equivalence.
  // It only creates a candidate that MUST be classified as NEEDS_CONFIRMATION.
  for (const before of beforeList) {
    if (matchedBeforeIds.has(before.mention_id)) continue;
    const beforeName = getCanonName(before);

    for (const after of afterList) {
      if (
        matchedAfterIds.has(after.mention_id) ||
        duplicateAfterIds.has(after.mention_id)
      ) {
        continue;
      }
      const afterName = getCanonName(after);
      const similarity = calculateSimilarity(beforeName, afterName);

      if (similarity >= 0.8) {
        matchedPairs.push({
          beforeMention: before,
          afterMention: after,
          matchBasis: 'fuzzy_candidate',
          matchConfidence: similarity,
        });
        matchedBeforeIds.add(before.mention_id);
        matchedAfterIds.add(after.mention_id);
        break;
      }
    }
  }

  // 4. Unmatched BEFORE mentions (Omission from AFTER list)
  for (const before of beforeList) {
    if (!matchedBeforeIds.has(before.mention_id)) {
      matchedPairs.push({
        beforeMention: before,
        afterMention: null,
        matchBasis: 'unmatched',
        matchConfidence: 0.0,
      });
    }
  }

  // 5. Duplicate AFTER mentions
  for (const after of afterList) {
    if (duplicateAfterIds.has(after.mention_id)) {
      matchedPairs.push({
        beforeMention: null,
        afterMention: after,
        matchBasis: 'alias_table',
        matchConfidence: 0.95,
        isDuplicateAfter: true,
      });
      matchedAfterIds.add(after.mention_id);
    }
  }

  // 6. Unmatched non-duplicate AFTER mentions
  for (const after of afterList) {
    if (!matchedAfterIds.has(after.mention_id)) {
      matchedPairs.push({
        beforeMention: null,
        afterMention: after,
        matchBasis: 'unmatched',
        matchConfidence: after.confidence,
      });
    }
  }

  return matchedPairs;
}

/**
 * Classifies a paired or unmatched medication mention strictly following
 * non-negotiable deterministic safety rules.
 */
export function classifyMedicationPair(
  pair: MatchPair,
  index: number
): MedicationDiff {
  const {
    beforeMention,
    afterMention,
    matchBasis,
    matchConfidence,
    isDuplicateAfter,
  } = pair;
  const diffId = `diff-${index + 1}`;
  const beforeEvidence = beforeMention?.evidence_quote ?? null;
  const afterEvidence = afterMention?.evidence_quote ?? null;

  // RULE: Detected AFTER duplicate
  if (isDuplicateAfter && afterMention) {
    return {
      diff_id: diffId,
      before_mention_id: null,
      after_mention_id: afterMention.mention_id,
      match_basis: matchBasis,
      match_confidence: matchConfidence,
      category: 'possible_duplicate',
      changed_fields: [],
      explanation:
        'Potential duplicate medication therapy detected on the new list.',
      before_evidence: null,
      after_evidence: afterEvidence,
      review_required: true,
    };
  }

  // RULE: Fuzzy name similarity never proves equivalence -> NEEDS_CONFIRMATION
  if (matchBasis === 'fuzzy_candidate') {
    return {
      diff_id: diffId,
      before_mention_id: beforeMention?.mention_id ?? null,
      after_mention_id: afterMention?.mention_id ?? null,
      match_basis: 'fuzzy_candidate',
      match_confidence: matchConfidence,
      category: 'needs_confirmation',
      changed_fields: [],
      explanation:
        'Names are similar but drug equivalence cannot be assumed without clinical confirmation.',
      before_evidence: beforeEvidence,
      after_evidence: afterEvidence,
      review_required: true,
    };
  }

  // RULE: Low confidence (< 0.8) -> NEEDS_CONFIRMATION
  if (
    (beforeMention && beforeMention.confidence < 0.8) ||
    (afterMention && afterMention.confidence < 0.8)
  ) {
    return {
      diff_id: diffId,
      before_mention_id: beforeMention?.mention_id ?? null,
      after_mention_id: afterMention?.mention_id ?? null,
      match_basis: matchBasis,
      match_confidence: matchConfidence,
      category: 'needs_confirmation',
      changed_fields: [],
      explanation:
        'Extraction confidence is below the clinical threshold (0.80); confirmation required.',
      before_evidence: beforeEvidence,
      after_evidence: afterEvidence,
      review_required: true,
    };
  }

  // RULE: Missing evidence quote -> NEEDS_CONFIRMATION
  if (
    (beforeMention && !beforeMention.evidence_quote.trim()) ||
    (afterMention && !afterMention.evidence_quote.trim())
  ) {
    return {
      diff_id: diffId,
      before_mention_id: beforeMention?.mention_id ?? null,
      after_mention_id: afterMention?.mention_id ?? null,
      match_basis: matchBasis,
      match_confidence: matchConfidence,
      category: 'needs_confirmation',
      changed_fields: [],
      explanation:
        'Missing source evidence quote; clinical review required to confirm.',
      before_evidence: beforeEvidence,
      after_evidence: afterEvidence,
      review_required: true,
    };
  }

  // RULE: Medication missing from AFTER is NEVER classified as stopped -> NEEDS_CONFIRMATION
  if (beforeMention && !afterMention) {
    return {
      diff_id: diffId,
      before_mention_id: beforeMention.mention_id,
      after_mention_id: null,
      match_basis: 'unmatched',
      match_confidence: 0.0,
      category: 'needs_confirmation',
      changed_fields: [],
      explanation:
        'Appears on the previous list but missing from the new list; confirm whether it was intentionally omitted or discontinued.',
      before_evidence: beforeEvidence,
      after_evidence: null,
      review_required: true,
    };
  }

  // RULE: Unmatched medication in AFTER
  if (!beforeMention && afterMention) {
    if (
      afterMention.status_word === 'stop' ||
      afterMention.status_word === 'hold'
    ) {
      return {
        diff_id: diffId,
        before_mention_id: null,
        after_mention_id: afterMention.mention_id,
        match_basis: 'unmatched',
        match_confidence: afterMention.confidence,
        category: 'explicitly_stopped',
        changed_fields: ['status'],
        explanation:
          'Explicitly marked as discontinued or held on the new list; verify stop order.',
        before_evidence: null,
        after_evidence: afterEvidence,
        review_required: true,
      };
    }

    return {
      diff_id: diffId,
      before_mention_id: null,
      after_mention_id: afterMention.mention_id,
      match_basis: 'unmatched',
      match_confidence: afterMention.confidence,
      category: 'started',
      changed_fields: [],
      explanation: 'Appears on the new list; confirm whether to start.',
      before_evidence: null,
      after_evidence: afterEvidence,
      review_required: true,
    };
  }

  // Both BEFORE and AFTER exist
  if (beforeMention && afterMention) {
    // RULE: EXPLICITLY_STOPPED requires explicit stop/hold wording in AFTER
    if (
      afterMention.status_word === 'stop' ||
      afterMention.status_word === 'hold'
    ) {
      return {
        diff_id: diffId,
        before_mention_id: beforeMention.mention_id,
        after_mention_id: afterMention.mention_id,
        match_basis: matchBasis,
        match_confidence: matchConfidence,
        category: 'explicitly_stopped',
        changed_fields: ['status'],
        explanation:
          'Explicitly marked as discontinued or held on the new list; verify stop order.',
        before_evidence: beforeEvidence,
        after_evidence: afterEvidence,
        review_required: true,
      };
    }

    const changedFields: ChangedField[] = [];
    let nullVsKnownConflict = false;

    // Check Route
    if (beforeMention.route !== null && afterMention.route !== null) {
      if (beforeMention.route !== afterMention.route) {
        changedFields.push('route');
      }
    } else if (beforeMention.route !== null || afterMention.route !== null) {
      nullVsKnownConflict = true;
    }

    // Check Dose
    const doseQtyChanged =
      beforeMention.dose_quantity !== null &&
      afterMention.dose_quantity !== null &&
      beforeMention.dose_quantity !== afterMention.dose_quantity;
    const doseFormChanged =
      beforeMention.dose_form !== null &&
      afterMention.dose_form !== null &&
      beforeMention.dose_form !== afterMention.dose_form;

    if (doseQtyChanged || doseFormChanged) {
      changedFields.push('dose');
    } else if (
      (beforeMention.dose_quantity !== null &&
        afterMention.dose_quantity === null) ||
      (beforeMention.dose_quantity === null &&
        afterMention.dose_quantity !== null) ||
      (beforeMention.dose_form !== null && afterMention.dose_form === null) ||
      (beforeMention.dose_form === null && afterMention.dose_form !== null)
    ) {
      nullVsKnownConflict = true;
    }

    // Check Strength
    const strengthValChanged =
      beforeMention.strength_value !== null &&
      afterMention.strength_value !== null &&
      beforeMention.strength_value !== afterMention.strength_value;
    const strengthUnitChanged =
      beforeMention.strength_unit !== null &&
      afterMention.strength_unit !== null &&
      beforeMention.strength_unit !== afterMention.strength_unit;

    if (strengthValChanged || strengthUnitChanged) {
      changedFields.push('strength');
    } else if (
      (beforeMention.strength_value !== null &&
        afterMention.strength_value === null) ||
      (beforeMention.strength_value === null &&
        afterMention.strength_value !== null) ||
      (beforeMention.strength_unit !== null &&
        afterMention.strength_unit === null) ||
      (beforeMention.strength_unit === null &&
        afterMention.strength_unit !== null)
    ) {
      nullVsKnownConflict = true;
    }

    // Check Frequency
    const freqPerDayChanged =
      beforeMention.frequency_per_day !== null &&
      afterMention.frequency_per_day !== null &&
      beforeMention.frequency_per_day !== afterMention.frequency_per_day;
    const freqRawChanged =
      beforeMention.frequency_per_day === null &&
      afterMention.frequency_per_day === null &&
      beforeMention.frequency_raw !== null &&
      afterMention.frequency_raw !== null &&
      beforeMention.frequency_raw.toLowerCase().trim() !==
        afterMention.frequency_raw.toLowerCase().trim();

    if (freqPerDayChanged || freqRawChanged) {
      changedFields.push('frequency');
    } else if (
      (beforeMention.frequency_per_day !== null &&
        afterMention.frequency_per_day === null) ||
      (beforeMention.frequency_per_day === null &&
        afterMention.frequency_per_day !== null)
    ) {
      nullVsKnownConflict = true;
    }

    // RULE: Null versus known is not a change. It becomes NEEDS_CONFIRMATION.
    if (nullVsKnownConflict) {
      return {
        diff_id: diffId,
        before_mention_id: beforeMention.mention_id,
        after_mention_id: afterMention.mention_id,
        match_basis: matchBasis,
        match_confidence: matchConfidence,
        category: 'needs_confirmation',
        changed_fields: changedFields,
        explanation:
          'Comparison involves unspecified or missing fields between lists; confirmation required.',
        before_evidence: beforeEvidence,
        after_evidence: afterEvidence,
        review_required: true,
      };
    }

    // Determine category based on priority: route > dose > strength > frequency
    if (changedFields.length > 0) {
      let category: DiffCategory = 'frequency_changed';
      let explanation = '';

      if (changedFields.includes('route')) {
        category = 'route_changed';
        explanation = `Route changed from ${beforeMention.route} to ${afterMention.route}.`;
      } else if (changedFields.includes('dose')) {
        category = 'dose_changed';
        explanation = `Dose changed from ${beforeMention.dose_quantity ?? ''} ${beforeMention.dose_form ?? ''} to ${afterMention.dose_quantity ?? ''} ${afterMention.dose_form ?? ''}.`.trim();
      } else if (changedFields.includes('strength')) {
        category = 'strength_changed';
        explanation = `Strength changed from ${beforeMention.strength_value} ${beforeMention.strength_unit ?? ''} to ${afterMention.strength_value} ${afterMention.strength_unit ?? ''}.`.trim();
      } else if (changedFields.includes('frequency')) {
        category = 'frequency_changed';
        const bFreq =
          beforeMention.frequency_per_day !== null
            ? `${beforeMention.frequency_per_day}x daily`
            : (beforeMention.frequency_raw ?? '');
        const aFreq =
          afterMention.frequency_per_day !== null
            ? `${afterMention.frequency_per_day}x daily`
            : (afterMention.frequency_raw ?? '');
        explanation = `Frequency changed from ${bFreq} to ${aFreq}.`;
      }

      return {
        diff_id: diffId,
        before_mention_id: beforeMention.mention_id,
        after_mention_id: afterMention.mention_id,
        match_basis: matchBasis,
        match_confidence: matchConfidence,
        category,
        changed_fields: changedFields,
        explanation,
        before_evidence: beforeEvidence,
        after_evidence: afterEvidence,
        review_required: true,
      };
    }

    // No field changes detected -> Unchanged
    return {
      diff_id: diffId,
      before_mention_id: beforeMention.mention_id,
      after_mention_id: afterMention.mention_id,
      match_basis: matchBasis,
      match_confidence: matchConfidence,
      category: 'unchanged',
      changed_fields: [],
      explanation:
        'Medication details match between previous and new lists.',
      before_evidence: beforeEvidence,
      after_evidence: afterEvidence,
      review_required: true,
    };
  }

  // Fallback safe classification
  return {
    diff_id: diffId,
    before_mention_id: beforeMention?.mention_id ?? null,
    after_mention_id: afterMention?.mention_id ?? null,
    match_basis: matchBasis,
    match_confidence: matchConfidence,
    category: 'needs_confirmation',
    changed_fields: [],
    explanation:
      'Indeterminate medication state; clinical verification required.',
    before_evidence: beforeEvidence,
    after_evidence: afterEvidence,
    review_required: true,
  };
}

/**
 * Sorts diffs strictly according to clinical review priority:
 * 1. Explicit stop & field changes
 * 2. Duplicates
 * 3. Started
 * 4. Confirmation
 * 5. Unchanged
 */
const CATEGORY_PRIORITY: Record<DiffCategory, number> = {
  explicitly_stopped: 1,
  route_changed: 2,
  dose_changed: 3,
  strength_changed: 4,
  frequency_changed: 5,
  possible_duplicate: 6,
  started: 7,
  needs_confirmation: 8,
  unchanged: 9,
};

export function sortDiffsByReviewPriority(
  diffs: MedicationDiff[]
): MedicationDiff[] {
  return [...diffs].sort((a, b) => {
    const pA = CATEGORY_PRIORITY[a.category] ?? 99;
    const pB = CATEGORY_PRIORITY[b.category] ?? 99;
    if (pA !== pB) return pA - pB;
    return a.diff_id.localeCompare(b.diff_id);
  });
}

/**
 * Builds the complete deterministic DiffReport with category counts,
 * professional review questions, and clinical limitations.
 */
export function buildDiffReport(
  beforeDoc: SourceDocument,
  afterDoc: SourceDocument,
  aliasTable: Record<string, string> = DEMO_ALIAS_TABLE
): DiffReport {
  // 1. Detect duplicates in AFTER list
  const duplicateGroups = detectAfterDuplicates(
    afterDoc.medications,
    aliasTable
  );
  const duplicateAfterIds = new Set(
    duplicateGroups.map((group) => group.duplicateId)
  );

  // 2. Deterministic matching
  const pairs = matchMedicationMentions(
    beforeDoc.medications,
    afterDoc.medications,
    aliasTable,
    duplicateAfterIds
  );

  // 3. Classification
  const rawDiffs = pairs.map((pair, index) =>
    classifyMedicationPair(pair, index)
  );

  // 4. Priority sorting
  const diffs = sortDiffsByReviewPriority(rawDiffs);

  // 5. Compute category counts
  const counts: Record<DiffCategory, number> = {
    started: 0,
    explicitly_stopped: 0,
    strength_changed: 0,
    frequency_changed: 0,
    dose_changed: 0,
    route_changed: 0,
    possible_duplicate: 0,
    unchanged: 0,
    needs_confirmation: 0,
  };

  for (const diff of diffs) {
    counts[diff.category] = (counts[diff.category] || 0) + 1;
  }

  // 6. Generate professional questions for items needing clinical action
  const questions: string[] = [];
  for (const diff of diffs) {
    if (diff.category === 'explicitly_stopped') {
      questions.push(
        `Confirm that medication order for diff #${diff.diff_id} was intentionally discontinued.`
      );
    } else if (diff.category === 'possible_duplicate') {
      questions.push(
        `Review potential duplicate therapy in new regimen for diff #${diff.diff_id}.`
      );
    } else if (
      diff.category === 'needs_confirmation' &&
      diff.before_mention_id &&
      !diff.after_mention_id
    ) {
      questions.push(
        `Confirm whether prior medication in diff #${diff.diff_id} was intentionally omitted or discontinued.`
      );
    } else if (
      diff.category === 'needs_confirmation' &&
      diff.match_basis === 'fuzzy_candidate'
    ) {
      questions.push(
        `Verify whether similar medication names in diff #${diff.diff_id} represent intended equivalence or distinct drugs.`
      );
    } else if (
      diff.category === 'route_changed' ||
      diff.category === 'dose_changed' ||
      diff.category === 'strength_changed' ||
      diff.category === 'frequency_changed'
    ) {
      questions.push(
        `Verify updated regimen (${diff.category.replace('_', ' ')}) for diff #${diff.diff_id}.`
      );
    } else if (diff.category === 'started') {
      questions.push(
        `Confirm indication and order to initiate new therapy for diff #${diff.diff_id}.`
      );
    }
  }

  // 7. Clinical limitations disclosures
  const limitations = [
    'RxDiff is a deterministic reconciliation aid and never provides clinical advice, dosage calculation, or prescription orders.',
    'All discrepancies, alterations, and flags require clinical review by a licensed healthcare professional before taking medical action.',
    'Drug equivalence is never inferred from name similarity; only verified aliases from transparent local tables are recognized.',
    'Omission of a medication from a subsequent list does not constitute a verified discontinuation order.',
  ];

  const report: DiffReport = {
    diffs,
    counts,
    questions_for_professional: questions,
    limitations,
  };

  // Validate against Zod schema
  return DiffReportSchema.parse(report);
}
