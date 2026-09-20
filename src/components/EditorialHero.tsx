import React, { useState, useRef } from 'react';
import { ArrowRightIcon, PlusIcon, WarningIcon } from './Icons.js';

interface EditorialHeroProps {
  onEnterWorkspace: () => void;
  onGenerateDiff: () => void;
  beforeFile: File | null;
  afterFile: File | null;
  onSelectBeforeFile: (file: File) => void;
  onSelectAfterFile: (file: File) => void;
}

export const EditorialHero: React.FC<EditorialHeroProps> = ({
  onEnterWorkspace,
  onGenerateDiff,
  beforeFile,
  afterFile,
  onSelectBeforeFile,
  onSelectAfterFile,
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const handleBeforeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onSelectBeforeFile(f);
  };

  const handleAfterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onSelectAfterFile(f);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0D0F] selection:bg-emerald-900 selection:text-white flex flex-col justify-between">
      {/* 1. CINEMATIC VIDEO CANVAS */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-[115%] h-[115%] object-cover -translate-x-[7.5%] -translate-y-[7.5%] opacity-75"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260329_050842_be71947f-f16e-4a14-810c-06e83d23ddb5.mp4"
        />
        {/* Harmonizing atmospheric color wash */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0D0F]/70 via-[#0A0D0F]/45 to-[#0A0D0F]/90 mix-blend-multiply" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#0A0D0F]/40 to-[#0A0D0F]/80" />
      </div>

      {/* 2. MINIMALIST EDITORIAL NAV */}
      <header className="relative z-50 flex items-center justify-between px-6 sm:px-12 py-7 max-w-[1440px] mx-auto w-full text-white">
        <div className="flex items-center gap-3">
          <div className="text-xl tracking-[0.16em] uppercase font-sans font-light">
            Rx<span className="font-semibold">Diff</span>
          </div>
          <span className="hidden sm:inline-block text-[11px] tracking-[0.18em] uppercase text-white/50 border-l border-white/20 pl-3">
            Clinical Evidence Light Table
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onEnterWorkspace}
            className="text-xs sm:text-sm font-sans tracking-[0.14em] uppercase border-b border-white/40 pb-1 text-white hover:text-emerald-300 hover:border-emerald-300 transition-colors duration-300 active:translate-y-[1px]"
          >
            Enter Workspace →
          </button>
        </div>
      </header>

      {/* Hidden file inputs */}
      <input
        ref={beforeInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleBeforeChange}
        className="hidden"
        aria-label="Upload prior medicines image"
      />
      <input
        ref={afterInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleAfterChange}
        className="hidden"
        aria-label="Upload discharge list image"
      />

      {/* 3. ART DIRECTED HERO CENTERPIECE */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-4 pb-16 my-auto">
        <div className="font-sans text-[11px] sm:text-[12px] uppercase tracking-[0.24em] text-emerald-300/85 mb-3">
          Medication reconciliation, with evidence.
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-[5.25rem] leading-[1.08] text-white tracking-tight drop-shadow-sm font-sans font-light mb-8 max-w-4xl">
          Two lists. <br />
          <span className="font-serif italic font-normal tracking-normal text-emerald-100">
            One safer conversation.
          </span>
        </h1>

        {/* 4. THE GLASS CANVAS (Upload Module) */}
        <div className="w-full max-w-2xl bg-white/[0.08] backdrop-blur-3xl saturate-[1.15] border border-white/[0.18] rounded-[2rem] p-2.5 sm:p-3.5 shadow-2xl shadow-black/40 transition-transform duration-500 hover:scale-[1.008]">
          <div className="bg-white/[0.42] rounded-[1.5rem] p-6 sm:p-8 backdrop-blur-md text-left">
            <p className="font-sans text-emerald-950/85 text-xs sm:text-sm tracking-wider uppercase mb-5 text-center font-semibold">
              Reconcile your prescriptions
            </p>

            {/* Dual Upload Modules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 relative">
              {/* Connector line between the two boxes */}
              <div
                className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-[1px] bg-emerald-950/20 z-10"
                aria-hidden="true"
              />

              {/* Left Upload: Prior Medicines */}
              <button
                type="button"
                onClick={() => beforeInputRef.current?.click()}
                className="group relative overflow-hidden bg-white/60 hover:bg-white/90 border border-emerald-950/15 rounded-2xl p-5 text-left transition-all duration-300 min-h-[120px] flex flex-col justify-between shadow-sm cursor-pointer"
              >
                <span className="font-serif italic text-emerald-950/60 text-lg group-hover:text-emerald-950 transition-colors">
                  01.
                </span>
                <div>
                  <span className="block font-sans font-semibold text-emerald-950 text-sm">
                    {beforeFile ? beforeFile.name : 'Prior Medicines'}
                  </span>
                  <span className="block font-sans font-light text-emerald-950/70 text-xs mt-0.5">
                    {beforeFile ? `${(beforeFile.size / 1024).toFixed(1)} KB` : 'Upload image list'}
                  </span>
                </div>
                <PlusIcon className="absolute top-5 right-5 w-4 h-4 text-emerald-950/40 group-hover:text-emerald-950 transition-colors" />
              </button>

              {/* Right Upload: Discharge List */}
              <button
                type="button"
                onClick={() => afterInputRef.current?.click()}
                className="group relative overflow-hidden bg-white/60 hover:bg-white/90 border border-emerald-950/15 rounded-2xl p-5 text-left transition-all duration-300 min-h-[120px] flex flex-col justify-between shadow-sm cursor-pointer"
              >
                <span className="font-serif italic text-emerald-950/60 text-lg group-hover:text-emerald-950 transition-colors">
                  02.
                </span>
                <div>
                  <span className="block font-sans font-semibold text-emerald-950 text-sm">
                    {afterFile ? afterFile.name : 'Discharge List'}
                  </span>
                  <span className="block font-sans font-light text-emerald-950/70 text-xs mt-0.5">
                    {afterFile ? `${(afterFile.size / 1024).toFixed(1)} KB` : 'Upload image list'}
                  </span>
                </div>
                <PlusIcon className="absolute top-5 right-5 w-4 h-4 text-emerald-950/40 group-hover:text-emerald-950 transition-colors" />
              </button>
            </div>

            {/* Execute Button */}
            <button
              type="button"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onClick={onGenerateDiff}
              className="w-full mt-2 bg-emerald-950 hover:bg-emerald-900 text-white rounded-xl py-3.5 sm:py-4 px-6 flex items-center justify-between group overflow-hidden relative transition-colors duration-300 shadow-md cursor-pointer"
            >
              <div className="absolute inset-0 bg-black/25 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]" />
              <span className="relative z-10 font-sans text-xs sm:text-sm tracking-[0.16em] uppercase font-semibold">
                Generate Diff Map
              </span>
              <ArrowRightIcon
                className={`relative z-10 w-4 h-4 transition-transform duration-300 ${
                  isHovering ? 'translate-x-1.5' : ''
                }`}
              />
            </button>

            {/* Quick Link to Synthetic Demo Cases */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={onEnterWorkspace}
                className="font-sans text-xs text-emerald-950/75 hover:text-emerald-950 underline underline-offset-4 tracking-wide transition-colors"
              >
                Or explore 3 bundled synthetic clinical cases →
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 5. Persistent Safety Footer Strip */}
      <footer className="relative z-10 py-3 px-6 text-center text-[11px] font-sans text-white/50 border-t border-white/10 bg-[#0A0D0F]/60 backdrop-blur-sm flex items-center justify-center gap-1.5">
        <WarningIcon className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
        <span>
          Do not start, stop, or change medicine based on RxDiff. Confirm every flagged item with a doctor or pharmacist.
        </span>
      </footer>
    </div>
  );
};
