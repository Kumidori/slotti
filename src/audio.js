import tripleSlashUrl from './assets/audio/tripleSlash.mp3';
import arcaneBurstUrl from './assets/audio/arcaneBurst.mp3';
import fortressUrl from './assets/audio/fortress.mp3';
import fullRestoreUrl from './assets/audio/fullRestore.mp3';
import rainbowUrl from './assets/audio/rainbow.mp3';
import tripleSkullUrl from './assets/audio/tripleSkull.mp3';

let audioCtx = null;
let unlocked = false;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

export function ensureAudio() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
  if (!unlocked) {
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    unlocked = true;
    primeComboAudio();
  }
}

let comboPrimed = false;
function primeComboAudio() {
  if (comboPrimed) return;
  comboPrimed = true;
  // Mobile requires each <audio> element to be unlocked by a user gesture.
  // Silently play/pause each clip so later programmatic plays succeed.
  for (const key of Object.keys(COMBO_AUDIO)) {
    const audio = getComboAudio(key);
    if (!audio) continue;
    const original = audio.volume;
    audio.volume = 0;
    audio.play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = original;
      })
      .catch(() => {
        audio.volume = original;
      });
  }
}

function playTone(freq, duration, type = 'square', volume = 0.15, delay = 0) {
  const audioCtx = getCtx();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime + delay);
  osc.stop(audioCtx.currentTime + delay + duration);
}

function playNoise(duration, volume = 0.1, delay = 0) {
  const audioCtx = getCtx();
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, audioCtx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
  source.connect(gain);
  gain.connect(audioCtx.destination);
  source.start(audioCtx.currentTime + delay);
}

export const sfx = {
  spinStart() {
    playTone(220, 0.08, 'square', 0.08);
    playTone(330, 0.08, 'square', 0.08, 0.04);
  },
  reelTick() {
    playTone(800 + Math.random() * 400, 0.03, 'square', 0.04);
  },
  reelStop(index) {
    playTone(500 + index * 200, 0.1, 'triangle', 0.12);
  },
  comboWeak() {
    playTone(300, 0.12, 'sawtooth', 0.08);
  },
  comboDouble() {
    playTone(440, 0.1, 'square', 0.1);
    playTone(550, 0.1, 'square', 0.1, 0.08);
  },
  jackpot() {
    [523, 659, 784, 1047].forEach((f, i) => {
      playTone(f, 0.2, 'square', 0.12, i * 0.1);
      playTone(f * 1.5, 0.2, 'triangle', 0.06, i * 0.1);
    });
  },
  damage() {
    playNoise(0.15, 0.12);
    playTone(150, 0.15, 'sawtooth', 0.1);
  },
  playerHit() {
    playNoise(0.2, 0.15);
    playTone(100, 0.2, 'sawtooth', 0.12);
    playTone(80, 0.15, 'sawtooth', 0.08, 0.1);
  },
  fart() {
    // Procedural pbthhh — descending sawtooth + low noise rumble
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.4);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
    playNoise(0.45, 0.08);
  },
  heal() {
    playTone(440, 0.15, 'sine', 0.1);
    playTone(660, 0.15, 'sine', 0.1, 0.1);
    playTone(880, 0.2, 'sine', 0.08, 0.2);
  },
  shield() {
    playTone(200, 0.15, 'triangle', 0.1);
    playTone(400, 0.1, 'triangle', 0.08, 0.05);
  },
  shieldBreak() {
    playTone(300, 0.1, 'triangle', 0.1);
    playTone(150, 0.2, 'triangle', 0.08, 0.05);
    playNoise(0.15, 0.08, 0.1);
  },
  skull() {
    playTone(80, 0.3, 'sawtooth', 0.15);
    playTone(60, 0.4, 'sawtooth', 0.1, 0.15);
    playNoise(0.2, 0.08, 0.1);
  },
  victory() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      playTone(f, 0.25, 'square', 0.1, i * 0.12);
      playTone(f * 0.5, 0.25, 'triangle', 0.06, i * 0.12);
    });
  },
  gameOver() {
    [400, 350, 300, 200].forEach((f, i) => {
      playTone(f, 0.3, 'sawtooth', 0.1, i * 0.2);
    });
    playNoise(0.5, 0.06, 0.6);
  },
  buy() {
    playTone(600, 0.08, 'square', 0.1);
    playTone(800, 0.08, 'square', 0.1, 0.06);
    playTone(1000, 0.12, 'square', 0.08, 0.12);
  },
  cantBuy() {
    playTone(200, 0.15, 'square', 0.1);
    playTone(150, 0.2, 'square', 0.1, 0.1);
  },
  buttonClick() {
    playTone(660, 0.05, 'square', 0.06);
  },
  shopOpen() {
    playTone(440, 0.1, 'triangle', 0.08);
    playTone(554, 0.1, 'triangle', 0.08, 0.08);
    playTone(660, 0.15, 'triangle', 0.06, 0.16);
  },
};


// --- Procedural background music ---

const BPM = 96;
const STEP = 60 / BPM / 2; // eighth notes
const BAR_STEPS = 8;

// Chord = root frequency + 3 chord-tone frequencies the melody can draw from
const CALM_CHORDS = [
  { root: 110, notes: [220, 262, 330, 440] }, // Am: A C E A
  { root: 87,  notes: [175, 220, 262, 349] }, // F:  F A C F
  { root: 131, notes: [262, 330, 392, 523] }, // C:  C E G C
  { root: 98,  notes: [196, 247, 294, 392] }, // G:  G B D G
];

const BOSS_CHORDS = [
  { root: 73,  notes: [147, 175, 220, 294] }, // Dm: D F A D
  { root: 117, notes: [233, 294, 349, 466] }, // Bb: Bb D F Bb
  { root: 87,  notes: [175, 220, 262, 349] }, // F:  F A C F
  { root: 110, notes: [220, 262, 330, 440] }, // Am: A C E A
];

// Note indices into chord.notes; null = rest
const CALM_PATTERNS = [
  [0, null, 1, null, 2, null, 1, null],     // sparse up
  [3, 2, 1, 2, 0, 2, 1, 2],                  // wandering
  [null, 1, 2, 1, null, 2, 3, 2],            // offbeat
  [0, 2, 1, 3, 2, 1, 0, null],               // descent
];

const BOSS_PATTERNS = [
  [0, 2, 0, 2, 0, 2, 1, 2],                  // driving
  [3, null, 2, 1, 0, null, 1, 2],            // chunky
  [0, 1, 2, 3, 2, 1, 0, 1],                  // walk
  [2, 2, null, 0, 2, 2, null, 3],            // syncopation
];

// --- Per-boss themes ---

// Lili: harmonic-minor brood (Am - F - E - Am with E major as dark V)
const LILI_CHORDS = [
  { root: 110, notes: [220, 262, 330, 440] }, // Am
  { root: 87,  notes: [175, 220, 262, 349] }, // F
  { root: 82,  notes: [165, 208, 247, 330] }, // E (with G# = 208)
  { root: 110, notes: [220, 262, 330, 440] }, // Am
];
const LILI_PATTERNS = [
  [0, null, 1, 2, 3, 2, 1, null],
  [3, 2, null, 1, 2, null, 3, 2],
  [null, 2, 1, 2, 0, 2, 1, 0],
  [0, 2, 3, 2, 0, 2, 3, null],
];

// Ruby: driving 4-on-the-floor punk in D minor pentatonic
const RUBY_CHORDS = [
  { root: 73,  notes: [147, 175, 220, 294] }, // Dm
  { root: 110, notes: [220, 262, 330, 440] }, // Am
  { root: 87,  notes: [175, 220, 262, 349] }, // F
  { root: 73,  notes: [147, 175, 220, 294] }, // Dm
];
const RUBY_PATTERNS = [
  [0, 2, 3, 2, 0, 2, 3, 2],
  [3, 2, 1, 2, 3, 2, 1, 0],
  [0, 0, 2, 2, 3, 3, 1, 1],
  [2, 3, 0, 3, 2, 3, 0, 1],
];

// Furzkopf: low, sickly, sparse — Em with detuned bass for wobble
const FURZ_CHORDS = [
  { root: 82,  notes: [165, 196, 247, 330] }, // Em
  { root: 65,  notes: [131, 175, 196, 262] }, // C
  { root: 98,  notes: [196, 247, 294, 392] }, // G
  { root: 73,  notes: [147, 185, 220, 294] }, // D
];
const FURZ_PATTERNS = [
  [0, null, null, 1, null, 2, null, null],
  [null, 1, null, 0, null, null, 2, null],
  [3, null, 2, null, 1, null, 0, null],
  [null, null, 1, 2, null, 0, null, 1],
];

const PROFILES = {
  calm: {
    chords: CALM_CHORDS,
    patterns: CALM_PATTERNS,
    bassType: 'triangle',
    melodyType: 'sine',
    bassVol: 0.05,
    melodyVol: 0.024,
    drumVol: 0.05,
    drumDensity: 0.5,
    kickSteps: [0, 4],
  },
  boss: {
    chords: BOSS_CHORDS,
    patterns: BOSS_PATTERNS,
    bassType: 'square',
    melodyType: 'triangle',
    bassVol: 0.06,
    melodyVol: 0.034,
    drumVol: 0.07,
    drumDensity: 0.85,
    kickSteps: [0, 4],
  },
  lili: {
    chords: LILI_CHORDS,
    patterns: LILI_PATTERNS,
    bassType: 'square',
    melodyType: 'triangle',
    bassVol: 0.06,
    melodyVol: 0.032,
    drumVol: 0.06,
    drumDensity: 0.7,
    kickSteps: [0, 4],
    snareSteps: [4],
  },
  ruby: {
    chords: RUBY_CHORDS,
    patterns: RUBY_PATTERNS,
    bassType: 'square',
    melodyType: 'square',
    bassVol: 0.07,
    melodyVol: 0.038,
    drumVol: 0.09,
    drumDensity: 1.0,
    kickSteps: [0, 2, 4, 6], // 4-on-the-floor
    snareSteps: [2, 6],
  },
  furzkopf: {
    chords: FURZ_CHORDS,
    patterns: FURZ_PATTERNS,
    bassType: 'sawtooth',
    melodyType: 'triangle',
    bassVol: 0.06,
    melodyVol: 0.028,
    drumVol: 0.05,
    drumDensity: 0.35,
    kickSteps: [0, 4],
    bassDetune: 9, // cents wobble for sickliness
  },
};

const musicState = {
  playing: false,
  intensity: 'calm',
  muted: typeof localStorage !== 'undefined' && localStorage.getItem('mute_music') === '1',
  scheduler: null,
  nextNote: 0,
  step: 0,
  masterGain: null,
};

function getMasterGain() {
  if (musicState.masterGain) return musicState.masterGain;
  const ctx = getCtx();
  const g = ctx.createGain();
  g.gain.value = musicState.muted ? 0 : 1;
  g.connect(ctx.destination);
  musicState.masterGain = g;
  return g;
}

function scheduleNote(time, freq, duration, type, volume) {
  const ctx = getCtx();
  const dest = getMasterGain();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(volume, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + duration + 0.05);
}

function scheduleKick(time, volume) {
  const ctx = getCtx();
  const dest = getMasterGain();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + 0.16);
}

function scheduleSnare(time, volume) {
  const ctx = getCtx();
  const dest = getMasterGain();
  // Noise burst + body tone for snare
  const bufferSize = Math.floor(ctx.sampleRate * 0.1);
  const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.7;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  filter.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start(time);
}

function scheduleHat(time, volume) {
  const ctx = getCtx();
  const dest = getMasterGain();
  const bufferSize = Math.floor(ctx.sampleRate * 0.04);
  const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start(time);
}

function tick() {
  const ctx = getCtx();
  const lookahead = 0.15;
  const profile = PROFILES[musicState.intensity] || PROFILES.calm;
  while (musicState.nextNote < ctx.currentTime + lookahead) {
    const step = musicState.step;
    const stepInBar = step % BAR_STEPS;
    const bar = Math.floor(step / BAR_STEPS) % profile.chords.length;
    const chord = profile.chords[bar];
    const pattern = profile.patterns[bar % profile.patterns.length];
    const time = musicState.nextNote;

    // Bass: root on every beat (every other eighth) — root on downbeats, octave up on offbeats
    if (stepInBar % 2 === 0) {
      const useOctave = stepInBar !== 0 && Math.random() < 0.25;
      let f = useOctave ? chord.root * 2 : chord.root;
      // Optional detune wobble (Furzkopf)
      if (profile.bassDetune) {
        f *= Math.pow(2, ((Math.random() * 2 - 1) * profile.bassDetune) / 1200);
      }
      scheduleNote(time, f, STEP * 1.7, profile.bassType, profile.bassVol);
    }

    // Melody from current pattern, picking from chord tones
    const noteIdx = pattern[stepInBar];
    if (noteIdx !== null && noteIdx !== undefined) {
      const f = chord.notes[noteIdx % chord.notes.length];
      scheduleNote(time, f, STEP * 0.55, profile.melodyType, profile.melodyVol);
    }

    // Drums: kick / snare on configured steps
    const kickSteps = profile.kickSteps || [0, 4];
    if (kickSteps.includes(stepInBar)) {
      scheduleKick(time, profile.drumVol);
    }
    if (profile.snareSteps && profile.snareSteps.includes(stepInBar)) {
      scheduleSnare(time, profile.drumVol * 0.7);
    }
    if (stepInBar % 2 === 1 && Math.random() < profile.drumDensity) {
      scheduleHat(time, profile.drumVol * 0.5);
    }

    musicState.nextNote += STEP;
    musicState.step++;
  }
}

export function startMusic(intensity = 'calm') {
  if (typeof window === 'undefined') return;
  ensureAudio();
  musicState.intensity = intensity;
  if (musicState.playing) return;
  musicState.playing = true;
  musicState.nextNote = getCtx().currentTime + 0.1;
  musicState.step = 0;
  musicState.scheduler = setInterval(tick, 40);
}

export function stopMusic() {
  if (musicState.scheduler) {
    clearInterval(musicState.scheduler);
    musicState.scheduler = null;
  }
  musicState.playing = false;
}

export function setMusicIntensity(intensity) {
  if (musicState.intensity === intensity) return;
  musicState.intensity = intensity;
  // Reset step so the new pattern starts on a downbeat
  musicState.step = 0;
}

export function setMusicMuted(muted) {
  musicState.muted = !!muted;
  try { localStorage.setItem('mute_music', muted ? '1' : '0'); } catch { /* ignore */ }
  const ctx = getCtx();
  const g = getMasterGain();
  g.gain.cancelScheduledValues(ctx.currentTime);
  g.gain.linearRampToValueAtTime(muted ? 0 : 1, ctx.currentTime + 0.2);
}

export function isMusicMuted() {
  return musicState.muted;
}

// --- Combo announcer (prerecorded English voice clips) ---

const COMBO_AUDIO = {
  tripleSlash: tripleSlashUrl,
  arcaneBurst: arcaneBurstUrl,
  fortress: fortressUrl,
  fullRestore: fullRestoreUrl,
  rainbow: rainbowUrl,
  tripleSkull: tripleSkullUrl,
};

const audioCache = {};
function getComboAudio(key) {
  if (!COMBO_AUDIO[key]) return null;
  if (!audioCache[key]) {
    audioCache[key] = new Audio(COMBO_AUDIO[key]);
    audioCache[key].volume = 0.9;
  }
  return audioCache[key];
}

let currentClip = null;
export function playComboVoice(comboKey) {
  const audio = getComboAudio(comboKey);
  if (!audio) return;
  if (currentClip && !currentClip.paused) {
    currentClip.pause();
    currentClip.currentTime = 0;
  }
  currentClip = audio;
  audio.currentTime = 0;
  audio.play().catch(() => { /* autoplay may be blocked until first interaction */ });
}

