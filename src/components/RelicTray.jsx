import { useState } from 'react';
import { SHOP_ITEMS } from '../gameData';
import { useTranslation } from '../i18n/useTranslation.jsx';
import '../styles/RelicTray.css';

const RELIC_INDEX = Object.fromEntries(
  SHOP_ITEMS.filter(i => i.type === 'relic').map(i => [i.id, i])
);

export default function RelicTray({ relics }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(null);

  if (!relics || relics.length === 0) return null;

  return (
    <div className="relic-tray">
      {relics.map((id, i) => {
        const def = RELIC_INDEX[id];
        if (!def) return null;
        return (
          <button
            key={`${id}-${i}`}
            className={`relic-chip rarity-${def.rarity || 'common'}`}
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="relic-chip-icon">{def.icon}</span>
            {open === i && (
              <div className="relic-popover" onClick={e => e.stopPropagation()}>
                <div className="relic-popover-name">{t(`relic.${id}.name`)}</div>
                <div className="relic-popover-desc">{t(`relic.${id}.desc`)}</div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
