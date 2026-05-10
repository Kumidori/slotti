import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../i18n/useTranslation.jsx';
import '../styles/ReactionOverlay.css';

// Parry: random anticipation delay (you can't tap yet), then a short active window.
// Total time on screen ≈ anticipation + window, but the only successful tap is in
// the second slice. Tapping during anticipation counts as a miss ("too early").
const PARRY_ANTICIPATION_MIN = 280;
const PARRY_ANTICIPATION_MAX = 620;
const PARRY_WINDOW_MS = 320;
const DODGE_TOTAL_MS = 1800;
const ARROWS = ['←', '↑', '→', '↓'];
const ARROW_KEYS = {
  ArrowLeft: '←', ArrowUp: '↑', ArrowRight: '→', ArrowDown: '↓',
};

// prompt = { kind: 'parry' } | { kind: 'dodge', sequence: ['←','↑','→'] }
// onResolve(reactionMult, counterDmg)
export default function ReactionOverlay({ prompt, onResolve }) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(1);
  const [parried, setParried] = useState(false);
  const [parryEarly, setParryEarly] = useState(false);
  const [parryArmed, setParryArmed] = useState(false); // window has opened
  const [dodgeIdx, setDodgeIdx] = useState(0);
  const [dodgeMistakes, setDodgeMistakes] = useState(0);
  const startRef = useRef(0);
  const armRef = useRef(0); // when the parry window opens (ms since start)
  const resolvedRef = useRef(false);

  // (Re)set state every time a new prompt fires
  useEffect(() => {
    if (!prompt) return;
    setParried(false);
    setParryEarly(false);
    setParryArmed(false);
    setDodgeIdx(0);
    setDodgeMistakes(0);
    setProgress(1);
    resolvedRef.current = false;
    startRef.current = performance.now();
    if (prompt.kind === 'parry') {
      // Random anticipation before the active window
      armRef.current = PARRY_ANTICIPATION_MIN + Math.random() * (PARRY_ANTICIPATION_MAX - PARRY_ANTICIPATION_MIN);
      const armTimer = setTimeout(() => {
        if (!resolvedRef.current) setParryArmed(true);
      }, armRef.current);
      return () => clearTimeout(armTimer);
    }
  }, [prompt]);

  // Countdown ticker — drives the shrinking timer bar
  useEffect(() => {
    if (!prompt) return;
    const total = prompt.kind === 'dodge'
      ? DODGE_TOTAL_MS
      : armRef.current + PARRY_WINDOW_MS;
    let raf;
    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      const left = Math.max(0, 1 - elapsed / total);
      setProgress(left);
      if (left > 0 && !resolvedRef.current) raf = requestAnimationFrame(tick);
      else if (!resolvedRef.current) finalize();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [prompt]);

  const finalize = () => {
    if (resolvedRef.current || !prompt) return;
    resolvedRef.current = true;
    if (prompt.kind === 'parry') {
      if (parried) onResolve(0, 5); // perfect parry: full block + 5 counter
      else onResolve(1, 0);          // missed: full damage
    } else {
      // Dodge: each correct arrow = 1/N of the damage avoided
      const correct = dodgeIdx; // number of successful steps so far
      const total = prompt.sequence.length;
      // Mistakes also dock you a step
      const effective = Math.max(0, correct - dodgeMistakes);
      const mult = Math.max(0, 1 - effective / total);
      onResolve(mult, 0);
    }
  };

  const handleParry = () => {
    if (!prompt || prompt.kind !== 'parry' || resolvedRef.current) return;
    if (!parryArmed) {
      // Tapped during the anticipation phase — full damage, brief flash
      setParryEarly(true);
      resolvedRef.current = true;
      // Tiny delay so player sees the "TOO EARLY" feedback before the prompt vanishes
      setTimeout(() => onResolve(1, 0), 250);
      return;
    }
    setParried(true);
    resolvedRef.current = true;
    onResolve(0, 5);
  };

  const handleDodgeInput = (arrow) => {
    if (!prompt || prompt.kind !== 'dodge' || resolvedRef.current) return;
    const expected = prompt.sequence[dodgeIdx];
    if (arrow === expected) {
      const next = dodgeIdx + 1;
      setDodgeIdx(next);
      if (next >= prompt.sequence.length) {
        // All correct — finalize with current mistakes count
        resolvedRef.current = true;
        const effective = Math.max(0, next - dodgeMistakes);
        const mult = Math.max(0, 1 - effective / prompt.sequence.length);
        onResolve(mult, 0);
      }
    } else {
      setDodgeMistakes(m => m + 1);
    }
  };

  // Keyboard support for dodge
  useEffect(() => {
    if (!prompt || prompt.kind !== 'dodge') return;
    const onKey = (e) => {
      const a = ARROW_KEYS[e.key];
      if (a) { e.preventDefault(); handleDodgeInput(a); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prompt, dodgeIdx]);

  if (!prompt) return null;

  return (
    <div className="reaction-overlay">
      {prompt.kind === 'parry' && (
        <div className="reaction-card parry">
          <div className="reaction-title">⚔️ {t('reaction.parry')}</div>
          <div className="reaction-bar">
            <div className="reaction-bar-fill" style={{ transform: `scaleX(${progress})` }} />
          </div>
          <button
            className={`reaction-btn parry-btn ${parried ? 'hit' : ''} ${parryEarly ? 'early' : ''} ${parryArmed && !parried && !parryEarly ? 'armed' : ''}`}
            onClick={handleParry}
          >
            {parried ? `✅ ${t('reaction.parryHit')}`
              : parryEarly ? `❌ ${t('reaction.parryEarly')}`
              : parryArmed ? `🛡️ ${t('reaction.parryNow')}`
              : `⏳ ${t('reaction.parryWait')}`}
          </button>
        </div>
      )}

      {prompt.kind === 'dodge' && (
        <div className="reaction-card dodge">
          <div className="reaction-title">💨 {t('reaction.dodge')}</div>
          <div className="reaction-bar">
            <div className="reaction-bar-fill" style={{ transform: `scaleX(${progress})` }} />
          </div>
          <div className="dodge-sequence">
            {prompt.sequence.map((a, i) => (
              <span
                key={i}
                className={`dodge-step ${i < dodgeIdx ? 'done' : i === dodgeIdx ? 'current' : ''}`}
              >
                {a}
              </span>
            ))}
          </div>
          <div className="dodge-pad">
            {ARROWS.map(a => (
              <button
                key={a}
                className="reaction-btn dodge-btn"
                onClick={() => handleDodgeInput(a)}
              >
                {a}
              </button>
            ))}
          </div>
          {dodgeMistakes > 0 && (
            <div className="dodge-mistakes">−{dodgeMistakes}</div>
          )}
        </div>
      )}
    </div>
  );
}
