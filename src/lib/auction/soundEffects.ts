// Browser-native synthetic sound effects using Web Audio API (no external file dependencies)
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

// 1. Crisp Wooden Gavel / Hammer Drop Sound
export function playGavelHammer() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Two rapid resonant wooden strikes
  [0, 0.14].forEach((delay) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(140, now + delay);
    osc.frequency.exponentialRampToValueAtTime(40, now + delay + 0.12);

    gain.gain.setValueAtTime(0.8, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + 0.16);
  });
}

// 2. PKL Referee Dual-Tone Whistle Sound
export function playRefereeWhistle() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sine";
  osc2.type = "triangle";

  osc1.frequency.setValueAtTime(2600, now);
  osc1.frequency.linearRampToValueAtTime(2900, now + 0.08);
  osc1.frequency.linearRampToValueAtTime(2700, now + 0.25);

  osc2.frequency.setValueAtTime(2680, now);
  osc2.frequency.linearRampToValueAtTime(2980, now + 0.08);
  osc2.frequency.linearRampToValueAtTime(2780, now + 0.25);

  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.35);
  osc2.stop(now + 0.35);
}

// 3. Upbeat Bid Placed Paddle Chime
export function playBidChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now); // A5
  osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08); // E6

  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.2);
}
