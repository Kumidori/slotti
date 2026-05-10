import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/useTranslation.jsx';
import {
  loadLeaderboard, fetchOnline, submitOnline,
  getPlayerName, setPlayerName,
} from '../leaderboard';
import { getCharacter } from '../characters';
import '../styles/Leaderboard.css';

const CHAR_ICONS = { knight: '⚔️', mage: '🧙', lili: '👧', ruby: '🐕', furzkopf: '👷' };

function formatDate(ts) {
  if (!ts) return '';
  const d = typeof ts === 'string' ? new Date(ts) : new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export default function Leaderboard({ onClose }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('online'); // 'online' | 'local'
  const [localEntries] = useState(() => loadLeaderboard());
  const [onlineEntries, setOnlineEntries] = useState(null); // null = loading, [] = empty/error
  const [onlineError, setOnlineError] = useState(false);
  const [name, setName] = useState(() => getPlayerName());
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  // Latest local entry the user might want to share (their last finished run)
  const latestLocal = localEntries[0] || null;

  useEffect(() => {
    if (tab !== 'online' || onlineEntries !== null) return;
    let cancelled = false;
    fetchOnline().then(list => {
      if (cancelled) return;
      if (list === null) { setOnlineError(true); setOnlineEntries([]); }
      else setOnlineEntries(list);
    });
    return () => { cancelled = true; };
  }, [tab, onlineEntries]);

  const handleNameChange = (v) => {
    setName(v);
    setPlayerName(v);
  };

  const handleSubmitLatest = async () => {
    if (!latestLocal || !name.trim() || submitting) return;
    setSubmitting(true);
    const entries = await submitOnline(latestLocal, name.trim());
    setSubmitting(false);
    if (entries) {
      setOnlineEntries(entries);
      setJustSubmitted(true);
      setTimeout(() => setJustSubmitted(false), 2000);
    } else {
      setOnlineError(true);
    }
  };

  const renderTable = (entries, opts = {}) => {
    if (!entries || entries.length === 0) {
      return <p className="leaderboard-empty">{t('leaderboard.empty')}</p>;
    }
    return (
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            {opts.showName && <th>{t('leaderboard.name')}</th>}
            <th>{t('leaderboard.character')}</th>
            <th>{t('leaderboard.floor')}</th>
            <th>{t('leaderboard.score')}</th>
            <th>{t('leaderboard.gold')}</th>
            <th>{t('leaderboard.achievements')}</th>
            <th>{t('leaderboard.result')}</th>
            <th>{t('leaderboard.date')}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const c = getCharacter(e.character);
            const goldVal = e.totalGoldEarned ?? e.gold ?? 0;
            const scoreVal = e.score ?? 0;
            const dateVal = e.date ?? e.when;
            return (
              <tr key={i} className={`row-${e.result}`}>
                <td>{i + 1}</td>
                {opts.showName && <td className="cell-name">{e.name || '—'}</td>}
                <td className="cell-char">
                  <span className="lb-char-icon">{CHAR_ICONS[e.character] || '?'}</span>
                  <span className="lb-char-name">{c ? t(`char.${c.id}.name`) : '?'}</span>
                </td>
                <td>{e.floor}{e.room != null ? `–${e.room}` : ''}</td>
                <td className="cell-score">{scoreVal}</td>
                <td>{goldVal}g</td>
                <td className="cell-achievements">⭐ {e.achievementPoints || 0}</td>
                <td>
                  {e.result === 'win'
                    ? <span className="lb-win">🏆 {t('leaderboard.win')}</span>
                    : <span className="lb-loss">💀 {t('leaderboard.loss')}</span>}
                </td>
                <td className="cell-date">{formatDate(dateVal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="leaderboard-overlay" onClick={onClose}>
      <div className="leaderboard-inner" onClick={(e) => e.stopPropagation()}>
        <h2>🏆 {t('leaderboard.title')}</h2>

        <div className="leaderboard-tabs">
          <button
            className={`leaderboard-tab ${tab === 'online' ? 'active' : ''}`}
            onClick={() => setTab('online')}
          >
            🌐 {t('leaderboard.online')}
          </button>
          <button
            className={`leaderboard-tab ${tab === 'local' ? 'active' : ''}`}
            onClick={() => setTab('local')}
          >
            📱 {t('leaderboard.local')}
          </button>
        </div>

        {tab === 'online' && (
          <>
            <div className="leaderboard-name-row">
              <input
                type="text"
                className="leaderboard-name-input"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t('leaderboard.namePlaceholder')}
                maxLength={24}
              />
              <button
                className="leaderboard-submit"
                onClick={handleSubmitLatest}
                disabled={!latestLocal || !name.trim() || submitting}
              >
                {submitting ? '…'
                  : justSubmitted ? `✅ ${t('leaderboard.submitted')}`
                  : `📤 ${t('leaderboard.submitLatest')}`}
              </button>
            </div>
            {onlineError && (
              <p className="leaderboard-error">{t('leaderboard.errorLoad')}</p>
            )}
            {onlineEntries === null
              ? <p className="leaderboard-empty">…</p>
              : renderTable(onlineEntries, { showName: true })}
          </>
        )}

        {tab === 'local' && renderTable(localEntries)}

        <button className="leaderboard-close" onClick={onClose}>
          {t('leaderboard.close')}
        </button>
      </div>
    </div>
  );
}
