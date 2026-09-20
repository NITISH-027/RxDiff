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
    setPinnedDiffId((prev) => (prev === diffId ? null : diffId));
  };

  const handleCloseInspector = () => {
    setPinnedDiffId(null);
  };

  const handleSelectSourceMention = (mentionId: string, type: 'before' | 'after') => {
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
    <div className="w-full flex flex-col flex-1" data-testid="reconciliation-canvas">
      {/* Mobile Segmented Control (Tabs) */}
      <div className="lg:hidden flex items-center justify-between p-1.5 mb-3 bg-panel border border-line-dark rounded-[4px]">
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

      {/* Desktop 3-Column Layout (31% / 38% / 31%) */}
      <div
        ref={containerRef}
        className="relative w-full flex-1 flex flex-col lg:flex-row gap-4 items-stretch min-h-[580px]"
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
          className={`w-full lg:w-[31%] flex-1 flex flex-col ${
            mobileTab === 'before' ? 'block' : 'hidden lg:flex'
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
          className={`w-full lg:w-[38%] flex-1 flex flex-col z-20 ${
            mobileTab === 'changes' ? 'block' : 'hidden lg:flex'
          }`}
        >
          <ReviewSpine
            diffItems={model.diffItems}
            activeDiffId={activeDiffId}
            onHoverDiff={setHoveredDiffId}
            onSelectDiff={handleSelectDiff}
          />
        </div>

        {/* COLUMN 3: AFTER Source Rail (31%) OR In-Place Evidence Inspector */}
        <div
          className={`w-full lg:w-[31%] flex-1 flex flex-col z-20 ${
            mobileTab === 'after' || (mobileTab === 'changes' && pinnedDiffId !== null)
              ? 'block'
              : 'hidden lg:flex'
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
    </div>
  );
};
