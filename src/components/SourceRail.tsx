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
  const displayTitle =
    railType === 'before' ? 'Previous medication list' : 'Discharge medication list';
  const documentLabel =
    railType === 'before' ? 'Previous prescription / home' : 'Hospital discharge order';

  return (
    <div
      className="flex flex-col bg-white text-[#1A1D20] border border-[#E5E0D8] rounded-[8px] shadow-card overflow-hidden select-none transition-all duration-150"
      data-testid={`source-rail-${railType}`}
    >
      {/* Editorial Panel Masthead */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#E5E0D8] bg-[#FAF8F5] shrink-0">
        <div className="flex items-baseline gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3D5A4C]/60" aria-hidden="true" />
          <h3 className="font-sans text-[12.5px] font-semibold tracking-wide text-[#1A1D20]">
            <span>{displayTitle}</span>
            <span className="sr-only">{title}</span>
          </h3>
          <span className="text-[10px] text-[#75808B] font-mono uppercase tracking-wider">
            [{sourceType}]
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#75808B] tabular-nums bg-white px-2 py-0.5 rounded-[3px] border border-[#E5E0D8]">
          {mentions.length} {mentions.length === 1 ? 'medication' : 'medications'}
          <span className="sr-only">{mentions.length === 1 ? 'ITEM' : 'ITEMS'}</span>
        </span>
      </div>

      {/* Subtitle / Document context */}
      <div className="px-3.5 py-1.5 bg-[#FAF8F5]/60 border-b border-[#E5E0D8]/60 text-[11px] font-sans text-[#75808B] flex items-center justify-between">
        <span>{documentLabel}</span>
        <span className="font-mono text-[10px] text-[#75808B]">Original source lines</span>
      </div>

      {/* Compact Scrollable Items Container (Comfortable 140px-180px height) */}
      <div className="max-h-[160px] overflow-y-auto divide-y divide-[#E5E0D8]/60">
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
              className={`relative px-3.5 py-2 transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#FAF8F5] ring-1 ring-[#3D5A4C]/40 z-10'
                  : 'bg-white hover:bg-[#FAF8F5]'
              } ${isDimmed ? 'opacity-35' : 'opacity-100'}`}
              style={{
                borderLeft: isActive ? '3px solid #3D5A4C' : undefined,
              }}
            >
              {/* Row Header: Gutter Marker + Status Pill */}
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-mono text-[10.5px] font-medium text-[#48525B] bg-[#F5F2EB] px-1.5 py-0.5 rounded-[2px] tabular-nums">
                  {item.marker}
                </span>

                {item.mention.status_word !== 'none' && (
                  <span
                    className={`font-mono text-[9.5px] font-semibold px-1.5 py-0.5 rounded-[2px] uppercase ${
                      item.mention.status_word === 'stop' || item.mention.status_word === 'hold'
                        ? 'bg-[#FFE4E6] text-[#9F1239]'
                        : item.mention.status_word === 'start'
                          ? 'bg-[#E8EFEA] text-[#2E6B56]'
                          : 'bg-[#F5F2EB] text-[#75808B]'
                    }`}
                  >
                    {item.mention.status_word}
                  </span>
                )}
              </div>

              {/* Exact Evidence Line */}
              <p className="font-mono text-[11.5px] leading-[17px] text-[#1A1D20] mb-1 break-words font-normal">
                &ldquo;{item.mention.evidence_quote}&rdquo;
              </p>

              {/* Parsed Values as Quiet Annotations */}
              <div className="flex flex-wrap gap-1 text-[10px] font-mono text-[#526071]">
                {item.mention.strength_value !== null && (
                  <span className="bg-[#FAF8F5] px-1.5 py-0.5 rounded-[2px] tabular-nums border border-[#E5E0D8]/70">
                    {item.mention.strength_value} {item.mention.strength_unit ?? ''}
                  </span>
                )}
                {item.mention.dose_quantity !== null && (
                  <span className="bg-[#FAF8F5] px-1.5 py-0.5 rounded-[2px] tabular-nums border border-[#E5E0D8]/70">
                    {item.mention.dose_quantity} {item.mention.dose_form ?? 'dose'}
                  </span>
                )}
                {item.mention.route && (
                  <span className="bg-[#FAF8F5] px-1.5 py-0.5 rounded-[2px] border border-[#E5E0D8]/70">
                    {item.mention.route}
                  </span>
                )}
                {item.mention.frequency_raw && (
                  <span className="bg-[#FAF8F5] px-1.5 py-0.5 rounded-[2px] border border-[#E5E0D8]/70 truncate max-w-[170px]">
                    {item.mention.frequency_raw}
                  </span>
                )}
              </div>

              {/* Anchor Node for connector measurement */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
                  railType === 'before' ? '-right-[4px]' : '-left-[4px]'
                } ${isActive ? 'bg-[#3D5A4C]' : 'bg-transparent'}`}
                aria-hidden="true"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
