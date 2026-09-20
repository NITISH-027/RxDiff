import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WarningIcon } from './Icons.js';

interface StoryIntroProps {
  onSkip?: () => void;
  onInspectEvidence?: () => void;
}

const TOTAL_FRAMES = 72;

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

function scheduleIdle(callback: () => void) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return (window as unknown as { requestIdleCallback: (cb: () => void, opts: { timeout: number }) => number })
      .requestIdleCallback(callback, { timeout: 2000 });
  }
  return setTimeout(callback, 60);
}

export const StoryIntro: React.FC<StoryIntroProps> = ({ onSkip, onInspectEvidence }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageViewportRef = useRef<HTMLDivElement | null>(null);

  // Canvas Refs for each scene sequence
  const canvas1Ref = useRef<HTMLCanvasElement | null>(null);
  const canvas2Ref = useRef<HTMLCanvasElement | null>(null);
  const canvas3Ref = useRef<HTMLCanvasElement | null>(null);

  // Animated DOM element refs (manipulated directly during scroll with zero React re-renders)
  const heroRef = useRef<HTMLDivElement | null>(null);
  const stageBRef = useRef<HTMLDivElement | null>(null);
  const diffCardRef = useRef<HTMLDivElement | null>(null);
  const questionRef = useRef<HTMLDivElement | null>(null);
  const connectorLeftPathRef = useRef<SVGPathElement | null>(null);
  const connectorRightPathRef = useRef<SVGPathElement | null>(null);
  const contextCopyRef = useRef<HTMLSpanElement | null>(null);
  const contextStepRef = useRef<HTMLSpanElement | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);

  // Frame Cache: Map<frameIndex, HTMLImageElement> for each scene
  const framesCache = useRef<{
    1: Map<number, HTMLImageElement>;
    2: Map<number, HTMLImageElement>;
    3: Map<number, HTMLImageElement>;
  }>({
    1: new Map(),
    2: new Map(),
    3: new Map(),
  });

  const lastDrawnFrameRef = useRef<{ 1: number; 2: number; 3: number }>({
    1: -1,
    2: -1,
    3: -1,
  });

  const activeSceneRef = useRef<1 | 2 | 3>(1);
  const rafRef = useRef<number | null>(null);

  const [initialFramesReady, setInitialFramesReady] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  // Subscribe to prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
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

  // Helper to draw image onto canvas with cover aspect ratio, capped scale, DPR capped at 1.5, and high quality smoothing
  const drawFrameCover = useCallback((canvas: HTMLCanvasElement, img: HTMLImageElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.5);
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    if (!displayWidth || !displayHeight) return;

    const targetWidth = Math.floor(displayWidth * dpr);
    const targetHeight = Math.floor(displayHeight * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    // High quality bicubic scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    if (!imgW || !imgH) return;

    // Capped cover scale (max 1.05x zoom over fit to prevent pixelation on tall/wide screens)
    const fitScale = Math.min(targetWidth / imgW, targetHeight / imgH);
    const coverScale = Math.max(targetWidth / imgW, targetHeight / imgH);
    const effectiveScale = Math.min(coverScale, fitScale * 1.05);

    const rW = Math.round(imgW * effectiveScale);
    const rH = Math.round(imgH * effectiveScale);
    const oX = Math.round((targetWidth - rW) / 2);
    const oY = Math.round((targetHeight - rH) / 2);

    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, oX, oY, rW, rH);
  }, []);

  // Helper to retrieve nearest already-loaded frame rather than blanking
  const getNearestLoadedFrame = useCallback((scene: 1 | 2 | 3, targetIndex: number): HTMLImageElement | null => {
    const map = framesCache.current[scene];
    if (map.has(targetIndex)) return map.get(targetIndex)!;

    let closestKey = -1;
    let minDiff = Infinity;

    map.forEach((_img, key) => {
      const diff = Math.abs(key - targetIndex);
      if (diff < minDiff) {
        minDiff = diff;
        closestKey = key;
      }
    });

    return closestKey !== -1 ? map.get(closestKey)! : null;
  }, []);

  // Load a single frame and cache it
  const loadFrame = useCallback((scene: 1 | 2 | 3, index: number, onLoaded?: (img: HTMLImageElement) => void) => {
    const map = framesCache.current[scene];
    if (map.has(index)) {
      if (onLoaded) onLoaded(map.get(index)!);
      return;
    }
    const img = new Image();
    img.src = `/story/scene-${scene}/ezgif-frame-${String(index + 1).padStart(3, '0')}.jpg`;
    img.onload = () => {
      map.set(index, img);
      if (onLoaded) onLoaded(img);
    };
  }, []);

  // Render a specific frame on the given scene's canvas
  const renderSceneFrame = useCallback((scene: 1 | 2 | 3, targetFrame: number) => {
    let canvas: HTMLCanvasElement | null = null;
    if (scene === 1) canvas = canvas1Ref.current;
    else if (scene === 2) canvas = canvas2Ref.current;
    else if (scene === 3) canvas = canvas3Ref.current;

    if (!canvas) return;

    const frameImg = getNearestLoadedFrame(scene, targetFrame);
    if (frameImg) {
      drawFrameCover(canvas, frameImg);
      lastDrawnFrameRef.current[scene] = targetFrame;
    } else {
      // Trigger load if not in cache
      loadFrame(scene, targetFrame, (img) => {
        if (canvas) drawFrameCover(canvas, img);
        lastDrawnFrameRef.current[scene] = targetFrame;
      });
    }
  }, [drawFrameCover, getNearestLoadedFrame, loadFrame]);

  // Initial Preloading Strategy (Desktop only):
  // 1. Load Frame 1 of Scene 1 immediately
  // 2. Preload next 8-12 nearby frames (frames 1 to 11)
  // 3. Complete initial 8 frames check to clear loading indicator
  // 4. Continue remaining frames during idle time using requestIdleCallback
  useEffect(() => {
    if (prefersReducedMotion || (typeof window !== 'undefined' && window.innerWidth < 768)) {
      return;
    }

    let loadedCount = 0;

    // Load Frame 1 immediately
    loadFrame(1, 0, (img) => {
      if (canvas1Ref.current) {
        drawFrameCover(canvas1Ref.current, img);
      }
      loadedCount++;
    });

    // Preload nearby frames 1 to 11
    for (let i = 1; i <= 11; i++) {
      loadFrame(1, i, () => {
        loadedCount++;
        if (loadedCount >= 8) {
          setInitialFramesReady(true);
        }
      });
    }

    // Continue remaining frames during idle time
    let idleIndex = 12;
    const scheduleNextIdleBatch = () => {
      if (idleIndex >= TOTAL_FRAMES) return;
      scheduleIdle(() => {
        const batchEnd = Math.min(idleIndex + 4, TOTAL_FRAMES);
        for (let i = idleIndex; i < batchEnd; i++) {
          loadFrame(1, i);
        }
        idleIndex = batchEnd;
        if (idleIndex < TOTAL_FRAMES) {
          scheduleNextIdleBatch();
        }
      });
    };

    scheduleNextIdleBatch();
  }, [drawFrameCover, loadFrame, prefersReducedMotion]);

  // ResizeObserver to handle canvas resizing without lag
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !stageViewportRef.current) return;

    const ro = new ResizeObserver(() => {
      const active = activeSceneRef.current;
      const lastFrame = Math.max(lastDrawnFrameRef.current[active], 0);
      renderSceneFrame(active, lastFrame);
    });

    ro.observe(stageViewportRef.current);
    return () => ro.disconnect();
  }, [renderSceneFrame]);

  // Single passive scroll listener and RAF loop with ZERO React re-renders during scroll
  useEffect(() => {
    if (prefersReducedMotion || (typeof window !== 'undefined' && window.innerWidth < 768)) {
      return;
    }

    const pathLength = 320;
    let scene2Preloaded = false;
    let scene3Preloaded = false;

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const totalHeight = rect.height - window.innerHeight;
        if (totalHeight <= 0) return;

        const scrollOffset = -rect.top;
        const progress = Math.min(Math.max(scrollOffset / totalHeight, 0), 1);

        // Preload upcoming scenes as progress nears
        if (progress > 0.15 && !scene2Preloaded) {
          scene2Preloaded = true;
          // Preload first 12 frames of scene 2
          for (let i = 0; i <= 11; i++) loadFrame(2, i);
          let s2Idx = 12;
          const idleS2 = () => {
            if (s2Idx >= TOTAL_FRAMES) return;
            scheduleIdle(() => {
              const end = Math.min(s2Idx + 4, TOTAL_FRAMES);
              for (let i = s2Idx; i < end; i++) loadFrame(2, i);
              s2Idx = end;
              if (s2Idx < TOTAL_FRAMES) idleS2();
            });
          };
          idleS2();
        }

        if (progress > 0.45 && !scene3Preloaded) {
          scene3Preloaded = true;
          // Preload first 12 frames of scene 3
          for (let i = 0; i <= 11; i++) loadFrame(3, i);
          let s3Idx = 12;
          const idleS3 = () => {
            if (s3Idx >= TOTAL_FRAMES) return;
            scheduleIdle(() => {
              const end = Math.min(s3Idx + 4, TOTAL_FRAMES);
              for (let i = s3Idx; i < end; i++) loadFrame(3, i);
              s3Idx = end;
              if (s3Idx < TOTAL_FRAMES) idleS3();
            });
          };
          idleS3();
        }

        // Timeline mapping
        // 0% - 20%: Scene 1 (Hero)
        // 20% - 64%: Scene 2 (Two lists & Metformin difference)
        // 64% - 100%: Scene 3 (Provenance link & Product Materializes)
        let activeScene: 1 | 2 | 3;
        let segmentProgress: number;

        if (progress < 0.20) {
          activeScene = 1;
          segmentProgress = progress / 0.20;
        } else if (progress < 0.64) {
          activeScene = 2;
          segmentProgress = (progress - 0.20) / 0.44;
        } else {
          activeScene = 3;
          segmentProgress = (progress - 0.64) / 0.36;
        }

        activeSceneRef.current = activeScene;
        const targetFrame = Math.round(Math.min(Math.max(segmentProgress, 0), 1) * (TOTAL_FRAMES - 1));

        // Draw only when target frame changes or canvas needs update
        if (lastDrawnFrameRef.current[activeScene] !== targetFrame) {
          renderSceneFrame(activeScene, targetFrame);
        }

        // 1. Canvas visibility toggling
        const materializeProgress = progress >= 0.84 ? Math.min((progress - 0.84) / 0.16, 1) : 0;
        if (canvas1Ref.current) {
          canvas1Ref.current.style.opacity = activeScene === 1 ? '1' : '0';
        }
        if (canvas2Ref.current) {
          canvas2Ref.current.style.opacity = activeScene === 2 ? '1' : '0';
        }
        if (canvas3Ref.current) {
          const c3Opacity = activeScene === 3 ? String((1 - materializeProgress) * 0.12) : '0';
          canvas3Ref.current.style.opacity = c3Opacity;
        }

        // 2. Stage A (Hero) opacity and transform
        if (heroRef.current) {
          const heroOpacity = progress <= 0.20 ? 1 - progress / 0.20 : 0;
          heroRef.current.style.opacity = String(heroOpacity);
          heroRef.current.style.transform = `translateY(${-progress * 40}px)`;
          heroRef.current.style.pointerEvents = heroOpacity > 0.05 ? 'auto' : 'none';
        }

        // 3. Stage B (3-column layout) opacity
        if (stageBRef.current) {
          const listsOpacity = progress >= 0.18 ? Math.min((progress - 0.18) / 0.08, 1) : 0.01;
          stageBRef.current.style.opacity = String(listsOpacity);
          stageBRef.current.style.pointerEvents = listsOpacity > 0.05 ? 'auto' : 'none';
        }

        // 4. Center difference card emergence
        if (diffCardRef.current) {
          const diffEmergence = progress >= 0.42 ? Math.min((progress - 0.42) / 0.12, 1) : 0.01;
          diffCardRef.current.style.opacity = String(diffEmergence);
          diffCardRef.current.style.transform = `scale(${0.92 + 0.08 * diffEmergence})`;
          diffCardRef.current.style.pointerEvents = diffEmergence > 0.05 ? 'auto' : 'none';
        }

        // 5. Neutral question opacity
        if (questionRef.current) {
          const questionOpacity = progress >= 0.72 ? Math.min((progress - 0.72) / 0.08, 1) : 0.01;
          questionRef.current.style.opacity = String(questionOpacity);
          questionRef.current.style.pointerEvents = questionOpacity > 0.05 ? 'auto' : 'none';
        }

        // 6. SVG provenance connector animation
        const connectorProgress = progress >= 0.64 ? Math.min((progress - 0.64) / 0.14, 1) : 0;
        if (connectorLeftPathRef.current) {
          const leftOffset = pathLength * (1 - Math.min(connectorProgress * 2, 1));
          connectorLeftPathRef.current.style.strokeDashoffset = String(leftOffset);
        }
        if (connectorRightPathRef.current) {
          const rightOffset = pathLength * (1 - Math.max((connectorProgress - 0.5) * 2, 0));
          connectorRightPathRef.current.style.strokeDashoffset = String(rightOffset);
        }

        // 7. Context Copy and Step text updates
        if (contextCopyRef.current && contextStepRef.current) {
          if (progress < 0.42) {
            contextCopyRef.current.textContent = 'Two lists can look almost the same.';
            contextStepRef.current.textContent = 'Step 01: Identification';
          } else if (progress < 0.84) {
            contextCopyRef.current.textContent = 'The difference lives between the documents.';
            contextStepRef.current.textContent = 'Step 02: Provenance Link';
          } else {
            contextCopyRef.current.textContent = 'See what changed. Know what to ask.';
            contextStepRef.current.textContent = 'Step 03: Clinical Review';
          }
        }

        // 8. Background warming (#0A0D0F -> #FAF8F5)
        if (stageContainerRef.current) {
          if (materializeProgress > 0.8) {
            stageContainerRef.current.style.backgroundColor = '#FAF8F5';
          } else if (materializeProgress > 0.3) {
            stageContainerRef.current.style.backgroundColor = '#161C20';
          } else {
            stageContainerRef.current.style.backgroundColor = '#0A0D0F';
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [loadFrame, prefersReducedMotion, renderSceneFrame]);

  // Fallback for prefers-reduced-motion
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
              <div className="aspect-video w-full overflow-hidden rounded bg-black mb-2">
                <img
                  src="/story/scene-1/ezgif-frame-001.jpg"
                  alt="Scene 01 frame"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="font-mono text-[10px] text-white/50 uppercase tracking-widest">
                Scene 01
              </div>
              <p className="font-serif text-[15px] text-white/90 leading-snug">
                You leave the hospital with a new list of medicines.
              </p>
            </div>
            <div className="bg-[#141A1F] rounded-[6px] border border-white/10 p-4 space-y-2">
              <div className="aspect-video w-full overflow-hidden rounded bg-black mb-2">
                <img
                  src="/story/scene-2/ezgif-frame-001.jpg"
                  alt="Scene 02 frame"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="font-mono text-[10px] text-white/50 uppercase tracking-widest">
                Scene 02
              </div>
              <p className="font-serif text-[15px] text-white/90 leading-snug">
                Two lists. The differences between them are easy to miss.
              </p>
            </div>
            <div className="bg-[#141A1F] rounded-[6px] border border-white/10 p-4 space-y-2">
              <div className="aspect-video w-full overflow-hidden rounded bg-black mb-2">
                <img
                  src="/story/scene-3/ezgif-frame-001.jpg"
                  alt="Scene 03 frame"
                  className="w-full h-full object-cover"
                />
              </div>
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
    >
      {/* ========================================================================= */}
      {/* DESKTOP (≥768px): 320vh Wrapper with 100vh Sticky Stage                   */}
      {/* ========================================================================= */}
      <div className="hidden md:block relative h-[320vh]">
        {/* Sticky 100vh Viewport Stage */}
        <div
          ref={stageContainerRef}
          className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between transition-colors duration-300 bg-[#0A0D0F]"
        >
          {/* Top Bar with Brand, Quiet Loading Indicator, Skip Link */}
          <div className="relative z-40 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-serif text-[18px] font-semibold tracking-tight text-white transition-colors duration-200">
                RxDiff
              </span>
              <span className="text-[11.5px] font-sans border-l border-white/20 pl-2.5 text-white/60 transition-colors duration-200">
                Medication reconciliation
              </span>
            </div>

            {/* Quiet Loading Indicator (only until first 8 frames are ready) */}
            {!initialFramesReady && (
              <div
                aria-label="Story loading status"
                className="px-2.5 py-1 rounded-[3px] bg-black/40 border border-white/10 text-[10px] font-mono text-white/50 tracking-wider flex items-center gap-1.5 backdrop-blur-xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
                <span>Preparing visual story...</span>
              </div>
            )}

            <button
              onClick={handleSkip}
              className="px-3.5 py-1.5 rounded-[4px] text-[11.5px] font-sans font-medium transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#3D5A4C] bg-black/50 hover:bg-black/80 text-white/90 hover:text-white border border-white/20 backdrop-blur-md"
              title="Skip story and go directly to medication comparison tool"
            >
              <span>Skip story</span>
              <span>→</span>
            </button>
          </div>

          {/* Canvas-Based FrameSequence Stage */}
          <div
            ref={stageViewportRef}
            className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
            aria-hidden="true"
          >
            {/* Scene 1 Sequence Canvas */}
            <canvas
              ref={canvas1Ref}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
              style={{ opacity: 1 }}
            />

            {/* Scene 2 Sequence Canvas */}
            <canvas
              ref={canvas2Ref}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
              style={{ opacity: 0 }}
            />

            {/* Scene 3 Sequence Canvas */}
            <canvas
              ref={canvas3Ref}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
              style={{ opacity: 0 }}
            />

            {/* Cinematic Radial Vignette to focus the eye and soften edge artifacts */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 50%, rgba(10, 13, 15, 0.15) 0%, rgba(10, 13, 15, 0.55) 65%, rgba(10, 13, 15, 0.92) 100%)',
              }}
            />

            {/* Static Cinematic Film Grain to break up JPEG banding and add filmic texture */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.035]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
              }}
            />
          </div>

          {/* STAGE A (0-20%): Hero Headline & Support */}
          <div
            ref={heroRef}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center px-6 transition-opacity duration-200"
            style={{
              opacity: 1,
              pointerEvents: 'auto',
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
            ref={stageBRef}
            className="relative z-30 flex-1 flex flex-col justify-center max-w-[1240px] w-full mx-auto px-6 transition-opacity duration-200"
            style={{
              opacity: 0.01,
              pointerEvents: 'none',
              willChange: 'transform, opacity',
            }}
          >
            {/* Context Copy Bar */}
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2 transition-colors duration-200">
              <span
                ref={contextCopyRef}
                className="font-serif text-[18px] tracking-tight text-[#EDEDED] transition-colors duration-200"
              >
                Two lists can look almost the same.
              </span>

              <span
                ref={contextStepRef}
                className="font-mono text-[11px] uppercase tracking-wider text-white/50 transition-colors duration-200"
              >
                Step 01: Identification
              </span>
            </div>

            {/* 3-Column Spatial Grid */}
            <div className="relative grid grid-cols-12 gap-6 items-center">
              {/* SVG Provenance Connectors Layer */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible"
                aria-hidden="true"
              >
                <g>
                  {/* Left connector: Left row [B1] right edge -> Center card left edge */}
                  <path
                    ref={connectorLeftPathRef}
                    d="M 280 88 C 340 88, 360 88, 410 88"
                    fill="none"
                    stroke="#2E6B56"
                    strokeWidth="2"
                    strokeDasharray={320}
                    strokeDashoffset={320}
                    strokeLinecap="round"
                    style={{ willChange: 'stroke-dashoffset' }}
                  />
                  {/* Right connector: Center card right edge -> Right row [D2] left edge */}
                  <path
                    ref={connectorRightPathRef}
                    d="M 830 88 C 880 88, 900 88, 960 88"
                    fill="none"
                    stroke="#2E6B56"
                    strokeWidth="2"
                    strokeDasharray={320}
                    strokeDashoffset={320}
                    strokeLinecap="round"
                    style={{ willChange: 'stroke-dashoffset' }}
                  />
                </g>
              </svg>

              {/* LEFT COLUMN: 01 Previous List */}
              <div className="col-span-4 p-4 rounded-[6px] border border-white/10 bg-[#0F1012]/85 transition-all duration-300">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#EDEDED]">
                    01 Previous Prescriptions
                  </span>
                  <span className="font-mono text-[10px] text-white/50">
                    Home List
                  </span>
                </div>

                <div className="space-y-2">
                  {PREVIOUS_SOURCE_LINES.map((line) => (
                    <div
                      key={line.id}
                      className={`p-2 rounded-[4px] border text-[11.5px] font-sans transition-all duration-200 ${
                        line.active
                          ? 'bg-[#2E6B56]/20 border-[#2E6B56]/50 text-white font-medium shadow-sm'
                          : 'bg-transparent border-transparent text-white/60'
                      }`}
                    >
                      <span className="font-mono text-[10px] font-bold mr-1.5 opacity-60">
                        [{line.id}]
                      </span>
                      <span>{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CENTER COLUMN: Emergent Review Difference Card */}
              <div className="col-span-4 flex flex-col justify-center">
                <div
                  ref={diffCardRef}
                  className="relative p-4 rounded-[6px] border border-[#B45309]/60 bg-[#0F1012]/95 transition-all duration-300"
                  style={{
                    opacity: 0.01,
                    pointerEvents: 'none',
                    borderLeftWidth: '4px',
                    borderLeftColor: '#B45309',
                    boxShadow: '0 0 20px rgba(180,83,9,0.15)',
                    willChange: 'transform, opacity',
                  }}
                >
                  {/* Status Tag & Action */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10.5px] font-bold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-[3px] border border-[#B45309]/30">
                      CHANGED
                    </span>
                    <span className="font-mono text-[10px] text-white/60">
                      CONFIRMATION NEEDED
                    </span>
                  </div>

                  {/* Medicine Name */}
                  <h3 className="font-serif text-[18px] font-semibold leading-snug text-white">
                    Metformin
                  </h3>

                  {/* Regimen Shift */}
                  <p className="font-sans text-[13px] font-medium mt-1 text-[#E2E8F0]">
                    Frequency: 1× daily → 2× daily
                  </p>

                  {/* Revealed Neutral Question after connector links */}
                  <div
                    ref={questionRef}
                    className="mt-3 pt-2.5 border-t border-white/10 text-[11.5px] font-sans leading-relaxed text-[#6EE7B7] transition-opacity duration-200"
                    style={{
                      opacity: 0.01,
                      pointerEvents: 'none',
                    }}
                  >
                    <span>Does this change match the intended discharge plan?</span>

                    <div className="mt-2 flex items-center justify-end">
                      <button
                        onClick={handleInspectClick}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-[2px] border bg-white/10 hover:bg-white/20 text-white border-white/20 transition-all"
                      >
                        Inspect exact evidence →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: 02 Discharge Regimen */}
              <div className="col-span-4 p-4 rounded-[6px] border border-white/10 bg-[#0F1012]/85 transition-all duration-300">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#EDEDED]">
                    02 Discharge Orders
                  </span>
                  <span className="font-mono text-[10px] text-white/50">
                    Hospital Orders
                  </span>
                </div>

                <div className="space-y-2">
                  {DISCHARGE_SOURCE_LINES.map((line) => (
                    <div
                      key={line.id}
                      className={`p-2 rounded-[4px] border text-[11.5px] font-sans transition-all duration-200 ${
                        line.active
                          ? 'bg-[#2E6B56]/20 border-[#2E6B56]/50 text-white font-medium shadow-sm'
                          : 'bg-transparent border-transparent text-white/60'
                      }`}
                    >
                      <span className="font-mono text-[10px] font-bold mr-1.5 opacity-60">
                        [{line.id}]
                      </span>
                      <span>{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Safety Disclaimers at Bottom of Stage */}
            <div className="mt-8 pt-3 border-t border-white/10 flex items-center justify-between text-[11.5px] font-sans text-white/70">
              <div className="flex items-center gap-2">
                <WarningIcon className="w-3.5 h-3.5 text-[#E5A93C] shrink-0" />
                <span>
                  Do not start, stop, or change medicine based on RxDiff. Confirm every flagged item with a doctor or pharmacist.
                </span>
              </div>

              <span className="font-mono text-[10.5px] tracking-wider uppercase opacity-70">
                Scroll to complete transformation ↓
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE (≤767px): Maximum 220vh Journey with static representative frames  */}
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

        {/* Mobile Story Scenes (max 220vh total, static representative frame 1 per scene) */}
        <div className="flex flex-col">
          {/* Scene 1 */}
          <div className="min-h-[70vh] p-6 flex flex-col justify-end relative border-b border-white/10 overflow-hidden">
            <img
              src="/story/scene-1/ezgif-frame-001.jpg"
              alt="Scene 01"
              className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />
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
          <div className="min-h-[70vh] p-6 flex flex-col justify-end relative border-b border-white/10 overflow-hidden">
            <img
              src="/story/scene-2/ezgif-frame-001.jpg"
              alt="Scene 02"
              className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />
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
          <div className="min-h-[70vh] p-6 flex flex-col justify-end relative overflow-hidden">
            <img
              src="/story/scene-3/ezgif-frame-001.jpg"
              alt="Scene 03"
              className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />
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

      {/* Non-loaded Fallback Video References to maintain backward contract if required */}
      <div className="hidden" aria-hidden="true">
        <video src="/story/scene-1.mp4" muted playsInline preload="none" />
        <video src="/story/scene-2.mp4" muted playsInline preload="none" />
        <video src="/story/scene-3.mp4" muted playsInline preload="none" />
      </div>
    </section>
  );
};
