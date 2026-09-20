import React from 'react';
import type { IndexedSourceMention } from '../adapters/presentationAdapter.js';

interface SourceRailProps {
  title: string;
  sourceType: string;
  mentions: IndexedSourceMention[];
  activeMentionId: string | null;
  dimmedMentionIds: Set<string>;
  onSelectMention?: (mentionId: string) => void;
  railType: 'before' | 'after';
}

export const SourceRail: React.FC<SourceRailProps> = ({
  title,
  sourceType,
  mentions,
  activeMentionId,
  dimmedMentionIds,
  onSelectMention,
  railType,
}) => {
  return (
    <div
      className="flex flex-col h-full bg-paper text-paper-ink border border-paper-edge rounded-[6px] shadow-paper overflow-hidden select-none"
      data-testid={`source-rail-${railType}`}
    >
      {/* Continuous Document Masthead */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-paper-edge bg-[#EAE6DD] shrink-0">
        <div className="flex items-baseline gap-2">
          <h2 className="font-sans text-[12px] font-semibold tracking-wide text-paper-ink uppercase">
            {title}
          </h2>
          <span className="text-[10.5px] text-paper-muted font-mono uppercase tracking-wider">
            [{sourceType}]
          </span>
        </div>
        <span className="font-mono text-[11px] text-paper-muted tabular-nums">
          {mentions.length} {mentions.length === 1 ? 'ITEM' : 'ITEMS'}
        </span>
      </div>

      {/* Continuous Paper Rows Container (14-16px rhythm) */}
      <div className="flex-1 overflow-y-auto divide-y divide-paper-edge/75">
        {mentions.map((item) => {
          const isActive = activeMentionId === item.mention.mention_id;
          const isDimmed =
            dimmedMentionIds.size > 0 && !isActive && dimmedMentionIds.has(item.mention.mention_id);

          return (
            <div
              key={item.mention.mention_id}
              id={`${railType}-${item.mention.mention_id}`}
              data-anchor-id={`${railType}-${item.mention.mention_id}`}
              onClick={() => onSelectMention?.(item.mention.mention_id)}
              className={`relative px-3 py-2.5 transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-white ring-1 ring-active border-active z-10'
                  : 'hover:bg-[#FAF9F5]'
              } ${isDimmed ? 'opacity-35' : 'opacity-100'}`}
              style={{
                borderLeft: isActive ? '3px solid #38BDF8' : undefined,
              }}
            >
              {/* Row Header: Gutter Marker + Status Pill */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-mono text-[11px] font-semibold text-paper-ink bg-[#E3DFD4] px-1.5 py-0.5 rounded-[2px] tabular-nums">
                  {item.marker}
                </span>

                {item.mention.status_word !== 'none' && (
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] uppercase ${
                      item.mention.status_word === 'stop' || item.mention.status_word === 'hold'
                        ? 'bg-[#FB7185]/20 text-[#BE123C]'
                        : item.mention.status_word === 'start'
                          ? 'bg-[#38BDF8]/20 text-[#0369A1]'
                          : 'bg-[#EAE6DD] text-paper-muted'
                    }`}
                  >
                    {item.mention.status_word}
                  </span>
                )}
              </div>

              {/* Exact Evidence Line (Dominant line) */}
              <p className="font-mono text-[12.5px] leading-[18px] text-paper-ink mb-1.5 break-words">
                &ldquo;{item.mention.evidence_quote}&rdquo;
              </p>

              {/* Parsed Values as Quiet Mono Annotations */}
              <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-mono text-paper-muted">
                {item.mention.strength_value !== null && (
                  <span className="bg-[#EAE6DD] px-1.5 py-0.5 rounded-[2px] tabular-nums text-paper-ink font-medium">
                    {item.mention.strength_value} {item.mention.strength_unit ?? ''}
                  </span>
                )}
                {item.mention.dose_quantity !== null && (
                  <span className="bg-[#EAE6DD] px-1.5 py-0.5 rounded-[2px] tabular-nums text-paper-ink font-medium">
                    {item.mention.dose_quantity} {item.mention.dose_form ?? 'dose'}
                  </span>
                )}
                {item.mention.route && (
                  <span className="bg-[#EAE6DD] px-1.5 py-0.5 rounded-[2px] text-paper-ink font-medium">
                    {item.mention.route}
                  </span>
                )}
                {item.mention.frequency_raw && (
                  <span className="bg-[#EAE6DD] px-1.5 py-0.5 rounded-[2px] text-paper-ink font-medium truncate max-w-[170px]">
                    {item.mention.frequency_raw}
                  </span>
                )}
              </div>

              {/* Anchor Node for connector measurement */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
                  railType === 'before' ? '-right-[4px]' : '-left-[4px]'
                } ${isActive ? 'bg-[#38BDF8]' : 'bg-transparent'}`}
                aria-hidden="true"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
