import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import Reel from './Reel';
import { pickFromPool, SYMBOLS } from '../gameData';
import { ensureAudio, sfx } from '../audio';
import { useTranslation } from '../i18n/useTranslation.jsx';
import '../styles/SlotMachine.css';

const SlotMachine = forwardRef(function SlotMachine({ state, onResolve, onSpinningChange, onUseLockTokens, disabled }, ref) {
  const { t } = useTranslation();
  const [displayIcons, setDisplayIcons] = useState(['⚔️', '🛡️', '⚔️']);
  const [displaySymbolIds, setDisplaySymbolIds] = useState(['sword', 'shield', 'sword']);
  const [spinningReels, setSpinningReels] = useState([false, false, false]);
  const [highlights, setHighlights] = useState([null, null, null]);
  const [lockedReels, setLockedReels] = useState([false, false, false]);
  const [spinKey, setSpinKey] = useState(0);
  const tickRef = useRef(null);
  const isSpinning = useRef(false);

  const stopDelays = [700, 1050, 1400];

  // Reset locks when fight changes or no spins remain
  useEffect(() => {
    if (state.spinsLeft <= 0 || !state.enemy) {
      setLockedReels([false, false, false]);
    }
  }, [state.spinsLeft, state.enemy?.name, state.room]);

  const toggleLock = useCallback((i) => {
    if (isSpinning.current || disabled || state.spinsLeft <= 0) return;
    setLockedReels(prev => {
      const next = [...prev];
      if (next[i]) {
        next[i] = false;
      } else {
        const currentLocked = prev.filter(Boolean).length;
        if (currentLocked >= state.locksLeft) return prev;
        next[i] = true;
      }
      return next;
    });
  }, [disabled, state.spinsLeft, state.locksLeft]);

  const spin = useCallback(() => {
    if (disabled || isSpinning.current || state.spinsLeft <= 0) return;
    isSpinning.current = true;
    onSpinningChange?.(true);
    ensureAudio();
    sfx.spinStart();

    const results = [0, 1, 2].map(i => {
      if (lockedReels[i]) {
        const kept = SYMBOLS.find(s => s.id === displaySymbolIds[i]);
        if (kept) return kept;
      }
      return pickFromPool(state.symbolPool);
    });

    const lockedCount = lockedReels.filter(Boolean).length;
    if (lockedCount > 0) onUseLockTokens?.(lockedCount);

    setDisplayIcons(results.map(r => r.icon));
    setDisplaySymbolIds(results.map(r => r.id));
    setLockedReels([false, false, false]);
    setSpinKey(k => k + 1);
    setSpinningReels(lockedReels.map(l => !l));
    setHighlights([null, null, null]);

    tickRef.current = setInterval(() => sfx.reelTick(), 80);

    results.forEach((_, i) => {
      setTimeout(() => {
        setSpinningReels(prev => {
          const next = [...prev];
          next[i] = false;
          return next;
        });
        sfx.reelStop(i);
      }, stopDelays[i]);
    });

    setTimeout(() => {
      clearInterval(tickRef.current);
      isSpinning.current = false;
      onSpinningChange?.(false);

      const ids = results.map(r => r.id);
      const counts = {};
      ids.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
      const activeSymbol = Object.keys(counts).find(k => counts[k] >= 2);
      const hasSkull = counts.skull >= 1;
      const isTriple = Object.values(counts).some(c => c === 3);

      const newHighlights = ids.map(id => {
        if (hasSkull && (counts.skull >= 2 || !activeSymbol)) {
          return id === 'skull' ? 'active-skull' : (counts.skull >= 1 && !activeSymbol ? null : 'inactive');
        }
        if (activeSymbol) {
          if (id === activeSymbol) return isTriple ? 'active-triple' : 'active';
          return 'inactive';
        }
        return null;
      });
      setHighlights(newHighlights);
      setTimeout(() => setHighlights([null, null, null]), 1800);

      onResolve(results);
    }, stopDelays[2] + 100);
  }, [disabled, state.spinsLeft, state.symbolPool, onResolve, onSpinningChange, onUseLockTokens, lockedReels, displaySymbolIds]);

  useImperativeHandle(ref, () => ({ spin }), [spin]);

  const canLockNow = !isSpinning.current && !disabled && state.spinsLeft >= 1 && state.locksLeft > 0;
  const lockedCount = lockedReels.filter(Boolean).length;
  const anyLocked = lockedCount > 0;
  const remainingTokens = state.locksLeft - lockedCount;

  return (
    <div className="slot-area">
      <div className="reels">
        {[0, 1, 2].map(i => (
          <Reel
            key={i}
            icon={displayIcons[i]}
            spinning={spinningReels[i]}
            spinDuration={stopDelays[i]}
            spinKey={spinKey}
            highlight={highlights[i]}
            locked={lockedReels[i]}
            onToggleLock={() => toggleLock(i)}
            canLock={canLockNow && (lockedReels[i] || remainingTokens > 0)}
          />
        ))}
      </div>
      <div className={`lock-hint ${state.spinsLeft >= 1 ? 'visible' : ''} ${anyLocked ? 'active' : ''}`}>
        {state.locksLeft <= 0 && lockedCount === 0
          ? t('slot.noLocks')
          : anyLocked
            ? t('slot.lockedWithCount', { count: state.locksLeft - lockedCount })
            : t('slot.lockHintWithCount', { count: state.locksLeft })}
      </div>
    </div>
  );
});

export default SlotMachine;
