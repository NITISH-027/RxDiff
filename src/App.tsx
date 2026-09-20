import { useState, useEffect, useMemo, useRef } from 'react';
import { BUNDLED_CASES, type SyntheticCase } from './data/syntheticCases.js';
import { buildDiffReport } from './engine/diffEngine.js';
import { createPresentationModel } from './adapters/presentationAdapter.js';
import { ReconciliationCanvas } from './components/ReconciliationCanvas.js';
import { PrintHandoff } from './components/PrintHandoff.js';
import { WarningIcon, PrinterIcon } from './components/Icons.js';
import { ImageUploadDropzone } from './components/ImageUploadDropzone.js';
import { EditorialHero } from './components/EditorialHero.js';
import { StoryIntro } from './components/StoryIntro.js';
import { liveGeminiProvider } from './services/extraction/liveGeminiProvider.js';
import type { ExtractionStage, LiveExtractionSuccess } from './services/extraction/types.js';

type WorkbenchMode = 'demos' | 'upload';
type CaseKey = 'case-a' | 'case-b' | 'case-c';

export function App() {
  const [showHero, setShowHero] = useState<boolean>(false);
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

  if (showHero) {
    return (
      <EditorialHero
        onEnterWorkspace={() => {
          setShowHero(false);
          setMode('demos');
        }}
        onGenerateDiff={() => {
          setShowHero(false);
          setMode('upload');
        }}
        beforeFile={beforeFile}
        afterFile={afterFile}
        onSelectBeforeFile={(f) => setBeforeFile(f)}
        onSelectAfterFile={(f) => setAfterFile(f)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1D20] flex flex-col selection:bg-[#3D5A4C]/20 selection:text-[#1A1D20]">
      {/* Keyboard-focusable Skip Link to #workspace */}
      <a
        href="#workspace"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#2E6B56] focus:text-white focus:rounded focus:outline-none focus:ring-2 focus:ring-white text-xs font-mono shadow-md"
      >
        Skip to medication comparison
      </a>

      {/* STAGE 5: Visual Narrative Scroll Story Journey */}
      <StoryIntro />

      {/* Main Reconciliation Tool (#app and #workspace) */}
      <div id="app" className="min-h-screen flex flex-col">
        {/* 54px Minimal Editorial Frame Top Bar */}
        <header className="no-print sticky top-0 bg-white/95 backdrop-blur-sm border-b border-[#E5E0D8] px-4 sm:px-6 h-[54px] flex items-center justify-between gap-3 select-none z-30 shadow-xs">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="font-serif text-[17px] font-semibold tracking-tight text-[#1A1D20]">
            <span>RxDiff</span>
            <span className="sr-only">RXDIFF</span>
          </span>
          <span className="text-[12px] text-[#75808B] font-sans border-l border-[#E5E0D8] pl-2.5 tracking-normal hidden sm:inline">
            <span>Medication reconciliation</span>
            <span className="sr-only">MEDICATION RECONCILIATION</span>
          </span>
        </div>

        {/* Center: Persistent Clinical Safety Statement (Desktop) */}
        <div className="hidden md:flex items-center justify-center flex-1 max-w-[680px] text-center">
          <p className="font-sans text-[11.5px] text-[#48525B] tracking-normal line-clamp-1 flex items-center gap-1.5">
            <WarningIcon className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
            <span>
              Do not start, stop, or change medicine based on RxDiff. Confirm every flagged item with a doctor or pharmacist.
            </span>
          </p>
        </div>

        {/* Right: Mode Badge & Print Handoff Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          {mode === 'upload' && liveResult ? (
            <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-[3px] bg-[#E8EFEA] text-[#2E6B56] border border-[#2E6B56]/20 font-medium hidden sm:inline">
              LIVE EXTRACTION / REVIEW REQUIRED
            </span>
          ) : (
            <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-[3px] bg-[#F5F2EB] text-[#75808B] border border-[#E5E0D8] hidden sm:inline">
              SYNTHETIC DEMO — NO PATIENT DATA
            </span>
          )}

          <button
            onClick={handlePrint}
            className="min-h-[32px] px-3 py-1 text-[11.5px] font-sans font-medium text-[#1A1D20] bg-white hover:bg-[#F5F2EB] active:translate-y-[1px] border border-[#E5E0D8] rounded-[4px] shadow-xs transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#3D5A4C]"
            title="Open printable medication reconciliation handoff"
          >
            <PrinterIcon className="w-3.5 h-3.5 text-[#75808B]" />
            <span>
              <span>Print handoff</span>
              <span className="sr-only">PRINT HANDOFF</span>
            </span>
          </button>
        </div>
      </header>

      {/* Compact Mobile Safety Strip */}
      <div
        className="no-print md:hidden bg-[#FAF8F5] border-b border-[#E5E0D8] px-3 py-1.5 flex items-center justify-between gap-2 text-[10.5px] font-sans shrink-0 min-h-[46px]"
        data-testid="mobile-safety-strip"
      >
        <div className="flex items-center gap-1.5 text-[#48525B] flex-1">
          <WarningIcon className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
          <span className="leading-snug">
            Do not start, stop, or change medicine based on RxDiff. Confirm with a doctor or pharmacist.
          </span>
        </div>
        <span className="px-1.5 py-0.5 rounded-[2px] bg-[#F5F2EB] text-[#75808B] border border-[#E5E0D8] text-[9px] font-mono font-bold shrink-0">
          {mode === 'upload' && liveResult ? 'LIVE RUN' : 'SYNTHETIC DEMO'}
        </span>
      </div>

      {/* Main Spacious Centered Workspace */}
      <main id="workspace" className="no-print flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
        {/* Editorial Header Entry Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-3 border-b border-[#E5E0D8] shrink-0">
          <div>
            <div className="font-mono text-[10.5px] tracking-[0.14em] text-[#75808B] uppercase mb-1">
              Clinical Medication Reconciliation
            </div>
            <h1 className="font-serif text-[clamp(24px,2.6vw,34px)] font-normal text-[#1A1D20] tracking-tight leading-tight">
              The important changes can hide between two lists.
            </h1>
            <p className="font-sans text-[13.5px] text-[#48525B] mt-1 max-w-[680px] leading-[20px]">
              RxDiff reveals what changed and links every flag back to its source. See what changed. Know what to ask.
            </p>
          </div>

          {/* Mode Switcher + Selectors */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
            {/* Mode Control: Calm physical pill switch */}
            <div
              className="flex items-center gap-1 bg-[#EDE8DF] p-0.5 rounded-[6px] border border-[#E5E0D8] shrink-0"
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
                    ? 'bg-white text-[#1A1D20] font-semibold border border-[#E5E0D8]/80 shadow-xs'
                    : 'text-[#75808B] hover:text-[#1A1D20]'
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
                    ? 'bg-white text-[#1A1D20] font-semibold border border-[#E5E0D8]/80 shadow-xs'
                    : 'text-[#75808B] hover:text-[#1A1D20]'
                }`}
              >
                <span>Analyze images</span>
              </button>
            </div>

            {/* Demo Cases Editorial Index (Only shown in demo mode) */}
            {mode === 'demos' && (
              <div
                className="flex items-center gap-1 overflow-x-auto p-0.5 bg-[#EDE8DF] rounded-[6px] border border-[#E5E0D8] shrink-0"
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

        {/* WORKBENCH BODY */}
        {mode === 'demos' ? (
          <>
            {/* Stepper Strip */}
            <div className="relative h-[36px] bg-white rounded-[6px] border border-[#E5E0D8] px-3.5 flex items-center justify-between gap-2 overflow-hidden select-none shrink-0 shadow-xs">
              {isAnalyzing && (
                <div
                  className="absolute inset-y-0 w-[1px] bg-[#3D5A4C] animate-scan-line pointer-events-none"
                  aria-hidden="true"
                />
              )}

              {/* Stepper Pipeline: READ → STRUCTURE → MATCH → REVIEW */}
              <div className="flex items-center gap-1 sm:gap-2 text-[10.5px] font-mono">
                <span className={analyzingStep >= 0 ? 'text-[#3D5A4C] font-semibold' : 'text-[#75808B]'}>
                  READ {analyzingStep > 0 && '✓'}
                </span>
                <span className="text-[#75808B]">→</span>
                <span className={analyzingStep >= 1 ? 'text-[#3D5A4C] font-semibold' : 'text-[#75808B]'}>
                  STRUCTURE {analyzingStep > 1 && '✓'}
                </span>
                <span className="text-[#75808B]">→</span>
                <span className={analyzingStep >= 2 ? 'text-[#3D5A4C] font-semibold' : 'text-[#75808B]'}>
                  MATCH {analyzingStep > 2 && '✓'}
                </span>
                <span className="text-[#75808B]">→</span>
                <span className={analyzingStep >= 3 ? 'text-[#2E6B56] font-semibold' : 'text-[#75808B]'}>
                  REVIEW
                </span>
                <span className="text-[#75808B] ml-2 pl-2 border-l border-[#E5E0D8] hidden md:inline">
                  <span>Synthetic example</span>
                  <span className="sr-only">Structured demo case</span>
                </span>
              </div>

              {/* Summary Metric */}
              <div className="font-mono text-[11px] font-semibold text-[#1A1D20] tracking-wider tabular-nums">
                {isAnalyzing ? (
                  <span className="text-[#75808B] italic">Analyzing regimen...</span>
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
          <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
            {/* Top Mandatory De-Identification Disclaimer Banner */}
            <div className="p-3 rounded-[6px] bg-white border border-[#E5E0D8] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-start gap-2 max-w-[840px]">
                <WarningIcon className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                <div className="text-[11.5px] font-sans text-[#48525B] leading-[17px]">
                  <span>
                    Prototype only. Use de-identified medication lists. Images are processed for this request and are not stored by RxDiff. Do not start, stop, or change medicine based on the result.
                  </span>
                </div>
              </div>

              {/* Mandatory De-identification Checkbox */}
              <label className="flex items-center gap-2 text-[11.5px] font-sans font-medium text-[#1A1D20] cursor-pointer select-none shrink-0 bg-[#FAF8F5] px-3 py-1.5 rounded-[4px] border border-[#E5E0D8] hover:border-[#3D5A4C]">
                <input
                  type="checkbox"
                  checked={deidentifiedConfirmed}
                  onChange={(e) => setDeidentifiedConfirmed(e.target.checked)}
                  disabled={isUploading}
                  className="rounded border-[#E5E0D8] text-[#3D5A4C] focus:ring-[#3D5A4C]"
                />
                <span>I removed names, IDs, addresses, phone numbers, barcodes, and other personal details.</span>
              </label>
            </div>

            {/* If liveResult is loaded, show live canvas with reset option */}
            {liveResult && livePresentationModel ? (
              <div className="flex-1 min-h-0 flex flex-col space-y-2.5 overflow-hidden">
                {/* Live Extraction Action Strip */}
                <div className="h-[34px] bg-white rounded-[5px] border border-[#E5E0D8] px-3 flex items-center justify-between gap-2 overflow-hidden select-none shrink-0 font-mono text-[11px] shadow-xs">
                  <div className="flex items-center gap-2 text-[#2E6B56] font-semibold">
                    <span className="w-2 h-2 rounded-full bg-[#2E6B56] animate-pulse" />
                    <span>LIVE EXTRACTION COMPLETE</span>
                    <span className="text-[#75808B] font-normal">
                      [ID: {liveResult.metadata.request_id.slice(0, 8)}]
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[#1A1D20] font-semibold tabular-nums">
                      {livePresentationModel.summaryText}
                    </span>
                    <button
                      onClick={handleResetUpload}
                      className="px-2.5 py-0.5 bg-[#FAF8F5] hover:bg-[#F5F2EB] text-[#48525B] hover:text-[#1A1D20] border border-[#E5E0D8] rounded-[3px] transition-colors"
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
              <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
                {/* Dual Document Sleeves */}
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
                    placeholder="Place previous list"
                  />

                  {/* Relationship mark */}
                  <div
                    className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 px-2 py-1 bg-white border border-[#E5E0D8] rounded-[4px] shadow-card pointer-events-none text-[10.5px] font-sans text-[#75808B] uppercase tracking-wider items-center gap-1.5"
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
                    placeholder="Place discharge list"
                  />
                </div>

                {/* Safe Inline Correction Error Banner */}
                {uploadError && (
                  <div
                    role="alert"
                    className="p-3 rounded-[5px] bg-[#FFE4E6]/80 border border-[#FB7185]/40 text-[#1A1D20] font-mono text-[12px] flex items-start justify-between gap-2 shrink-0"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-[#9F1239] font-bold">FAILURE:</span>
                      <div>
                        <p className="font-bold text-[#9F1239]">
                          No medication comparison was produced.
                        </p>
                        <p className="text-[#48525B] mt-0.5">{uploadError}</p>
                        <p className="text-[#75808B] text-[11px] mt-1">
                          Your selected image files remain ready. Check image clarity, orientation, or try another image pair.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUploadError(null)}
                      className="text-[#75808B] hover:text-[#1A1D20] text-[11px] uppercase font-bold"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Bottom Extraction Action Bar */}
                <div className="relative p-2.5 bg-white rounded-[6px] border border-[#E5E0D8] shadow-card flex items-center justify-between gap-3 shrink-0 select-none overflow-hidden">
                  {/* Active Scan Line during Upload/Extract */}
                  {isUploading && (
                    <div
                      className="absolute inset-y-0 w-[1px] bg-[#3D5A4C] animate-scan-line pointer-events-none"
                      aria-hidden="true"
                    />
                  )}

                  {/* Stepper */}
                  <div className="flex items-center gap-1 sm:gap-2 text-[10.5px] font-mono">
                    <span
                      className={
                        uploadStage === 'UPLOAD'
                          ? 'text-[#3D5A4C] font-bold animate-pulse'
                          : isUploading && ['EXTRACT', 'VALIDATE', 'COMPARE'].includes(uploadStage)
                            ? 'text-[#3D5A4C] font-bold'
                            : 'text-[#75808B]'
                      }
                    >
                      UPLOAD {['EXTRACT', 'VALIDATE', 'COMPARE'].includes(uploadStage) && '✓'}
                    </span>
                    <span className="text-[#75808B]">→</span>
                    <span
                      className={
                        uploadStage === 'EXTRACT'
                          ? 'text-[#3D5A4C] font-bold animate-pulse'
                          : isUploading && ['VALIDATE', 'COMPARE'].includes(uploadStage)
                            ? 'text-[#3D5A4C] font-bold'
                            : 'text-[#75808B]'
                      }
                    >
                      EXTRACT (Gemini 3.6 Flash){' '}
                      {['VALIDATE', 'COMPARE'].includes(uploadStage) && '✓'}
                    </span>
                    <span className="text-[#75808B]">→</span>
                    <span
                      className={
                        uploadStage === 'VALIDATE'
                          ? 'text-[#3D5A4C] font-bold animate-pulse'
                          : isUploading && uploadStage === 'COMPARE'
                            ? 'text-[#3D5A4C] font-bold'
                            : 'text-[#75808B]'
                      }
                    >
                      VALIDATE (Evidence checks) {uploadStage === 'COMPARE' && '✓'}
                    </span>
                    <span className="text-[#75808B]">→</span>
                    <span
                      className={
                        uploadStage === 'COMPARE' ? 'text-[#2E6B56] font-bold' : 'text-[#75808B]'
                      }
                    >
                      COMPARE (Deterministic Diff)
                    </span>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center gap-2">
                    {isUploading ? (
                      <button
                        type="button"
                        onClick={handleCancelExtraction}
                        className="h-[44px] px-4 text-[12px] font-sans font-medium text-[#9F1239] bg-[#FFE4E6] hover:bg-[#FECDD3] border border-[#FB7185]/30 rounded-[4px] transition-colors"
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
                        className={`h-[44px] px-5 text-[12.5px] font-sans font-semibold rounded-[4px] transition-all flex items-center gap-2 ${
                          beforeFile && afterFile && deidentifiedConfirmed
                            ? 'bg-[#1A1D20] text-white hover:bg-[#33393F] shadow-sm cursor-pointer active:translate-y-[1px]'
                            : 'bg-[#F5F2EB] text-[#75808B] border border-[#E5E0D8] cursor-not-allowed opacity-50'
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
      </div>

      {/* Dedicated Print Handoff Sheet */}
      <PrintHandoff model={activePresentationModel} />
    </div>
  );
}

export default App;
