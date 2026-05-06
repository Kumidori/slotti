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


// --- Text-to-speech for combo announcements ---

let voicesCache = null;
function refreshVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  voicesCache = window.speechSynthesis.getVoices();
}
if (typeof window !== "undefined" && window.speechSynthesis) {
  refreshVoices();
  window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
}

function pickVoice(lang) {
  if (!voicesCache || voicesCache.length === 0) return null;
  const prefix = lang === "de" ? "de" : lang === "bg" ? "bg" : "en";
  return voicesCache.find(v => v.lang.toLowerCase().startsWith(prefix))
      || voicesCache.find(v => v.default)
      || voicesCache[0];
}

// Strip emojis and other pictographs so the TTS engine doesnt say
// "skull and crossbones" out loud.
function stripEmojis(text) {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\u{1F000}-\u{1F02F}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function speak(text, lang = "en") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const clean = stripEmojis(text || "");
  if (!clean) return;
  const utterance = new SpeechSynthesisUtterance(clean);
  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;
  utterance.lang = voice ? voice.lang : (lang === "de" ? "de-DE" : lang === "bg" ? "bg-BG" : "en-US");
  utterance.rate = 1.05;
  utterance.pitch = 1.0;
  utterance.volume = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

