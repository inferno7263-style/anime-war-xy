// Small, original synthesized combat sounds. Audio starts only after a gesture.
export class CombatAudio {
  constructor() {
    this.enabled = false;
    this.context = null;
  }

  unlock() {
    if (!this.enabled) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      this.enabled = false;
      return;
    }
    this.context ||= new AudioContext();
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
  }

  toggle() {
    this.enabled = !this.enabled;
    this.unlock();
    if (this.enabled) this.tone(440, 0.09, 'sine', 0.07, 620);
    return this.enabled;
  }

  tone(frequency, duration, type = 'sine', volume = 0.08, endFrequency = frequency) {
    if (!this.enabled || !this.context) return;
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      ctx.currentTime + duration,
    );
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  noise(duration = 0.12, volume = 0.08, frequency = 900) {
    if (!this.enabled || !this.context) return;
    const ctx = this.context;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++)
      channel[i] = (Math.random() * 2 - 1) * (1 - i / channel.length);
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  play(event) {
    if (event.type === 'hit') {
      this.noise(event.heavy ? 0.2 : 0.1, event.blocked ? 0.08 : 0.18, event.blocked ? 2400 : 550);
      this.tone(
        event.blocked ? 680 : 145,
        event.heavy ? 0.23 : 0.12,
        'triangle',
        0.1,
        event.blocked ? 330 : 35,
      );
    } else if (event.type === 'attack') {
      this.noise(event.heavy ? 0.23 : 0.14, 0.055, 1700);
    } else if (event.type === 'dash') {
      this.noise(0.18, 0.08, 1200);
    } else if (event.type === 'jump') {
      this.tone(100, 0.12, 'sine', 0.045, 220);
    }
  }
}
