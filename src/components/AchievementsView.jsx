import { useTranslation } from '../i18n/useTranslation.jsx';
import { ACHIEVEMENTS, loadUnlocked, totalPoints } from '../achievements';
import '../styles/AchievementsView.css';

export default function AchievementsView({ onClose }) {
  const { t } = useTranslation();
  const owned = new Set(loadUnlocked());
  const points = totalPoints();
  const ownedCount = owned.size;
  const total = ACHIEVEMENTS.length;

  return (
    <div className="ach-overlay" onClick={onClose}>
      <div className="ach-inner" onClick={(e) => e.stopPropagation()}>
        <h2>🏆 {t('achievements.title')}</h2>
        <div className="ach-summary">
          <span>{t('achievements.unlockedCount', { owned: ownedCount, total })}</span>
          <span className="ach-points">{points} {t('achievements.points')}</span>
        </div>
        <div className="ach-list">
          {ACHIEVEMENTS.map(a => {
            const isOwned = owned.has(a.id);
            return (
              <div
                key={a.id}
                className={`ach-card difficulty-${a.difficulty} ${isOwned ? 'owned' : 'locked'}`}
              >
                <div className="ach-card-icon">{isOwned ? '🏆' : '🔒'}</div>
                <div className="ach-card-body">
                  <div className="ach-card-name">
                    {isOwned ? t(`achievement.${a.id}.name`) : '???'}
                  </div>
                  <div className="ach-card-desc">{t(`achievement.${a.id}.desc`)}</div>
                </div>
                <div className="ach-card-points">+{a.points}</div>
              </div>
            );
          })}
        </div>
        <button className="ach-close" onClick={onClose}>
          {t('achievements.close')}
        </button>
      </div>
    </div>
  );
}
