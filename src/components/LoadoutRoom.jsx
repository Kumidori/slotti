import { useTranslation } from '../i18n/useTranslation.jsx';
import { CONSUMABLE_INDEX, CHEST_CAPACITY, INVENTORY_CAPACITY } from '../gameData';
import { sfx } from '../audio';
import '../styles/LoadoutRoom.css';

function ItemCell({ itemId, onClick, label }) {
  const { t } = useTranslation();
  if (!itemId) {
    return <div className="loadout-cell empty">{label || ''}</div>;
  }
  const def = CONSUMABLE_INDEX[itemId];
  return (
    <button
      className="loadout-cell filled"
      onClick={() => { sfx.buttonClick(); onClick?.(itemId); }}
      title={`${t(`item.${itemId}.name`)} — ${t(`item.${itemId}.desc`)}`}
    >
      <span className="loadout-cell-icon">{def?.icon || '?'}</span>
    </button>
  );
}

export default function LoadoutRoom({
  chest = [],
  inventory = [],
  pendingRoomNode,
  onMoveToInventory,
  onMoveToChest,
  onConfirm,
}) {
  const { t } = useTranslation();
  const inventoryFull = inventory.length >= INVENTORY_CAPACITY;
  const chestFull = chest.length >= CHEST_CAPACITY;
  const roomLabelKey = pendingRoomNode?.type
    ? `path.${pendingRoomNode.type}`
    : 'path.fight';

  return (
    <div className="loadout-room">
      <div className="loadout-inner">
        <h2>🎒 {t('loadout.title')}</h2>
        <p className="loadout-sub">{t('loadout.subtitle', { room: t(roomLabelKey) })}</p>

        <div className="loadout-section">
          <div className="loadout-section-header">
            <span>{t('loadout.inventory')}</span>
            <span className="loadout-count">{inventory.length}/{INVENTORY_CAPACITY}</span>
          </div>
          <div className="loadout-grid inventory">
            {Array.from({ length: INVENTORY_CAPACITY }).map((_, i) => (
              <ItemCell
                key={`inv-${i}`}
                itemId={inventory[i]}
                onClick={onMoveToChest}
                label="—"
              />
            ))}
          </div>
          <div className="loadout-hint">{t('loadout.hintInventory')}</div>
        </div>

        <div className="loadout-section">
          <div className="loadout-section-header">
            <span>{t('loadout.chest')}</span>
            <span className="loadout-count">{chest.length}/{CHEST_CAPACITY}</span>
          </div>
          <div className="loadout-grid chest">
            {Array.from({ length: CHEST_CAPACITY }).map((_, i) => (
              <ItemCell
                key={`chest-${i}`}
                itemId={chest[i]}
                onClick={inventoryFull ? undefined : onMoveToInventory}
              />
            ))}
          </div>
          <div className="loadout-hint">
            {inventoryFull ? t('loadout.inventoryFull') : t('loadout.hintChest')}
          </div>
        </div>

        <button className="loadout-confirm" onClick={() => { sfx.buttonClick(); onConfirm(); }}>
          ⚔️ {t('loadout.confirm')}
        </button>
      </div>
    </div>
  );
}
