import { useState, useEffect } from 'react';
import ShopItem from './ShopItem';
import { SHOP_ITEMS, calcInterest } from '../gameData';
import { sfx, ensureAudio } from '../audio';
import '../styles/Shop.css';

export default function Shop({ state, onBuy, onClose, onSetLockedItems }) {
  const [entries, setEntries] = useState([]);
  const [selectedName, setSelectedName] = useState(null);

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

  const handleSelect = (item) => {
    ensureAudio();
    if (selectedName === item.name) {
      setSelectedName(null);
      sfx.buttonClick();
    } else {
      setSelectedName(item.name);
      sfx.buttonClick();
    }
  };

  const handleChoose = () => {
    if (!selectedName) return;
    const entry = entries.find(e => e.item.name === selectedName);
    if (!entry || entry.sold) return;

    ensureAudio();
    if (state.gold < entry.item.cost) {
      sfx.cantBuy();
      return;
    }

    sfx.buy();
    setEntries(prev => prev.map(e =>
      e.item.name === selectedName ? { ...e, sold: true, locked: false } : e
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
      e.item.name === item.name ? { ...e, locked: !e.locked } : e
    ));
  };

  const nextInterest = calcInterest(state.gold);
  const canAfford = selectedName
    ? state.gold >= (entries.find(e => e.item.name === selectedName)?.item.cost ?? Infinity)
    : true;

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
            selected={entry.item.name === selectedName}
            gold={state.gold}
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
        Choose
      </button>
      <button className="shop-skip-btn" onClick={handleSkip}>
        Leave Shop →
      </button>
    </div>
  );
}
