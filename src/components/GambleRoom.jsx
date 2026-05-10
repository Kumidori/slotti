import { useEffect } from 'react';
import { useTranslation } from '../i18n/useTranslation.jsx';
import { sfx } from '../audio';
import '../styles/GambleRoom.css';

export default function GambleRoom({
  gold, gambleBet, gambleAnim, gambleReveal,
  onSetBet, onPlay, onLeave, onClearAnim,
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!gambleAnim) return;
    const timer = setTimeout(() => onClearAnim?.(), 800);
    return () => clearTimeout(timer);
  }, [gambleAnim, onClearAnim]);

  const canBet = gold > 0;
  const bet = Math.min(gambleBet, Math.max(1, gold));
  const adjust = (delta) => onSetBet(Math.max(1, Math.min(gold, bet + delta)));

  const pickColor = (color) => {
    if (!canBet) return;
    sfx.buttonClick();
    onPlay(color);
  };

  return (
    <div className="gamble-room">
      <div className={`gamble-room-inner ${gambleAnim ? 'flash-' + gambleAnim : ''}`}>
        <h2>🎰 {t('gambleRoom.title')}</h2>
        <p className="gamble-room-sub">{t('gambleRoom.subtitle')}</p>

        <div className="gamble-room-gold">💰 {gold}g</div>

        {gambleReveal && (
          <div className={`gamble-reveal ${gambleReveal.drawn}`}>
            <span className="gamble-reveal-card">
              {gambleReveal.drawn === 'red' ? '🟥' : '⬛'}
            </span>
            <span className="gamble-reveal-label">
              {gambleReveal.drawn === 'red' ? t('gamble.red') : t('gamble.black')}
              {' '}{gambleReveal.win
                ? `+${gambleReveal.delta}g`
                : `${gambleReveal.delta}g`}
            </span>
          </div>
        )}

        <div className="gamble-bet-row">
          <span className="gamble-bet-label">{t('gambleRoom.yourBet')}</span>
          <div className="gamble-bet-controls">
            <button onClick={() => adjust(-10)} disabled={bet <= 1}>−10</button>
            <button onClick={() => adjust(-1)}  disabled={bet <= 1}>−1</button>
            <span className="gamble-bet-value">{bet}g</span>
            <button onClick={() => adjust(+1)}  disabled={bet >= gold}>+1</button>
            <button onClick={() => adjust(+10)} disabled={bet >= gold}>+10</button>
          </div>
          <div className="gamble-bet-shortcuts">
            <button onClick={() => onSetBet(Math.max(1, Math.floor(gold / 4)))}>¼</button>
            <button onClick={() => onSetBet(Math.max(1, Math.floor(gold / 2)))}>½</button>
            <button onClick={() => onSetBet(Math.max(1, gold))}>MAX</button>
          </div>
        </div>

        <div className="gamble-actions">
          <button
            className="gamble-btn color-btn red"
            onClick={() => pickColor('red')}
            disabled={!canBet}
          >
            🟥 {t('gamble.red')}
          </button>
          <button
            className="gamble-btn color-btn black"
            onClick={() => pickColor('black')}
            disabled={!canBet}
          >
            ⬛ {t('gamble.black')}
          </button>
        </div>

        <div className="gamble-room-hint">{t('gambleRoom.hint', { win: bet, lose: bet })}</div>

        <button className="gamble-leave" onClick={onLeave}>
          {t('gambleRoom.leave')}
        </button>
      </div>
    </div>
  );
}
