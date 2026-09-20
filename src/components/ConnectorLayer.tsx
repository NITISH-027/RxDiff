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
  isRightSegment?: boolean;
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

      // 1. BEFORE Row -> Diff Left Anchor
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
          });
        }
      }

      // 2. Diff Right Anchor -> AFTER Row (only if inspector is not replacing AFTER rail)
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
            isRightSegment: true,
          });
        }
      }
    });

    setSegments(newSegments);
  }, [containerRef, diffItems, inspectorOpen]);

  useEffect(() => {
    // Initial measurement
    calculatePaths();

    // Re-measure on resize or layout changes
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => {
        calculatePaths();
      });
      ro.observe(containerRef.current);
    }

    window.addEventListener('resize', calculatePaths);
    window.addEventListener('scroll', calculatePaths);

    // Double frame check for font rendering or layout settling
    const rafId = requestAnimationFrame(calculatePaths);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', calculatePaths);
      window.removeEventListener('scroll', calculatePaths);
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
          <g key={`${seg.diffId}-${idx}`}>
            <path
              d={seg.d}
              fill="none"
              stroke={isActive ? '#38BDF8' : 'rgba(255, 255, 255, 0.12)'}
              strokeWidth={isActive ? 2 : 1}
              strokeOpacity={isDimmed ? 0.05 : isActive ? 1 : 0.4}
              strokeDasharray={isActive ? 'none' : '3 3'}
              className="transition-all duration-200"
            />

            {/* Tiny TRACE pill on the active connector */}
            {isActive && (
              <g transform={`translate(${seg.midX - 18}, ${seg.midY - 8})`}>
                <rect
                  width="36"
                  height="16"
                  rx="3"
                  fill="#0D1013"
                  stroke="#38BDF8"
                  strokeWidth="1"
                />
                <text
                  x="18"
                  y="11"
                  fill="#38BDF8"
                  fontSize="9"
                  fontFamily="'IBM Plex Mono', monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                  letterSpacing="0.08em"
                >
                  TRACE
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};
