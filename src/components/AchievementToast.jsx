import { useEffect, useState } from 'react';
import { ACHIEVEMENT_INDEX } from '../achievements';
import { useTranslation } from '../i18n/useTranslation.jsx';
import '../styles/AchievementToast.css';

export default function AchievementToast() {
  const { t } = useTranslation();
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const onAchievement = (e) => {
      const id = e.detail?.id;
      if (!id) return;
      setQueue(q => [...q, { id, key: Date.now() + Math.random() }]);
      // Auto-dismiss after 3.5s
      setTimeout(() => setQueue(q => q.slice(1)), 3500);
    };
    window.addEventListener('slotti:achievement', onAchievement);
    return () => window.removeEventListener('slotti:achievement', onAchievement);
  }, []);

  if (queue.length === 0) return null;

  return (
    <div className="achievement-toast-stack">
      {queue.map(({ id, key }) => {
        const def = ACHIEVEMENT_INDEX[id];
        if (!def) return null;
        return (
          <div key={key} className={`achievement-toast difficulty-${def.difficulty}`}>
            <div className="achievement-toast-icon">🏆</div>
            <div className="achievement-toast-body">
              <div className="achievement-toast-title">{t('achievement.unlocked')}</div>
              <div className="achievement-toast-name">{t(`achievement.${id}.name`)}</div>
              <div className="achievement-toast-desc">{t(`achievement.${id}.desc`)}</div>
            </div>
            <div className="achievement-toast-points">+{def.points}</div>
          </div>
        );
      })}
    </div>
  );
}
