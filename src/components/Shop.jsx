import { useState, useEffect } from 'react';
import ShopItem from './ShopItem';
import { SHOP_ITEMS, calcInterest } from '../gameData';
import { sfx } from '../audio';
import '../styles/Shop.css';

export default function Shop({ state, onBuy, onClose, onSetLockedItems }) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    sfx.shopOpen();

    const lockedNames = new Set(state.lockedItems.map(i => i.name));
    const locked = [...state.lockedItems];
    const unlocked = SHOP_ITEMS.filter(i => !lockedNames.has(i.name));
    const freshPicks = [...unlocked].sort(() => Math.random() - 0.5).slice(0, 3 - locked.length);
    const offering = [...locked, ...freshPicks];

    setEntries(offering.map(item => ({
      item,
      locked: lockedNames.has(item.name),
      sold: false,
    })));
  }, []);

  const handleBuy = (item) => {
    setEntries(prev => prev.map(e =>
      e.item.name === item.name ? { ...e, sold: true, locked: false } : e
    ));
    onBuy(item);
  };

  const handleToggleLock = (item) => {
    setEntries(prev => prev.map(e =>
      e.item.name === item.name ? { ...e, locked: !e.locked } : e
    ));
  };

  const handleClose = () => {
    const newLocked = entries.filter(e => e.locked && !e.sold).map(e => e.item);
    onSetLockedItems(newLocked);
    sfx.buttonClick();
    onClose();
  };

  const nextInterest = calcInterest(state.gold);

  return (
    <div className="shop-overlay">
      <h2>🏪 Shop</h2>
      <div className="shop-gold">💰 {state.gold}</div>
      <div className="shop-interest">
        {state.lastInterest > 0
          ? `+${state.lastInterest} interest earned! (${nextInterest} next)`
          : `Save 10+ gold to earn interest (max +5)`
        }
      </div>
      <div className="shop-items">
        {entries.map((entry) => (
          <ShopItem
            key={entry.item.name}
            item={entry.item}
            locked={entry.locked}
            sold={entry.sold}
            gold={state.gold}
            onBuy={handleBuy}
            onToggleLock={handleToggleLock}
          />
        ))}
      </div>
      <button className="shop-skip" onClick={handleClose}>
        Skip →
      </button>
    </div>
  );
}
