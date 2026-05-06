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

// A natural minor: A C E with passing notes — calm & wistful
const CALM = {
  bass:   [110, 110, 87,  87,  98,  98,  110, 110], // A2 A2 F2 F2 G2 G2 A2 A2
  melody: [440, 523, 659, 523, 440, 587, 523, 440], // arpeggio
  bassType: 'triangle',
  melodyType: 'sine',
  bassVol: 0.05,
  melodyVol: 0.025,
};

// Tighter, harder pattern for bosses
const BOSS = {
  bass:   [110, 165, 110, 196, 110, 165, 110, 220],
  melody: [220, 330, 277, 330, 220, 415, 330, 277],
  bassType: 'square',
  melodyType: 'triangle',
  bassVol: 0.06,
  melodyVol: 0.035,
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

function tick() {
  const ctx = getCtx();
  const lookahead = 0.15;
  const pattern = musicState.intensity === 'boss' ? BOSS : CALM;
  while (musicState.nextNote < ctx.currentTime + lookahead) {
    const idx = musicState.step % pattern.bass.length;
    scheduleNote(musicState.nextNote, pattern.bass[idx], STEP * 0.9, pattern.bassType, pattern.bassVol);
    if (musicState.step % 2 === 0) {
      scheduleNote(musicState.nextNote, pattern.melody[idx], STEP * 0.55, pattern.melodyType, pattern.melodyVol);
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

