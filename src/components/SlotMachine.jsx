import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import Reel from './Reel';
import { getWeightedSymbol, SYMBOLS } from '../gameData';
import { ensureAudio, sfx } from '../audio';
import '../styles/SlotMachine.css';

const SlotMachine = forwardRef(function SlotMachine({ state, onResolve, onSpinningChange, disabled }, ref) {
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
      // Only one lock allowed at a time — tapping another reel moves the lock
      const next = [false, false, false];
      next[i] = !prev[i];
      return next;
    });
  }, [disabled, state.spinsLeft]);

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
      return getWeightedSymbol(state.luckBonus);
    });

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
  }, [disabled, state.spinsLeft, state.luckBonus, onResolve, onSpinningChange, lockedReels, displaySymbolIds]);

  useImperativeHandle(ref, () => ({ spin }), [spin]);

  const canLockNow = !isSpinning.current && !disabled && state.spinsLeft >= 1;
  const anyLocked = lockedReels.some(Boolean);

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
            canLock={canLockNow}
          />
        ))}
      </div>
      <div className={`lock-hint ${canLockNow ? 'visible' : ''} ${anyLocked ? 'active' : ''}`}>
        {anyLocked ? '🔒 Locked — will keep on next spin' : '💡 Tap a reel to lock it for the next spin'}
      </div>
    </div>
  );
});

export default SlotMachine;
