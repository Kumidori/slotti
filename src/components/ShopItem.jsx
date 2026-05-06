import { ensureAudio, sfx } from '../audio';
import { useTranslation } from '../i18n/useTranslation.jsx';
import '../styles/Shop.css';

export default function ShopItem({ item, locked, sold, selected, gold, onSelect, onToggleLock }) {
  const { t } = useTranslation();
  const handleTap = () => {
    if (sold) return;
    onSelect(item);
  };

  const handleLock = (e) => {
    e.stopPropagation();
    if (sold) return;
    ensureAudio();
    sfx.buttonClick();
    onToggleLock(item);
  };

  const cantAfford = gold < item.cost;
  const prefix = item.type === 'relic' ? 'relic' : 'item';

  return (
    <div
      className={`shop-item ${sold ? 'sold' : ''} ${selected ? 'selected' : ''} ${cantAfford && !sold ? 'cant-afford' : ''} ${item.type === 'relic' ? 'is-relic' : ''}`}
      onClick={handleTap}
    >
      <div className="item-icon">{item.icon}</div>
      <div className="shop-item-info">
        <div className="item-name">
          {t(`${prefix}.${item.id}.name`)}
          {item.type === 'relic' && <span className="relic-tag">✨</span>}
        </div>
        <div className="item-desc">{t(`${prefix}.${item.id}.desc`)}</div>
      </div>
      <div className="item-cost">💰 {item.cost}</div>
      <button
        className={`lock-btn ${locked ? 'locked' : ''}`}
        onClick={handleLock}
        title={locked ? 'Unlock' : 'Lock for next shop'}
      >
        {locked ? '🔒' : '🔓'}
      </button>
    </div>
  );
}
