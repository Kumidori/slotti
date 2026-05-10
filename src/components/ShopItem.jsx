import { ensureAudio, sfx } from '../audio';
import { useTranslation } from '../i18n/useTranslation.jsx';
import { SHOP_ITEMS } from '../gameData';
import '../styles/Shop.css';

const ITEM_BY_ID = Object.fromEntries(SHOP_ITEMS.map(i => [i.id, i]));

export default function ShopItem({ item, locked, sold, selected, gold, discount = 1, ownedRelics = [], onSelect, onToggleLock }) {
  const { t } = useTranslation();
  const finalCost = Math.ceil(item.cost * discount);
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

  // Recipe ingredient check — counts each owned relic at most once per ingredient
  let ingredientStatus = null;
  let ingredientsOk = true;
  if (item.type === 'recipe') {
    const remaining = [...ownedRelics];
    ingredientStatus = (item.ingredients || []).map(ing => {
      const idx = remaining.indexOf(ing);
      const owned = idx !== -1;
      if (owned) remaining.splice(idx, 1);
      else ingredientsOk = false;
      return { id: ing, owned };
    });
  }

  const cantAfford = gold < finalCost;
  const cantBuy = cantAfford || (item.type === 'recipe' && !ingredientsOk);
  const prefix = item.type === 'relic' ? 'relic' : item.type === 'recipe' ? 'recipe' : 'item';
  const rarity = item.rarity || 'common';

  return (
    <div
      className={`shop-item rarity-${rarity} ${sold ? 'sold' : ''} ${selected ? 'selected' : ''} ${cantBuy && !sold ? 'cant-afford' : ''} ${item.type === 'relic' ? 'is-relic' : ''} ${item.type === 'recipe' ? 'is-recipe' : ''}`}
      onClick={handleTap}
    >
      <div className="item-icon">{item.icon}</div>
      <div className="shop-item-info">
        <div className="item-name">
          {t(`${prefix}.${item.id}.name`)}
          {item.type === 'relic' && <span className="relic-tag">✨</span>}
          {item.type === 'recipe' && <span className="recipe-tag">📜</span>}
        </div>
        <div className="item-desc">{t(`${prefix}.${item.id}.desc`)}</div>
        {ingredientStatus && (
          <div className="recipe-ingredients">
            {ingredientStatus.map(({ id, owned }, i) => {
              const ing = ITEM_BY_ID[id];
              return (
                <span
                  key={i}
                  className={`recipe-ing ${owned ? 'have' : 'need'}`}
                  title={ing ? t(`relic.${id}.name`) : id}
                >
                  {ing?.icon || '?'} {owned ? '✓' : '✗'}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <div className="item-cost">
        {discount < 1 && <span className="item-cost-old">{item.cost}</span>}
        💰 {finalCost}
      </div>
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
