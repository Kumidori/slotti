import { useState } from 'react';
import { CHARACTERS } from '../characters';
import { SYMBOLS } from '../gameData';
import { useTranslation } from '../i18n/useTranslation.jsx';
import { sfx, ensureAudio } from '../audio';
import liliImg from '../assets/lili.webp';
import rubyImg from '../assets/ruby.png';
import furzkopfImg from '../assets/furzkopf.webp';
import '../styles/CharacterSelect.css';

const SPRITE_IMAGES = { lili: liliImg, ruby: rubyImg, furzkopf: furzkopfImg };

export default function CharacterSelect({ unlockedChars, onStart }) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState('knight');

  const isUnlocked = (c) => !c.locked || unlockedChars.includes(c.unlockedBy);

  const handleStart = () => {
    ensureAudio();
    sfx.buttonClick();
    onStart(selectedId);
  };

  const select = (id) => {
    sfx.buttonClick();
    setSelectedId(id);
  };

  return (
    <div className="char-select">
      <div className="char-select-inner">
        <h2>{t('charSelect.title')}</h2>
        <p className="char-select-sub">{t('charSelect.subtitle')}</p>

        <div className="char-grid">
          {CHARACTERS.map(c => {
            const unlocked = isUnlocked(c);
            const sel = unlocked && selectedId === c.id;
            return (
              <button
                key={c.id}
                className={`char-card ${sel ? 'selected' : ''} ${!unlocked ? 'locked' : ''}`}
                onClick={() => unlocked && select(c.id)}
                disabled={!unlocked}
              >
                <div className="char-icon">
                  {SPRITE_IMAGES[c.id] && unlocked
                    ? <img src={SPRITE_IMAGES[c.id]} alt={c.id} className="char-img" />
                    : <span className="char-emoji">{unlocked ? c.icon : '🔒'}</span>}
                </div>
                <div className="char-name">{t(`char.${c.id}.name`)}</div>
                {!unlocked && (
                  <div className="char-locked">{t('charSelect.lockedHint')}</div>
                )}
              </button>
            );
          })}
        </div>

        {(() => {
          const sel = CHARACTERS.find(c => c.id === selectedId);
          if (!sel) return null;
          const counts = {};
          sel.pool.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
          return (
            <div className="char-detail">
              <div className="char-detail-desc">{t(`char.${sel.id}.desc`)}</div>
              {sel.passive && (
                <div className="char-passive">
                  <span className="char-passive-tag">★ {t(`passive.${sel.passive}.name`)}</span>
                  <span className="char-passive-desc">{t(`passive.${sel.passive}.desc`)}</span>
                </div>
              )}
              <div className="char-pool">
                {SYMBOLS.filter(s => counts[s.id]).map(s => (
                  <span key={s.id} className="char-pool-item">
                    <span className="char-pool-icon">{s.icon}</span>
                    <span className="char-pool-count">×{counts[s.id]}</span>
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        <button className="char-start" onClick={handleStart}>
          {t('charSelect.start')}
        </button>
      </div>
    </div>
  );
}
