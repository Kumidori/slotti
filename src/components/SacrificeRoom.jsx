import { useState, useEffect, useRef } from 'react';
import Reel from './Reel';
import { SYMBOLS, getSymbol } from '../gameData';
import { useTranslation } from '../i18n/useTranslation.jsx';
import { sfx } from '../audio';
import '../styles/SacrificeRoom.css';

const REVEAL_DURATION = 1100;

export default function SacrificeRoom({ pool, sacrificeChosen, sacrificeReward, onSacrifice, onSkip, onFinish }) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  const tickRef = useRef(null);

  // When a reward arrives, animate the reel
  useEffect(() => {
    if (!sacrificeReward) return;
    setSpinning(true);
    setSpinKey(k => k + 1);
    sfx.spinStart();
    tickRef.current = setInterval(() => sfx.reelTick(), 80);
    const stop = setTimeout(() => {
      setSpinning(false);
      sfx.reelStop(0);
      sfx.victory();
      clearInterval(tickRef.current);
    }, REVEAL_DURATION);
    return () => {
      clearTimeout(stop);
      clearInterval(tickRef.current);
    };
  }, [sacrificeReward]);

  // Group pool by id with counts
  const counts = {};
  pool.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
  const distinctSymbols = SYMBOLS.filter(s => counts[s.id] > 0);

  const handleSacrifice = () => {
    if (!selectedId) return;
    sfx.buttonClick();
    onSacrifice(selectedId);
    setSelectedId(null);
  };

  const rewardSym = sacrificeReward ? getSymbol(sacrificeReward) : null;
  const showResult = !!sacrificeReward;

  return (
    <div className="sacrifice-room">
      <div className="sacrifice-inner">
        <h2>{t('sacrifice.title')}</h2>
        <p className="sacrifice-sub">
          {showResult ? t('sacrifice.resultSub') : t('sacrifice.subtitle')}
        </p>

        {!showResult && (
          <>
            <div className="sacrifice-pool">
              {distinctSymbols.map(s => {
                const isSel = selectedId === s.id;
                return (
                  <button
                    key={s.id}
                    className={`sacrifice-symbol ${isSel ? 'selected' : ''}`}
                    onClick={() => { sfx.buttonClick(); setSelectedId(s.id); }}
                  >
                    <span className="sacrifice-symbol-icon">{s.icon}</span>
                    <span className="sacrifice-symbol-count">×{counts[s.id]}</span>
                  </button>
                );
              })}
            </div>

            <button
              className="sacrifice-confirm"
              onClick={handleSacrifice}
              disabled={!selectedId}
            >
              {t('sacrifice.choose')}
            </button>
            <button className="sacrifice-skip" onClick={onSkip}>
              {t('sacrifice.skip')}
            </button>
          </>
        )}

        {showResult && (
          <>
            <div className="sacrifice-result">
              <div className="sacrifice-result-row">
                <div className="sacrifice-result-label">{t('sacrifice.gave')}</div>
                <div className="sacrifice-given">{getSymbol(sacrificeChosen)?.icon}</div>
              </div>
              <div className="sacrifice-arrow">→</div>
              <div className="sacrifice-result-row">
                <div className="sacrifice-result-label">{t('sacrifice.got')}</div>
                <Reel
                  icon={rewardSym?.icon}
                  spinning={spinning}
                  spinDuration={REVEAL_DURATION}
                  spinKey={spinKey}
                />
              </div>
            </div>
            <button
              className="sacrifice-confirm"
              onClick={onFinish}
              disabled={spinning}
            >
              {t('sacrifice.continue')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
