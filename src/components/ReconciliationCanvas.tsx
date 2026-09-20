import React, { useState, useRef } from 'react';
import type { PresentationModel } from '../adapters/presentationAdapter.js';
import { SourceRail } from './SourceRail.js';
import { ReviewSpine } from './ReviewSpine.js';
import { EvidenceInspector } from './EvidenceInspector.js';
import { ConnectorLayer } from './ConnectorLayer.js';

interface ReconciliationCanvasProps {
  model: PresentationModel;
}

export const ReconciliationCanvas: React.FC<ReconciliationCanvasProps> = ({ model }) => {
  const [hoveredDiffId, setHoveredDiffId] = useState<string | null>(null);
  const [pinnedDiffId, setPinnedDiffId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'before' | 'changes' | 'after'>('changes');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Active diff is pinned if set, otherwise hovered
  const activeDiffId = pinnedDiffId ?? hoveredDiffId;
  const activeDiffItem = model.diffItems.find((d) => d.diff.diff_id === activeDiffId) ?? null;

  // Track active mention IDs
  const activeBeforeId = activeDiffItem?.beforeMention?.mention_id ?? null;
  const activeAfterId = activeDiffItem?.afterMention?.mention_id ?? null;

  // Dimmed mention IDs
  const dimmedBeforeIds = new Set<string>();
  const dimmedAfterIds = new Set<string>();

  if (activeDiffId) {
    model.beforeMentions.forEach((m) => {
      if (m.mention.mention_id !== activeBeforeId) {
        dimmedBeforeIds.add(m.mention.mention_id);
      }
    });
    model.afterMentions.forEach((m) => {
      if (m.mention.mention_id !== activeAfterId) {
        dimmedAfterIds.add(m.mention.mention_id);
      }
    });
  }

  const handleSelectDiff = (diffId: string) => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setPinnedDiffId((prev) => (prev === diffId ? null : diffId));
  };

  const handleCloseInspector = () => {
    setPinnedDiffId(null);
    // Return focus to the triggering card
    setTimeout(() => {
      triggerRef.current?.focus();
    }, 50);
  };

  const handleSelectSourceMention = (mentionId: string, type: 'before' | 'after') => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    const matchingDiff = model.diffItems.find((d) =>
      type === 'before'
        ? d.diff.before_mention_id === mentionId
        : d.diff.after_mention_id === mentionId
    );
    if (matchingDiff) {
      setPinnedDiffId(matchingDiff.diff.diff_id);
    }
  };

  return (
    <div
      className="w-full flex flex-col flex-1 min-h-0 h-full overflow-hidden"
      data-testid="reconciliation-canvas"
    >
      {/* Mobile Segmented Control (Tabs) */}
      <div className="lg:hidden flex items-center justify-between p-1 mb-2 bg-panel border border-line-dark rounded-[4px] shrink-0">
        {(['before', 'changes', 'after'] as const).map((tab) => {
          const isSelected = mobileTab === tab;
          const label =
            tab === 'before'
              ? `01 BEFORE (${model.counts.beforeTotal})`
              : tab === 'changes'
                ? `CHANGES (${model.counts.toConfirm})`
                : `02 AFTER (${model.counts.afterTotal})`;

          return (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 min-h-[44px] py-2 px-1 text-center font-mono text-[11px] font-bold uppercase rounded-[3px] transition-colors ${
                isSelected
                  ? 'bg-active text-[#080A0C] shadow-sm'
                  : 'text-text-2 hover:text-text-1 hover:bg-panel-raised'
              }`}
              aria-selected={isSelected}
              role="tab"
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 3-Column Layout (31% / 38% / 31%) */}
      <div
        ref={containerRef}
        className="relative w-full flex-1 min-h-0 flex flex-col lg:flex-row gap-3.5 items-stretch h-full overflow-hidden"
      >
        {/* SVG Signature Connector Overlay */}
        <ConnectorLayer
          containerRef={containerRef}
          diffItems={model.diffItems}
          activeDiffId={activeDiffId}
          inspectorOpen={pinnedDiffId !== null}
        />

        {/* COLUMN 1: BEFORE Source Rail (31%) */}
        <div
          className={`w-full lg:w-[31%] h-full flex flex-col overflow-hidden ${
            mobileTab === 'before' ? 'flex flex-1' : 'hidden lg:flex'
          }`}
        >
          <SourceRail
            title="01 PREVIOUS PRESCRIPTION"
            sourceType="PRESCRIPTION"
            mentions={model.beforeMentions}
            activeMentionId={activeBeforeId}
            dimmedMentionIds={dimmedBeforeIds}
            onSelectMention={(id) => handleSelectSourceMention(id, 'before')}
            railType="before"
          />
        </div>

        {/* COLUMN 2: Central Review Spine (38%) */}
        <div
          className={`w-full lg:w-[38%] h-full flex flex-col z-20 overflow-hidden ${
            mobileTab === 'changes' ? 'flex flex-1' : 'hidden lg:flex'
          }`}
        >
          <ReviewSpine
            diffItems={model.diffItems}
            activeDiffId={activeDiffId}
            onHoverDiff={setHoveredDiffId}
            onSelectDiff={handleSelectDiff}
          />
        </div>

        {/* COLUMN 3: AFTER Source Rail (31%) OR Desktop In-Place Evidence Inspector */}
        <div
          className={`w-full lg:w-[31%] h-full flex flex-col z-20 overflow-hidden ${
            mobileTab === 'after' ? 'flex flex-1' : 'hidden lg:flex'
          }`}
        >
          {pinnedDiffId && activeDiffItem ? (
            <EvidenceInspector item={activeDiffItem} onClose={handleCloseInspector} />
          ) : (
            <SourceRail
              title="02 DISCHARGE REGIMEN"
              sourceType="DISCHARGE"
              mentions={model.afterMentions}
              activeMentionId={activeAfterId}
              dimmedMentionIds={dimmedAfterIds}
              onSelectMention={(id) => handleSelectSourceMention(id, 'after')}
              railType="after"
            />
          )}
        </div>
      </div>

      {/* MOBILE BOTTOM SHEET FOR EVIDENCE INSPECTOR */}
      {pinnedDiffId && activeDiffItem && (
        <div className="lg:hidden">
          {/* Dark Scrim */}
          <div
            className="fixed inset-0 bg-black/75 z-40"
            onClick={handleCloseInspector}
            aria-hidden="true"
            data-testid="mobile-sheet-scrim"
          />

          {/* Fixed Bottom Sheet Drawer: max-height 78dvh, safe-area padding */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Evidence Inspector Sheet"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[78dvh] flex flex-col bg-panel-raised border-t border-line-dark shadow-2xl rounded-t-[8px] pb-[env(safe-area-inset-bottom,16px)] overflow-hidden animate-card-enter"
            data-testid="mobile-evidence-sheet"
          >
            <EvidenceInspector
              item={activeDiffItem}
              onClose={handleCloseInspector}
              isMobileSheet
            />
          </div>
        </div>
      )}
    </div>
  );
};
