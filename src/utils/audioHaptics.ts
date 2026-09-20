/**
 * audioHaptics.ts
 *
 * Micro-tactile synthesized sound effects for clinical reconciliation workflows.
 * Implemented 100% with Web Audio API (zero audio file dependencies, zero network requests).
 * Muted by default to respect quiet clinical environments.
 */

let audioCtx: AudioContext | null = null;
let isAudioMuted = true;

// Initialize or retrieve AudioContext
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const hapticAudio = {
  get isMuted(): boolean {
    return isAudioMuted;
  },

  setMuted(muted: boolean): void {
    isAudioMuted = muted;
    if (!muted) {
      getAudioContext();
    }
  },

  toggleMute(): boolean {
    this.setMuted(!isAudioMuted);
    if (!isAudioMuted) {
      // Play subtle confirmation click on unmuting
      this.playTactileClick();
    }
    return isAudioMuted;
  },

  /**
   * Soft paper rustle / subtle tactile click when selecting a medication card
   */
  playTactileClick(): void {
    if (isAudioMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Fail silently if browser blocks audio
    }
  },

  /**
   * Soft warm tone when filtering or switching cases
   */
  playSubtleChime(): void {
    if (isAudioMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.06);

      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Fail silently
    }
  },
};
