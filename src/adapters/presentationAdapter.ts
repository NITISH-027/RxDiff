import type {
  MedicationMention,
  MedicationDiff,
  DiffReport,
  DiffCategory,
} from '../types/medication.js';
import type { SyntheticCase } from '../data/syntheticCases.js';

export type UserFacingCategory =
  | 'CHANGED'
  | 'EXPLICIT STOP WORDING'
  | 'APPEARS NEW'
  | 'POSSIBLE DUPLICATE'
  | 'NEEDS CONFIRMATION'
  | 'TEXT MATCHED';

export interface IndexedSourceMention {
  marker: string; // "M01", "M02", etc.
  index: number;
  mention: MedicationMention;
  displayName: string;
}

export interface PresentationDiffItem {
  diff: MedicationDiff;
  displayName: string;
  userFacingCategory: UserFacingCategory;
  categoryColor: string; // Hex token string
  transformationText: string;
  actionBadge: 'CONFIRM' | 'MATCHED TEXT';
  beforeMarker: string | null;
  afterMarker: string | null;
  beforeMention: MedicationMention | null;
  afterMention: MedicationMention | null;
  evidenceCount: number;
  patientQuestion: string;
}

export interface PresentationModel {
  caseId: string;
  caseTitle: string;
  caseDescription: string;
  beforeMentions: IndexedSourceMention[];
  afterMentions: IndexedSourceMention[];
  diffItems: PresentationDiffItem[];
  counts: {
    beforeTotal: number;
    afterTotal: number;
    toConfirm: number;
    matched: number;
  };
  summaryText: string; // e.g. "4 BEFORE / 5 AFTER / 3 TO CONFIRM"
  limitations: string[];
}

export function formatGutterMarker(index: number): string {
  return `M${String(index + 1).padStart(2, '0')}`;
}

export function resolveMedicationDisplayName(
  before: MedicationMention | null,
  after: MedicationMention | null
): string {
  const primary = after ?? before;
  if (!primary) return 'Unknown Medication';

  if (primary.raw_name && primary.raw_name.trim()) {
    return primary.raw_name.trim();
  }

  if (primary.normalized_name && primary.normalized_name.trim()) {
    const norm = primary.normalized_name.trim();
    return norm.charAt(0).toUpperCase() + norm.slice(1);
  }

  // Fallback parse from raw_text
  const firstChunk = primary.raw_text.split(/,|\d/)[0]?.trim();
  if (firstChunk) {
    const cleaned = firstChunk.replace(/^(continue|start|stop|hold)\s+/i, '');
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return 'Medication';
}

export function mapUserFacingCategory(category: DiffCategory): UserFacingCategory {
  switch (category) {
    case 'strength_changed':
    case 'frequency_changed':
    case 'dose_changed':
    case 'route_changed':
      return 'CHANGED';
    case 'explicitly_stopped':
      return 'EXPLICIT STOP WORDING';
    case 'started':
      return 'APPEARS NEW';
    case 'possible_duplicate':
      return 'POSSIBLE DUPLICATE';
    case 'needs_confirmation':
      return 'NEEDS CONFIRMATION';
    case 'unchanged':
      return 'TEXT MATCHED';
  }
}

export function getCategoryColor(userCategory: UserFacingCategory): string {
  switch (userCategory) {
    case 'CHANGED':
      return 'var(--changed)'; // #F59E0B
    case 'EXPLICIT STOP WORDING':
      return 'var(--stopped)'; // #FB7185
    case 'APPEARS NEW':
      return 'var(--active)'; // #38BDF8
    case 'POSSIBLE DUPLICATE':
      return 'var(--duplicate)'; // #A78BFA
    case 'NEEDS CONFIRMATION':
      return 'var(--uncertain)'; // #94A3B8
    case 'TEXT MATCHED':
      return 'var(--matched)'; // #34D399
  }
}

export function deriveTransformationText(
  diff: MedicationDiff,
  before: MedicationMention | null,
  after: MedicationMention | null
): string {
  switch (diff.category) {
    case 'frequency_changed': {
      const b = before?.frequency_per_day
        ? `${before.frequency_per_day}x/day`
        : (before?.frequency_raw ?? 'prior freq');
      const a = after?.frequency_per_day
        ? `${after.frequency_per_day}x/day`
        : (after?.frequency_raw ?? 'new freq');
      return `Frequency: ${b} → ${a}`;
    }
    case 'strength_changed': {
      const b = `${before?.strength_value ?? ''} ${before?.strength_unit ?? ''}`.trim();
      const a = `${after?.strength_value ?? ''} ${after?.strength_unit ?? ''}`.trim();
      return `Strength: ${b} → ${a}`;
    }
    case 'dose_changed': {
      const b = `${before?.dose_quantity ?? ''} ${before?.dose_form ?? ''}`.trim();
      const a = `${after?.dose_quantity ?? ''} ${after?.dose_form ?? ''}`.trim();
      return `Dose: ${b} → ${a}`;
    }
    case 'route_changed':
      return `Route: ${before?.route ?? 'unknown'} → ${after?.route ?? 'unknown'}`;
    case 'explicitly_stopped':
      return 'Discontinue order noted on discharge list';
    case 'started':
      return 'New medication order; confirm indication to start';
    case 'possible_duplicate':
      return 'Redundant or dual-ordered therapy on new list';
    case 'needs_confirmation':
      if (before && !after) {
        return 'Absent from discharge list; verify intentional stop vs omission';
      }
      if (diff.match_basis === 'fuzzy_candidate') {
        return 'Similar name detected; confirm drug equivalence';
      }
      return 'Incomplete details; clinical confirmation required';
    case 'unchanged':
      return 'Source text and regimen match across lists';
  }
}

export function derivePatientQuestion(
  medName: string,
  diff: MedicationDiff,
  before: MedicationMention | null,
  after: MedicationMention | null
): string {
  switch (diff.category) {
    case 'unchanged':
      return `Does ${medName} and this regimen match the intended current list?`;
    case 'explicitly_stopped':
      return `Was ${medName} intentionally stopped or held on the new list?`;
    case 'frequency_changed': {
      const a = after?.frequency_per_day
        ? `${after.frequency_per_day} times daily`
        : (after?.frequency_raw ?? 'the new frequency');
      return `Is the new frequency of ${medName} (${a}) intended on the current list?`;
    }
    case 'strength_changed': {
      const a = `${after?.strength_value ?? ''} ${after?.strength_unit ?? ''}`.trim();
      return `Is the new dose strength of ${medName} (${a}) intended on the current list?`;
    }
    case 'dose_changed':
      return `Is the listed dose quantity of ${medName} intended on the current list?`;
    case 'route_changed':
      return `Is the listed administration route of ${medName} intended on the current list?`;
    case 'started':
      return `Is ${medName} intended as a new addition to the current list?`;
    case 'possible_duplicate':
      return `Are both orders for ${medName} intended on the current list, or is one order redundant?`;
    case 'needs_confirmation':
      if (before && !after) {
        return `Was ${medName} intentionally discontinued, or was it omitted from the new list?`;
      }
      return `Could you clarify the intended order for ${medName} on the current list?`;
  }
}

export function createPresentationModel(
  caseBundle: SyntheticCase,
  report: DiffReport
): PresentationModel {
  // Index source mentions
  const beforeMentions: IndexedSourceMention[] = caseBundle.beforeDoc.medications.map(
    (mention, idx) => ({
      marker: formatGutterMarker(idx),
      index: idx,
      mention,
      displayName: resolveMedicationDisplayName(mention, null),
    })
  );

  const afterMentions: IndexedSourceMention[] = caseBundle.afterDoc.medications.map(
    (mention, idx) => ({
      marker: formatGutterMarker(idx),
      index: idx,
      mention,
      displayName: resolveMedicationDisplayName(null, mention),
    })
  );

  const beforeMap = new Map<string, IndexedSourceMention>(
    beforeMentions.map((m) => [m.mention.mention_id, m])
  );
  const afterMap = new Map<string, IndexedSourceMention>(
    afterMentions.map((m) => [m.mention.mention_id, m])
  );

  // Map presentation diff items
  const diffItems: PresentationDiffItem[] = report.diffs.map((diff) => {
    const beforeIndexed = diff.before_mention_id
      ? beforeMap.get(diff.before_mention_id) ?? null
      : null;
    const afterIndexed = diff.after_mention_id
      ? afterMap.get(diff.after_mention_id) ?? null
      : null;

    const beforeMention = beforeIndexed?.mention ?? null;
    const afterMention = afterIndexed?.mention ?? null;

    const displayName = resolveMedicationDisplayName(beforeMention, afterMention);
    const userFacingCategory = mapUserFacingCategory(diff.category);
    const categoryColor = getCategoryColor(userFacingCategory);
    const transformationText = deriveTransformationText(diff, beforeMention, afterMention);
    const actionBadge = diff.category === 'unchanged' ? 'MATCHED TEXT' : 'CONFIRM';

    const evidenceCount = (beforeMention ? 1 : 0) + (afterMention ? 1 : 0);
    const patientQuestion = derivePatientQuestion(displayName, diff, beforeMention, afterMention);

    return {
      diff,
      displayName,
      userFacingCategory,
      categoryColor,
      transformationText,
      actionBadge,
      beforeMarker: beforeIndexed?.marker ?? null,
      afterMarker: afterIndexed?.marker ?? null,
      beforeMention,
      afterMention,
      evidenceCount,
      patientQuestion,
    };
  });

  const beforeTotal = beforeMentions.length;
  const afterTotal = afterMentions.length;
  const toConfirm = diffItems.filter((d) => d.diff.category !== 'unchanged').length;
  const matched = diffItems.filter((d) => d.diff.category === 'unchanged').length;

  const summaryText = `${beforeTotal} BEFORE / ${afterTotal} AFTER / ${toConfirm} TO CONFIRM`;

  return {
    caseId: caseBundle.id,
    caseTitle: caseBundle.title,
    caseDescription: caseBundle.description,
    beforeMentions,
    afterMentions,
    diffItems,
    counts: {
      beforeTotal,
      afterTotal,
      toConfirm,
      matched,
    },
    summaryText,
    limitations: report.limitations,
  };
}
