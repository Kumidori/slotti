import { useTranslation } from '../i18n/useTranslation.jsx';
import { sfx } from '../audio';
import '../styles/FloorMap.css';

const ROOM_META = {
  fight:     { icon: '⚔️',  labelKey: 'path.fight' },
  elite:     { icon: '👹',  labelKey: 'path.elite' },
  shop:      { icon: '💰',  labelKey: 'path.shop' },
  sacrifice: { icon: '🪦',  labelKey: 'path.sacrifice' },
  rest:      { icon: '🏕️', labelKey: 'path.rest' },
};

export default function FloorMap({ floor, levels, onSelect, onCommit }) {
  const { t } = useTranslation();
  const allChosen = levels.every(l => l.chosen);

  const pick = (level, option) => {
    sfx.buttonClick();
    onSelect(level, option);
  };
  const start = () => {
    sfx.buttonClick();
    onCommit();
  };

  // Render top-down: boss first, then levels reversed (level 5 closest to boss)
  // Visually: boss on top, then row 5 (one before boss), down to row 1 (start)
  const reversed = [...levels].reverse(); // index 0 = level 5

  return (
    <div className="floor-map">
      <div className="floor-map-inner">
        <h2>{t('plan.title', { floor })}</h2>
        <p className="plan-sub">{t('plan.subtitle')}</p>

        <div className="map-tracks">
          {/* Boss row at the top */}
          <div className="map-row map-row-boss">
            <div className="map-node boss">
              <span className="map-node-icon">💀</span>
              <span className="map-node-label">{t('plan.boss')}</span>
            </div>
          </div>
          {/* Levels from top (level 5) down to bottom (level 1) */}
          {reversed.map((level, idx) => {
            // actual level index (0-4)
            const lvlIdx = levels.length - 1 - idx;
            return (
              <div key={lvlIdx} className="map-row">
                {level.options.map((opt, i) => {
                  const meta = ROOM_META[opt] || ROOM_META.fight;
                  const isChosen = level.chosen === opt;
                  const otherChosen = level.chosen && level.chosen !== opt;
                  return (
                    <button
                      key={i}
                      className={`map-node type-${opt} ${isChosen ? 'chosen' : ''} ${otherChosen ? 'dimmed' : ''}`}
                      onClick={() => pick(lvlIdx, opt)}
                    >
                      <span className="map-node-icon">{meta.icon}</span>
                      <span className="map-node-label">{t(meta.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <button
          className="plan-start"
          onClick={start}
          disabled={!allChosen}
        >
          {allChosen ? t('plan.start') : t('plan.pickAll')}
        </button>
      </div>
    </div>
  );
}
