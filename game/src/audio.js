// Procedural Web Audio API sound generator. Zero external audio asset dependencies.

let ctx = null;

function getContext() {
  if (!ctx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) ctx = new AudioContextClass();
  }
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function playShoot(type = 'm4a1') {
  const c = getContext();
  if (!c) return;
  const now = c.currentTime;

  // Low frequency transient punch
  const osc = c.createOscillator();
  const oscGain = c.createGain();
  const freq = type === 'awp' ? 120 : (type === 'usp' ? 190 : 150);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + (type === 'awp' ? 0.22 : 0.12));

  oscGain.gain.setValueAtTime(type === 'awp' ? 0.5 : 0.35, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + (type === 'awp' ? 0.25 : 0.14));

  osc.connect(oscGain);
  oscGain.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.28);

  // Noise crack
  const bufferSize = Math.floor(c.sampleRate * (type === 'awp' ? 0.35 : 0.18));
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = c.createBufferSource();
  noise.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(type === 'awp' ? 1400 : 2200, now);
  filter.Q.setValueAtTime(1.5, now);

  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(type === 'awp' ? 0.6 : 0.4, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + (type === 'awp' ? 0.32 : 0.16));

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(c.destination);
  noise.start(now);
}

export function playReload() {
  const c = getContext();
  if (!c) return;
  const now = c.currentTime;

  const click = (delay, pitch) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(pitch, now + delay);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.4, now + delay + 0.05);

    gain.gain.setValueAtTime(0.18, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06);

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 0.07);
  };

  click(0.1, 700);  // Magazine release
  click(0.9, 900);  // New magazine insert
  click(1.4, 1100); // Bolt rack
}

export function playHitmarker(headshot = false) {
  const c = getContext();
  if (!c) return;
  const now = c.currentTime;

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(headshot ? 1650 : 880, now);
  osc.frequency.exponentialRampToValueAtTime(headshot ? 2200 : 980, now + 0.06);

  gain.gain.setValueAtTime(headshot ? 0.3 : 0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

export function playExplosion() {
  const c = getContext();
  if (!c) return;
  const now = c.currentTime;

  // Sub bass boom
  const osc = c.createOscillator();
  const oscGain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(90, now);
  osc.frequency.exponentialRampToValueAtTime(20, now + 0.9);

  oscGain.gain.setValueAtTime(0.8, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

  osc.connect(oscGain);
  oscGain.connect(c.destination);
  osc.start(now);
  osc.stop(now + 1.2);

  // Rumble noise
  const bufferSize = Math.floor(c.sampleRate * 0.9);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = c.createBufferSource();
  noise.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(600, now);
  filter.frequency.exponentialRampToValueAtTime(80, now + 0.8);

  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0.7, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(c.destination);
  noise.start(now);
}

export function playBombBeep(pitch = 1000) {
  const c = getContext();
  if (!c) return;
  const now = c.currentTime;

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(pitch, now);

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

export function playRoundWon() {
  const c = getContext();
  if (!c) return;
  const now = c.currentTime;

  const chord = [440, 554.37, 659.25, 880]; // A major
  chord.forEach((freq, idx) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

    gain.gain.setValueAtTime(0.15, now + idx * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now + idx * 0.08);
    osc.stop(now + 1.3);
  });
}

export function playRoundLost() {
  const c = getContext();
  if (!c) return;
  const now = c.currentTime;

  const chord = [392, 370, 349.23]; // Descending chromatic
  chord.forEach((freq, idx) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now + idx * 0.15);

    gain.gain.setValueAtTime(0.18, now + idx * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now + idx * 0.15);
    osc.stop(now + 1.1);
  });
}

export function playBuy() {
  const c = getContext();
  if (!c) return;
  const now = c.currentTime;

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}
