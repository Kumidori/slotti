import { useState, useEffect } from 'react';
import ShopItem from './ShopItem';
import { SHOP_ITEMS, calcInterest, pickByRarity } from '../gameData';
import { sfx, ensureAudio } from '../audio';
import { useTranslation } from '../i18n/useTranslation.jsx';
import { shopRerollCost } from '../hooks/useGameState';
import '../styles/Shop.css';

export default function Shop({ state, onBuy, onClose, onSetLockedItems, onReroll }) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [selectedName, setSelectedName] = useState(null);

  useEffect(() => {
    sfx.shopOpen();

    const lockedIds = new Set(state.lockedItems.map(i => i.id));
    const locked = [...state.lockedItems];
    const unlocked = SHOP_ITEMS.filter(i => !lockedIds.has(i.id));
    const freshPicks = pickByRarity(unlocked, 3 - locked.length);
    const offering = [...locked, ...freshPicks];

    setEntries(offering.map(item => ({
      item,
      locked: lockedIds.has(item.id),
      sold: false,
    })));
    setSelectedName(null);
  }, [state.shopRerollKey]);

  const handleSelect = (item) => {
    ensureAudio();
    if (selectedName === item.id) {
      setSelectedName(null);
      sfx.buttonClick();
    } else {
      setSelectedName(item.id);
      sfx.buttonClick();
    }
  };

  const handleChoose = () => {
    if (!selectedName) return;
    const entry = entries.find(e => e.item.id === selectedName);
    if (!entry || entry.sold) return;

    ensureAudio();
    if (state.gold < entry.item.cost) {
      sfx.cantBuy();
      return;
    }

    sfx.buy();
    setEntries(prev => prev.map(e =>
      e.item.id === selectedName ? { ...e, sold: true, locked: false } : e
    ));
    onBuy(entry.item);
    setSelectedName(null);
  };

  const handleSkip = () => {
    const newLocked = entries.filter(e => e.locked && !e.sold).map(e => e.item);
    onSetLockedItems(newLocked);
    sfx.buttonClick();
    onClose();
  };

  const handleToggleLock = (item) => {
    setEntries(prev => prev.map(e =>
      e.item.id === item.id ? { ...e, locked: !e.locked } : e
    ));
  };

  const bargainStacks = state.relics?.filter(r => r === 'bargainHunter').length || 0;
  const discount = Math.max(0.4, 1 - 0.2 * bargainStacks);
  const pennyStacks = state.relics?.filter(r => r === 'pennyPincher').length || 0;
  const interestCap = 5 + 5 * pennyStacks;
  const nextInterest = calcInterest(state.gold, interestCap);
  const selectedItem = entries.find(e => e.item.id === selectedName)?.item;
  const selectedCost = selectedItem ? Math.ceil(selectedItem.cost * discount) : Infinity;
  const canAfford = selectedName ? state.gold >= selectedCost : true;
  const rerollPrice = shopRerollCost(state.shopRerollCount || 0, state.luckBonus || 0);
  const canReroll = state.gold >= rerollPrice;

  return (
    <div className="shop-overlay">
      <h2>{t('shop.title')}</h2>
      <div className="shop-gold">💰 {state.gold}</div>
      <div className="shop-interest">
        {state.lastInterest > 0
          ? t('shop.interestEarned', { interest: state.lastInterest, next: nextInterest })
          : t('shop.interestPrompt')
        }
      </div>
      <div className="shop-items">
        {entries.map((entry) => (
          <ShopItem
            key={entry.item.id}
            item={entry.item}
            locked={entry.locked}
            sold={entry.sold}
            selected={entry.item.id === selectedName}
            gold={state.gold}
            discount={discount}
            onSelect={handleSelect}
            onToggleLock={handleToggleLock}
          />
        ))}
      </div>
      <button
        className={`shop-choose-btn ${!canAfford ? 'cant-afford' : ''}`}
        onClick={handleChoose}
        disabled={!selectedName || !canAfford}
      >
        {t('shop.choose')}
      </button>
      <div className="shop-bottom-row">
        <button
          className="shop-reroll-btn"
          onClick={() => { sfx.buttonClick(); onReroll?.(); }}
          disabled={!canReroll}
          title={canReroll ? `Reroll for ${rerollPrice}g` : `Need ${rerollPrice}g`}
        >
          🎲 {t('shop.reroll')} <span className="reroll-cost">{rerollPrice}g</span>
        </button>
        <button className="shop-skip-btn" onClick={handleSkip}>
          {t('shop.leave')}
        </button>
      </div>
    </div>
  );
}
