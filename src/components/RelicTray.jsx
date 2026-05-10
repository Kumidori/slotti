import { useState } from 'react';
import { SHOP_ITEMS, COMPOUND_RELICS } from '../gameData';
import { useTranslation } from '../i18n/useTranslation.jsx';
import '../styles/RelicTray.css';

const RELIC_INDEX = Object.fromEntries([
  ...SHOP_ITEMS.filter(i => i.type === 'relic').map(i => [i.id, i]),
  ...COMPOUND_RELICS.map(r => [r.id, r]),
]);

export default function RelicTray({ relics }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(null);

  if (!relics || relics.length === 0) return null;

  // Group by id with counts, preserving first-acquired order
  const seen = [];
  const counts = {};
  for (const id of relics) {
    if (counts[id]) counts[id]++;
    else { counts[id] = 1; seen.push(id); }
  }

  return (
    <div className="relic-tray">
      {seen.map((id) => {
        const def = RELIC_INDEX[id];
        if (!def) return null;
        const count = counts[id];
        return (
          <button
            key={id}
            className={`relic-chip rarity-${def.rarity || 'common'}`}
            onClick={() => setOpen(open === id ? null : id)}
          >
            <span className="relic-chip-icon">{def.icon}</span>
            {count > 1 && <span className="relic-chip-count">×{count}</span>}
            {open === id && (
              <div className="relic-popover" onClick={e => e.stopPropagation()}>
                <div className="relic-popover-name">
                  {t(`relic.${id}.name`)}{count > 1 ? ` ×${count}` : ''}
                </div>
                <div className="relic-popover-desc">{t(`relic.${id}.desc`)}</div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
