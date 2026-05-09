import { useState, useEffect, useRef } from 'react';
import Reel from './Reel';
import { getSymbol } from '../gameData';
import { rerollCost, GAMBLE_MAX_DOUBLES } from '../hooks/useGameState';
import { sfx } from '../audio';
import { useTranslation } from '../i18n/useTranslation.jsx';
import '../styles/SymbolPicker.css';

const STOP_DELAYS = [600, 900, 1200];

export default function SymbolPicker({
  picks, gold, lastGoldEarned, rerollCount, luckBonus,
  pendingGold = 0, gambleTier = 0, gambleBusted = false, gambleAnim = null,
  onGamble, onCashOut, onClearGambleAnim,
  onPick, onSkip, onReroll,
}) {
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

  // Auto-clear win/lose flash so the next gamble can re-trigger it
  useEffect(() => {
    if (!gambleAnim) return;
    const timer = setTimeout(() => onClearGambleAnim?.(), 700);
    return () => clearTimeout(timer);
  }, [gambleAnim, onClearGambleAnim]);

  if (!picks) return null;

  const cost = rerollCost(rerollCount, luckBonus);
  const canReroll = gold >= cost;
  const canGamble = pendingGold > 0 && !gambleBusted && gambleTier < GAMBLE_MAX_DOUBLES;
  const nextGoldOnWin = pendingGold * 2;

  return (
    <div className="symbol-picker">
      <div className="symbol-picker-inner">
        <h2>{t('picker.victory')}</h2>

        {(pendingGold > 0 || gambleBusted) && (
          <div className={`gamble-panel ${gambleAnim ? 'flash-' + gambleAnim : ''}`}>
            <div className="gamble-ladder">
              {Array.from({ length: GAMBLE_MAX_DOUBLES + 1 }).map((_, i) => {
                const isCurrent = i === gambleTier && !gambleBusted;
                const isPast = i < gambleTier;
                return (
                  <div
                    key={i}
                    className={`gamble-rung ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}`}
                  >
                    {pendingGold > 0
                      ? Math.round(pendingGold / Math.pow(2, gambleTier - i))
                      : Math.round((lastGoldEarned || 1) * Math.pow(2, i))}
                    g
                  </div>
                );
              }).reverse()}
            </div>
            <div className="gamble-actions">
              {gambleBusted ? (
                <div className="gamble-bust">{t('gamble.bust')}</div>
              ) : canGamble ? (
                <>
                  <button className="gamble-btn cashout" onClick={onCashOut}>
                    {t('gamble.cashOut', { amount: pendingGold })}
                  </button>
                  <button className="gamble-btn double" onClick={onGamble}>
                    {t('gamble.double', { amount: nextGoldOnWin })}
                  </button>
                </>
              ) : (
                <button className="gamble-btn cashout" onClick={onCashOut}>
                  {t('gamble.cashOut', { amount: pendingGold })}
                </button>
              )}
            </div>
            {!gambleBusted && pendingGold > 0 && (
              <div className="gamble-hint">{t('gamble.hint')}</div>
            )}
          </div>
        )}

        {lastGoldEarned > 0 && pendingGold === 0 && !gambleBusted && (
          <p className="picker-gold">{t('picker.goldEarned', { amount: lastGoldEarned })}</p>
        )}
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
                  rarity={sym.rarity}
                />
              </button>
            );
          })}
        </div>

        <div className="picker-info">
          {selectedIndex !== null && revealed ? (
            <>
              <div className="picker-info-name">
                {getSymbol(picks[selectedIndex]).icon} {t(`symbol.${picks[selectedIndex]}.name`)}
              </div>
              <div className="picker-info-desc">
                {t(`symbol.${picks[selectedIndex]}.desc`)}
              </div>
            </>
          ) : (
            <div className="picker-info-hint">{t('picker.tapForInfo')}</div>
          )}
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
