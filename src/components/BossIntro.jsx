import { useEffect } from 'react';
import { useTranslation } from '../i18n/useTranslation.jsx';
import { sfx } from '../audio';
import liliImg from '../assets/lili.webp';
import rubyImg from '../assets/ruby.png';
import furzkopfImg from '../assets/furzkopf.webp';
import '../styles/BossIntro.css';

const SPRITE_IMAGES = { lili: liliImg, ruby: rubyImg, furzkopf: furzkopfImg };

// Per-boss colour theme — name colour, glow, and a tag emoji
const BOSS_THEME = {
  lili:     { color: '#e94560', glow: 'rgba(233, 69, 96, 0.55)',  tag: '🩸' },
  ruby:     { color: '#f1c40f', glow: 'rgba(241, 196, 15, 0.55)', tag: '🐾' },
  furzkopf: { color: '#7ed957', glow: 'rgba(126, 217, 87, 0.55)', tag: '💨' },
};

// Auto-dismiss after this many ms unless the player taps to skip
const AUTO_DISMISS_MS = 4500;

export default function BossIntro({ enemy, onDismiss }) {
  const { t } = useTranslation();

  useEffect(() => {
    const t1 = setTimeout(() => sfx.victory?.(), 100);
    const t2 = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDismiss]);

  if (!enemy) return null;
  const theme = BOSS_THEME[enemy.sprite] || { color: '#fff', glow: 'rgba(255,255,255,0.3)', tag: '⚔️' };
  const sprite = SPRITE_IMAGES[enemy.sprite];
  const epithetKey = `boss.${enemy.sprite}.epithet`;
  const quoteKey = `boss.${enemy.sprite}.quote`;
  const epithet = t(epithetKey);
  const quote = t(quoteKey);
  // useTranslation returns the key when missing — hide if so
  const showEpithet = epithet && epithet !== epithetKey;
  const showQuote = quote && quote !== quoteKey;

  return (
    <div className="boss-intro" onClick={onDismiss}>
      <div className="boss-intro-bar top" />
      <div className="boss-intro-bar bottom" />

      <div className="boss-intro-stage">
        <div
          className="boss-intro-sprite"
          style={{ filter: `drop-shadow(0 0 30px ${theme.glow})` }}
        >
          {sprite
            ? <img src={sprite} alt={enemy.name} />
            : <span className="boss-intro-emoji">{enemy.sprite}</span>}
        </div>

        <div className="boss-intro-info">
          <div className="boss-intro-tag" style={{ color: theme.color }}>
            {theme.tag} {t('bossIntro.heading')}
          </div>
          <div
            className="boss-intro-name"
            style={{ color: theme.color, textShadow: `0 0 24px ${theme.glow}` }}
          >
            {enemy.name}
          </div>
          {showEpithet && (
            <div className="boss-intro-epithet">{epithet}</div>
          )}
          {showQuote && (
            <div className="boss-intro-quote">&ldquo;{quote}&rdquo;</div>
          )}
        </div>
      </div>

      <div className="boss-intro-skip">
        {t('bossIntro.skip')}
      </div>
    </div>
  );
}
