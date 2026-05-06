import { useState, useEffect, useRef } from 'react';
import Reel from './Reel';
import { getSymbol } from '../gameData';
import { rerollCost } from '../hooks/useGameState';
import { sfx } from '../audio';
import { useTranslation } from '../i18n/useTranslation.jsx';
import '../styles/SymbolPicker.css';

const STOP_DELAYS = [600, 900, 1200];

export default function SymbolPicker({ picks, gold, lastGoldEarned, rerollCount, luckBonus, onPick, onSkip, onReroll }) {
  const { t } = useTranslation();
  const [spinningReels, setSpinningReels] = useState([true, true, true]);
  const [revealed, setRevealed] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const tickRef = useRef(null);

  // Trigger spin animation on mount and whenever picks change (e.g. reroll)
  useEffect(() => {
    if (!picks) return;
    setRevealed(false);
    setSelectedIndex(null);
    setSpinningReels([true, true, true]);
    setSpinKey(k => k + 1);
    sfx.spinStart();
    tickRef.current = setInterval(() => sfx.reelTick(), 80);

    const timers = STOP_DELAYS.map((delay, i) =>
      setTimeout(() => {
        setSpinningReels(prev => {
          const next = [...prev];
          next[i] = false;
          return next;
        });
        sfx.reelStop(i);
      }, delay)
    );
    const finalTimer = setTimeout(() => {
      setRevealed(true);
      clearInterval(tickRef.current);
    }, STOP_DELAYS[2] + 200);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finalTimer);
      clearInterval(tickRef.current);
    };
  }, [picks]);

  if (!picks) return null;

  const cost = rerollCost(rerollCount, luckBonus);
  const canReroll = gold >= cost;

  return (
    <div className="symbol-picker">
      <div className="symbol-picker-inner">
        <h2>{t('picker.victory')}</h2>
        {lastGoldEarned > 0 && <p className="picker-gold">{t('picker.goldEarned', { amount: lastGoldEarned })}</p>}
        <p className="picker-sub">{t('picker.subtitle')}</p>

        <div className="picker-reels">
          {[0, 1, 2].map(i => {
            const sym = getSymbol(picks[i]);
            const canPick = revealed;
            const isSelected = selectedIndex === i;
            return (
              <button
                key={i}
                className={`picker-reel-btn ${canPick ? 'pickable' : ''} ${isSelected ? 'selected' : ''}`}
                disabled={!canPick}
                onClick={() => { sfx.buttonClick(); setSelectedIndex(i); }}
              >
                <Reel
                  icon={sym.icon}
                  spinning={spinningReels[i]}
                  spinDuration={STOP_DELAYS[i]}
                  spinKey={spinKey}
                />
              </button>
            );
          })}
        </div>

        <button
          className="picker-choose"
          onClick={() => { sfx.buttonClick(); onPick(picks[selectedIndex]); }}
          disabled={!revealed || selectedIndex === null}
        >
          {t('picker.choose')}
        </button>

        <div className="picker-actions">
          <button className="picker-skip" onClick={onSkip} disabled={!revealed}>
            {t('picker.skip')}
          </button>
          <button
            className="picker-reroll"
            onClick={onReroll}
            disabled={!revealed || !canReroll}
          >
            {t('picker.reroll')} <span className="reroll-cost">{cost}g</span>
          </button>
        </div>
      </div>
    </div>
  );
}
