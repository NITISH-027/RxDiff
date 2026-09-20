import React, { useEffect } from 'react';
import type { PresentationDiffItem } from '../adapters/presentationAdapter.js';

interface EvidenceInspectorProps {
  item: PresentationDiffItem;
  onClose: () => void;
}

export const EvidenceInspector: React.FC<EvidenceInspectorProps> = ({ item, onClose }) => {
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
      className="flex flex-col h-full bg-panel-raised border border-line-dark rounded-[4px] shadow-lg overflow-hidden animate-card-enter"
      data-testid="evidence-inspector"
    >
      {/* Inspector Header with close affordance */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-line-dark bg-[#1A2027]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold tracking-[0.10em] text-active uppercase">
            EVIDENCE INSPECTOR
          </span>
          <span className="text-[10px] text-text-3 font-mono">
            [{item.diff.diff_id}]
          </span>
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono text-text-2 hover:text-white bg-[#0D1013] hover:bg-[#222830] border border-line-dark rounded-[3px] transition-colors focus-visible:ring-1 focus-visible:ring-active"
          title="Restore source rail (Escape)"
        >
          <span>VIEW ORIGINAL</span>
          <kbd className="text-[9px] bg-panel px-1 py-0.5 rounded text-text-3 border border-line-dark">ESC</kbd>
        </button>
      </div>

      {/* Main Inspector Body */}
      <div className="flex-1 p-3.5 space-y-3.5 overflow-y-auto">
        {/* Medication Title & Category Header */}
        <div className="pb-2.5 border-b border-line-dark">
          <div className="flex items-center gap-2 mb-1.5">
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

            <span className="font-mono text-[10px] text-text-3 uppercase">
              Basis: <strong className="text-text-2">{item.diff.match_basis}</strong>
            </span>
          </div>

          <h2 className="text-[16px] font-bold text-text-1">
            {item.displayName}
          </h2>

          <p className="font-mono text-[12.5px] text-text-2 mt-1 leading-[18px]">
            {item.transformationText}
          </p>
        </div>

        {/* Source Evidence Blocks */}
        <div className="space-y-3">
          {/* BEFORE Evidence Quote */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-text-3 mb-1">
              <span>01 BEFORE EVIDENCE {item.beforeMarker ? `[${item.beforeMarker}]` : ''}</span>
              {item.beforeMention && (
                <span className="tabular-nums">Conf: {(item.beforeMention.confidence * 100).toFixed(0)}%</span>
              )}
            </div>

            {item.beforeMention ? (
              <blockquote className="p-2.5 rounded-[3px] bg-paper text-paper-ink font-mono text-[12px] leading-[18px] border-l-2 border-[#D9D5CC]">
                &ldquo;{item.beforeMention.evidence_quote}&rdquo;
              </blockquote>
            ) : (
              <div className="p-2 rounded-[3px] bg-recessed border border-line-dark text-text-3 font-mono text-[11.5px] italic">
                No matching line (not on previous prescription list)
              </div>
            )}
          </div>

          {/* AFTER Evidence Quote */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-text-3 mb-1">
              <span>02 AFTER EVIDENCE {item.afterMarker ? `[${item.afterMarker}]` : ''}</span>
              {item.afterMention && (
                <span className="tabular-nums">Conf: {(item.afterMention.confidence * 100).toFixed(0)}%</span>
              )}
            </div>

            {item.afterMention ? (
              <blockquote className="p-2.5 rounded-[3px] bg-paper text-paper-ink font-mono text-[12px] leading-[18px] border-l-2 border-[#D9D5CC]">
                &ldquo;{item.afterMention.evidence_quote}&rdquo;
              </blockquote>
            ) : (
              <div className="p-2 rounded-[3px] bg-recessed border border-line-dark text-text-3 font-mono text-[11.5px] italic">
                No matching line (absent from discharge list)
              </div>
            )}
          </div>
        </div>

        {/* Engine Explanation */}
        <div className="p-2.5 rounded-[3px] bg-panel border border-line-dark">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-text-3 block mb-1">
            Engine Explanation
          </span>
          <p className="text-[12.5px] text-text-2 leading-[18px]">
            {item.diff.explanation}
          </p>
        </div>

        {/* Changed Fields list if present */}
        {item.diff.changed_fields.length > 0 && (
          <div>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-text-3 block mb-1">
              Changed Fields
            </span>
            <div className="flex flex-wrap gap-1.5">
              {item.diff.changed_fields.map((field) => (
                <span
                  key={field}
                  className="font-mono text-[11px] px-2 py-0.5 rounded-[2px] bg-changed/10 text-changed border border-changed/20 uppercase font-semibold"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Question for Healthcare Professional */}
        <div className="p-2.5 rounded-[3px] bg-active/5 border border-active/20">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-active block mb-1">
            Suggested Question for Doctor/Pharmacist
          </span>
          <p className="text-[13px] text-text-1 font-medium leading-[18px]">
            &ldquo;{item.patientQuestion}&rdquo;
          </p>
        </div>

        {/* Safety Disclaimer */}
        <div className="pt-2 border-t border-line-dark">
          <p className="font-mono text-[11px] text-text-3 italic leading-[16px]">
            ⚠️ Confirm this interpretation with a doctor or pharmacist. RxDiff never changes prescriptions.
          </p>
        </div>
      </div>
    </div>
  );
};
