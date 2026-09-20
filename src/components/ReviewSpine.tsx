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
  const priorityItems = diffItems.filter((i) => i.diff.category !== 'unchanged');
  const unchangedItems = diffItems.filter((i) => i.diff.category === 'unchanged');

  return (
    <div
      className="flex flex-col w-full space-y-4 select-none"
      data-testid="review-spine"
    >
      {/* Primary Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-2 border-b border-[#E5E0D8]">
        <div>
          <div className="flex items-baseline gap-2">
            <h2 className="font-serif text-[20px] font-normal text-[#1A1D20] tracking-tight">
              <span>Medication review</span>
              <span className="sr-only">RECONCILIATION SPINE</span>
            </h2>
            <span className="text-[11px] text-[#75808B] font-mono">
              <span>[Priority order]</span>
              <span className="sr-only">[PRIORITY RANKED]</span>
            </span>
          </div>
          <p className="font-sans text-[12.5px] text-[#48525B] mt-0.5">
            Evaluate flagged differences, discontinued items, and orders requiring confirmation.
          </p>
        </div>

        <div className="font-mono text-[11px] text-[#75808B] tabular-nums self-start sm:self-auto">
          <span>{diffItems.length} {diffItems.length === 1 ? 'comparison' : 'comparisons'}</span>
          <span className="sr-only">{diffItems.length} {diffItems.length === 1 ? 'DIFF' : 'DIFFS'}</span>
        </div>
      </div>

      {/* Priority Differences Cards */}
      <div className="space-y-3.5">
        {priorityItems.map((item) => {
          const isActive = activeDiffId === item.diff.diff_id;
          const isDimmed = activeDiffId !== null && !isActive;

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
              className={`relative flex flex-col p-4 sm:p-4.5 rounded-[8px] border transition-all duration-150 cursor-pointer text-left ${
                isActive
                  ? 'bg-[#FAF8F5] border-[#3D5A4C] ring-2 ring-[#3D5A4C]/20 shadow-md'
                  : 'bg-white border-[#E5E0D8] hover:border-[#D5CFC5] hover:bg-[#FAF8F5]/50 shadow-card'
              } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
              style={{
                borderLeftWidth: '3.5px',
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
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className="font-sans text-[11.5px] font-medium tracking-normal px-2.5 py-0.5 rounded-[3px] flex items-center gap-1.5"
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
                  className={`font-mono text-[10px] font-medium px-2 py-0.5 rounded-[2px] uppercase ${
                    item.actionBadge === 'CONFIRM'
                      ? 'border border-[#B45309]/30 text-[#B45309] bg-[#FEF3C7]/70 font-semibold'
                      : 'border border-[#2E6B56]/20 text-[#2E6B56] bg-[#E8EFEA]/70 font-semibold'
                  }`}
                >
                  {item.actionBadge}
                </span>
              </div>

              {/* Medicine Name (17-18px semibold) */}
              <h3 className="font-serif text-[17.5px] sm:text-[18px] font-semibold text-[#1A1D20] leading-snug mb-1">
                {item.displayName}
              </h3>

              {/* Transformation Statement */}
              <p className="font-sans text-[13.5px] leading-[19.5px] text-[#48525B] mb-3">
                {item.transformationText}
              </p>

              {/* Bottom Row: Gutter Markers & Evidence Interaction */}
              <div className="flex items-center justify-between pt-2.5 border-t border-[#E5E0D8]/70 text-[11.5px] font-mono text-[#75808B]">
                <div className="flex items-center gap-2">
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
                    <span className="text-[#9F1239] font-sans italic text-[11.5px]">
                      <span>Omitted from discharge</span>
                      <span className="sr-only">OMITTED FROM NEW</span>
                    </span>
                  )}
                  {!item.beforeMarker && (
                    <span className="text-[#2E6B56] font-sans italic text-[11.5px]">
                      <span>New in discharge</span>
                      <span className="sr-only">NOT IN PREVIOUS</span>
                    </span>
                  )}
                </div>

                <span className="text-[#3D5A4C] hover:text-[#22352B] font-sans text-[12px] font-medium flex items-center gap-1 group">
                  <span>Review evidence & quotes</span>
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary Section: Unchanged Regimen Items */}
      {unchangedItems.length > 0 && (
        <div className="pt-3 border-t border-[#E5E0D8] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-[11.5px] font-semibold uppercase tracking-wider text-[#75808B]">
              <span>Consistent medications (no changes detected)</span>
            </h3>
            <span className="font-mono text-[10.5px] text-[#75808B]">
              {unchangedItems.length} continuing
            </span>
          </div>

          <div className="space-y-2">
            {unchangedItems.map((item) => {
              const isActive = activeDiffId === item.diff.diff_id;
              const isDimmed = activeDiffId !== null && !isActive;

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
                  className={`relative flex flex-col p-3.5 rounded-[6px] border transition-all duration-150 cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#FAF8F5] border-[#3D5A4C] ring-1 ring-[#3D5A4C] shadow-xs'
                      : 'bg-[#FAF8F5]/60 border-[#E5E0D8]/80 hover:border-[#D5CFC5] hover:bg-[#FAF8F5]'
                  } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
                  style={{
                    borderLeftWidth: '3px',
                    borderLeftColor: item.categoryColor,
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-sans text-[11px] font-medium text-[#2E6B56] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2E6B56]" aria-hidden="true" />
                      <span>
                        <span>{humanReadableCategoryMap[item.userFacingCategory] || item.userFacingCategory}</span>
                        <span className="sr-only">{item.userFacingCategory}</span>
                      </span>
                    </span>

                    <span className="font-mono text-[10px] text-[#75808B]">
                      Matched
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                    <h4 className="font-serif text-[15.5px] font-semibold text-[#1A1D20]">
                      {item.displayName}
                    </h4>
                    <p className="font-sans text-[12.5px] text-[#48525B]">
                      {item.transformationText}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
