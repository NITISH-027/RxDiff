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
      ref={containerRef}
      className="w-full flex flex-col space-y-6 select-none"
      data-testid="reconciliation-canvas"
    >
      {/* Mobile Segmented Navigation Tabs */}
      <div className="lg:hidden flex items-center justify-between p-1 bg-[#EDE8DF] border border-[#E5E0D8] rounded-[6px] shrink-0">
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
              className={`flex-1 min-h-[40px] py-1.5 px-1 text-center font-mono text-[11px] font-medium uppercase rounded-[4px] transition-colors ${
                isSelected
                  ? 'bg-white text-[#1A1D20] font-semibold shadow-xs'
                  : 'text-[#75808B] hover:text-[#1A1D20]'
              }`}
              aria-selected={isSelected}
              role="tab"
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* SVG Connector Layer */}
      <ConnectorLayer
        containerRef={containerRef}
        diffItems={model.diffItems}
        activeDiffId={activeDiffId}
        inspectorOpen={pinnedDiffId !== null}
      />

      {/* 1. COMPACT SOURCE DOCUMENT SUMMARIES (Progressive Disclosure Bar) */}
      <section
        aria-label="Source Document Summaries"
        className={`grid grid-cols-1 md:grid-cols-2 gap-4 items-start ${
          mobileTab === 'changes'
            ? 'flex flex-col md:grid'
            : 'flex flex-col md:grid'
        }`}
      >
        {/* BEFORE Source Summary Panel */}
        <div
          className={`w-full ${
            mobileTab === 'after' ? 'hidden md:block' : 'block'
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

        {/* AFTER Source Summary Panel OR In-Place Evidence Inspector when difference pinned */}
        <div
          className={`w-full ${
            mobileTab === 'before' ? 'hidden md:block' : 'block'
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
      </section>

      {/* 2. PRIMARY FOCUS HERO: SPACIOUS CENTERED MEDICATION REVIEW */}
      <section
        aria-label="Medication Differences Review"
        className={`w-full ${
          mobileTab !== 'changes' ? 'hidden lg:block' : 'block'
        }`}
      >
        <ReviewSpine
          diffItems={model.diffItems}
          activeDiffId={activeDiffId}
          onHoverDiff={setHoveredDiffId}
          onSelectDiff={handleSelectDiff}
        />
      </section>

      {/* MOBILE BOTTOM SHEET FOR EVIDENCE INSPECTOR */}
      {pinnedDiffId && activeDiffItem && (
        <div className="lg:hidden">
          {/* Dark Scrim */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
            onClick={handleCloseInspector}
            aria-hidden="true"
            data-testid="mobile-sheet-scrim"
          />

          {/* Fixed Bottom Sheet Drawer */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Evidence Inspector Sheet"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[82dvh] flex flex-col bg-white border-t border-[#E5E0D8] shadow-2xl rounded-t-[12px] pb-[env(safe-area-inset-bottom,16px)] overflow-hidden animate-card-enter"
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
