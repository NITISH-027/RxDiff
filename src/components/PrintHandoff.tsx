import React from 'react';
import type { PresentationModel } from '../adapters/presentationAdapter.js';

interface PrintHandoffProps {
  model: PresentationModel;
}

export const PrintHandoff: React.FC<PrintHandoffProps> = ({ model }) => {
  return (
    <div className="print-only p-8 text-black bg-white font-sans text-[12pt] leading-normal">
      {/* Print Document Header */}
      <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
        <div>
          <span className="font-mono text-[10pt] uppercase tracking-widest text-gray-600 block">
            RxDiff Medication Reconciliation Handout
          </span>
          <h1 className="text-[20pt] font-bold mt-1 text-black">
            Questions to confirm about my medication list.
          </h1>
          <p className="text-[11pt] text-gray-700 mt-1">
            Case: {model.caseTitle} ({model.caseId.toUpperCase()})
          </p>
        </div>

        <div className="text-right">
          <span className="inline-block border border-red-600 px-2 py-1 text-red-600 font-mono text-[9pt] font-bold uppercase">
            SYNTHETIC DEMO — NO PATIENT DATA
          </span>
          <span className="block text-[9pt] text-gray-500 font-mono mt-1">
            Generated: {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Safety Advisory Banner */}
      <div className="border-l-4 border-amber-500 bg-amber-50 p-3 mb-6">
        <p className="text-[10.5pt] font-bold text-amber-900">
          IMPORTANT SAFETY NOTICE:
        </p>
        <p className="text-[10pt] text-amber-800 mt-0.5">
          Do not start, stop, or change medicine based on RxDiff. Confirm every flagged item with a doctor or pharmacist.
        </p>
      </div>

      {/* Flagged Items Table */}
      <div className="mb-8">
        <h2 className="text-[14pt] font-bold mb-3 border-b border-gray-300 pb-1">
          Items Requiring Clinical Review ({model.counts.toConfirm})
        </h2>

        <table className="w-full border-collapse text-[10pt]">
          <thead>
            <tr className="border-b-2 border-gray-800 text-left bg-gray-100 font-mono">
              <th className="p-2">Status</th>
              <th className="p-2">Medication</th>
              <th className="p-2">Change Observed</th>
              <th className="p-2">Question for Doctor/Pharmacist</th>
            </tr>
          </thead>
          <tbody>
            {model.diffItems
              .filter((item) => item.diff.category !== 'unchanged')
              .map((item) => (
                <tr key={item.diff.diff_id} className="border-b border-gray-300 align-top">
                  <td className="p-2 font-mono font-bold text-[9pt] uppercase whitespace-nowrap">
                    {item.userFacingCategory}
                  </td>
                  <td className="p-2 font-bold">{item.displayName}</td>
                  <td className="p-2 font-mono text-[9pt] text-gray-800">
                    {item.transformationText}
                    {item.beforeMention && (
                      <div className="text-gray-500 italic mt-0.5">
                        Prev: &ldquo;{item.beforeMention.evidence_quote}&rdquo;
                      </div>
                    )}
                    {item.afterMention && (
                      <div className="text-gray-500 italic mt-0.5">
                        New: &ldquo;{item.afterMention.evidence_quote}&rdquo;
                      </div>
                    )}
                  </td>
                  <td className="p-2 font-medium text-black">
                    &ldquo;{item.patientQuestion}&rdquo;
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Matched Text Items Table */}
      {model.counts.matched > 0 && (
        <div className="mb-8">
          <h2 className="text-[12pt] font-bold mb-2 border-b border-gray-300 pb-1 text-gray-800">
            Source Text Matched ({model.counts.matched})
          </h2>
          <table className="w-full border-collapse text-[9.5pt]">
            <thead>
              <tr className="border-b border-gray-400 text-left bg-gray-50 font-mono text-[8.5pt]">
                <th className="p-1.5">Medication</th>
                <th className="p-1.5">Regimen Details</th>
                <th className="p-1.5">Confirmation Question</th>
                <th className="p-1.5">Source Evidence Line</th>
              </tr>
            </thead>
            <tbody>
              {model.diffItems
                .filter((item) => item.diff.category === 'unchanged')
                .map((item) => (
                  <tr key={item.diff.diff_id} className="border-b border-gray-200">
                    <td className="p-1.5 font-semibold">{item.displayName}</td>
                    <td className="p-1.5 font-mono text-gray-700">
                      {item.beforeMention?.frequency_raw ?? 'Recorded regimen'}
                    </td>
                    <td className="p-1.5 font-medium text-black">
                      &ldquo;{item.patientQuestion}&rdquo;
                    </td>
                    <td className="p-1.5 font-mono text-gray-600 text-[8.5pt]">
                      &ldquo;{item.beforeMention?.evidence_quote ?? item.afterMention?.evidence_quote}&rdquo;
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Limitations and Disclaimers */}
      <div className="border-t border-gray-400 pt-4 text-[9pt] text-gray-600 font-mono">
        <p className="font-bold mb-1 text-gray-800">Deterministic Engine Limitations:</p>
        <ul className="list-disc pl-5 space-y-1">
          {model.limitations.map((limitation, i) => (
            <li key={i}>{limitation}</li>
          ))}
        </ul>

        <div className="mt-4 pt-3 border-t border-gray-200 text-center text-gray-500 text-[8.5pt]">
          *** SYNTHETIC DEMO - NO PATIENT DATA - DEMO ALIAS TABLE (GLUCOPHAGE → METFORMIN) ***
        </div>
      </div>
    </div>
  );
};
