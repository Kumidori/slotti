import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../i18n/useTranslation.jsx';
import '../styles/ReactionOverlay.css';

// Skill-stop parry: a cursor sweeps across a bar. Tap inside the green zone
// to half-block; the small perfect zone in the middle = full block + counter.
const PARRY_SWEEP_MS = 720;       // one full pass (left → right)
const PARRY_MAX_PASSES = 3;       // auto-fail after this many passes
const PARRY_GOOD_HALF = 0.10;     // good zone half-width (=20% of bar)
const PARRY_PERFECT_HALF = 0.035; // perfect zone half-width (=7% of bar)

const DODGE_TOTAL_MS = 1800;
const ARROWS = ['←', '↑', '→', '↓'];
const ARROW_KEYS = {
  ArrowLeft: '←', ArrowUp: '↑', ArrowRight: '→', ArrowDown: '↓',
};

function classifyParry(cursorPos) {
  const dist = Math.abs(cursorPos - 0.5);
  if (dist <= PARRY_PERFECT_HALF) return 'perfect';
  if (dist <= PARRY_GOOD_HALF) return 'good';
  return 'miss';
}

// prompt = { kind: 'parry' } | { kind: 'dodge', sequence: ['←','↑','→'] }
// onResolve(reactionMult, counterDmg)
export default function ReactionOverlay({ prompt, onResolve }) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(1);
  const [cursor, setCursor] = useState(0);
  const [parryResult, setParryResult] = useState(null); // 'perfect' | 'good' | 'miss' | null
  const [dodgeIdx, setDodgeIdx] = useState(0);
  const [dodgeMistakes, setDodgeMistakes] = useState(0);
  const startRef = useRef(0);
  const resolvedRef = useRef(false);

  // (Re)set state every time a new prompt fires
  useEffect(() => {
    if (!prompt) return;
    setParryResult(null);
    setCursor(0);
    setDodgeIdx(0);
    setDodgeMistakes(0);
    setProgress(1);
    resolvedRef.current = false;
    startRef.current = performance.now();
  }, [prompt]);

  // Animation tick — moves the cursor (parry) or just the timer (dodge)
  useEffect(() => {
    if (!prompt) return;
    const totalMs = prompt.kind === 'parry'
      ? PARRY_SWEEP_MS * PARRY_MAX_PASSES
      : DODGE_TOTAL_MS;
    let raf;
    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      const left = Math.max(0, 1 - elapsed / totalMs);
      setProgress(left);
      if (prompt.kind === 'parry') {
        // Triangle wave: 0→1→0→1… across PARRY_SWEEP_MS each direction
        const t = (elapsed / PARRY_SWEEP_MS) % 2;
        setCursor(t <= 1 ? t : 2 - t);
      }
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
      onResolve(1, 0); // window expired — full damage
    } else {
      const correct = dodgeIdx;
      const total = prompt.sequence.length;
      const effective = Math.max(0, correct - dodgeMistakes);
      const mult = Math.max(0, 1 - effective / total);
      onResolve(mult, 0);
    }
  };

  const handleParryStop = () => {
    if (!prompt || prompt.kind !== 'parry' || resolvedRef.current) return;
    const result = classifyParry(cursor);
    setParryResult(result);
    resolvedRef.current = true;
    // Brief reveal so player sees the result before the prompt vanishes
    const delay = 280;
    if (result === 'perfect') setTimeout(() => onResolve(0, 5), delay);
    else if (result === 'good') setTimeout(() => onResolve(0.5, 0), delay);
    else setTimeout(() => onResolve(1, 0), delay);
  };

  const handleDodgeInput = (arrow) => {
    if (!prompt || prompt.kind !== 'dodge' || resolvedRef.current) return;
    const expected = prompt.sequence[dodgeIdx];
    if (arrow === expected) {
      const next = dodgeIdx + 1;
      setDodgeIdx(next);
      if (next >= prompt.sequence.length) {
        resolvedRef.current = true;
        const effective = Math.max(0, next - dodgeMistakes);
        const mult = Math.max(0, 1 - effective / prompt.sequence.length);
        onResolve(mult, 0);
      }
    } else {
      setDodgeMistakes(m => m + 1);
    }
  };

  // Keyboard support — Space/Enter for parry, arrows for dodge
  useEffect(() => {
    if (!prompt) return;
    const onKey = (e) => {
      if (prompt.kind === 'parry' && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        handleParryStop();
        return;
      }
      if (prompt.kind === 'dodge') {
        const a = ARROW_KEYS[e.key];
        if (a) { e.preventDefault(); handleDodgeInput(a); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prompt, dodgeIdx, cursor]);

  if (!prompt) return null;

  return (
    <div className="reaction-overlay">
      {prompt.kind === 'parry' && (
        <div className={`reaction-card parry ${parryResult ? 'result-' + parryResult : ''}`}>
          <div className="reaction-title">⚔️ {t('reaction.parry')}</div>

          <div className="parry-bar">
            <div
              className="parry-zone good"
              style={{ left: `${(0.5 - PARRY_GOOD_HALF) * 100}%`, width: `${PARRY_GOOD_HALF * 2 * 100}%` }}
            />
            <div
              className="parry-zone perfect"
              style={{ left: `${(0.5 - PARRY_PERFECT_HALF) * 100}%`, width: `${PARRY_PERFECT_HALF * 2 * 100}%` }}
            />
            <div
              className="parry-cursor"
              style={{ left: `${cursor * 100}%` }}
            />
          </div>

          <div className="parry-timer">
            <div className="parry-timer-fill" style={{ transform: `scaleX(${progress})` }} />
          </div>

          <button
            className={`reaction-btn parry-btn ${parryResult ? 'result-' + parryResult : ''}`}
            onClick={handleParryStop}
            disabled={!!parryResult}
          >
            {parryResult === 'perfect' ? `✨ ${t('reaction.parryPerfect')}`
              : parryResult === 'good' ? `🛡️ ${t('reaction.parryGood')}`
              : parryResult === 'miss' ? `❌ ${t('reaction.parryMiss')}`
              : `🛑 ${t('reaction.parryStop')}`}
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
