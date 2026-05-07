import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import Reel from './Reel';
import { pickFromPool, SYMBOLS, ROWS, REELS } from '../gameData';
import { ensureAudio, sfx } from '../audio';
import { useTranslation } from '../i18n/useTranslation.jsx';
import '../styles/SlotMachine.css';

// Default starting display: per reel, 3 stacked icons
const DEFAULT_REEL = ['sword', 'shield', 'sword'];
const DEFAULT_REEL_ICONS = ['⚔️', '🛡️', '⚔️'];

const SlotMachine = forwardRef(function SlotMachine({ state, onResolve, onSpinningChange, onUseLockTokens, disabled }, ref) {
  const { t } = useTranslation();
  // Each reel is an array of ROWS (3) symbols, top to bottom.
  const [reelIcons, setReelIcons] = useState([DEFAULT_REEL_ICONS, DEFAULT_REEL_ICONS, DEFAULT_REEL_ICONS]);
  const [reelIds, setReelIds] = useState([DEFAULT_REEL, DEFAULT_REEL, DEFAULT_REEL]);
  const [spinningReels, setSpinningReels] = useState([false, false, false]);
  const [lockedReels, setLockedReels] = useState([false, false, false]);
  const [winningCells, setWinningCells] = useState([]); // [[row, reel], ...] of cells in winning lines
  const [spinKey, setSpinKey] = useState(0);
  const tickRef = useRef(null);
  const isSpinning = useRef(false);

  const stopDelays = [700, 1050, 1400];

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

    // Build new 3x3 grid: per reel, either keep locked column or roll fresh
    const newReelIds = [0, 1, 2].map(i => {
      if (lockedReels[i]) return reelIds[i].slice();
      return [0, 1, 2].map(() => pickFromPool(state.symbolPool).id);
    });
    const newReelIcons = newReelIds.map(col =>
      col.map(id => SYMBOLS.find(s => s.id === id)?.icon || '?')
    );

    const lockedCount = lockedReels.filter(Boolean).length;
    if (lockedCount > 0) onUseLockTokens?.(lockedCount);

    setReelIds(newReelIds);
    setReelIcons(newReelIcons);
    setLockedReels([false, false, false]);
    setWinningCells([]);
    setSpinKey(k => k + 1);
    setSpinningReels(lockedReels.map(l => !l));

    tickRef.current = setInterval(() => sfx.reelTick(), 80);

    [0, 1, 2].forEach((i) => {
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

      // Build the grid in [row][reel] order for the reducer
      const grid = [];
      for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < REELS; c++) {
          row.push({ id: newReelIds[c][r], icon: newReelIcons[c][r] });
        }
        grid.push(row);
      }
      onResolve(grid);
    }, stopDelays[2] + 100);
  }, [disabled, state.spinsLeft, state.symbolPool, onResolve, onSpinningChange, onUseLockTokens, lockedReels, reelIds]);

  useImperativeHandle(ref, () => ({
    spin,
    highlightCells: (cells) => setWinningCells(cells || []),
  }), [spin]);

  const canLockNow = !isSpinning.current && !disabled && state.spinsLeft >= 1 && state.locksLeft > 0;
  const lockedCount = lockedReels.filter(Boolean).length;
  const anyLocked = lockedCount > 0;
  const remainingTokens = state.locksLeft - lockedCount;

  return (
    <div className="slot-area">
      <div className="reels reels-3row">
        {[0, 1, 2].map(i => (
          <Reel
            key={i}
            icons={reelIcons[i]}
            spinning={spinningReels[i]}
            spinDuration={stopDelays[i]}
            spinKey={spinKey}
            locked={lockedReels[i]}
            onToggleLock={() => toggleLock(i)}
            canLock={canLockNow && (lockedReels[i] || remainingTokens > 0)}
            highlightedRows={winningCells.filter(([r, c]) => c === i).map(([r]) => r)}
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
