'use client';

// WebAudio synthesized alert chime (zero external audio file dependencies)
class AudioAlertService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('kds_audio_muted');
      this.isMuted = savedMute === 'true';
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('kds_audio_muted', String(muted));
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Dual-tone kitchen bell chime (D5 587.33Hz -> A5 880Hz)
   * Signals an incoming ticket has hit the kitchen station
   */
  public playNewTicketChime(): void {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Tone 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(0.28, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.45);

      // Tone 2: 880.00 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880.0, now + 0.15);

      gain2.gain.setValueAtTime(0.001, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.35, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.15);
      osc2.stop(now + 0.75);
    } catch (e) {
      console.warn('Audio alert playback suppressed by browser policy:', e);
    }
  }

  /**
   * Triple-tone alert for Ready-To-Serve (C5 -> E5 -> G5)
   * Signals waiter that food is ready for pickup
   */
  public playReadyAlert(): void {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.12;
        const dur = 0.35;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.25, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + dur);
      });
    } catch (e) {
      console.warn('Ready alert audio playback error:', e);
    }
  }
}

export const audioAlert = new AudioAlertService();
