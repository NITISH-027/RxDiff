import React, { useEffect, useRef } from 'react';
import type { PresentationDiffItem } from '../adapters/presentationAdapter.js';
import { WarningIcon, CloseIcon } from './Icons.js';

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

export const EvidenceInspector: React.FC<EvidenceInspectorProps> = ({
  item,
  onClose,
  isMobileSheet = false,
}) => {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

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
      className={`flex flex-col h-full bg-panel border border-line-dark shadow-xl overflow-hidden animate-card-enter ${
        isMobileSheet ? 'rounded-t-[8px]' : 'rounded-[6px]'
      }`}
      data-testid="evidence-inspector"
    >
      {/* Mobile Drawer Handle Pill */}
      {isMobileSheet && (
        <div className="pt-2.5 pb-1 flex justify-center bg-chrome" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-text-3/40" />
        </div>
      )}

      {/* Header with Return to source affordance */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-line-dark bg-chrome shrink-0">
        <div className="flex items-baseline gap-2">
          <span className="font-sans text-[12px] font-semibold tracking-wide text-active uppercase">
            Clinical review sheet
          </span>
          <span className="text-[10px] text-text-3 font-mono">
            [{item.diff.diff_id}]
          </span>
        </div>

        <button
          ref={closeBtnRef}
          onClick={onClose}
          className="min-h-[30px] flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-sans font-medium text-text-2 hover:text-white bg-panel hover:bg-panel-raised active:translate-y-[1px] border border-line-dark rounded-[4px] transition-colors focus-visible:ring-2 focus-visible:ring-active"
          title="Restore source rail (Escape)"
          aria-label={isMobileSheet ? 'close evidence sheet' : 'restore source rail'}
        >
          {isMobileSheet ? (
            <>
              <CloseIcon className="w-3.5 h-3.5 text-text-2" />
              <span className="font-mono text-[11px] uppercase">Close</span>
            </>
          ) : (
            <>
              <span>Return to source</span>
              <span className="sr-only">VIEW ORIGINAL</span>
              <kbd className="text-[9px] font-mono bg-chrome px-1 py-0.5 rounded text-text-3 border border-line-dark">
                ESC
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Clinical Review Sheet Body */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* 1. Category Chip + Medicine Name */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[10px] font-bold tracking-[0.08em] px-2 py-0.5 rounded-[2px] uppercase flex items-center gap-1.5"
              style={{
                backgroundColor: `color-mix(in srgb, ${item.categoryColor} 15%, transparent)`,
                color: item.categoryColor,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ backgroundColor: item.categoryColor }}
                aria-hidden="true"
              />
              {item.userFacingCategory}
            </span>
          </div>

          <h2 className="font-sans text-[17px] font-semibold text-text-1 leading-snug">
            {item.displayName}
          </h2>
        </div>

        {/* 2. Neutral Patient/Doctor Question in 16-18px sans */}
        <div className="p-3.5 rounded-[6px] bg-[#101417] border border-line-dark">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-active block mb-1.5">
            Confirmation question for clinician
          </span>
          <p className="font-sans text-[16px] text-text-1 font-medium leading-[23px]">
            &ldquo;{item.patientQuestion}&rdquo;
          </p>
        </div>

        {/* 3. BEFORE / AFTER Exact Quotes on Warm Paper Slips */}
        <div className="space-y-2.5">
          {/* BEFORE Quote */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-text-3 mb-1">
              <span>01 BEFORE EVIDENCE {item.beforeMarker ? `[${item.beforeMarker}]` : ''}</span>
            </div>

            {item.beforeMention ? (
              <blockquote className="p-3 rounded-[5px] bg-paper text-paper-ink font-mono text-[12.5px] leading-[18px] border border-paper-edge shadow-paper">
                &ldquo;{item.beforeMention.evidence_quote}&rdquo;
              </blockquote>
            ) : (
              <div className="p-2.5 rounded-[5px] bg-recessed border border-line-dark text-text-3 font-mono text-[11.5px] italic">
                No matching line (not present on previous list)
              </div>
            )}
          </div>

          {/* AFTER Quote */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-text-3 mb-1">
              <span>02 AFTER EVIDENCE {item.afterMarker ? `[${item.afterMarker}]` : ''}</span>
            </div>

            {item.afterMention ? (
              <blockquote className="p-3 rounded-[5px] bg-paper text-paper-ink font-mono text-[12.5px] leading-[18px] border border-paper-edge shadow-paper">
                &ldquo;{item.afterMention.evidence_quote}&rdquo;
              </blockquote>
            ) : (
              <div className="p-2.5 rounded-[5px] bg-recessed border border-line-dark text-text-3 font-mono text-[11.5px] italic">
                No matching line (omitted from discharge list)
              </div>
            )}
          </div>
        </div>

        {/* 4. Why this was flagged */}
        <div className="p-3 rounded-[5px] bg-chrome border border-line-dark">
          <span className="font-sans text-[11.5px] font-semibold uppercase tracking-[0.06em] text-text-2 block mb-1">
            <span>Why this was flagged</span>
            <span className="sr-only">Engine Explanation</span>
          </span>
          <p className="font-sans text-[13px] text-text-2 leading-[19px]">
            {item.diff.explanation}
          </p>
        </div>

        {/* 5. Quiet Match Basis & Changed Fields */}
        <div className="pt-2 border-t border-line-dark flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[12px] font-sans text-text-3">
            <span className="text-text-3">Match basis:</span>
            <span className="text-text-2 font-medium">
              {formatMatchBasis(item.diff.match_basis)}
            </span>
          </div>

          {item.diff.changed_fields.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[12px] font-sans text-text-3">Changed fields:</span>
              {item.diff.changed_fields.map((field) => (
                <span
                  key={field}
                  className="font-mono text-[10.5px] px-1.5 py-0.5 rounded-[2px] bg-changed/10 text-changed border border-changed/20 uppercase font-semibold"
                >
                  {field}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 6. Safety Reminder */}
        <div className="pt-2 border-t border-line-dark">
          <p className="font-sans text-[11.5px] text-text-3 italic leading-[16px] flex items-start gap-1.5">
            <WarningIcon className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 mt-0.5" />
            <span>
              Do not start, stop, or change medicine based on RxDiff. Confirm every flagged item with a doctor or pharmacist.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
