import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WarningIcon } from './Icons.js';

interface StoryIntroProps {
  onSkip?: () => void;
}

interface SceneInfo {
  id: number;
  src: string;
  caption: string;
}

const SCENES: SceneInfo[] = [
  {
    id: 1,
    src: '/story/scene-1.mp4',
    caption: 'You leave the hospital with a new list of medicines.',
  },
  {
    id: 2,
    src: '/story/scene-2.mp4',
    caption: 'Two lists. The differences between them are easy to miss.',
  },
  {
    id: 3,
    src: '/story/scene-3.mp4',
    caption: 'RxDiff makes every difference visible - and shows you exactly where it came from.',
  },
];

export const StoryIntro: React.FC<StoryIntroProps> = ({ onSkip }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([null, null, null]);
  const mobileVideoRefs = useRef<(HTMLVideoElement | null)[]>([null, null, null]);
  const playedOnceRef = useRef<boolean[]>([false, false, false]);

  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [opacities, setOpacities] = useState<[number, number, number]>([1, 0, 0]);
  const [stageOpacity, setStageOpacity] = useState<number>(1);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });
  const [videoErrors, setVideoErrors] = useState<boolean[]>([false, false, false]);

  const lastUpdateTimeRef = useRef<number[]>([0, 0, 0]);
  const rafRef = useRef<number | null>(null);

  // Subscribe to prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  // 3-second safety timeout fallback: show paused frame 0 without blocking tool
  useEffect(() => {
    const timer = setTimeout(() => {
      videoRefs.current.forEach((video, index) => {
        if (video && video.readyState < 1) {
          // If video hasn't loaded even metadata within 3s, flag fallback
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
    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.scrollIntoView({ behavior: 'smooth' });
    }
  }, [onSkip]);

  // Desktop Scroll Scrub Controller (≥768px)
  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const totalHeight = rect.height - window.innerHeight;

        if (totalHeight <= 0) return;

        // Progress from 0 to 1 over the 320vh scroll
        const scrollOffset = -rect.top;
        const progress = Math.min(Math.max(scrollOffset / totalHeight, 0), 1);

        // Map progress to 3 equal segments: [0, 1/3], [1/3, 2/3], [2/3, 1]
        let currentIdx: number;
        let segmentProgress: number;

        if (progress < 1 / 3) {
          currentIdx = 0;
          segmentProgress = progress / (1 / 3);
        } else if (progress < 2 / 3) {
          currentIdx = 1;
          segmentProgress = (progress - 1 / 3) / (1 / 3);
        } else {
          currentIdx = 2;
          segmentProgress = (progress - 2 / 3) / (1 / 3);
        }

        setActiveSceneIndex(currentIdx);

        // Compute crossfades during outer 10% around boundaries
        const newOpacities: [number, number, number] = [0, 0, 0];

        if (currentIdx === 0) {
          if (segmentProgress > 0.9) {
            // Fading to scene 2
            const t = (segmentProgress - 0.9) / 0.1;
            newOpacities[0] = 1 - t;
            newOpacities[1] = t;
            newOpacities[2] = 0;
          } else {
            newOpacities[0] = 1;
            newOpacities[1] = 0;
            newOpacities[2] = 0;
          }
        } else if (currentIdx === 1) {
          if (segmentProgress < 0.1) {
            // Crossfading from scene 1
            const t = segmentProgress / 0.1;
            newOpacities[0] = 1 - t;
            newOpacities[1] = t;
            newOpacities[2] = 0;
          } else if (segmentProgress > 0.9) {
            // Fading to scene 3
            const t = (segmentProgress - 0.9) / 0.1;
            newOpacities[0] = 0;
            newOpacities[1] = 1 - t;
            newOpacities[2] = t;
          } else {
            newOpacities[0] = 0;
            newOpacities[1] = 1;
            newOpacities[2] = 0;
          }
        } else {
          // Scene 3
          if (segmentProgress < 0.1) {
            // Crossfading from scene 2
            const t = segmentProgress / 0.1;
            newOpacities[0] = 0;
            newOpacities[1] = 1 - t;
            newOpacities[2] = t;
          } else {
            newOpacities[0] = 0;
            newOpacities[1] = 0;
            newOpacities[2] = 1;
          }
        }

        setOpacities(newOpacities);

        // Near completion (>0.94 overall progress), fade stage into dashboard
        if (progress > 0.94) {
          const fadeStage = (1 - progress) / 0.06;
          setStageOpacity(Math.max(fadeStage, 0));
        } else {
          setStageOpacity(1);
        }

        // Scrub the active scene video with currentTime = segmentProgress * duration
        const activeVideo = videoRefs.current[currentIdx];
        if (activeVideo && activeVideo.duration && !isNaN(activeVideo.duration)) {
          const targetTime = segmentProgress * activeVideo.duration;
          // Update only when time changes by >40ms (0.04s)
          if (Math.abs(activeVideo.currentTime - targetTime) > 0.04) {
            activeVideo.currentTime = targetTime;
            lastUpdateTimeRef.current[currentIdx] = targetTime;
          }
        }

        // Hold scene 3's final frame when approaching the very end
        if (currentIdx === 2 && segmentProgress >= 0.99 && activeVideo && activeVideo.duration) {
          activeVideo.currentTime = activeVideo.duration;
        }

        // Scene preload progression: scenes 2/3 preload auto when near viewport
        if (progress > 0.15 && videoRefs.current[1] && videoRefs.current[1]?.preload !== 'auto') {
          videoRefs.current[1]!.preload = 'auto';
        }
        if (progress > 0.45 && videoRefs.current[2] && videoRefs.current[2]?.preload !== 'auto') {
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

  // Mobile (<768px) IntersectionObserver Play-Once Controller
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    if (window.innerWidth >= 768 || prefersReducedMotion) return;

    const observers: IntersectionObserver[] = [];

    mobileVideoRefs.current.forEach((video, idx) => {
      if (!video) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              if (!playedOnceRef.current[idx]) {
                playedOnceRef.current[idx] = true;
                video.play().catch(() => {
                  // Autoplay blocked fallback
                });
              }
            } else {
              video.pause();
            }
          });
        },
        { threshold: 0.5 }
      );

      observer.observe(video);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [prefersReducedMotion]);

  // Fallback for prefers-reduced-motion: No sticky, no scrub, no autoplay
  if (prefersReducedMotion) {
    return (
      <section
        ref={containerRef}
        className="no-print w-full bg-[#0A0D0F] text-[#F3F4F6] py-12 px-6"
        aria-label="RxDiff Visual Narrative Intro (Reduced Motion)"
      >
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <span className="font-serif text-[20px] text-white">RxDiff Story</span>
            <button
              onClick={handleSkip}
              className="px-4 py-2 rounded-[4px] bg-white text-[#1A1D20] text-[12px] font-sans font-medium hover:bg-[#F3F0E8] transition-all"
            >
              Go to medication comparison tool →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SCENES.map((scene, idx) => (
              <div key={scene.id} className="bg-[#141A1F] rounded-[6px] overflow-hidden border border-white/10 p-4 space-y-3">
                <div className="relative aspect-video w-full overflow-hidden rounded bg-black">
                  <video
                    src={scene.src}
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover origin-center"
                    style={{ transform: 'scale(1.14)' }}
                  />
                </div>
                <div className="font-mono text-[10px] text-white/50 uppercase tracking-widest">
                  Scene 0{idx + 1}
                </div>
                <p className="font-serif text-[15px] text-white/90 leading-snug">
                  {scene.caption}
                </p>
                {idx === 2 && (
                  <div className="pt-2 border-t border-white/10 flex items-start gap-1 text-[11px] font-sans text-white/70 leading-snug">
                    <WarningIcon className="w-3.5 h-3.5 text-[#E5A93C] shrink-0 mt-0.5" />
                    <span>
                      Do not start, stop, or change medicine based on RxDiff. Confirm every flagged item with a doctor or pharmacist.
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center pt-2">
            <button
              onClick={handleSkip}
              className="px-5 py-2.5 rounded-[4px] bg-[#2E6B56] hover:bg-[#255746] text-white text-[13px] font-sans font-medium transition-all"
            >
              Continue to RxDiff Workbench →
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      className="no-print relative w-full bg-[#0A0D0F] text-[#F3F4F6] select-none"
      aria-label="RxDiff Visual Narrative Intro"
    >
      {/* ========================================================================= */}
      {/* DESKTOP (≥768px): 320vh Wrapper with 100vh Sticky Stage                   */}
      {/* ========================================================================= */}
      <div className="hidden md:block relative h-[320vh]">
        {/* Sticky 100vh Viewport Stage */}
        <div
          className="sticky top-0 h-screen w-full overflow-hidden bg-[#0A0D0F] transition-opacity duration-300"
          style={{ opacity: stageOpacity }}
        >
          {/* Skip Story Button (Top-Right) */}
          <div className="absolute top-5 right-6 z-40">
            <button
              onClick={handleSkip}
              className="px-3.5 py-1.5 rounded-[4px] bg-black/50 hover:bg-black/80 text-[11.5px] font-sans font-medium text-white/90 hover:text-white border border-white/20 backdrop-blur-md transition-all active:translate-y-[1px] flex items-center gap-1.5 shadow-sm"
              title="Skip story and go directly to medication comparison tool"
            >
              <span>Skip story</span>
              <span className="text-white/60">→</span>
            </button>
          </div>

          {/* Three Video Layers with Scale(1.14) to Crop Generation Mark */}
          {SCENES.map((scene, idx) => {
            const isVisible = opacities[idx] > 0.01;
            const hasError = videoErrors[idx];

            return (
              <div
                key={scene.id}
                className="absolute inset-0 w-full h-full overflow-hidden transition-opacity duration-150"
                style={{
                  opacity: opacities[idx],
                  pointerEvents: isVisible ? 'auto' : 'none',
                }}
              >
                {!hasError ? (
                  <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
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
                  </div>
                ) : (
                  /* Fallback paused frame 0 on error / timeout */
                  <div className="w-full h-full bg-[#11161B] flex items-center justify-center text-[#75808B] text-sm">
                    <video
                      src={scene.src}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover origin-center"
                      style={{ transform: 'scale(1.14)' }}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Subtle Vignette Gradient Overlay */}
          <div
            className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/85 via-black/20 to-black/30 z-20"
            aria-hidden="true"
          />

          {/* Captions (Bottom-Left, Max 26ch) */}
          <div className="absolute bottom-10 left-8 sm:left-12 z-30 max-w-[26ch] pointer-events-none">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/50 mb-1.5">
              0{activeSceneIndex + 1} / 03
            </div>
            <p className="font-serif text-[clamp(22px,2.4vw,32px)] font-normal text-white leading-[1.25] tracking-tight drop-shadow-md">
              {SCENES[activeSceneIndex]?.caption}
            </p>

            {/* Restate Safety Warning on Scene 3 */}
            {activeSceneIndex === 2 && (
              <div className="mt-4 pt-3 border-t border-white/20 flex items-start gap-1.5 text-[11px] font-sans text-white/70 leading-snug">
                <WarningIcon className="w-3.5 h-3.5 text-[#E5A93C] shrink-0 mt-0.5" />
                <span>
                  Do not start, stop, or change medicine based on RxDiff. Confirm every flagged item with a doctor or pharmacist.
                </span>
              </div>
            )}
          </div>

          {/* Scroll Down Indication */}
          <div className="absolute bottom-6 right-8 z-30 pointer-events-none hidden lg:flex items-center gap-2 text-[11px] font-mono text-white/40 uppercase tracking-widest">
            <span>Scroll to explore</span>
            <span className="animate-bounce">↓</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE (<768px): Stacked Three 100vh Scenes with Auto-Play Once           */}
      {/* ========================================================================= */}
      <div className="md:hidden flex flex-col w-full">
        {/* Mobile Skip Button Bar */}
        <div className="sticky top-0 z-40 bg-[#0A0D0F]/90 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between border-b border-white/10">
          <span className="font-serif text-[15px] font-semibold text-white">RxDiff</span>
          <button
            onClick={handleSkip}
            className="px-3 py-1 rounded-[4px] bg-white/10 hover:bg-white/20 text-[11px] font-sans font-medium text-white border border-white/20 transition-all"
          >
            Skip to tool →
          </button>
        </div>

        {SCENES.map((scene, idx) => (
          <div
            key={`mobile-${scene.id}`}
            className="relative h-screen w-full overflow-hidden bg-[#0A0D0F] flex flex-col justify-end p-6 border-b border-white/10"
          >
            {/* Background Video (object-fit cover, center-framed, scaled 1.14) */}
            <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center">
              <video
                ref={(el) => {
                  mobileVideoRefs.current[idx] = el;
                }}
                src={scene.src}
                muted
                playsInline
                preload="metadata"
                loop={false}
                className="w-full h-full object-cover object-center origin-center"
                style={{ transform: 'scale(1.14)' }}
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none"
                aria-hidden="true"
              />
            </div>

            {/* Mobile Scene Caption (Bottom-Left, Max 26ch) */}
            <div className="relative z-20 max-w-[26ch] mb-6 pointer-events-none">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/60 block mb-1">
                Scene 0{scene.id}
              </span>
              <p className="font-serif text-[22px] font-normal text-white leading-snug tracking-tight">
                {scene.caption}
              </p>

              {idx === 2 && (
                <div className="mt-3 pt-2.5 border-t border-white/20 flex items-start gap-1.5 text-[10.5px] font-sans text-white/70 leading-snug">
                  <WarningIcon className="w-3.5 h-3.5 text-[#E5A93C] shrink-0 mt-0.5" />
                  <span>Confirm every difference with a doctor or pharmacist.</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

