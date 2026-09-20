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
      className="flex flex-col h-full bg-panel border border-line-dark rounded-[6px] shadow-sm overflow-hidden select-none"
      data-testid="review-spine"
    >
      {/* Header: Medication review / Priority order / N comparisons */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-line-dark bg-chrome shrink-0">
        <div className="flex items-baseline gap-2">
          <h2 className="font-sans text-[12px] font-semibold tracking-wide text-text-1 uppercase">
            <span>Medication review</span>
            <span className="sr-only">RECONCILIATION SPINE</span>
          </h2>
          <span className="text-[10px] text-text-3 font-mono uppercase tracking-wider">
            <span>[Priority order]</span>
            <span className="sr-only">[PRIORITY RANKED]</span>
          </span>
        </div>
        <span className="font-mono text-[11px] text-text-2 tabular-nums">
          <span>{diffItems.length} {diffItems.length === 1 ? 'comparison' : 'comparisons'}</span>
          <span className="sr-only">{diffItems.length} {diffItems.length === 1 ? 'DIFF' : 'DIFFS'}</span>
        </span>
      </div>

      {/* Editorial Annotations List on Shared Plane */}
      <div className="flex-1 p-2.5 space-y-2 overflow-y-auto">
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
              className={`relative flex flex-col p-3 rounded-[5px] border transition-all duration-150 cursor-pointer text-left ${
                isActive
                  ? 'bg-panel-raised border-[#38BDF8] ring-1 ring-[#38BDF8]'
                  : isUnchanged
                    ? 'bg-chrome/60 border-line-dark/70 hover:border-line-dark hover:bg-panel-raised/50 opacity-80'
                    : 'bg-panel-raised border-line-dark hover:border-line-active hover:bg-[#1C232B]'
              } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
              style={{
                borderLeftWidth: '2.5px',
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

              {/* Category Pill & Action Badge */}
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
                  className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-[2px] uppercase ${
                    item.actionBadge === 'CONFIRM'
                      ? 'border border-[#F59E0B]/40 text-[#F59E0B] bg-[#F59E0B]/10'
                      : 'border border-[#34D399]/30 text-[#34D399] bg-[#34D399]/10'
                  }`}
                >
                  {item.actionBadge}
                </span>
              </div>

              {/* Medicine Name (15-17px sans semibold) */}
              <h3 className="font-sans text-[15.5px] font-semibold text-text-1 leading-snug mb-1">
                {item.displayName}
              </h3>

              {/* Plain Transformation Statement (13-14px sans) */}
              <p className="font-sans text-[13px] leading-[18px] text-text-2 mb-2">
                {item.transformationText}
              </p>

              {/* Bottom Metadata: Gutter Markers & Evidence Text Action */}
              <div className="flex items-center justify-between pt-2 border-t border-line-dark/60 text-[11px] font-mono text-text-3">
                <div className="flex items-center gap-1.5">
                  {item.beforeMarker && (
                    <span className="text-text-2">
                      Before <strong className="text-text-1 font-mono">{item.beforeMarker}</strong>
                    </span>
                  )}
                  {item.beforeMarker && item.afterMarker && <span className="text-text-3">·</span>}
                  {item.afterMarker && (
                    <span className="text-text-2">
                      After <strong className="text-text-1 font-mono">{item.afterMarker}</strong>
                    </span>
                  )}
                  {!item.afterMarker && (
                    <span className="text-[#FB7185] italic">
                      <span>Omitted from discharge</span>
                      <span className="sr-only">OMITTED FROM NEW</span>
                    </span>
                  )}
                  {!item.beforeMarker && (
                    <span className="text-[#38BDF8] italic">
                      <span>New in discharge</span>
                      <span className="sr-only">NOT IN PREVIOUS</span>
                    </span>
                  )}
                </div>

                <span className="text-active hover:underline text-[11px] font-medium flex items-center gap-1">
                  <span>{item.evidenceCount} {item.evidenceCount === 1 ? 'line' : 'lines'}</span>
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
