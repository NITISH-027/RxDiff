import React from 'react';
import type { PresentationDiffItem } from '../adapters/presentationAdapter.js';

interface ReviewSpineProps {
  diffItems: PresentationDiffItem[];
  activeDiffId: string | null;
  onHoverDiff: (diffId: string | null) => void;
  onSelectDiff: (diffId: string) => void;
}

export const ReviewSpine: React.FC<ReviewSpineProps> = ({
  diffItems,
  activeDiffId,
  onHoverDiff,
  onSelectDiff,
}) => {
  return (
    <div
      className="flex flex-col h-full bg-panel border border-line-dark rounded-[4px] shadow-sm overflow-hidden"
      data-testid="review-spine"
    >
      {/* Spine Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-line-dark bg-panel-raised">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold tracking-[0.10em] text-text-1 uppercase">
            RECONCILIATION SPINE
          </span>
          <span className="text-[10px] text-text-3 font-mono uppercase">
            [PRIORITY RANKED]
          </span>
        </div>
        <span className="font-mono text-[11px] text-text-2 tabular-nums">
          {diffItems.length} {diffItems.length === 1 ? 'DIFF' : 'DIFFS'}
        </span>
      </div>

      {/* Cards List */}
      <div className="flex-1 p-2 space-y-2.5 overflow-y-auto">
        {diffItems.map((item) => {
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
              className={`relative flex flex-col p-3 rounded-[3px] border bg-panel-raised transition-all duration-200 cursor-pointer text-left ${
                isActive
                  ? 'border-[#38BDF8] ring-1 ring-[#38BDF8] shadow-md'
                  : 'border-line-dark hover:border-line-active hover:bg-[#1A2027]'
              } ${isDimmed ? 'opacity-45' : 'opacity-100'}`}
              style={{
                borderLeftWidth: '3px',
                borderLeftColor: item.categoryColor,
              }}
            >
              {/* Left & Right Anchor Nodes for SVG measurement */}
              <div
                id={`diff-${item.diff.diff_id}-left`}
                data-anchor-id={`diff-${item.diff.diff_id}-left`}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1"
                aria-hidden="true"
              />
              <div
                id={`diff-${item.diff.diff_id}-right`}
                data-anchor-id={`diff-${item.diff.diff_id}-right`}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1"
                aria-hidden="true"
              />

              {/* Top Row: Category Pill & Action Badge */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span
                  className="font-mono text-[10px] font-bold tracking-[0.08em] px-1.5 py-0.5 rounded-[2px] uppercase flex items-center gap-1.5"
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
                  {item.userFacingCategory}
                </span>

                <span
                  className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] uppercase ${
                    item.actionBadge === 'CONFIRM'
                      ? 'border border-[#F59E0B]/40 text-[#F59E0B] bg-[#F59E0B]/10'
                      : 'border border-[#34D399]/30 text-[#34D399] bg-[#34D399]/10'
                  }`}
                >
                  {item.actionBadge}
                </span>
              </div>

              {/* Medication Name */}
              <h3 className="text-[14px] font-semibold text-text-1 leading-[20px] mb-1">
                {item.displayName}
              </h3>

              {/* Concise Transformation Statement */}
              <p className="font-mono text-[12px] leading-[17px] text-text-2 mb-2">
                {item.transformationText}
              </p>

              {/* Bottom Metadata: Gutter Markers & Evidence Lines Count */}
              <div className="flex items-center justify-between pt-2 border-t border-line-dark text-[10.5px] font-mono text-text-3">
                <div className="flex items-center gap-2">
                  {item.beforeMarker && (
                    <span className="text-text-2">
                      PREV: <strong className="text-text-1">{item.beforeMarker}</strong>
                    </span>
                  )}
                  {item.beforeMarker && item.afterMarker && <span>→</span>}
                  {item.afterMarker && (
                    <span className="text-text-2">
                      NEW: <strong className="text-text-1">{item.afterMarker}</strong>
                    </span>
                  )}
                  {!item.afterMarker && (
                    <span className="text-[#FB7185] italic">OMITTED FROM NEW</span>
                  )}
                  {!item.beforeMarker && (
                    <span className="text-[#38BDF8] italic">NOT IN PREVIOUS</span>
                  )}
                </div>

                <span className="text-text-3 tabular-nums">
                  {item.evidenceCount} {item.evidenceCount === 1 ? 'EVIDENCE LINE' : 'EVIDENCE LINES'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
