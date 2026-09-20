import { useState, useEffect, useMemo, useRef } from 'react';
import { BUNDLED_CASES, type SyntheticCase } from './data/syntheticCases.js';
import { buildDiffReport } from './engine/diffEngine.js';
import { createPresentationModel } from './adapters/presentationAdapter.js';
import { ReconciliationCanvas } from './components/ReconciliationCanvas.js';
import { PrintHandoff } from './components/PrintHandoff.js';
import { WarningIcon, PrinterIcon } from './components/Icons.js';
import { ImageUploadDropzone } from './components/ImageUploadDropzone.js';
import { liveGeminiProvider } from './services/extraction/liveGeminiProvider.js';
import type { ExtractionStage, LiveExtractionSuccess } from './services/extraction/types.js';

type WorkbenchMode = 'demos' | 'upload';
type CaseKey = 'case-a' | 'case-b' | 'case-c';

export function App() {
  const [mode, setMode] = useState<WorkbenchMode>('demos');
  const [selectedCase, setSelectedCase] = useState<CaseKey>('case-a');
  const [analyzingStep, setAnalyzingStep] = useState<number>(3); // 0: READ, 1: STRUCTURE, 2: MATCH, 3: REVIEWED
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Upload Workbench State
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [deidentifiedConfirmed, setDeidentifiedConfirmed] = useState<boolean>(false);
  const [uploadStage, setUploadStage] = useState<ExtractionStage>('IDLE');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [liveResult, setLiveResult] = useState<LiveExtractionSuccess | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const currentCase = BUNDLED_CASES[selectedCase];

  // Pure deterministic DiffReport for Demo
  const demoReport = useMemo(() => {
    return buildDiffReport(currentCase.beforeDoc, currentCase.afterDoc);
  }, [currentCase]);

  // Demo Presentation Model
  const demoPresentationModel = useMemo(() => {
    return createPresentationModel(currentCase, demoReport);
  }, [currentCase, demoReport]);

  // Live Extraction Presentation Model
  const livePresentationModel = useMemo(() => {
    if (!liveResult) return null;
    const liveCaseBundle: SyntheticCase = {
      id: 'case-a',
      title: 'Live Extraction',
      description: `Gemini 3.6 Flash extraction (Req: ${liveResult.metadata.request_id.slice(0, 8)})`,
      beforeDoc: liveResult.beforeDoc,
      afterDoc: liveResult.afterDoc,
      expectedOutcomes: {},
    };
    return createPresentationModel(liveCaseBundle, liveResult.report);
  }, [liveResult]);

  const activePresentationModel =
    mode === 'upload' && livePresentationModel ? livePresentationModel : demoPresentationModel;

  const handleSelectCase = (caseId: CaseKey) => {
    if (caseId === selectedCase) return;
    setSelectedCase(caseId);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setAnalyzingStep(3);
      setIsAnalyzing(false);
      return;
    }

    setIsAnalyzing(true);
    setAnalyzingStep(0);
  };

  // Truthful analysis step progression for demos (1.6s total)
  useEffect(() => {
    if (!isAnalyzing) return;

    const t1 = setTimeout(() => setAnalyzingStep(1), 450);
    const t2 = setTimeout(() => setAnalyzingStep(2), 900);
    const t3 = setTimeout(() => {
      setAnalyzingStep(3);
      setIsAnalyzing(false);
    }, 1600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isAnalyzing]);

  const handlePrint = () => {
    window.print();
  };

  // Trigger live extraction
  const handleStartExtraction = async () => {
    if (!beforeFile || !afterFile || !deidentifiedConfirmed || isUploading) return;

    setUploadError(null);
    setIsUploading(true);
    setUploadStage('UPLOAD');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const res = await liveGeminiProvider.extract(
      beforeFile,
      afterFile,
      (stage) => setUploadStage(stage),
      controller.signal
    );

    setIsUploading(false);
    setUploadStage('IDLE');
    abortControllerRef.current = null;

    if (res.success) {
      setLiveResult(res);
      setUploadError(null);
    } else {
      setUploadError(res.error);
    }
  };

  const handleCancelExtraction = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsUploading(false);
      setUploadStage('IDLE');
    }
  };

  const handleResetUpload = () => {
    setLiveResult(null);
    setUploadError(null);
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-canvas text-text-1 flex flex-col selection:bg-active/20 selection:text-white radial-light-pool bg-grain">
      {/* 56px Quiet Frame Top Bar */}
      <header className="no-print h-[56px] bg-chrome border-b border-line-dark px-4 sm:px-6 flex items-center justify-between gap-3 select-none shrink-0 z-30">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="font-sans text-[15px] font-semibold tracking-tight text-white">
            <span>RxDiff</span>
            <span className="sr-only">RXDIFF</span>
          </span>
          <span className="text-[12px] text-text-3 font-sans border-l border-line-dark pl-2.5 tracking-normal hidden sm:inline">
            <span>Medication reconciliation</span>
            <span className="sr-only">MEDICATION RECONCILIATION</span>
          </span>
        </div>

        {/* Center: Persistent Clinical Safety Statement (Desktop) */}
        <div className="hidden md:flex items-center justify-center flex-1 max-w-[680px] text-center">
          <p className="font-sans text-[11.5px] text-text-2 tracking-normal line-clamp-1 flex items-center gap-1.5">
            <WarningIcon className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
            <span>
              Do not start, stop, or change medicine based on RxDiff. Confirm every flagged item with a doctor or pharmacist.
            </span>
          </p>
        </div>

        {/* Right: Synthetic / Live Badge & Print Handoff Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          {mode === 'upload' && liveResult ? (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-[3px] bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 uppercase font-bold hidden sm:inline">
              LIVE EXTRACTION / REVIEW REQUIRED
            </span>
          ) : (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-[3px] bg-panel-raised text-text-3 border border-line-dark uppercase hidden sm:inline">
              SYNTHETIC DEMO — NO PATIENT DATA
            </span>
          )}

          <button
            onClick={handlePrint}
            className="min-h-[32px] px-3 py-1 text-[11px] font-sans font-medium text-text-1 bg-panel hover:bg-panel-raised active:translate-y-[1px] border border-line-dark rounded-[4px] transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-active"
            title="Open printable medication reconciliation handoff"
          >
            <PrinterIcon className="w-3.5 h-3.5 text-text-2" />
            <span>
              <span>Print handoff</span>
              <span className="sr-only">PRINT HANDOFF</span>
            </span>
          </button>
        </div>
      </header>

      {/* Compact Mobile Safety Strip (48-52px on mobile) */}
      <div
        className="no-print md:hidden bg-chrome border-b border-line-dark px-3 py-1.5 flex items-center justify-between gap-2 text-[10.5px] font-sans shrink-0 min-h-[48px]"
        data-testid="mobile-safety-strip"
      >
        <div className="flex items-center gap-1.5 text-text-2 flex-1">
          <WarningIcon className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
          <span className="leading-snug">
            Do not start, stop, or change medicine based on RxDiff. Confirm with a doctor or pharmacist.
          </span>
        </div>
        <span className="px-1.5 py-0.5 rounded-[2px] bg-panel-raised text-text-3 border border-line-dark uppercase text-[9px] font-mono font-bold shrink-0">
          {mode === 'upload' && liveResult ? 'LIVE RUN' : 'SYNTHETIC DEMO'}
        </span>
      </div>

      {/* Main Workspace (Max 1480px, strictly fits inside 1440x900 with zero page scroll) */}
      <main className="no-print flex-1 min-h-0 flex flex-col max-w-[1480px] w-full mx-auto px-4 sm:px-6 py-2.5 space-y-2.5 overflow-hidden">
        {/* Editorial Compact Entry Area */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 pb-2 border-b border-line-dark shrink-0">
          <div>
            <div className="font-mono text-[10.5px] tracking-[0.12em] text-text-3 uppercase mb-0.5">
              Medication reconciliation, with evidence.
            </div>
            <h1 className="font-sans text-[clamp(24px,2.5vw,34px)] font-semibold text-text-1 tracking-tight leading-tight">
              Two lists. One safer conversation.
            </h1>
            <p className="font-sans text-[12.5px] text-text-2 mt-0.5">
              Deterministic verification between previous prescription and discharge lists.
            </p>
          </div>

          {/* Mode Switcher + Selectors */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
            {/* Mode Control: Warm physical two-position switch */}
            <div
              className="flex items-center gap-1 bg-[#101417] p-1 rounded-[6px] border border-line-dark shrink-0"
              role="tablist"
              aria-label="Workflow Mode"
            >
              <button
                role="tab"
                aria-selected={mode === 'demos'}
                aria-label="Explore demo (demo cases)"
                onClick={() => setMode('demos')}
                className={`min-h-[30px] px-3.5 py-1 text-[11.5px] font-sans font-medium rounded-[4px] transition-all ${
                  mode === 'demos'
                    ? 'bg-panel-raised text-white font-semibold border border-line-active shadow-sm'
                    : 'text-text-3 hover:text-text-2 hover:bg-panel'
                }`}
              >
                <span>Explore demo</span>
              </button>
              <button
                role="tab"
                aria-selected={mode === 'upload'}
                aria-label="Analyze images"
                onClick={() => setMode('upload')}
                className={`min-h-[30px] px-3.5 py-1 text-[11.5px] font-sans font-medium rounded-[4px] transition-all ${
                  mode === 'upload'
                    ? 'bg-panel-raised text-white font-semibold border border-line-active shadow-sm'
                    : 'text-text-3 hover:text-text-2 hover:bg-panel'
                }`}
              >
                <span>Analyze images</span>
              </button>
            </div>

            {/* Demo Cases Editorial Index with Fine Warm Underline (Only shown in demo mode) */}
            {mode === 'demos' && (
              <div
                className="flex items-center gap-1 overflow-x-auto p-1 bg-[#101417] rounded-[6px] border border-line-dark shrink-0"
                role="tablist"
                aria-label="Bundled Demo Cases"
              >
                {[
                  { id: 'case-a', index: '01', title: 'Regimen changes', fullLabel: 'A / Regimen changes' },
                  { id: 'case-b', index: '02', title: 'Omission safety', fullLabel: 'B / Omission safety' },
                  { id: 'case-c', index: '03', title: 'Alias duplicate', fullLabel: 'C / Alias duplicate' },
                ].map((c) => {
                  const isSelected = selectedCase === c.id;
                  return (
                    <button
                      key={c.id}
                      id={`select-${c.id}`}
                      onClick={() => handleSelectCase(c.id as CaseKey)}
                      role="tab"
                      aria-selected={isSelected}
                      aria-label={`${c.index} ${c.title} (${c.fullLabel})`}
                      className={`relative min-h-[30px] px-2.5 py-1 text-[11px] font-mono rounded-[3px] transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        isSelected
                          ? 'text-white font-semibold bg-panel-raised'
                          : 'text-text-3 hover:text-text-2 hover:bg-panel'
                      }`}
                    >
                      <span className="text-text-3 font-bold">{c.index}</span>
                      <span>{c.title}</span>
                      {isSelected && (
                        <span
                          className="absolute bottom-0 inset-x-2 h-[1.5px] bg-[#D8D2C5]"
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

        {/* WORKBENCH BODY */}
        {mode === 'demos' ? (
          <>
            {/* Thin Timeline Stepper with 1px Traveling Rule */}
            <div className="relative h-[32px] bg-panel rounded-[5px] border border-line-dark px-3 flex items-center justify-between gap-2 overflow-hidden select-none shrink-0">
              {isAnalyzing && (
                <div
                  className="absolute inset-y-0 w-[1px] bg-active animate-scan-line pointer-events-none"
                  aria-hidden="true"
                />
              )}

              {/* Stepper Pipeline: READ → STRUCTURE → MATCH → REVIEW */}
              <div className="flex items-center gap-1 sm:gap-2 text-[10.5px] font-mono">
                <span className={analyzingStep >= 0 ? 'text-active font-bold' : 'text-text-3'}>
                  READ {analyzingStep > 0 && '✓'}
                </span>
                <span className="text-text-3">→</span>
                <span className={analyzingStep >= 1 ? 'text-active font-bold' : 'text-text-3'}>
                  STRUCTURE {analyzingStep > 1 && '✓'}
                </span>
                <span className="text-text-3">→</span>
                <span className={analyzingStep >= 2 ? 'text-active font-bold' : 'text-text-3'}>
                  MATCH {analyzingStep > 2 && '✓'}
                </span>
                <span className="text-text-3">→</span>
                <span className={analyzingStep >= 3 ? 'text-matched font-bold' : 'text-text-3'}>
                  REVIEW
                </span>
                <span className="text-text-3 ml-2 pl-2 border-l border-line-dark hidden md:inline">
                  <span>Synthetic example</span>
                  <span className="sr-only">Structured demo case</span>
                </span>
              </div>

              {/* Summary Metric */}
              <div className="font-mono text-[11px] font-semibold text-text-1 tracking-wider tabular-nums">
                {isAnalyzing ? (
                  <span className="text-text-3 italic">Analyzing regimen...</span>
                ) : (
                  <span>{activePresentationModel.summaryText}</span>
                )}
              </div>
            </div>

            {/* Reconciliation Canvas */}
            <ReconciliationCanvas model={activePresentationModel} />
          </>
        ) : (
          /* UPLOAD MODE */
          <div className="flex-1 min-h-0 flex flex-col space-y-2.5 overflow-hidden">
            {/* Top Mandatory De-Identification Disclaimer Banner on Warm Recessed Material */}
            <div className="p-2.5 rounded-[6px] bg-[#101417] border border-line-dark flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-start gap-2 max-w-[840px]">
                <WarningIcon className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                <div className="text-[11.5px] font-sans text-text-2 leading-[17px]">
                  <span>
                    Prototype only. Use de-identified medication lists. Images are processed for this request and are not stored by RxDiff. Do not start, stop, or change medicine based on the result.
                  </span>
                </div>
              </div>

              {/* Mandatory De-identification Checkbox */}
              <label className="flex items-center gap-2 text-[11px] font-sans font-medium text-text-1 cursor-pointer select-none shrink-0 bg-[#0B0E10] px-3 py-1.5 rounded-[4px] border border-line-dark hover:border-line-active">
                <input
                  type="checkbox"
                  checked={deidentifiedConfirmed}
                  onChange={(e) => setDeidentifiedConfirmed(e.target.checked)}
                  disabled={isUploading}
                  className="rounded bg-panel border-line-dark text-active focus:ring-active"
                />
                <span>I removed names, IDs, addresses, phone numbers, barcodes, and other personal details.</span>
              </label>
            </div>

            {/* If liveResult is loaded, show live canvas with reset option */}
            {liveResult && livePresentationModel ? (
              <div className="flex-1 min-h-0 flex flex-col space-y-2 overflow-hidden">
                {/* Live Extraction Action Strip */}
                <div className="h-[34px] bg-panel rounded-[5px] border border-line-dark px-3 flex items-center justify-between gap-2 overflow-hidden select-none shrink-0 font-mono text-[11px]">
                  <div className="flex items-center gap-2 text-active font-bold">
                    <span className="w-2 h-2 rounded-full bg-active animate-pulse" />
                    <span>LIVE EXTRACTION COMPLETE</span>
                    <span className="text-text-3 font-normal">
                      [ID: {liveResult.metadata.request_id.slice(0, 8)}]
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-text-1 font-semibold tabular-nums">
                      {livePresentationModel.summaryText}
                    </span>
                    <button
                      onClick={handleResetUpload}
                      className="px-2.5 py-0.5 bg-panel-raised hover:bg-[#202730] text-text-2 hover:text-white border border-line-dark rounded-[3px] transition-colors"
                    >
                      New Images
                    </button>
                  </div>
                </div>

                {/* Live Reconciliation Canvas */}
                <ReconciliationCanvas model={livePresentationModel} />
              </div>
            ) : (
              /* Dual Document Sleeves Tray */
              <div className="flex-1 min-h-0 flex flex-col space-y-2.5 overflow-hidden">
                {/* Dual Document Sleeves with Quiet Relationship Divider */}
                <div className="relative flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3.5 overflow-hidden items-stretch">
                  <ImageUploadDropzone
                    label="01 Previous list"
                    subtitle="Previous prescription / home list"
                    file={beforeFile}
                    onFileSelected={(f) => setBeforeFile(f)}
                    onFileRemoved={() => setBeforeFile(null)}
                    disabled={isUploading}
                    ariaLabel="01 BEFORE IMAGE"
                    srLabel="01 BEFORE IMAGE"
                  />

                  {/* Quiet 'Compare evidence' relationship mark */}
                  <div
                    className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 px-2 py-1 bg-[#101417] border border-line-dark rounded-[4px] shadow-sm pointer-events-none text-[10.5px] font-sans text-text-3 uppercase tracking-wider items-center gap-1.5"
                    aria-hidden="true"
                  >
                    <span>Compare evidence</span>
                  </div>

                  <ImageUploadDropzone
                    label="02 Discharge list"
                    subtitle="New discharge / inpatient list"
                    file={afterFile}
                    onFileSelected={(f) => setAfterFile(f)}
                    onFileRemoved={() => setAfterFile(null)}
                    disabled={isUploading}
                    ariaLabel="02 AFTER IMAGE"
                    srLabel="02 AFTER IMAGE"
                  />
                </div>

                {/* Safe Inline Correction Error Banner (Preserves selected files) */}
                {uploadError && (
                  <div
                    role="alert"
                    className="p-3 rounded-[5px] bg-[#FB7185]/10 border border-[#FB7185]/30 text-text-1 font-mono text-[12px] flex items-start justify-between gap-2 shrink-0"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-[#FB7185] font-bold">FAILURE:</span>
                      <div>
                        <p className="font-bold text-[#FB7185]">
                          No medication comparison was produced.
                        </p>
                        <p className="text-text-2 mt-0.5">{uploadError}</p>
                        <p className="text-text-3 text-[11px] mt-1">
                          Your selected image files remain ready. Check image clarity, orientation, or try another image pair.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUploadError(null)}
                      className="text-text-3 hover:text-white text-[11px] uppercase font-bold"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Bottom Extraction Action Bar */}
                <div className="relative p-2.5 bg-panel rounded-[6px] border border-line-dark flex items-center justify-between gap-3 shrink-0 select-none overflow-hidden">
                  {/* Active Scan Line during Upload/Extract */}
                  {isUploading && (
                    <div
                      className="absolute inset-y-0 w-[1px] bg-active animate-scan-line pointer-events-none"
                      aria-hidden="true"
                    />
                  )}

                  {/* Truthful Pipeline Stepper: UPLOAD → EXTRACT → VALIDATE → COMPARE */}
                  <div className="flex items-center gap-1 sm:gap-2 text-[10.5px] font-mono">
                    <span
                      className={
                        uploadStage === 'UPLOAD'
                          ? 'text-active font-bold animate-pulse'
                          : isUploading && ['EXTRACT', 'VALIDATE', 'COMPARE'].includes(uploadStage)
                            ? 'text-active font-bold'
                            : 'text-text-3'
                      }
                    >
                      UPLOAD {['EXTRACT', 'VALIDATE', 'COMPARE'].includes(uploadStage) && '✓'}
                    </span>
                    <span className="text-text-3">→</span>
                    <span
                      className={
                        uploadStage === 'EXTRACT'
                          ? 'text-active font-bold animate-pulse'
                          : isUploading && ['VALIDATE', 'COMPARE'].includes(uploadStage)
                            ? 'text-active font-bold'
                            : 'text-text-3'
                      }
                    >
                      EXTRACT (Gemini 3.6 Flash){' '}
                      {['VALIDATE', 'COMPARE'].includes(uploadStage) && '✓'}
                    </span>
                    <span className="text-text-3">→</span>
                    <span
                      className={
                        uploadStage === 'VALIDATE'
                          ? 'text-active font-bold animate-pulse'
                          : isUploading && uploadStage === 'COMPARE'
                            ? 'text-active font-bold'
                            : 'text-text-3'
                      }
                    >
                      VALIDATE (Evidence checks) {uploadStage === 'COMPARE' && '✓'}
                    </span>
                    <span className="text-text-3">→</span>
                    <span
                      className={
                        uploadStage === 'COMPARE' ? 'text-matched font-bold' : 'text-text-3'
                      }
                    >
                      COMPARE (Deterministic Diff)
                    </span>
                  </div>

                  {/* CTA: 48px high, high contrast */}
                  <div className="flex items-center gap-2">
                    {isUploading ? (
                      <button
                        type="button"
                        onClick={handleCancelExtraction}
                        className="h-[48px] px-4 text-[12px] font-sans font-medium text-[#FB7185] bg-[#FB7185]/10 hover:bg-[#FB7185]/20 border border-[#FB7185]/40 rounded-[5px] transition-colors"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        type="button"
                        role="button"
                        onClick={handleStartExtraction}
                        disabled={!beforeFile || !afterFile || !deidentifiedConfirmed}
                        aria-label="Compare medication lists (analyze medication lists)"
                        className={`h-[48px] px-6 text-[13px] font-sans font-semibold rounded-[5px] transition-all flex items-center gap-2 ${
                          beforeFile && afterFile && deidentifiedConfirmed
                            ? 'bg-text-1 text-canvas hover:bg-white shadow-md cursor-pointer active:translate-y-[1px]'
                            : 'bg-panel-raised text-text-3 border border-line-dark cursor-not-allowed opacity-40'
                        }`}
                      >
                        <span>Compare medication lists</span>
                        <span>→</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Dedicated Print Handoff Sheet */}
      <PrintHandoff model={activePresentationModel} />
    </div>
  );
}

export default App;
