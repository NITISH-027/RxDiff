import { useState, useEffect, useMemo } from 'react';
import { BUNDLED_CASES } from './data/syntheticCases.js';
import { buildDiffReport } from './engine/diffEngine.js';
import { createPresentationModel } from './adapters/presentationAdapter.js';
import { ReconciliationCanvas } from './components/ReconciliationCanvas.js';
import { PrintHandoff } from './components/PrintHandoff.js';
import { WarningIcon, PrinterIcon } from './components/Icons.js';

type CaseKey = 'case-a' | 'case-b' | 'case-c';

export function App() {
  const [selectedCase, setSelectedCase] = useState<CaseKey>('case-a');
  const [analyzingStep, setAnalyzingStep] = useState<number>(3); // 0: READ, 1: STRUCTURE, 2: MATCH, 3: REVIEWED
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const currentCase = BUNDLED_CASES[selectedCase];

  // Pure deterministic DiffReport
  const report = useMemo(() => {
    return buildDiffReport(currentCase.beforeDoc, currentCase.afterDoc);
  }, [currentCase]);

  // Presentation Model
  const presentationModel = useMemo(() => {
    return createPresentationModel(currentCase, report);
  }, [currentCase, report]);

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

  // Truthful analysis step progression (1.6s total)
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

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-canvas text-text-1 flex flex-col selection:bg-active/20 selection:text-white">
      {/* 44px Compact Top Bar */}
      <header className="no-print h-[44px] bg-chrome border-b border-line-dark px-3 sm:px-4 flex items-center justify-between gap-3 select-none shrink-0 z-30">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="font-mono text-[13px] font-bold tracking-[0.12em] text-white">
            RXDIFF
          </span>
          <span className="text-[10px] text-text-3 font-mono border-l border-line-dark pl-2.5 tracking-[0.08em] hidden sm:inline">
            MEDICATION RECONCILIATION
          </span>
        </div>

        {/* Center: Persistent Clinical Safety Statement (Desktop) */}
        <div className="hidden md:flex items-center justify-center flex-1 max-w-[640px] text-center">
          <p className="font-mono text-[11px] text-text-2 tracking-tight line-clamp-1 flex items-center gap-1.5">
            <WarningIcon className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
            <span>Do not start, stop, or change medicine based on RxDiff. Confirm every flagged item with a doctor or pharmacist.</span>
          </p>
        </div>

        {/* Right: Synthetic Badge & Print Handoff Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-[2px] bg-panel-raised text-text-3 border border-line-dark uppercase hidden sm:inline">
            SYNTHETIC DEMO — NO PATIENT DATA
          </span>

          <button
            onClick={handlePrint}
            className="min-h-[28px] px-2.5 py-1 text-[11px] font-mono font-medium text-text-1 bg-panel hover:bg-panel-raised active:translate-y-[1px] border border-line-dark rounded-[3px] transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-active"
            title="Open printable medication reconciliation handoff"
          >
            <PrinterIcon className="w-3.5 h-3.5 text-text-1" />
            <span>PRINT HANDOFF</span>
          </button>
        </div>
      </header>

      {/* Compact Mobile Safety Strip (Visible on mobile screens) */}
      <div
        className="no-print md:hidden bg-[#0D1013] border-b border-line-dark px-3 py-1.5 flex items-center justify-between gap-2 text-[10px] font-mono shrink-0"
        data-testid="mobile-safety-strip"
      >
        <div className="flex items-center gap-1.5 text-text-2 flex-1">
          <WarningIcon className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
          <span className="leading-tight">
            Do not start, stop, or change medicine based on RxDiff. Confirm with a doctor or pharmacist.
          </span>
        </div>
        <span className="px-1.5 py-0.5 rounded-[2px] bg-panel-raised text-text-3 border border-line-dark uppercase text-[9px] font-bold shrink-0">
          SYNTHETIC DEMO
        </span>
      </div>

      {/* Main Workspace (Strictly fits inside 1440x900 with zero page scroll) */}
      <main className="no-print flex-1 min-h-0 flex flex-col max-w-[1440px] w-full mx-auto px-3 sm:px-4 py-2 sm:py-2.5 space-y-2 overflow-hidden">
        {/* Compact Entry Area: Title + Terse Case Selectors */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-line-dark shrink-0">
          <div>
            <h1 className="text-[16px] font-bold text-text-1 tracking-tight">
              Two lists. One safer conversation.
            </h1>
            <p className="text-[11.5px] text-text-2 mt-0.5">
              Deterministic verification between previous prescription and discharge lists.
            </p>
          </div>

          {/* Three Terse Case Selectors */}
          <div
            className="flex items-center gap-1.5 bg-chrome p-1 rounded-[4px] border border-line-dark shrink-0"
            role="tablist"
            aria-label="Bundled Demo Cases"
          >
            {[
              { id: 'case-a', label: 'A / Regimen changes' },
              { id: 'case-b', label: 'B / Omission safety' },
              { id: 'case-c', label: 'C / Alias duplicate' },
            ].map((c) => {
              const isSelected = selectedCase === c.id;
              return (
                <button
                  key={c.id}
                  id={`select-${c.id}`}
                  onClick={() => handleSelectCase(c.id as CaseKey)}
                  role="tab"
                  aria-selected={isSelected}
                  className={`min-h-[30px] px-2.5 py-1 text-[11px] font-mono rounded-[3px] transition-all ${
                    isSelected
                      ? 'bg-panel-raised text-white font-bold border border-line-active shadow-sm'
                      : 'text-text-3 hover:text-text-2 hover:bg-panel'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 34px Analysis Strip with 1px Solid Sky Line - Zero Gradients */}
        <div className="relative h-[34px] bg-panel rounded-[4px] border border-line-dark px-3 flex items-center justify-between gap-2 overflow-hidden select-none shrink-0">
          {/* 1px Solid Sky Line during animation - NO GRADIENT */}
          {isAnalyzing && (
            <div
              className="absolute inset-y-0 w-[1px] bg-active animate-scan-line pointer-events-none"
              aria-hidden="true"
            />
          )}

          {/* Stepper Pipeline */}
          <div className="flex items-center gap-1 sm:gap-2 text-[10.5px] font-mono">
            <span
              className={`${
                analyzingStep >= 0 ? 'text-active font-bold' : 'text-text-3'
              }`}
            >
              READ {analyzingStep > 0 && '✓'}
            </span>
            <span className="text-text-3">→</span>
            <span
              className={`${
                analyzingStep >= 1 ? 'text-active font-bold' : 'text-text-3'
              }`}
            >
              STRUCTURE {analyzingStep > 1 && '✓'}
            </span>
            <span className="text-text-3">→</span>
            <span
              className={`${
                analyzingStep >= 2 ? 'text-active font-bold' : 'text-text-3'
              }`}
            >
              MATCH {analyzingStep > 2 && '✓'}
            </span>
            <span className="text-text-3">→</span>
            <span
              className={`${
                analyzingStep >= 3 ? 'text-matched font-bold' : 'text-text-3'
              }`}
            >
              REVIEW
            </span>

            <span className="text-text-3 ml-2 pl-2 border-l border-line-dark hidden md:inline">
              Structured demo case
            </span>
          </div>

          {/* Real Summary Metric */}
          <div className="font-mono text-[11px] font-bold text-text-1 tracking-wider tabular-nums">
            {isAnalyzing ? (
              <span className="text-text-3 italic">Analyzing regimen...</span>
            ) : (
              <span>{presentationModel.summaryText}</span>
            )}
          </div>
        </div>

        {/* Reconciliation Canvas (31% BEFORE / 38% Spine / 31% AFTER) */}
        <ReconciliationCanvas model={presentationModel} />
      </main>

      {/* Dedicated Print Handoff Sheet */}
      <PrintHandoff model={presentationModel} />
    </div>
  );
}

export default App;
