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

  return (
    <div
      className={`shop-item ${sold ? 'sold' : ''} ${selected ? 'selected' : ''} ${cantAfford && !sold ? 'cant-afford' : ''}`}
      onClick={handleTap}
    >
      <div className="item-icon">{item.icon}</div>
      <div className="shop-item-info">
        <div className="item-name">{t(`item.${item.effectKey}.name`)}</div>
        <div className="item-desc">{t(`item.${item.effectKey}.desc`)}</div>
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
