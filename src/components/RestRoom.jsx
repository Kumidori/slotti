import { useTranslation } from '../i18n/useTranslation.jsx';
import { sfx } from '../audio';
import '../styles/RestRoom.css';

export default function RestRoom({ playerHp, playerMaxHp, onContinue }) {
  const { t } = useTranslation();
  return (
    <div className="rest-room">
      <div className="rest-inner">
        <h2>🏕️ {t('rest.title')}</h2>
        <p className="rest-sub">{t('rest.subtitle')}</p>
        <div className="rest-hp">{playerHp} / {playerMaxHp} HP</div>
        <button
          className="rest-continue"
          onClick={() => { sfx.buttonClick(); onContinue(); }}
        >
          {t('rest.continue')}
        </button>
      </div>
    </div>
  );
}
