import React from 'react';
import type { PresentationDiffItem } from '../adapters/presentationAdapter.js';

interface ReviewSpineProps {
  diffItems: PresentationDiffItem[];
  activeDiffId: string | null;
  onHoverDiff: (diffId: string | null) => void;
  onSelectDiff: (diffId: string) => void;
}

const humanReadableCategoryMap: Record<string, string> = {
  'APPEARS NEW': 'New order',
  'EXPLICIT STOP WORDING': 'Explicit stop instruction',
  'CHANGED': 'Changed instruction',
  'NEEDS CONFIRMATION': 'Needs confirmation',
  'POSSIBLE DUPLICATE': 'Possible duplicate',
  'TEXT MATCHED': 'Regimen consistent',
};

export const ReviewSpine: React.FC<ReviewSpineProps> = ({
  diffItems,
  activeDiffId,
  onHoverDiff,
  onSelectDiff,
}) => {
  return (
    <div
      className="flex flex-col h-full bg-white border border-[#E5E0D8] rounded-[6px] shadow-card overflow-hidden select-none"
      data-testid="review-spine"
    >
      {/* Header: Medication review / Priority order / N comparisons */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#E5E0D8] bg-[#FAF8F5] shrink-0">
        <div className="flex items-baseline gap-2">
          <h2 className="font-sans text-[12px] font-semibold tracking-wide text-[#1A1D20]">
            <span>Medication review</span>
            <span className="sr-only">RECONCILIATION SPINE</span>
          </h2>
          <span className="text-[10px] text-[#75808B] font-mono tracking-wider">
            <span>[Priority order]</span>
            <span className="sr-only">[PRIORITY RANKED]</span>
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#75808B] tabular-nums">
          <span>{diffItems.length} {diffItems.length === 1 ? 'comparison' : 'comparisons'}</span>
          <span className="sr-only">{diffItems.length} {diffItems.length === 1 ? 'DIFF' : 'DIFFS'}</span>
        </span>
      </div>

      {/* Flagged and Matched Medication Cards List */}
      <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
        {diffItems.map((item) => {
          const isActive = activeDiffId === item.diff.diff_id;
          const isDimmed = activeDiffId !== null && !isActive;
          const isUnchanged = item.diff.category === 'unchanged';

          return (
            <div
              key={item.diff.diff_id}
              id={`diff-${item.diff.diff_id}`}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              onMouseEnter={() => onHoverDiff(item.diff.diff_id)}
              onMouseLeave={() => onHoverDiff(null)}
              onClick={() => onSelectDiff(item.diff.diff_id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectDiff(item.diff.diff_id);
                }
              }}
              className={`relative flex flex-col p-3.5 rounded-[5px] border transition-all duration-150 cursor-pointer text-left ${
                isActive
                  ? 'bg-[#FAF8F5] border-[#3D5A4C] ring-1 ring-[#3D5A4C] shadow-sm'
                  : isUnchanged
                    ? 'bg-[#FAF8F5]/50 border-[#E5E0D8]/70 hover:border-[#E5E0D8] hover:bg-[#FAF8F5]'
                    : 'bg-white border-[#E5E0D8] hover:border-[#D5CFC5] hover:bg-[#FAF8F5]/40 shadow-xs'
              } ${isDimmed ? 'opacity-35' : 'opacity-100'}`}
              style={{
                borderLeftWidth: '3px',
                borderLeftColor: item.categoryColor,
              }}
            >
              {/* Left & Right Anchor Nodes for SVG measurement */}
              <div
                id={`diff-${item.diff.diff_id}-left`}
                data-anchor-id={`diff-${item.diff.diff_id}-left`}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1 pointer-events-none"
                aria-hidden="true"
              />
              <div
                id={`diff-${item.diff.diff_id}-right`}
                data-anchor-id={`diff-${item.diff.diff_id}-right`}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 pointer-events-none"
                aria-hidden="true"
              />

              {/* Category Pill & Restrained Action Badge */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
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

                <span
                  className={`font-mono text-[10px] font-medium px-1.5 py-0.5 rounded-[2px] uppercase ${
                    item.actionBadge === 'CONFIRM'
                      ? 'border border-[#B45309]/30 text-[#B45309] bg-[#FEF3C7]/60'
                      : 'border border-[#2E6B56]/20 text-[#2E6B56] bg-[#E8EFEA]/60'
                  }`}
                >
                  {item.actionBadge}
                </span>
              </div>

              {/* Medicine Name (16px semibold deep charcoal) */}
              <h3 className="font-sans text-[16px] font-semibold text-[#1A1D20] leading-snug mb-1">
                {item.displayName}
              </h3>

              {/* Transformation Statement */}
              <p className="font-sans text-[13px] leading-[18.5px] text-[#48525B] mb-2.5">
                {item.transformationText}
              </p>

              {/* Bottom Metadata: Gutter Markers & Evidence Interaction */}
              <div className="flex items-center justify-between pt-2 border-t border-[#E5E0D8]/60 text-[11px] font-mono text-[#75808B]">
                <div className="flex items-center gap-1.5">
                  {item.beforeMarker && (
                    <span className="text-[#48525B]">
                      Before <strong className="text-[#1A1D20] font-mono">{item.beforeMarker}</strong>
                    </span>
                  )}
                  {item.beforeMarker && item.afterMarker && <span className="text-[#75808B]">·</span>}
                  {item.afterMarker && (
                    <span className="text-[#48525B]">
                      After <strong className="text-[#1A1D20] font-mono">{item.afterMarker}</strong>
                    </span>
                  )}
                  {!item.afterMarker && (
                    <span className="text-[#9F1239] font-sans italic text-[11px]">
                      <span>Omitted from discharge</span>
                      <span className="sr-only">OMITTED FROM NEW</span>
                    </span>
                  )}
                  {!item.beforeMarker && (
                    <span className="text-[#2E6B56] font-sans italic text-[11px]">
                      <span>New in discharge</span>
                      <span className="sr-only">NOT IN PREVIOUS</span>
                    </span>
                  )}
                </div>

                <span className="text-[#3D5A4C] hover:text-[#243B30] font-sans text-[11.5px] font-medium flex items-center gap-1">
                  <span>Inspect evidence</span>
                  <span>→</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
