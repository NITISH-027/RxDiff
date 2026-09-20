import { describe, it, expect } from 'vitest';
import { hapticAudio } from '../audioHaptics.js';

describe('hapticAudio', () => {
  it('starts muted by default and can be safely toggled', () => {
    expect(hapticAudio.isMuted).toBe(true);
    
    // Play while muted does not crash
    expect(() => hapticAudio.playTactileClick()).not.toThrow();
    expect(() => hapticAudio.playSubtleChime()).not.toThrow();

    // Toggle mute
    hapticAudio.setMuted(false);
    expect(hapticAudio.isMuted).toBe(false);

    // Toggle back
    hapticAudio.setMuted(true);
    expect(hapticAudio.isMuted).toBe(true);
  });
});
