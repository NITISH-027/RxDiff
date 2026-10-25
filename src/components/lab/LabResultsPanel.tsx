import React, { useState } from 'react';
import type {
  LabReviewReport,
  RangeFlag,
} from '../../types/labReport.js';

interface LabResultsPanelProps {
  report: LabReviewReport;
  onEditAgain: () => void;
}

export const LabResultsPanel: React.FC<LabResultsPanelProps> = ({
  report,
  onEditAgain,
}) => {
  const [filter, setFilter] = useState<'all' | RangeFlag>('all');
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const [copiedToast, setCopiedToast] = useState(false);

  const toggleEvidence = (resultId: string) => {
    setExpandedEvidence((prev) => ({
      ...prev,
      [resultId]: !prev[resultId],
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    for (const item of report.flagged_results) {
      allExpanded[item.result.result_id] = true;
    }
    setExpandedEvidence(allExpanded);
  };

  const collapseAll = () => {
    setExpandedEvidence({});
  };

  const filteredResults = report.flagged_results.filter((fr) => {
    if (filter === 'all') return true;
    return fr.flag === filter;
  });

  const getFlagBadge = (flag: RangeFlag) => {
    switch (flag) {
      case 'high':
        return (
          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-[3px] bg-[#FFE4E6] text-[#9F1239] border border-[#FB7185]/30">
            HIGH
          </span>
        );
      case 'low':
        return (
          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-[3px] bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]/40">
            LOW
          </span>
        );
      case 'within_range':
        return (
          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-[3px] bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]/40">
            WITHIN RANGE
          </span>
        );
      case 'cant_assess':
        return (
          <span className="font-mono text-[11px] font-medium px-2 py-0.5 rounded-[3px] bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
            CAN'T ASSESS
          </span>
        );
    }
  };

  const handleCopySummary = async () => {
    const lines: string[] = [
      '=== RXDIFF LAB REPORT REVIEW SUMMARY ===',
      `Date/Time: ${new Date().toLocaleString()}`,
      `Counts: HIGH=${report.counts.high}, LOW=${report.counts.low}, WITHIN_RANGE=${report.counts.within_range}, CAN'T_ASSESS=${report.counts.cant_assess}`,
      '',
    ];

    if (report.combination_prompts.length > 0) {
      lines.push('--- PROTOTYPE CO-ABNORMALITY REVIEW PROMPTS ---');
      for (const p of report.combination_prompts) {
        lines.push(`* ${p.title}`);
        lines.push(`  Message: ${p.message}`);
        lines.push(`  Clinical Reference: ${p.source_url}`);
      }
      lines.push('');
    }

    lines.push('--- CONFIRMED LAB TEST FINDINGS ---');
    for (const fr of report.flagged_results) {
      lines.push(
        `[${fr.flag.toUpperCase()}] ${fr.result.test_name_raw}: ${
          fr.result.value_numeric !== null ? fr.result.value_numeric : fr.result.value_text
        } ${fr.result.unit ?? ''} (Printed Range: ${fr.result.reference_range_raw ?? 'None'})`
      );
      lines.push(`  Verdict: ${fr.flag_reason}`);
      lines.push(`  Verbatim Source: "${fr.result.raw_text}"`);
    }

    lines.push('');
    lines.push('--- LIMITATIONS & DISCLAIMER ---');
    for (const lim of report.limitations) {
      lines.push(`- ${lim}`);
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Navigation */}
      <div className="bg-white rounded-[8px] border border-[#E5E0D8] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded bg-[#E8EFEA] text-[#2E6B56] font-bold border border-[#2E6B56]/20">
              Deterministic Range Engine Output
            </span>
            <span className="font-mono text-[10.5px] text-[#75808B]">
              {report.flagged_results.length} tests evaluated
            </span>
          </div>
          <h2 className="font-serif text-[20px] font-semibold text-[#1A1D20] mt-1">
            Confirmed Laboratory Findings
          </h2>
          <p className="text-[12.5px] text-[#48525B] mt-0.5 max-w-[680px]">
            Every verdict is computed purely against printed reference intervals and anchored directly to the exact source line.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onEditAgain}
            className="px-3 py-1.5 text-[12px] font-sans font-medium text-[#1A1D20] bg-white hover:bg-[#F5F2EB] border border-[#E5E0D8] rounded-[4px] shadow-xs transition-colors flex items-center gap-1.5"
            title="Edit extracted values or ranges"
          >
            <span>← Edit values</span>
          </button>
          <button
            type="button"
            onClick={handleCopySummary}
            className="px-3 py-1.5 text-[12px] font-sans font-medium text-[#1A1D20] bg-white hover:bg-[#F5F2EB] border border-[#E5E0D8] rounded-[4px] shadow-xs transition-colors flex items-center gap-1.5"
            title="Copy structured lab review summary"
          >
            {copiedToast ? (
              <span className="text-[#2E6B56] font-semibold">✓ Copied</span>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-[#75808B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <span>Copy summary</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 text-[12px] font-sans font-medium text-[#1A1D20] bg-white hover:bg-[#F5F2EB] border border-[#E5E0D8] rounded-[4px] shadow-xs transition-colors flex items-center gap-1.5"
            title="Print lab report findings"
          >
            <svg className="w-3.5 h-3.5 text-[#75808B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* 1. TOP: Combination Prompts Section ("Needs medical review - prototype prompts") */}
      {report.combination_prompts.length > 0 && (
        <div className="bg-[#FAF8F5] rounded-[8px] border border-[#E5E0D8] p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E0D8] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B45309]" />
              <h3 className="font-serif text-[16px] font-semibold text-[#1A1D20]">
                Needs medical review - prototype prompts
              </h3>
            </div>
            <span className="font-mono text-[10px] uppercase text-[#75808B] bg-white px-2 py-0.5 rounded border border-[#E5E0D8]">
              Prototype Co-abnormality review prompt (No diagnosis)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-1">
            {report.combination_prompts.map((prompt) => {
              // Find the contributing FlaggedResults
              const contributing = report.flagged_results.filter((fr) =>
                prompt.evidence_result_ids.includes(fr.result.result_id)
              );

              return (
                <div
                  key={prompt.rule_id}
                  className="bg-white rounded-[6px] border border-[#E5E0D8] p-4 shadow-2xs space-y-3 hover:border-[#3D5A4C]/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <h4 className="font-sans text-[14px] font-semibold text-[#1A1D20]">
                        {prompt.title}
                      </h4>
                      <p className="text-[13px] text-[#48525B] mt-1 leading-relaxed">
                        {prompt.message}
                      </p>
                    </div>
                    <a
                      href={prompt.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[11px] font-mono text-[#2E6B56] hover:underline flex items-center gap-1 bg-[#E8EFEA] px-2.5 py-1 rounded border border-[#2E6B56]/20 self-start"
                    >
                      <span>Clinical Reference</span>
                      <span>↗</span>
                    </a>
                  </div>

                  {/* Two Contributing Rows with their values and printed ranges */}
                  <div className="bg-[#FAF8F5] rounded-[4px] p-2.5 border border-[#EDE8DF] space-y-1.5">
                    <span className="block font-mono text-[10.5px] uppercase text-[#75808B] font-semibold">
                      Contributing Evidence Rows:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {contributing.map((c) => (
                        <div
                          key={c.result.result_id}
                          className="bg-white p-2 rounded border border-[#E5E0D8] text-[11.5px] space-y-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-[#1A1D20]">
                              {c.result.test_name_raw}
                            </span>
                            {getFlagBadge(c.flag)}
                          </div>
                          <div className="font-mono text-[11px] text-[#48525B]">
                            Value: <span className="font-bold">{c.result.value_numeric ?? c.result.value_text} {c.result.unit}</span>
                          </div>
                          <div className="font-mono text-[10.5px] text-[#75808B]">
                            Printed Range: {c.result.reference_range_raw ?? 'None'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Flagged Results Summary Counts & Filter Tabs */}
      <div className="bg-white rounded-[8px] border border-[#E5E0D8] p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E0D8] pb-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-0.5 bg-[#EDE8DF] rounded-[6px] border border-[#E5E0D8]">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-[11.5px] font-sans font-medium rounded-[4px] transition-all ${
                filter === 'all'
                  ? 'bg-white text-[#1A1D20] font-semibold shadow-xs'
                  : 'text-[#75808B] hover:text-[#1A1D20]'
              }`}
            >
              All ({report.flagged_results.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('high')}
              className={`px-3 py-1 text-[11.5px] font-sans font-medium rounded-[4px] transition-all flex items-center gap-1.5 ${
                filter === 'high'
                  ? 'bg-white text-[#9F1239] font-bold shadow-xs'
                  : 'text-[#75808B] hover:text-[#9F1239]'
              }`}
            >
              <span>High</span>
              <span className="font-mono text-[10px] bg-[#FFE4E6] text-[#9F1239] px-1.5 py-0.2 rounded">
                {report.counts.high}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('low')}
              className={`px-3 py-1 text-[11.5px] font-sans font-medium rounded-[4px] transition-all flex items-center gap-1.5 ${
                filter === 'low'
                  ? 'bg-white text-[#92400E] font-bold shadow-xs'
                  : 'text-[#75808B] hover:text-[#92400E]'
              }`}
            >
              <span>Low</span>
              <span className="font-mono text-[10px] bg-[#FEF3C7] text-[#92400E] px-1.5 py-0.2 rounded">
                {report.counts.low}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('within_range')}
              className={`px-3 py-1 text-[11.5px] font-sans font-medium rounded-[4px] transition-all flex items-center gap-1.5 ${
                filter === 'within_range'
                  ? 'bg-white text-[#166534] font-semibold shadow-xs'
                  : 'text-[#75808B] hover:text-[#166534]'
              }`}
            >
              <span>Within Range</span>
              <span className="font-mono text-[10px] bg-[#DCFCE7] text-[#166534] px-1.5 py-0.2 rounded">
                {report.counts.within_range}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('cant_assess')}
              className={`px-3 py-1 text-[11.5px] font-sans font-medium rounded-[4px] transition-all flex items-center gap-1.5 ${
                filter === 'cant_assess'
                  ? 'bg-white text-[#475569] font-semibold shadow-xs'
                  : 'text-[#75808B] hover:text-[#475569]'
              }`}
            >
              <span>Can't Assess</span>
              <span className="font-mono text-[10px] bg-[#F1F5F9] text-[#475569] px-1.5 py-0.2 rounded">
                {report.counts.cant_assess}
              </span>
            </button>
          </div>

          {/* Expand/Collapse All */}
          <div className="flex items-center gap-2 text-[11.5px]">
            <button
              type="button"
              onClick={expandAll}
              className="text-[#75808B] hover:text-[#1A1D20] font-sans hover:underline"
            >
              Expand all evidence
            </button>
            <span className="text-[#E5E0D8]">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-[#75808B] hover:text-[#1A1D20] font-sans hover:underline"
            >
              Collapse all
            </button>
          </div>
        </div>

        {/* 3. Result Rows with chips, reasons, and expandable evidence blocks */}
        <div className="space-y-3">
          {filteredResults.length === 0 ? (
            <div className="py-8 text-center text-[#75808B] text-[13px]">
              No test results match the selected filter.
            </div>
          ) : (
            filteredResults.map((fr) => {
              const r = fr.result;
              const isExpanded = !!expandedEvidence[r.result_id];

              return (
                <div
                  key={r.result_id}
                  className="border border-[#E5E0D8] rounded-[6px] p-3.5 sm:p-4 hover:border-[#3D5A4C]/40 transition-colors bg-white space-y-2.5"
                >
                  {/* Row Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {getFlagBadge(fr.flag)}
                      <span className="font-sans text-[14px] font-semibold text-[#1A1D20]">
                        {r.test_name_raw}
                      </span>
                      {r.user_edited && (
                        <span className="font-mono text-[10px] text-[#92400E] bg-[#FEF3C7] px-1.5 py-0.2 rounded border border-[#FCD34D]">
                          User corrected
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="font-mono text-[13px] text-[#1A1D20]">
                        <span className="font-bold">
                          {r.value_numeric !== null ? r.value_numeric : r.value_text ?? 'N/A'}
                        </span>
                        {r.unit && <span className="text-[#75808B] ml-1">{r.unit}</span>}
                      </div>
                      <span className="text-[11.5px] font-mono text-[#75808B] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#EDE8DF]">
                        Ref: {r.reference_range_raw ?? 'None printed'}
                      </span>
                    </div>
                  </div>

                  {/* Flag Reason */}
                  <div className="text-[12.5px] text-[#48525B] font-sans leading-relaxed">
                    {fr.flag_reason}
                  </div>

                  {/* Expandable Evidence Block */}
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleEvidence(r.result_id)}
                      className="text-[11px] font-mono text-[#2E6B56] hover:text-[#1E4B3C] flex items-center gap-1 focus:outline-none"
                    >
                      <span>{isExpanded ? '▼ Hide source evidence' : '▶ View source evidence'}</span>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 p-3 bg-[#FAF8F5] rounded-[4px] border border-[#EDE8DF] space-y-1.5 text-[11.5px]">
                        <div className="font-mono text-[#75808B]">
                          <span className="font-semibold text-[#1A1D20] mr-1">Raw Source Line:</span>
                          <span className="text-[#33393F]">"{r.raw_text}"</span>
                        </div>
                        {r.evidence_quote && r.evidence_quote !== r.raw_text && (
                          <div className="font-mono text-[#75808B]">
                            <span className="font-semibold text-[#1A1D20] mr-1">Evidence Quote:</span>
                            <span className="text-[#33393F]">"{r.evidence_quote}"</span>
                          </div>
                        )}
                        {r.user_edited && (
                          <div className="font-sans text-[11px] text-[#92400E] bg-[#FEF3C7]/60 p-1.5 rounded border border-[#FCD34D]/40">
                            Value corrected by you during review - original line shown above.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Footer: The four limitations strings, verbatim */}
      <footer className="bg-[#FAF8F5] rounded-[8px] border border-[#E5E0D8] p-4 sm:p-5 space-y-2">
        <h4 className="font-mono text-[11px] uppercase tracking-wider text-[#75808B] font-semibold">
          Limitations & Disclaimers
        </h4>
        <ul className="space-y-1 text-[12px] text-[#48525B] font-sans list-disc list-inside">
          {report.limitations.map((lim, idx) => (
            <li key={idx} className="leading-relaxed">
              {lim}
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
};
