import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import Reel from './Reel';
import { getWeightedSymbol } from '../gameData';
import { ensureAudio, sfx } from '../audio';
import '../styles/SlotMachine.css';

const SlotMachine = forwardRef(function SlotMachine({ state, onResolve, onSpinningChange, disabled }, ref) {
  const [displayIcons, setDisplayIcons] = useState(['⚔️', '🛡️', '⚔️']);
  const [spinningReels, setSpinningReels] = useState([false, false, false]);
  const [highlights, setHighlights] = useState([null, null, null]);
  const tickRef = useRef(null);
  const isSpinning = useRef(false);

  const spin = useCallback(() => {
    if (disabled || isSpinning.current || state.spinsLeft <= 0) return;
    isSpinning.current = true;
    onSpinningChange?.(true);
    ensureAudio();
    sfx.spinStart();

    const results = [
      getWeightedSymbol(state.luckBonus),
      getWeightedSymbol(state.luckBonus),
      getWeightedSymbol(state.luckBonus),
    ];

    setSpinningReels([true, true, true]);
    setHighlights([null, null, null]);

    tickRef.current = setInterval(() => sfx.reelTick(), 80);

    const stopDelays = [400, 700, 1000];
    results.forEach((sym, i) => {
      setTimeout(() => {
        setSpinningReels(prev => {
          const next = [...prev];
          next[i] = false;
          return next;
        });
        setDisplayIcons(prev => {
          const next = [...prev];
          next[i] = sym.icon;
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
    }, 1100);
  }, [disabled, state.spinsLeft, state.luckBonus, onResolve]);

  useImperativeHandle(ref, () => ({ spin }), [spin]);

  return (
    <div className="slot-area">
      <div className="reels">
        {[0, 1, 2].map(i => (
          <Reel
            key={i}
            icon={displayIcons[i]}
            spinning={spinningReels[i]}
            highlight={highlights[i]}
          />
        ))}
      </div>
    </div>
  );
});

export default SlotMachine;
