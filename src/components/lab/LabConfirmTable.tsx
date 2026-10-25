import React, { useState } from 'react';
import type { LabReportDocument, LabResult } from '../../types/labReport.js';
import { applyDeterministicIdentity } from '../../engine/lab/labAliases.js';

interface LabConfirmTableProps {
  document: LabReportDocument;
  onConfirm: (confirmedDoc: LabReportDocument) => void;
  onCancel?: () => void;
}

export const LabConfirmTable: React.FC<LabConfirmTableProps> = ({
  document,
  onConfirm,
  onCancel,
}) => {
  const [results, setResults] = useState<LabResult[]>(() =>
    document.results.map((r) => ({ ...r }))
  );
  const [removedResults, setRemovedResults] = useState<LabResult[]>([]);
  const [filterQuery, setFilterQuery] = useState('');

  const handleFieldChange = (
    index: number,
    field: 'test_name_raw' | 'value' | 'unit' | 'reference_range_raw',
    newValue: string
  ) => {
    setResults((prev) => {
      const next = [...prev];
      const target = { ...next[index], user_edited: true };

      if (field === 'test_name_raw') {
        target.test_name_raw = newValue;
      } else if (field === 'unit') {
        target.unit = newValue.trim() || null;
      } else if (field === 'reference_range_raw') {
        target.reference_range_raw = newValue.trim() || null;
      } else if (field === 'value') {
        const trimmed = newValue.trim();
        const numeric = Number(trimmed.replace(',', '.'));
        if (trimmed !== '' && !isNaN(numeric)) {
          target.value_numeric = numeric;
          target.value_text = null;
        } else {
          target.value_numeric = null;
          target.value_text = trimmed || null;
        }
      }

      // Re-apply deterministic identity (test_key & fasting) based on current test name and source line
      next[index] = applyDeterministicIdentity(target);
      return next;
    });
  };

  const handleRemoveRow = (index: number) => {
    setResults((prev) => {
      const removed = prev[index];
      setRemovedResults((rem) => [...rem, removed]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRestoreRow = (removedItem: LabResult) => {
    setResults((prev) => [...prev, removedItem]);
    setRemovedResults((prev) => prev.filter((r) => r.result_id !== removedItem.result_id));
  };

  const handleConfirm = () => {
    if (results.length === 0) return;
    const confirmedDoc: LabReportDocument = {
      document_id: 'lab-report',
      results,
      extraction_warnings: document.extraction_warnings,
    };
    onConfirm(confirmedDoc);
  };

  const filteredResultsWithIndex = results
    .map((r, i) => ({ result: r, originalIndex: i }))
    .filter(({ result }) => {
      if (!filterQuery.trim()) return true;
      const q = filterQuery.toLowerCase();
      return (
        result.test_name_raw.toLowerCase().includes(q) ||
        result.raw_text.toLowerCase().includes(q) ||
        (result.unit && result.unit.toLowerCase().includes(q))
      );
    });

  const editedCount = results.filter((r) => r.user_edited).length;

  return (
    <div className="bg-white rounded-[8px] border border-[#E5E0D8] shadow-sm overflow-hidden flex flex-col">
      {/* Header Banner */}
      <div className="bg-[#FAF8F5] border-b border-[#E5E0D8] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded bg-[#EDE8DF] text-[#48525B] font-bold">
              Step 1: Clinical Safety Confirmation
            </span>
            {editedCount > 0 && (
              <span className="font-mono text-[10.5px] px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] font-medium">
                {editedCount} field{editedCount > 1 ? 's' : ''} corrected
              </span>
            )}
          </div>
          <h2 className="font-serif text-[18px] sm:text-[20px] font-semibold text-[#1A1D20] mt-1">
            Verify Extracted Test Values Before Analysis
          </h2>
          <p className="text-[12.5px] text-[#48525B] mt-0.5 max-w-[720px] leading-relaxed">
            No flag is computed until you confirm. A wrong extracted value must never silently become a medical flag.
            Verify each field against the extracted verbatim source line printed below it.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-[12px] font-sans font-medium text-[#75808B] hover:text-[#1A1D20] hover:bg-[#F5F2EB] rounded-[4px] border border-[#E5E0D8] transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            id="confirm-and-review-btn"
            onClick={handleConfirm}
            disabled={results.length === 0}
            className={`px-4 py-2 text-[12.5px] font-sans font-semibold rounded-[4px] shadow-xs transition-all flex items-center gap-1.5 ${
              results.length > 0
                ? 'bg-[#1A1D20] text-white hover:bg-[#33393F] cursor-pointer active:translate-y-[1px]'
                : 'bg-[#F5F2EB] text-[#75808B] border border-[#E5E0D8] cursor-not-allowed'
            }`}
          >
            <span>Confirm and review</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* Warnings & Filter Toolbar */}
      {document.extraction_warnings.length > 0 && (
        <div className="bg-[#FFFBEB] border-b border-[#FDE68A] px-4 py-2.5 text-[11.5px] text-[#92400E] flex flex-col gap-1">
          <div className="font-semibold flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#D97706] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Extraction audit notices ({document.extraction_warnings.length}):</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-5 font-mono text-[11px]">
            {document.extraction_warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Search & Counter Strip */}
      <div className="px-4 py-2.5 bg-[#FAF8F5]/60 border-b border-[#E5E0D8] flex items-center justify-between gap-3 text-[12px]">
        <div className="flex items-center gap-2 flex-1 max-w-[320px]">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search extracted tests..."
            className="w-full px-2.5 py-1 text-[11.5px] font-sans bg-white border border-[#E5E0D8] rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#3D5A4C]"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="text-[11px] text-[#75808B] hover:text-[#1A1D20]"
            >
              Clear
            </button>
          )}
        </div>
        <div className="text-[11.5px] font-mono text-[#75808B]">
          Showing {filteredResultsWithIndex.length} of {results.length} tests
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAF8F5] border-b border-[#E5E0D8] text-[11px] font-mono text-[#75808B] uppercase tracking-wider">
              <th className="py-2.5 px-3 sm:px-4 w-[28%]">Test Name</th>
              <th className="py-2.5 px-3 w-[18%]">Result Value</th>
              <th className="py-2.5 px-3 w-[14%]">Unit</th>
              <th className="py-2.5 px-3 w-[26%]">Printed Ref Range</th>
              <th className="py-2.5 px-3 w-[14%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E0D8]">
            {filteredResultsWithIndex.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[13px] text-[#75808B] font-sans">
                  {results.length === 0
                    ? 'All rows have been removed. Restore rows below or re-extract report.'
                    : 'No test matches your search filter.'}
                </td>
              </tr>
            ) : (
              filteredResultsWithIndex.map(({ result, originalIndex }) => {
                const displayValue =
                  result.value_numeric !== null
                    ? String(result.value_numeric)
                    : result.value_text ?? '';

                const hasNoRange =
                  !result.reference_range_raw || !result.reference_range_raw.trim();

                return (
                  <tr
                    key={result.result_id}
                    className={`transition-colors hover:bg-[#FAF8F5]/50 ${
                      result.user_edited ? 'bg-[#FEF3C7]/15' : ''
                    }`}
                  >
                    {/* Test Name Column */}
                    <td className="py-3 px-3 sm:px-4 align-top">
                      <div className="space-y-1">
                        <input
                          type="text"
                          aria-label={`Test name for ${result.result_id}`}
                          value={result.test_name_raw}
                          onChange={(e) =>
                            handleFieldChange(originalIndex, 'test_name_raw', e.target.value)
                          }
                          className="w-full font-medium text-[13px] text-[#1A1D20] bg-white border border-[#E5E0D8] rounded-[4px] px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#3D5A4C]"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] text-[#75808B] bg-[#F5F2EB] px-1.5 py-0.2 rounded border border-[#E5E0D8]">
                            Key: {result.test_key}
                          </span>
                          {result.fasting === true && (
                            <span className="font-mono text-[10px] text-[#2E6B56] bg-[#E8EFEA] px-1.5 py-0.2 rounded font-semibold border border-[#2E6B56]/20">
                              Fasting
                            </span>
                          )}
                          {result.user_edited && (
                            <span className="font-mono text-[9.5px] text-[#92400E] bg-[#FEF3C7] px-1 py-0.2 rounded font-medium">
                              User edited
                            </span>
                          )}
                        </div>
                        {/* Source line verification */}
                        <div className="mt-1 text-[11px] font-mono text-[#75808B] bg-[#FAF8F5] p-1.5 rounded border border-[#EDE8DF] break-words">
                          <span className="text-[#9CA3AF] font-semibold mr-1">Source:</span>
                          <span className="text-[#48525B]">"{result.raw_text}"</span>
                        </div>
                      </div>
                    </td>

                    {/* Result Value Column */}
                    <td className="py-3 px-3 align-top">
                      <div className="space-y-1">
                        <input
                          type="text"
                          aria-label={`Value for ${result.test_name_raw}`}
                          value={displayValue}
                          onChange={(e) =>
                            handleFieldChange(originalIndex, 'value', e.target.value)
                          }
                          placeholder="e.g. 14.5 or Trace"
                          className="w-full font-mono text-[13px] text-[#1A1D20] bg-white border border-[#E5E0D8] rounded-[4px] px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#3D5A4C]"
                        />
                        <span className="block text-[10px] font-mono text-[#75808B]">
                          {result.value_numeric !== null ? 'Numeric value' : 'Qualitative text'}
                        </span>
                      </div>
                    </td>

                    {/* Unit Column */}
                    <td className="py-3 px-3 align-top">
                      <div className="space-y-1">
                        <input
                          type="text"
                          aria-label={`Unit for ${result.test_name_raw}`}
                          value={result.unit ?? ''}
                          onChange={(e) =>
                            handleFieldChange(originalIndex, 'unit', e.target.value)
                          }
                          placeholder="e.g. mg/dL"
                          className="w-full font-mono text-[12.5px] text-[#1A1D20] bg-white border border-[#E5E0D8] rounded-[4px] px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#3D5A4C]"
                        />
                      </div>
                    </td>

                    {/* Printed Range Column */}
                    <td className="py-3 px-3 align-top">
                      <div className="space-y-1">
                        <input
                          type="text"
                          aria-label={`Reference range for ${result.test_name_raw}`}
                          value={result.reference_range_raw ?? ''}
                          onChange={(e) =>
                            handleFieldChange(originalIndex, 'reference_range_raw', e.target.value)
                          }
                          placeholder="e.g. 13.0 - 17.0"
                          className="w-full font-mono text-[12.5px] text-[#1A1D20] bg-white border border-[#E5E0D8] rounded-[4px] px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#3D5A4C]"
                        />
                        {hasNoRange && (
                          <span className="block text-[10.5px] text-[#B45309] font-sans italic">
                            not printed - will show Can’t assess
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="py-3 px-3 sm:px-4 align-top text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(originalIndex)}
                        title="Remove extraction junk row"
                        className="text-[11.5px] font-sans text-[#DC2626] hover:text-[#991B1B] hover:bg-[#FEE2E2] px-2 py-1 rounded transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Removed Rows Restore Area (if any rows were removed) */}
      {removedResults.length > 0 && (
        <div className="bg-[#FAF8F5] border-t border-[#E5E0D8] p-3 px-4 flex items-center justify-between gap-3 text-[11.5px]">
          <span className="text-[#75808B]">
            {removedResults.length} row{removedResults.length > 1 ? 's' : ''} removed from extraction.
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {removedResults.map((r) => (
              <button
                key={r.result_id}
                type="button"
                onClick={() => handleRestoreRow(r)}
                className="font-mono text-[11px] text-[#2E6B56] hover:underline bg-white border border-[#E5E0D8] px-2 py-0.5 rounded shadow-xs"
              >
                + Restore {r.test_name_raw}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Confirmation Bar */}
      <div className="bg-[#FAF8F5] border-t border-[#E5E0D8] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-[11.5px] text-[#75808B] font-mono">
          Strict clinical safety rule: Engine will only evaluate confirmed data.
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={results.length === 0}
          className={`w-full sm:w-auto px-5 py-2 text-[13px] font-sans font-semibold rounded-[4px] shadow-xs transition-all flex items-center justify-center gap-1.5 ${
            results.length > 0
              ? 'bg-[#1A1D20] text-white hover:bg-[#33393F] cursor-pointer active:translate-y-[1px]'
              : 'bg-[#F5F2EB] text-[#75808B] border border-[#E5E0D8] cursor-not-allowed'
          }`}
        >
          <span>Confirm and review {results.length} test{results.length > 1 ? 's' : ''}</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
};
