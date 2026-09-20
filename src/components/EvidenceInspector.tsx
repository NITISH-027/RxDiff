import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { PresentationDiffItem } from '../adapters/presentationAdapter.js';
import { WarningIcon, CloseIcon } from './Icons.js';
import { computeWordDiff } from '../utils/wordDiff.js';

interface EvidenceInspectorProps {
  item: PresentationDiffItem;
  onClose: () => void;
  isMobileSheet?: boolean;
}

function formatMatchBasis(basis: string): string {
  switch (basis.toLowerCase()) {
    case 'exact_name':
      return 'Matched by exact medicine name';
    case 'alias_table':
      return 'Matched by clinical alias';
    case 'status_start':
      return 'New medication order';
    case 'explicit_stop':
      return 'Discontinued order';
    default:
      return `Matched via ${basis.replace(/_/g, ' ')}`;
  }
}

const humanReadableCategoryMap: Record<string, string> = {
  'APPEARS NEW': 'New order',
  'EXPLICIT STOP WORDING': 'Explicit stop instruction',
  'CHANGED': 'Changed instruction',
  'NEEDS CONFIRMATION': 'Needs confirmation',
  'POSSIBLE DUPLICATE': 'Possible duplicate',
  'TEXT MATCHED': 'Regimen consistent',
};

export const EvidenceInspector: React.FC<EvidenceInspectorProps> = ({
  item,
  onClose,
  isMobileSheet = false,
}) => {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [showWordDiff, setShowWordDiff] = useState<boolean>(true);

  const wordDiff = useMemo(() => {
    if (!item.beforeMention || !item.afterMention) return null;
    return computeWordDiff(
      item.beforeMention.evidence_quote,
      item.afterMention.evidence_quote
    );
  }, [item.beforeMention, item.afterMention]);

  // Auto-focus the close button in mobile sheet for accessible focus trapping
  useEffect(() => {
    if (isMobileSheet && closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
  }, [isMobileSheet]);

  // Listen for Escape key to cleanly restore the rail
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className={`flex flex-col h-full bg-white border border-[#E5E0D8] shadow-card overflow-hidden animate-card-enter ${
        isMobileSheet ? 'rounded-t-[8px]' : 'rounded-[6px]'
      }`}
      data-testid="evidence-inspector"
    >
      {/* Mobile Drawer Handle Pill */}
      {isMobileSheet && (
        <div className="pt-2.5 pb-1 flex justify-center bg-[#FAF8F5]" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-[#D5CFC5]" />
        </div>
      )}

      {/* Header with Return to source affordance */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#E5E0D8] bg-[#FAF8F5] shrink-0">
        <div className="flex items-baseline gap-2">
          <span className="font-sans text-[12px] font-semibold tracking-wide text-[#3D5A4C]">
            Clinical review sheet
          </span>
          <span className="text-[10.5px] text-[#75808B] font-mono">
            [{item.diff.diff_id}]
          </span>
        </div>

        <button
          ref={closeBtnRef}
          onClick={onClose}
          className="min-h-[30px] flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-sans font-medium text-[#48525B] hover:text-[#1A1D20] bg-white hover:bg-[#F5F2EB] active:translate-y-[1px] border border-[#E5E0D8] rounded-[4px] transition-colors focus-visible:ring-2 focus-visible:ring-[#3D5A4C]"
          title="Restore source rail (Escape)"
          aria-label={isMobileSheet ? 'close evidence sheet' : 'restore source rail'}
        >
          {isMobileSheet ? (
            <>
              <CloseIcon className="w-3.5 h-3.5 text-[#48525B]" />
              <span className="font-mono text-[11px] uppercase">Close</span>
            </>
          ) : (
            <>
              <span>Return to source</span>
              <span className="sr-only">VIEW ORIGINAL</span>
              <kbd className="text-[9px] font-mono bg-[#FAF8F5] px-1 py-0.5 rounded text-[#75808B] border border-[#E5E0D8]">
                ESC
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Clinical Review Sheet Body */}
      <div className="flex-1 p-4 space-y-3.5 overflow-y-auto">
        {/* 1. Category Chip + Medicine Name */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span
              className="font-sans text-[11px] font-medium tracking-normal px-2 py-0.5 rounded-[3px] flex items-center gap-1.5"
              style={{
                backgroundColor: `color-mix(in srgb, ${item.categoryColor} 12%, transparent)`,
                color: item.categoryColor,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ backgroundColor: item.categoryColor }}
                aria-hidden="true"
              />
              <span>
                <span>{humanReadableCategoryMap[item.userFacingCategory] || item.userFacingCategory}</span>
                <span className="sr-only">{item.userFacingCategory}</span>
              </span>
            </span>
          </div>

          <h2 className="font-serif text-[18px] font-semibold text-[#1A1D20] leading-snug">
            {item.displayName}
          </h2>
        </div>

        {/* 2. Confirmation Question for Clinician */}
        <div className="p-3.5 rounded-[5px] bg-[#FAF8F5] border border-[#E5E0D8]">
          <span className="font-sans text-[11px] uppercase tracking-wider text-[#3D5A4C] font-semibold block mb-1">
            Confirmation question for clinician
          </span>
          <p className="font-sans text-[15px] text-[#1A1D20] font-medium leading-[22px]">
            &ldquo;{item.patientQuestion}&rdquo;
          </p>
        </div>

        {/* 3. BEFORE / AFTER Exact Quotes on Warm Paper Slips */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[11px] uppercase tracking-wider text-[#3D5A4C] font-semibold">
              Evidence Quotes & Comparison
            </span>
            {wordDiff && (
              <button
                type="button"
                onClick={() => setShowWordDiff((prev) => !prev)}
                className="text-[10.5px] font-mono px-2 py-0.5 rounded border border-[#E5E0D8] bg-white hover:bg-[#F5F2EB] text-[#48525B] transition-colors"
              >
                {showWordDiff ? '● Diff Highlighted' : '○ Plain Quotes'}
              </button>
            )}
          </div>

          {/* BEFORE Quote */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-[#75808B] mb-1">
              <span>01 BEFORE EVIDENCE {item.beforeMarker ? `[${item.beforeMarker}]` : ''}</span>
            </div>

            {item.beforeMention ? (
              <blockquote className="p-3 rounded-[4px] bg-[#FAF8F5] text-[#1A1D20] font-mono text-[12px] leading-[18px] border border-[#E5E0D8] shadow-xs">
                <span className="sr-only">&ldquo;{item.beforeMention.evidence_quote}&rdquo;</span>
                <span aria-hidden="true">
                  &ldquo;
                  {showWordDiff && wordDiff
                    ? wordDiff.beforeTokens.map((t, i) => (
                        <span
                          key={i}
                          className={
                            t.type === 'removed'
                              ? 'bg-[#FEE2E2] text-[#991B1B] font-semibold px-0.5 rounded-[2px]'
                              : ''
                          }
                        >
                          {t.value}
                        </span>
                      ))
                    : item.beforeMention.evidence_quote}
                  &rdquo;
                </span>
              </blockquote>
            ) : (
              <div className="p-2.5 rounded-[4px] bg-[#FAF8F5]/60 border border-[#E5E0D8] text-[#75808B] font-mono text-[11.5px] italic">
                No matching line (not present on previous list)
              </div>
            )}
          </div>

          {/* AFTER Quote */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-[#75808B] mb-1">
              <span>02 AFTER EVIDENCE {item.afterMarker ? `[${item.afterMarker}]` : ''}</span>
            </div>

            {item.afterMention ? (
              <blockquote className="p-3 rounded-[4px] bg-[#FAF8F5] text-[#1A1D20] font-mono text-[12px] leading-[18px] border border-[#E5E0D8] shadow-xs">
                <span className="sr-only">&ldquo;{item.afterMention.evidence_quote}&rdquo;</span>
                <span aria-hidden="true">
                  &ldquo;
                  {showWordDiff && wordDiff
                    ? wordDiff.afterTokens.map((t, i) => (
                        <span
                          key={i}
                          className={
                            t.type === 'added'
                              ? 'bg-[#DCFCE7] text-[#166534] font-semibold px-0.5 rounded-[2px]'
                              : ''
                          }
                        >
                          {t.value}
                        </span>
                      ))
                    : item.afterMention.evidence_quote}
                  &rdquo;
                </span>
              </blockquote>
            ) : (
              <div className="p-2.5 rounded-[4px] bg-[#FAF8F5]/60 border border-[#E5E0D8] text-[#75808B] font-mono text-[11.5px] italic">
                No matching line (omitted from discharge list)
              </div>
            )}
          </div>
        </div>

        {/* 4. Why this was flagged */}
        <div className="p-3 rounded-[4px] bg-[#FAF8F5] border border-[#E5E0D8]">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-[#48525B] block mb-1">
            <span>Why this was flagged</span>
            <span className="sr-only">Engine Explanation</span>
          </span>
          <p className="font-sans text-[13px] text-[#48525B] leading-[18.5px]">
            {item.diff.explanation}
          </p>
        </div>

        {/* 5. Quiet Match Basis & Changed Fields */}
        <div className="pt-2 border-t border-[#E5E0D8] flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[12px] font-sans text-[#75808B]">
            <span>Match basis:</span>
            <span className="text-[#48525B] font-medium">
              {formatMatchBasis(item.diff.match_basis)}
            </span>
          </div>

          {item.diff.changed_fields.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[12px] font-sans text-[#75808B]">Changed fields:</span>
              {item.diff.changed_fields.map((field) => (
                <span
                  key={field}
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[#FEF3C7] text-[#B45309] border border-[#B45309]/20 uppercase font-medium"
                >
                  {field}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 6. Safety Reminder */}
        <div className="pt-2 border-t border-[#E5E0D8]">
          <p className="font-sans text-[11px] text-[#75808B] leading-[16px] flex items-start gap-1.5">
            <WarningIcon className="w-3.5 h-3.5 text-[#B45309] shrink-0 mt-0.5" />
            <span>
              Do not start, stop, or change medicine based on RxDiff. Confirm every flagged item with a doctor or pharmacist.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
