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
      className="flex flex-col h-full bg-paper text-paper-ink border border-line-paper rounded-[4px] shadow-sm overflow-hidden"
      data-testid={`source-rail-${railType}`}
    >
      {/* Rail Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-line-paper bg-[#EAE7DF]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold tracking-[0.10em] text-paper-ink uppercase">
            {title}
          </span>
          <span className="text-[11px] text-paper-muted font-mono uppercase">
            [{sourceType}]
          </span>
        </div>
        <span className="font-mono text-[11px] text-paper-muted tabular-nums">
          {mentions.length} {mentions.length === 1 ? 'ITEM' : 'ITEMS'}
        </span>
      </div>

      {/* Rows Container */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
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
              className={`relative p-2.5 rounded-[3px] border transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-white border-[#38BDF8] shadow-sm ring-1 ring-[#38BDF8]'
                  : 'bg-[#FAF8F5] border-line-paper hover:border-paper-muted/50 hover:bg-white'
              } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
            >
              {/* Row Header: Gutter Marker + Status/Name */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-mono text-[11px] font-bold text-paper-ink bg-[#E6E2D8] px-1.5 py-0.5 rounded-[2px] tabular-nums">
                  {item.marker}
                </span>

                {item.mention.status_word !== 'none' && (
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] uppercase ${
                      item.mention.status_word === 'stop' || item.mention.status_word === 'hold'
                        ? 'bg-[#FB7185]/20 text-[#BE123C]'
                        : item.mention.status_word === 'start'
                          ? 'bg-[#38BDF8]/20 text-[#0369A1]'
                          : 'bg-[#EAE7DF] text-paper-muted'
                    }`}
                  >
                    {item.mention.status_word}
                  </span>
                )}
              </div>

              {/* Exact Evidence Line */}
              <p className="font-mono text-[12.5px] leading-[18px] text-paper-ink mb-2 break-words">
                &ldquo;{item.mention.evidence_quote}&rdquo;
              </p>

              {/* Parsed Metadata Attributes */}
              <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-line-paper/60 text-[11px] font-mono text-paper-muted">
                {item.mention.strength_value !== null && (
                  <span className="bg-[#EAE7DF] px-1.5 py-0.5 rounded-[2px] tabular-nums text-paper-ink font-medium">
                    {item.mention.strength_value} {item.mention.strength_unit ?? ''}
                  </span>
                )}
                {item.mention.dose_quantity !== null && (
                  <span className="bg-[#EAE7DF] px-1.5 py-0.5 rounded-[2px] tabular-nums text-paper-ink font-medium">
                    {item.mention.dose_quantity} {item.mention.dose_form ?? 'dose'}
                  </span>
                )}
                {item.mention.route && (
                  <span className="bg-[#EAE7DF] px-1.5 py-0.5 rounded-[2px] text-paper-ink font-medium">
                    {item.mention.route}
                  </span>
                )}
                {item.mention.frequency_raw && (
                  <span className="bg-[#EAE7DF] px-1.5 py-0.5 rounded-[2px] text-paper-ink font-medium truncate max-w-[150px]">
                    {item.mention.frequency_raw}
                  </span>
                )}
              </div>

              {/* Visual Anchor Indicator for connector measurement */}
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
