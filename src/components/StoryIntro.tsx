import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WarningIcon } from './Icons.js';

interface StoryIntroProps {
  onSkip?: () => void;
  onInspectEvidence?: () => void;
}

// Case A preview lines for the cinematic journey
const PREVIOUS_SOURCE_LINES = [
  { id: 'B1', text: 'Metformin 500 mg tablet, 1 tablet once daily after dinner', active: true },
  { id: 'B2', text: 'Atorvastatin 10 mg tablet, 1 tablet at night', active: false },
  { id: 'B3', text: 'Amlodipine 5 mg tablet, 1 tablet once daily', active: false },
  { id: 'B4', text: 'Pantoprazole 40 mg tablet, 1 tablet before breakfast', active: false },
];

const DISCHARGE_SOURCE_LINES = [
  { id: 'D1', text: 'Amlodipine 5 mg tablet, 1 tablet once daily', active: false },
  { id: 'D2', text: 'CONTINUE Metformin 500 mg tablet, 1 tablet twice daily after meals', active: true },
  { id: 'D3', text: 'START Rosuvastatin 10 mg tablet, 1 tablet at night', active: false },
  { id: 'D4', text: 'STOP Atorvastatin 10 mg tablet', active: false },
  { id: 'D5', text: 'Pantoprazole 40 mg tablet, 1 tablet before breakfast', active: false },
];

export const StoryIntro: React.FC<StoryIntroProps> = ({ onSkip, onInspectEvidence }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([null, null, null]);
  const rafRef = useRef<number | null>(null);

  const [progress, setProgress] = useState<number>(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });
  const [videoErrors, setVideoErrors] = useState<boolean[]>([false, false, false]);

  // Subscribe to prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  // 3-second safety timeout fallback: show poster/dark field without blocking
  useEffect(() => {
    const timer = setTimeout(() => {
      videoRefs.current.forEach((video, index) => {
        if (video && video.readyState < 1) {
          setVideoErrors((prev) => {
            const copy = [...prev];
            copy[index] = true;
            return copy;
          });
        }
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleSkip = useCallback(() => {
    if (onSkip) {
      onSkip();
      return;
    }
    const target = document.getElementById('workspace') || document.getElementById('app');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, [onSkip]);

  const handleInspectClick = useCallback(() => {
    if (onInspectEvidence) {
      onInspectEvidence();
    }
    const target = document.getElementById('workspace') || document.getElementById('app');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, [onInspectEvidence]);

  // Scroll Progress Listener (Desktop: 320vh wrapper, Mobile: 220vh)
  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const totalHeight = rect.height - window.innerHeight;

        if (totalHeight <= 0) return;

        const scrollOffset = -rect.top;
        const currentProgress = Math.min(Math.max(scrollOffset / totalHeight, 0), 1);
        setProgress(currentProgress);

        // Scrub videos based on current progress
        // Scene 1: 0% - 20%
        // Scene 2: 20% - 64%
        // Scene 3: 64% - 100%
        let activeIdx: number;
        let segmentP: number;

        if (currentProgress < 0.20) {
          activeIdx = 0;
          segmentP = currentProgress / 0.20;
        } else if (currentProgress < 0.64) {
          activeIdx = 1;
          segmentP = (currentProgress - 0.20) / 0.44;
        } else {
          activeIdx = 2;
          segmentP = (currentProgress - 0.64) / 0.36;
        }

        const activeVideo = videoRefs.current[activeIdx];
        if (activeVideo && activeVideo.duration && !isNaN(activeVideo.duration)) {
          const targetTime = segmentP * activeVideo.duration;
          if (Math.abs(activeVideo.currentTime - targetTime) > 0.04) {
            activeVideo.currentTime = targetTime;
          }
        }

        // Preload video progression
        if (currentProgress > 0.15 && videoRefs.current[1] && videoRefs.current[1]?.preload !== 'auto') {
          videoRefs.current[1]!.preload = 'auto';
        }
        if (currentProgress > 0.45 && videoRefs.current[2] && videoRefs.current[2]?.preload !== 'auto') {
          videoRefs.current[2]!.preload = 'auto';
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [prefersReducedMotion]);

  // Derived timeline parameters
  // 0-20%: Hero typography
  const heroOpacity = progress <= 0.20 ? 1 - progress / 0.20 : 0;
  // 20-42%: Two lists appear
  const listsOpacity = progress >= 0.18 ? Math.min((progress - 0.18) / 0.10, 1) : 0;
  // 42-64%: Difference appears (central space widens, Metformin emerges)
  const diffEmergence = progress >= 0.42 ? Math.min((progress - 0.42) / 0.14, 1) : 0;
  // 64-84%: Provenance connector draws
  const connectorProgress = progress >= 0.64 ? Math.min((progress - 0.64) / 0.15, 1) : 0;
  // Connector reaches center around progress >= 0.72
  const questionOpacity = progress >= 0.72 ? Math.min((progress - 0.72) / 0.10, 1) : 0;
  // 84-100%: Product materializes (video fades, background warms to #F4F1E9)
  const materializeProgress = progress >= 0.84 ? Math.min((progress - 0.84) / 0.16, 1) : 0;

  // Background color interpolation: #0A0D0F -> #FAF8F5
  // At materializeProgress = 1, exactly matches workspace canvas #FAF8F5
  const videoOpacity = (1 - materializeProgress) * (progress >= 0.64 ? 0.10 : progress >= 0.42 ? 0.35 : 0.75);

  // SVG Connector dash animation values
  const pathLength = 320;
  const leftDashOffset = pathLength * (1 - Math.min(connectorProgress * 2, 1));
  const rightDashOffset = pathLength * (1 - Math.max((connectorProgress - 0.5) * 2, 0));

  // Reduced Motion Fallback
  if (prefersReducedMotion) {
    return (
      <section
        ref={containerRef}
        className="no-print w-full bg-[#0A0D0F] text-[#F3F4F6] py-12 px-6"
        aria-label="RxDiff Visual Narrative Intro (Reduced Motion)"
      >
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="font-serif text-[22px] text-white font-medium block">
                The important changes can hide between two lists.
              </span>
              <span className="text-[13px] text-white/70 font-sans mt-1 block">
                RxDiff reveals what changed and links every flag back to its source.
              </span>
            </div>
            <button
              onClick={handleSkip}
              className="px-4 py-2 rounded-[4px] bg-white text-[#1A1D20] text-[12px] font-sans font-medium hover:bg-[#F3F0E8] transition-all shrink-0"
            >
              Open medication comparison →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#141A1F] rounded-[6px] border border-white/10 p-4 space-y-2">
              <div className="font-mono text-[10px] text-white/50 uppercase tracking-widest">
                Scene 01
              </div>
              <p className="font-serif text-[15px] text-white/90 leading-snug">
                You leave the hospital with a new list of medicines.
              </p>
            </div>
            <div className="bg-[#141A1F] rounded-[6px] border border-white/10 p-4 space-y-2">
              <div className="font-mono text-[10px] text-white/50 uppercase tracking-widest">
                Scene 02
              </div>
              <p className="font-serif text-[15px] text-white/90 leading-snug">
                Two lists. The differences between them are easy to miss.
              </p>
            </div>
            <div className="bg-[#141A1F] rounded-[6px] border border-white/10 p-4 space-y-2">
              <div className="font-mono text-[10px] text-white/50 uppercase tracking-widest">
                Scene 03
              </div>
              <p className="font-serif text-[15px] text-white/90 leading-snug">
                RxDiff makes every difference visible - and shows you exactly where it came from.
              </p>
              <div className="pt-2 border-t border-white/10 flex items-start gap-1 text-[11px] font-sans text-white/70 leading-snug">
                <WarningIcon className="w-3.5 h-3.5 text-[#E5A93C] shrink-0 mt-0.5" />
                <span>Confirm every difference with a doctor or pharmacist.</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center pt-2">
            <button
              onClick={handleSkip}
              className="px-5 py-2.5 rounded-[4px] bg-[#2E6B56] hover:bg-[#255746] text-white text-[13px] font-sans font-medium transition-all"
            >
              Open medication comparison →
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      className="no-print relative w-full select-none"
      aria-label="RxDiff Visual Narrative Intro"
      style={{
        backgroundColor: materializeProgress > 0 ? '#FAF8F5' : '#0A0D0F',
      }}
    >
      {/* ========================================================================= */}
      {/* DESKTOP (≥768px): 320vh Wrapper with 100vh Sticky Stage                   */}
      {/* ========================================================================= */}
      <div className="hidden md:block relative h-[320vh]">
        {/* Sticky 100vh Viewport Stage */}
        <div
          className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between"
          style={{
            backgroundColor:
              materializeProgress > 0.8
                ? '#FAF8F5'
                : materializeProgress > 0.3
                  ? '#161C20'
                  : '#0A0D0F',
          }}
        >
          {/* Top Bar with Brand, Skip Story Link to #workspace */}
          <div className="relative z-40 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`font-serif text-[18px] font-semibold tracking-tight transition-colors duration-200 ${
                  materializeProgress > 0.6 ? 'text-[#1A1D20]' : 'text-white'
                }`}
              >
                RxDiff
              </span>
              <span
                className={`text-[11.5px] font-sans border-l pl-2.5 transition-colors duration-200 ${
                  materializeProgress > 0.6
                    ? 'border-[#E5E0D8] text-[#75808B]'
                    : 'border-white/20 text-white/60'
                }`}
              >
                Medication reconciliation
              </span>
            </div>

            <button
              onClick={handleSkip}
              className={`px-3.5 py-1.5 rounded-[4px] text-[11.5px] font-sans font-medium transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#3D5A4C] ${
                materializeProgress > 0.6
                  ? 'bg-white text-[#1A1D20] border border-[#E5E0D8] hover:bg-[#F5F2EB]'
                  : 'bg-black/50 hover:bg-black/80 text-white/90 hover:text-white border border-white/20 backdrop-blur-md'
              }`}
              title="Skip story and go directly to medication comparison tool"
            >
              <span>Skip story</span>
              <span>→</span>
            </button>
          </div>

          {/* Background Video Layers */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden transition-opacity duration-300"
            style={{ opacity: videoOpacity }}
            aria-hidden="true"
          >
            {[
              { id: 1, src: '/story/scene-1.mp4' },
              { id: 2, src: '/story/scene-2.mp4' },
              { id: 3, src: '/story/scene-3.mp4' },
            ].map((scene, idx) => {
              const isCurrent =
                (idx === 0 && progress < 0.20) ||
                (idx === 1 && progress >= 0.20 && progress < 0.64) ||
                (idx === 2 && progress >= 0.64);

              return (
                <div
                  key={scene.id}
                  className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-300 ${
                    isCurrent ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {!videoErrors[idx] ? (
                    <video
                      ref={(el) => {
                        videoRefs.current[idx] = el;
                      }}
                      src={scene.src}
                      muted
                      playsInline
                      preload={idx === 0 ? 'auto' : 'metadata'}
                      onError={() => {
                        setVideoErrors((prev) => {
                          const copy = [...prev];
                          copy[idx] = true;
                          return copy;
                        });
                      }}
                      className="w-full h-full object-cover origin-center"
                      style={{ transform: 'scale(1.14)' }}
                    />
                  ) : (
                    <div className="w-full h-full bg-[#0A0D0F]" />
                  )}
                </div>
              );
            })}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
          </div>

          {/* STAGE A (0-20%): Hero Headline & Support */}
          <div
            className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center px-6 transition-opacity duration-200"
            style={{
              opacity: heroOpacity,
              pointerEvents: heroOpacity > 0.05 ? 'auto' : 'none',
              willChange: 'opacity, transform',
            }}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#38BDF8] bg-[#38BDF8]/10 px-2.5 py-1 rounded-[3px] border border-[#38BDF8]/20 mb-3">
              Clinical Evidence Transformation
            </span>
            <h1 className="font-serif text-[clamp(28px,3.8vw,48px)] font-normal text-white max-w-[760px] leading-[1.15] tracking-tight">
              The important changes can hide between two lists.
            </h1>
            <p className="font-sans text-[clamp(14px,1.5vw,17px)] text-white/75 mt-3 max-w-[560px] leading-relaxed">
              RxDiff reveals what changed and links every flag back to its source.
            </p>
          </div>

          {/* STAGE B, C, D (20-100%): The 3-Column Materialization Stage */}
          <div
            className="relative z-30 flex-1 flex flex-col justify-center max-w-[1240px] w-full mx-auto px-6 transition-opacity duration-200"
            style={{
              opacity: progress >= 0.18 ? listsOpacity : 0.01,
              pointerEvents: listsOpacity > 0.05 ? 'auto' : 'none',
              willChange: 'transform, opacity',
            }}
          >
              {/* Context Copy Bar */}
              <div className="flex items-center justify-between mb-4 border-b pb-2 transition-colors duration-200"
                style={{
                  borderColor: materializeProgress > 0.6 ? '#E5E0D8' : 'rgba(255,255,255,0.12)',
                }}
              >
                <span
                  className="font-serif text-[18px] tracking-tight transition-colors duration-200"
                  style={{
                    color: materializeProgress > 0.6 ? '#1A1D20' : '#EDEDED',
                  }}
                >
                  {progress < 0.42
                    ? 'Two lists can look almost the same.'
                    : progress < 0.84
                      ? 'The difference lives between the documents.'
                      : 'See what changed. Know what to ask.'}
                </span>

                <span
                  className="font-mono text-[11px] uppercase tracking-wider transition-colors duration-200"
                  style={{
                    color: materializeProgress > 0.6 ? '#75808B' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {progress < 0.64
                    ? 'Step 01: Identification'
                    : progress < 0.84
                      ? 'Step 02: Provenance Link'
                      : 'Step 03: Clinical Review'}
                </span>
              </div>

              {/* 3-Column Spatial Grid */}
              <div className="relative grid grid-cols-12 gap-6 items-center">
                {/* SVG Provenance Connectors Layer */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible"
                  aria-hidden="true"
                >
                  {connectorProgress > 0.05 && (
                    <g>
                      {/* Left connector: Left row [B1] right edge -> Center card left edge */}
                      <path
                        d="M 280 88 C 340 88, 360 88, 410 88"
                        fill="none"
                        stroke="#2E6B56"
                        strokeWidth="2"
                        strokeDasharray={pathLength}
                        strokeDashoffset={leftDashOffset}
                        strokeLinecap="round"
                      />
                      {/* Right connector: Center card right edge -> Right row [D2] left edge */}
                      <path
                        d="M 830 88 C 880 88, 900 88, 960 88"
                        fill="none"
                        stroke="#2E6B56"
                        strokeWidth="2"
                        strokeDasharray={pathLength}
                        strokeDashoffset={rightDashOffset}
                        strokeLinecap="round"
                      />
                    </g>
                  )}
                </svg>

                {/* LEFT COLUMN: 01 Previous List */}
                <div
                  className="col-span-4 p-4 rounded-[6px] border transition-all duration-300"
                  style={{
                    backgroundColor:
                      materializeProgress > 0.6 ? '#FFFFFF' : 'rgba(15,16,18,0.85)',
                    borderColor:
                      materializeProgress > 0.6 ? '#E5E0D8' : 'rgba(255,255,255,0.1)',
                    boxShadow:
                      materializeProgress > 0.6 ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b"
                    style={{
                      borderColor: materializeProgress > 0.6 ? '#E5E0D8' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <span
                      className="font-mono text-[11px] font-semibold uppercase tracking-wider"
                      style={{
                        color: materializeProgress > 0.6 ? '#1A1D20' : '#EDEDED',
                      }}
                    >
                      01 Previous Prescriptions
                    </span>
                    <span
                      className="font-mono text-[10px]"
                      style={{
                        color: materializeProgress > 0.6 ? '#75808B' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      Home List
                    </span>
                  </div>

                  <div className="space-y-2">
                    {PREVIOUS_SOURCE_LINES.map((line) => {
                      const isHighlighted = line.active && progress >= 0.42;
                      return (
                        <div
                          key={line.id}
                          className={`p-2 rounded-[4px] border text-[11.5px] font-sans transition-all duration-200 ${
                            isHighlighted
                              ? materializeProgress > 0.6
                                ? 'bg-[#E8EFEA] border-[#2E6B56]/30 text-[#1A1D20] font-medium'
                                : 'bg-[#2E6B56]/20 border-[#2E6B56]/50 text-white font-medium shadow-sm'
                              : materializeProgress > 0.6
                                ? 'bg-[#FAF8F5]/60 border-[#E5E0D8] text-[#48525B]'
                                : 'bg-transparent border-transparent text-white/60'
                          }`}
                        >
                          <span className="font-mono text-[10px] font-bold mr-1.5 opacity-60">
                            [{line.id}]
                          </span>
                          <span>{line.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CENTER COLUMN: Emergent Review Difference Card */}
                <div className="col-span-4 flex flex-col justify-center">
                  <div
                    className="relative p-4 rounded-[6px] border transition-all duration-300"
                    style={{
                      opacity: progress >= 0.42 ? diffEmergence : 0.01,
                      pointerEvents: diffEmergence > 0.05 ? 'auto' : 'none',
                      backgroundColor:
                        materializeProgress > 0.6 ? '#FFFFFF' : 'rgba(15,16,18,0.92)',
                      borderColor:
                        materializeProgress > 0.6 ? '#B45309' : 'rgba(180,83,9,0.6)',
                      borderLeftWidth: '4px',
                      borderLeftColor: '#B45309',
                      boxShadow:
                        materializeProgress > 0.6
                          ? '0 4px 12px rgba(0,0,0,0.06)'
                          : '0 0 20px rgba(180,83,9,0.15)',
                      willChange: 'transform, opacity',
                    }}
                  >
                    {/* Status Tag & Action */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10.5px] font-bold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-[3px] border border-[#B45309]/30">
                        CHANGED
                      </span>
                      <span
                        className="font-mono text-[10px]"
                        style={{
                          color: materializeProgress > 0.6 ? '#75808B' : 'rgba(255,255,255,0.6)',
                        }}
                      >
                        CONFIRMATION NEEDED
                      </span>
                    </div>

                    {/* Medicine Name */}
                    <h3
                      className="font-serif text-[18px] font-semibold leading-snug"
                      style={{
                        color: materializeProgress > 0.6 ? '#1A1D20' : '#FFFFFF',
                      }}
                    >
                      Metformin
                    </h3>

                    {/* Regimen Shift */}
                    <p
                      className="font-sans text-[13px] font-medium mt-1"
                      style={{
                        color: materializeProgress > 0.6 ? '#48525B' : '#E2E8F0',
                      }}
                    >
                      Frequency: 1× daily → 2× daily
                    </p>

                    {/* Revealed Neutral Question after connector links */}
                    <div
                      className="mt-3 pt-2.5 border-t text-[11.5px] font-sans leading-relaxed transition-opacity duration-200"
                      style={{
                        opacity: progress >= 0.72 ? questionOpacity : 0.01,
                        pointerEvents: questionOpacity > 0.05 ? 'auto' : 'none',
                        borderColor:
                          materializeProgress > 0.6 ? '#E5E0D8' : 'rgba(255,255,255,0.1)',
                        color: materializeProgress > 0.6 ? '#2E6B56' : '#6EE7B7',
                      }}
                    >
                      <span>Does this change match the intended discharge plan?</span>

                      <div className="mt-2 flex items-center justify-end">
                        <button
                          onClick={handleInspectClick}
                          className={`text-[11px] font-mono px-2 py-0.5 rounded-[2px] border transition-all ${
                            materializeProgress > 0.6
                              ? 'bg-[#FAF8F5] hover:bg-[#EDE8DF] text-[#1A1D20] border-[#E5E0D8]'
                              : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                          }`}
                        >
                          Inspect exact evidence →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: 02 Discharge Regimen */}
                <div
                  className="col-span-4 p-4 rounded-[6px] border transition-all duration-300"
                  style={{
                    backgroundColor:
                      materializeProgress > 0.6 ? '#FFFFFF' : 'rgba(15,16,18,0.85)',
                    borderColor:
                      materializeProgress > 0.6 ? '#E5E0D8' : 'rgba(255,255,255,0.1)',
                    boxShadow:
                      materializeProgress > 0.6 ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b"
                    style={{
                      borderColor: materializeProgress > 0.6 ? '#E5E0D8' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <span
                      className="font-mono text-[11px] font-semibold uppercase tracking-wider"
                      style={{
                        color: materializeProgress > 0.6 ? '#1A1D20' : '#EDEDED',
                      }}
                    >
                      02 Discharge Orders
                    </span>
                    <span
                      className="font-mono text-[10px]"
                      style={{
                        color: materializeProgress > 0.6 ? '#75808B' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      Hospital Orders
                    </span>
                  </div>

                  <div className="space-y-2">
                    {DISCHARGE_SOURCE_LINES.map((line) => {
                      const isHighlighted = line.active && progress >= 0.42;
                      return (
                        <div
                          key={line.id}
                          className={`p-2 rounded-[4px] border text-[11.5px] font-sans transition-all duration-200 ${
                            isHighlighted
                              ? materializeProgress > 0.6
                                ? 'bg-[#E8EFEA] border-[#2E6B56]/30 text-[#1A1D20] font-medium'
                                : 'bg-[#2E6B56]/20 border-[#2E6B56]/50 text-white font-medium shadow-sm'
                              : materializeProgress > 0.6
                                ? 'bg-[#FAF8F5]/60 border-[#E5E0D8] text-[#48525B]'
                                : 'bg-transparent border-transparent text-white/60'
                          }`}
                        >
                          <span className="font-mono text-[10px] font-bold mr-1.5 opacity-60">
                            [{line.id}]
                          </span>
                          <span>{line.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Safety Disclaimers & Captions at Bottom of Stage */}
              <div className="mt-8 pt-3 border-t flex items-center justify-between text-[11.5px] font-sans transition-colors duration-200"
                style={{
                  borderColor: materializeProgress > 0.6 ? '#E5E0D8' : 'rgba(255,255,255,0.1)',
                  color: materializeProgress > 0.6 ? '#48525B' : 'rgba(255,255,255,0.7)',
                }}
              >
                <div className="flex items-center gap-2">
                  <WarningIcon className="w-3.5 h-3.5 text-[#E5A93C] shrink-0" />
                  <span>
                    Do not start, stop, or change medicine based on RxDiff. Confirm every flagged item with a doctor or pharmacist.
                  </span>
                </div>

                <span className="font-mono text-[10.5px] tracking-wider uppercase opacity-70">
                  {materializeProgress > 0.8 ? 'Interactive Workspace Active' : 'Scroll to complete transformation ↓'}
                </span>
              </div>
            </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE (≤767px): Maximum 220vh Journey with stacked scenes                 */}
      {/* ========================================================================= */}
      <div className="md:hidden flex flex-col w-full bg-[#0A0D0F]">
        {/* Sticky Mobile Bar */}
        <div className="sticky top-0 z-40 bg-[#0A0D0F]/95 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between border-b border-white/10">
          <span className="font-serif text-[16px] font-semibold text-white">RxDiff</span>
          <button
            onClick={handleSkip}
            className="px-3 py-1.5 rounded-[4px] bg-white/10 hover:bg-white/20 text-[11.5px] font-sans font-medium text-white border border-white/20 min-h-[44px] flex items-center"
          >
            Skip to tool →
          </button>
        </div>

        {/* Mobile Story Scenes (max 220vh total) */}
        <div className="flex flex-col">
          {/* Scene 1 */}
          <div className="min-h-[70vh] p-6 flex flex-col justify-end bg-gradient-to-t from-black via-black/50 to-transparent relative border-b border-white/10">
            <div className="relative z-10 max-w-[26ch]">
              <span className="font-mono text-[10px] text-white/60 uppercase tracking-widest block mb-1">
                Scene 01
              </span>
              <h2 className="font-serif text-[clamp(20px,6vw,32px)] font-normal text-white leading-snug">
                You leave the hospital with a new list of medicines.
              </h2>
            </div>
          </div>

          {/* Scene 2 */}
          <div className="min-h-[70vh] p-6 flex flex-col justify-end bg-gradient-to-t from-black via-black/50 to-transparent relative border-b border-white/10">
            <div className="relative z-10 max-w-[26ch]">
              <span className="font-mono text-[10px] text-white/60 uppercase tracking-widest block mb-1">
                Scene 02
              </span>
              <h2 className="font-serif text-[clamp(20px,6vw,32px)] font-normal text-white leading-snug">
                Two lists. The differences between them are easy to miss.
              </h2>
            </div>
          </div>

          {/* Scene 3 & Materialize Call */}
          <div className="min-h-[70vh] p-6 flex flex-col justify-end bg-gradient-to-t from-black via-black/50 to-transparent relative">
            <div className="relative z-10 max-w-[26ch] space-y-3">
              <span className="font-mono text-[10px] text-white/60 uppercase tracking-widest block mb-1">
                Scene 03
              </span>
              <h2 className="font-serif text-[clamp(20px,6vw,32px)] font-normal text-white leading-snug">
                RxDiff makes every difference visible - and shows you exactly where it came from.
              </h2>
              <div className="pt-2 border-t border-white/20 flex items-start gap-1 text-[11px] font-sans text-white/70">
                <WarningIcon className="w-3.5 h-3.5 text-[#E5A93C] shrink-0 mt-0.5" />
                <span>Confirm every difference with a doctor or pharmacist.</span>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSkip}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-[4px] bg-[#2E6B56] text-white text-[13px] font-sans font-medium text-center"
                >
                  Enter medication comparison →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
