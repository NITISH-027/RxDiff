import React, { useEffect, useState, useCallback } from 'react';
import type { PresentationDiffItem } from '../adapters/presentationAdapter.js';

interface ConnectorLayerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  diffItems: PresentationDiffItem[];
  activeDiffId: string | null;
  inspectorOpen: boolean;
}

interface PathSegment {
  diffId: string;
  d: string;
  midX: number;
  midY: number;
  gutter: 'left' | 'right';
}

export const ConnectorLayer: React.FC<ConnectorLayerProps> = ({
  containerRef,
  diffItems,
  activeDiffId,
  inspectorOpen,
}) => {
  const [segments, setSegments] = useState<PathSegment[]>([]);

  const calculatePaths = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newSegments: PathSegment[] = [];

    diffItems.forEach((item) => {
      const diffLeftEl = document.getElementById(`diff-${item.diff.diff_id}-left`);
      const diffRightEl = document.getElementById(`diff-${item.diff.diff_id}-right`);

      if (!diffLeftEl) return;

      const diffLeftRect = diffLeftEl.getBoundingClientRect();
      const diffLeftX = diffLeftRect.left - containerRect.left;
      const diffLeftY = diffLeftRect.top + diffLeftRect.height / 2 - containerRect.top;

      // 1. LEFT GUTTER: BEFORE Row right edge -> Diff card left edge
      if (item.beforeMention) {
        const beforeEl = document.getElementById(`before-${item.beforeMention.mention_id}`);
        if (beforeEl) {
          const beforeRect = beforeEl.getBoundingClientRect();
          const startX = beforeRect.right - containerRect.left;
          const startY = beforeRect.top + beforeRect.height / 2 - containerRect.top;

          const dx = diffLeftX - startX;
          const cx1 = startX + dx * 0.45;
          const cy1 = startY;
          const cx2 = diffLeftX - dx * 0.45;
          const cy2 = diffLeftY;

          newSegments.push({
            diffId: item.diff.diff_id,
            d: `M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${diffLeftX} ${diffLeftY}`,
            midX: (startX + diffLeftX) / 2,
            midY: (startY + diffLeftY) / 2,
            gutter: 'left',
          });
        }
      }

      // 2. RIGHT GUTTER: Diff card right edge -> AFTER Row left edge
      if (item.afterMention && diffRightEl && !inspectorOpen) {
        const diffRightRect = diffRightEl.getBoundingClientRect();
        const startX = diffRightRect.right - containerRect.left;
        const startY = diffRightRect.top + diffRightRect.height / 2 - containerRect.top;

        const afterEl = document.getElementById(`after-${item.afterMention.mention_id}`);
        if (afterEl) {
          const afterRect = afterEl.getBoundingClientRect();
          const endX = afterRect.left - containerRect.left;
          const endY = afterRect.top + afterRect.height / 2 - containerRect.top;

          const dx = endX - startX;
          const cx1 = startX + dx * 0.45;
          const cy1 = startY;
          const cx2 = endX - dx * 0.45;
          const cy2 = endY;

          newSegments.push({
            diffId: item.diff.diff_id,
            d: `M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`,
            midX: (startX + endX) / 2,
            midY: (startY + endY) / 2,
            gutter: 'right',
          });
        }
      }
    });

    setSegments(newSegments);
  }, [containerRef, diffItems, inspectorOpen]);

  useEffect(() => {
    calculatePaths();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => {
        calculatePaths();
      });
      ro.observe(containerRef.current);
    }

    // Capture scroll events from internal scrolling containers (SourceRail, ReviewSpine)
    window.addEventListener('scroll', calculatePaths, true);
    window.addEventListener('resize', calculatePaths);

    const rafId = requestAnimationFrame(calculatePaths);

    return () => {
      ro?.disconnect();
      window.removeEventListener('scroll', calculatePaths, true);
      window.removeEventListener('resize', calculatePaths);
      cancelAnimationFrame(rafId);
    };
  }, [calculatePaths, containerRef]);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-10 hidden lg:block overflow-visible"
      data-testid="connector-layer"
      aria-hidden="true"
    >
      {segments.map((seg, idx) => {
        const isActive = activeDiffId === seg.diffId;
        const isDimmed = activeDiffId !== null && !isActive;

        return (
          <g key={`${seg.diffId}-${seg.gutter}-${idx}`}>
            {/* Connector Path: subtle warm-gray hairline (18-24% opacity) / active sky (1.5px, 80% opacity) */}
            <path
              d={seg.d}
              fill="none"
              stroke={isActive ? '#38BDF8' : 'rgba(216, 210, 197, 0.22)'}
              strokeWidth={isActive ? 1.5 : 1}
              strokeOpacity={isDimmed ? 0.05 : isActive ? 0.85 : 0.22}
              className="transition-all duration-150"
            />
          </g>
        );
      })}
    </svg>
  );
};
