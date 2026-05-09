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

export default function FloorMap({ floor, levels, currentLevelIndex, onChoose }) {
  const { t } = useTranslation();
  const pick = (option) => {
    sfx.buttonClick();
    onChoose(option);
  };

  // Render boss at top, then levels reversed (level 5 closest to boss, level 1 at bottom)
  const reversed = [...levels].reverse();

  return (
    <div className="floor-map">
      <div className="floor-map-inner">
        <h2>{t('plan.title', { floor })}</h2>
        <p className="plan-sub">{t('plan.subtitle')}</p>

        <div className="map-tracks">
          <div className="map-row map-row-boss">
            <div className="map-node boss">
              <span className="map-node-icon">💀</span>
              <span className="map-node-label">{t('plan.boss')}</span>
            </div>
          </div>
          {reversed.map((level, idx) => {
            const lvlIdx = levels.length - 1 - idx;
            const isPast = lvlIdx < currentLevelIndex;
            const isCurrent = lvlIdx === currentLevelIndex;
            return (
              <div key={lvlIdx} className={`map-row ${isCurrent ? 'current-row' : ''}`}>
                {level.options.map((opt, i) => {
                  const meta = ROOM_META[opt] || ROOM_META.fight;
                  const isChosen = level.chosen === opt;
                  const isLockedOut = (isPast && !isChosen) || (!isPast && !isCurrent);
                  const className = [
                    'map-node',
                    `type-${opt}`,
                    isChosen ? 'chosen' : '',
                    isCurrent && !isChosen ? 'available' : '',
                    isLockedOut ? 'locked-out' : '',
                  ].join(' ');
                  return (
                    <button
                      key={i}
                      className={className}
                      onClick={() => isCurrent && pick(opt)}
                      disabled={!isCurrent}
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
      </div>
    </div>
  );
}
