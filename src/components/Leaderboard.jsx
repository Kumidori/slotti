import { useTranslation } from '../i18n/useTranslation.jsx';
import { loadLeaderboard } from '../leaderboard';
import { getCharacter } from '../characters';
import '../styles/Leaderboard.css';

const CHAR_ICONS = { knight: '⚔️', mage: '🧙', lili: '👧', ruby: '🐕', furzkopf: '👷' };

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export default function Leaderboard({ onClose }) {
  const { t } = useTranslation();
  const entries = loadLeaderboard();

  return (
    <div className="leaderboard-overlay" onClick={onClose}>
      <div className="leaderboard-inner" onClick={(e) => e.stopPropagation()}>
        <h2>🏆 {t('leaderboard.title')}</h2>
        {entries.length === 0 ? (
          <p className="leaderboard-empty">{t('leaderboard.empty')}</p>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('leaderboard.character')}</th>
                <th>{t('leaderboard.floor')}</th>
                <th>{t('leaderboard.gold')}</th>
                <th>{t('leaderboard.result')}</th>
                <th>{t('leaderboard.date')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const c = getCharacter(e.character);
                return (
                  <tr key={i} className={`row-${e.result}`}>
                    <td>{i + 1}</td>
                    <td className="cell-char">
                      <span className="lb-char-icon">{CHAR_ICONS[e.character] || '?'}</span>
                      <span className="lb-char-name">{c ? t(`char.${c.id}.name`) : '?'}</span>
                    </td>
                    <td>{e.floor}{e.room != null ? `–${e.room}` : ''}</td>
                    <td>{e.totalGoldEarned}g</td>
                    <td>
                      {e.result === 'win'
                        ? <span className="lb-win">🏆 {t('leaderboard.win')}</span>
                        : <span className="lb-loss">💀 {t('leaderboard.loss')}</span>}
                    </td>
                    <td className="cell-date">{formatDate(e.date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <button className="leaderboard-close" onClick={onClose}>
          {t('leaderboard.close')}
        </button>
      </div>
    </div>
  );
}
