import { useTranslation } from '../i18n/useTranslation.jsx';
import { sfx } from '../audio';
import '../styles/PathChoice.css';

const ROOM_META = {
  fight:     { icon: '⚔️',  labelKey: 'path.fight',     descKey: 'path.fight.desc' },
  elite:     { icon: '👹',  labelKey: 'path.elite',     descKey: 'path.elite.desc' },
  shop:      { icon: '💰',  labelKey: 'path.shop',      descKey: 'path.shop.desc' },
  sacrifice: { icon: '🪦',  labelKey: 'path.sacrifice', descKey: 'path.sacrifice.desc' },
  rest:      { icon: '🏕️', labelKey: 'path.rest',      descKey: 'path.rest.desc' },
};

export default function PathChoice({ choices, onPick }) {
  const { t } = useTranslation();
  const pick = (type) => {
    sfx.buttonClick();
    onPick(type);
  };

  return (
    <div className="path-choice">
      <div className="path-choice-inner">
        <h2>{t('path.title')}</h2>
        <p className="path-sub">{t('path.subtitle')}</p>
        <div className="path-cards">
          {choices.map((type, i) => {
            const meta = ROOM_META[type] || ROOM_META.fight;
            return (
              <button key={i} className={`path-card type-${type}`} onClick={() => pick(type)}>
                <span className="path-card-icon">{meta.icon}</span>
                <span className="path-card-label">{t(meta.labelKey)}</span>
                <span className="path-card-desc">{t(meta.descKey)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
