import { useTranslation } from '../i18n/useTranslation.jsx';
import { CONSUMABLE_INDEX, INVENTORY_CAPACITY } from '../gameData';
import { sfx } from '../audio';
import '../styles/InventoryBar.css';

export default function InventoryBar({ inventory = [], disabled, onUse }) {
  const { t } = useTranslation();
  if (inventory.length === 0) return null;

  // Build slot list: filled cells first, then empty placeholders for layout
  const slots = [];
  for (let i = 0; i < INVENTORY_CAPACITY; i++) {
    slots.push(inventory[i] || null);
  }

  return (
    <div className="inventory-bar">
      {slots.map((id, i) => {
        if (!id) return <div key={i} className="inv-slot empty" />;
        const def = CONSUMABLE_INDEX[id];
        return (
          <button
            key={i}
            className={`inv-slot filled ${def?.fused ? 'fused' : ''}`}
            disabled={disabled}
            onClick={() => { sfx.buttonClick(); onUse(id); }}
            title={`${t(`item.${id}.name`)} — ${t(`item.${id}.desc`)}`}
          >
            <span className="inv-slot-icon">{def?.icon || '?'}</span>
            {def?.fused && <span className="inv-slot-badge">+</span>}
          </button>
        );
      })}
    </div>
  );
}
