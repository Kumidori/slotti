import { useTranslation } from '../i18n/useTranslation.jsx';
import { CONSUMABLE_INDEX, CHEST_CAPACITY, INVENTORY_CAPACITY, FUSION_RECIPES } from '../gameData';
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
      className={`loadout-cell filled ${def?.fused ? 'fused' : ''}`}
      onClick={() => { sfx.buttonClick(); onClick?.(itemId); }}
      title={`${t(`item.${itemId}.name`)} — ${t(`item.${itemId}.desc`)}`}
    >
      <span className="loadout-cell-icon">{def?.icon || '?'}</span>
      {def?.fused && <span className="loadout-cell-badge">+</span>}
    </button>
  );
}

export default function LoadoutRoom({
  chest = [],
  inventory = [],
  pendingRoomNode,
  onMoveToInventory,
  onMoveToChest,
  onFuse,
  onConfirm,
}) {
  const { t } = useTranslation();
  const inventoryFull = inventory.length >= INVENTORY_CAPACITY;
  const chestFull = chest.length >= CHEST_CAPACITY;

  // Detect which base items have ≥3 in chest → can be fused
  const counts = {};
  for (const id of chest) counts[id] = (counts[id] || 0) + 1;
  const fusable = Object.keys(FUSION_RECIPES).filter(id => (counts[id] || 0) >= 3);
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
          {fusable.length > 0 && (
            <div className="loadout-fusions">
              <div className="loadout-fusions-label">⚗️ {t('loadout.fusions')}</div>
              {fusable.map(id => {
                const baseDef = CONSUMABLE_INDEX[id];
                const fusedDef = CONSUMABLE_INDEX[FUSION_RECIPES[id]];
                return (
                  <button
                    key={id}
                    className="loadout-fuse-btn"
                    onClick={() => { sfx.buttonClick(); onFuse?.(id); }}
                  >
                    <span>{baseDef?.icon}×3</span>
                    <span className="fuse-arrow">→</span>
                    <span className="fuse-result">{fusedDef?.icon}<sup>+</sup></span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button className="loadout-confirm" onClick={() => { sfx.buttonClick(); onConfirm(); }}>
          ⚔️ {t('loadout.confirm')}
        </button>
      </div>
    </div>
  );
}
