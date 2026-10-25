import React, { useState, useMemo, useRef } from 'react';
import type { LabReportDocument, LabReviewReport } from '../../types/labReport.js';
import { buildLabReviewReport } from '../../engine/lab/labReviewEngine.js';
import {
  SYNTHETIC_LAB_CASES,
  LAB_DEMO_A,
  type SyntheticLabCase,
} from '../../data/syntheticLabReports.js';
import { liveLabProvider } from '../../services/labExtraction/liveLabProvider.js';
import type { LabExtractionStage } from '../../services/labExtraction/types.js';
import { LabConfirmTable } from './LabConfirmTable.js';
import { LabResultsPanel } from './LabResultsPanel.js';

type LabMode = 'demos' | 'upload';
type LabStep = 'idle' | 'extracted' | 'confirmed';

export const LabReviewWorkbench: React.FC = () => {
  const [labMode, setLabMode] = useState<LabMode>('demos');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('lab-demo-a');

  // Lab state machine
  const [step, setStep] = useState<LabStep>('extracted');
  const [unconfirmedDoc, setUnconfirmedDoc] = useState<LabReportDocument>(LAB_DEMO_A.report);
  const [confirmedDoc, setConfirmedDoc] = useState<LabReportDocument | null>(null);

  // Upload & Extraction state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [extractionStage, setExtractionStage] = useState<LabExtractionStage>('IDLE');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentDemoCase: SyntheticLabCase =
    SYNTHETIC_LAB_CASES[selectedCaseId] || LAB_DEMO_A;

  // Pure deterministic buildLabReviewReport
  const reviewReport: LabReviewReport | null = useMemo(() => {
    if (!confirmedDoc) return null;
    return buildLabReviewReport(confirmedDoc);
  }, [confirmedDoc]);

  // Demo selection handler (loads bundled report straight into confirmation table, no network)
  const handleSelectDemo = (caseId: string) => {
    setSelectedCaseId(caseId);
    const demo = SYNTHETIC_LAB_CASES[caseId];
    if (demo) {
      setUnconfirmedDoc(demo.report);
      setConfirmedDoc(null);
      setStep('extracted');
    }
  };

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadError(null);
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    }
  };

  // Upload live extraction
  const handleStartUploadExtract = async () => {
    if (!uploadFile) return;

    setIsExtracting(true);
    setUploadError(null);
    setStep('idle');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await liveLabProvider.extract(
        uploadFile,
        (s) => setExtractionStage(s),
        controller.signal
      );

      if (result.success) {
        setUnconfirmedDoc(result.report);
        setConfirmedDoc(null);
        setStep('extracted');
      } else {
        setUploadError(result.error);
        setStep('idle');
      }
    } catch {
      setUploadError('An unexpected error occurred during report extraction.');
      setStep('idle');
    } finally {
      setIsExtracting(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelExtraction = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsExtracting(false);
      setExtractionStage('IDLE');
    }
  };

  // Confirmation transition: unconfirmedDoc -> confirmedDoc -> results
  const handleConfirmReport = (confirmed: LabReportDocument) => {
    setConfirmedDoc(confirmed);
    setStep('confirmed');
  };

  const handleBackToConfirm = () => {
    setStep('extracted');
  };

  return (
    <div className="space-y-6">
      {/* Sub-Header / Mode Switching Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-3 border-b border-[#E5E0D8] shrink-0">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.14em] text-[#75808B] uppercase mb-1">
            Laboratory Report Review & Verification
          </div>
          <h1 className="font-serif text-[clamp(24px,2.6vw,34px)] font-normal text-[#1A1D20] tracking-tight leading-tight">
            Deterministic Range & Co-Abnormality Review
          </h1>
          <p className="font-sans text-[13.5px] text-[#48525B] mt-1 max-w-[680px] leading-[20px]">
            Extracts test values, units, and ranges as printed. Values are verified by you before any
            high, low, or within-range flag is computed.
          </p>
        </div>

        {/* Mode Switcher + Demo selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
          <div
            className="flex items-center gap-1 bg-[#EDE8DF] p-0.5 rounded-[6px] border border-[#E5E0D8] shrink-0"
            role="tablist"
            aria-label="Lab Mode"
          >
            <button
              role="tab"
              aria-selected={labMode === 'demos'}
              onClick={() => {
                setLabMode('demos');
                handleSelectDemo(selectedCaseId);
              }}
              className={`min-h-[30px] px-3.5 py-1 text-[11.5px] font-sans font-medium rounded-[4px] transition-all ${
                labMode === 'demos'
                  ? 'bg-white text-[#1A1D20] font-semibold border border-[#E5E0D8]/80 shadow-xs'
                  : 'text-[#75808B] hover:text-[#1A1D20]'
              }`}
            >
              <span>Explore demo reports</span>
            </button>
            <button
              role="tab"
              aria-selected={labMode === 'upload'}
              onClick={() => {
                setLabMode('upload');
                if (step !== 'confirmed') {
                  setStep('idle');
                }
              }}
              className={`min-h-[30px] px-3.5 py-1 text-[11.5px] font-sans font-medium rounded-[4px] transition-all ${
                labMode === 'upload'
                  ? 'bg-white text-[#1A1D20] font-semibold border border-[#E5E0D8]/80 shadow-xs'
                  : 'text-[#75808B] hover:text-[#1A1D20]'
              }`}
            >
              <span>Upload report image</span>
            </button>
          </div>

          {/* Demos selector */}
          {labMode === 'demos' && (
            <div
              className="flex items-center gap-1 overflow-x-auto p-0.5 bg-[#EDE8DF] rounded-[6px] border border-[#E5E0D8] shrink-0"
              role="tablist"
              aria-label="Demo Reports"
            >
              {[
                { id: 'lab-demo-a', index: '01', title: 'Single Abnormal (CBC)' },
                { id: 'lab-demo-b', index: '02', title: 'Co-Abnormality Trigger' },
                { id: 'lab-demo-c', index: '03', title: 'Fail-Closed Safety' },
              ].map((c) => {
                const isSelected = selectedCaseId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectDemo(c.id)}
                    role="tab"
                    aria-selected={isSelected}
                    className={`relative min-h-[30px] px-2.5 py-1 text-[11px] font-mono rounded-[4px] transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      isSelected
                        ? 'text-[#1A1D20] font-semibold bg-white shadow-xs'
                        : 'text-[#75808B] hover:text-[#1A1D20]'
                    }`}
                  >
                    <span className="text-[#75808B] font-bold">{c.index}</span>
                    <span>{c.title}</span>
                    {isSelected && (
                      <span
                        className="absolute bottom-0 inset-x-2 h-[1.5px] bg-[#3D5A4C]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Demo Patient & Lab Context Strip */}
      {labMode === 'demos' && (
        <div className="bg-white rounded-[6px] border border-[#E5E0D8] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-serif text-[14px] font-semibold text-[#1A1D20]">
                {currentDemoCase.title}
              </span>
              <span className="font-mono text-[10px] text-[#2E6B56] bg-[#E8EFEA] px-2 py-0.5 rounded border border-[#2E6B56]/20 font-medium">
                {currentDemoCase.badge}
              </span>
            </div>
            <p className="text-[12px] text-[#48525B]">
              {currentDemoCase.description}
            </p>
          </div>
          <div className="font-mono text-[10.5px] text-[#75808B] text-right shrink-0">
            <div>Patient: {currentDemoCase.patientName}</div>
            <div>Source: {currentDemoCase.labName}</div>
          </div>
        </div>
      )}

      {/* Upload State / Form View */}
      {labMode === 'upload' && step === 'idle' && (
        <div className="bg-white rounded-[8px] border border-[#E5E0D8] p-6 space-y-5 shadow-xs max-w-[760px] mx-auto">
          <div>
            <h2 className="font-serif text-[20px] font-semibold text-[#1A1D20]">
              Upload Single Laboratory Report Image
            </h2>
            <p className="text-[13px] text-[#48525B] mt-1 leading-relaxed">
              Upload a JPEG, PNG, or WebP photo or scan of a lab report (up to 5 MB).
              Gemini will read each test line as printed without assessing normality.
            </p>
          </div>

          {/* File Picker */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#E5E0D8] hover:border-[#3D5A4C] rounded-[8px] p-6 text-center cursor-pointer bg-[#FAF8F5]/50 transition-colors flex flex-col items-center justify-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <svg className="w-8 h-8 text-[#75808B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="text-[13px] font-medium text-[#1A1D20]">
              {uploadFile ? uploadFile.name : 'Choose lab report image or drag and drop here'}
            </div>
            <div className="text-[11px] font-mono text-[#75808B]">
              Supported: JPEG, PNG, WebP (Max 5 MB)
            </div>
            {uploadFile && (
              <span className="text-[11.5px] font-mono text-[#2E6B56] bg-[#E8EFEA] px-2 py-0.5 rounded mt-1">
                {(uploadFile.size / 1024).toFixed(1)} KB selected
              </span>
            )}
          </div>

          {/* Image Preview Thumbnail if selected */}
          {filePreviewUrl && (
            <div className="flex items-center gap-3 p-3 bg-[#FAF8F5] rounded-[6px] border border-[#E5E0D8]">
              <img
                src={filePreviewUrl}
                alt="Lab report preview"
                className="w-16 h-16 object-cover rounded border border-[#E5E0D8]"
              />
              <div className="text-[12px] space-y-0.5">
                <div className="font-medium text-[#1A1D20]">{uploadFile?.name}</div>
                <div className="text-[11px] text-[#75808B]">Ready for OCR & extraction</div>
              </div>
            </div>
          )}

          {/* Progress / Status Strip */}
          {isExtracting && (
            <div className="bg-[#FAF8F5] p-3 rounded border border-[#E5E0D8] space-y-2">
              <div className="flex items-center justify-between text-[11.5px] font-mono">
                <span className="text-[#2E6B56] font-semibold">Stage: {extractionStage}</span>
                <span className="text-[#75808B]">Processing image...</span>
              </div>
              <div className="w-full bg-[#EDE8DF] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#2E6B56] h-full transition-all duration-300"
                  style={{
                    width:
                      extractionStage === 'UPLOAD'
                        ? '30%'
                        : extractionStage === 'EXTRACT'
                          ? '65%'
                          : extractionStage === 'VALIDATE'
                            ? '90%'
                            : '10%',
                  }}
                />
              </div>
            </div>
          )}

          {/* Error notice */}
          {uploadError && (
            <div className="bg-[#FFE4E6] p-3 rounded border border-[#FB7185]/30 text-[12px] text-[#9F1239] flex items-center gap-2">
              <svg className="w-4 h-4 text-[#E11D48] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{uploadError}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {isExtracting ? (
              <button
                type="button"
                onClick={handleCancelExtraction}
                className="px-4 py-2 text-[12.5px] font-medium text-[#9F1239] bg-[#FFE4E6] rounded border border-[#FB7185]/30 hover:bg-[#FECDD3]"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartUploadExtract}
                disabled={!uploadFile}
                className={`px-5 py-2.5 text-[13px] font-semibold rounded-[4px] shadow-xs transition-all flex items-center gap-2 ${
                  uploadFile
                    ? 'bg-[#1A1D20] text-white hover:bg-[#33393F] cursor-pointer active:translate-y-[1px]'
                    : 'bg-[#F5F2EB] text-[#75808B] border border-[#E5E0D8] cursor-not-allowed'
                }`}
              >
                <span>Extract lab report</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Step (Safety Critical) */}
      {step === 'extracted' && (
        <LabConfirmTable
          key={unconfirmedDoc.results[0]?.result_id || 'confirm-table'}
          document={unconfirmedDoc}
          onConfirm={handleConfirmReport}
          onCancel={
            labMode === 'upload'
              ? () => {
                  setStep('idle');
                }
              : undefined
          }
        />
      )}

      {/* Confirmed Results Panel */}
      {step === 'confirmed' && reviewReport && (
        <LabResultsPanel
          report={reviewReport}
          onEditAgain={handleBackToConfirm}
        />
      )}
    </div>
  );
};
