import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/useTranslation.jsx';
import '../styles/WinnerClaim.css';

const REWARD_URL = 'https://www.amazon.de/g/KAE7SZGQFFYQBM?t=SvL';

export default function WinnerClaim() {
  const { t } = useTranslation();
  const [state, setState] = useState({ status: 'loading', winner: null });
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/winner', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        setState({ status: 'ready', winner: d.winner || null });
      })
      .catch(() => {
        if (cancelled) return;
        // If the API isn't reachable, just show the link without claim flow
        setState({ status: 'error', winner: null });
      });
    return () => { cancelled = true; };
  }, []);

  const claim = async (e) => {
    e?.preventDefault?.();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (data.claimed) {
        setState({ status: 'ready', winner: data.winner });
        // Open the reward link in a new tab right away
        window.open(REWARD_URL, '_blank', 'noopener,noreferrer');
      } else if (data.winner) {
        setState({ status: 'ready', winner: data.winner });
        setError(t('reward.justClaimed'));
      } else {
        setError(t('reward.error'));
      }
    } catch {
      setError(t('reward.error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (state.status === 'loading') {
    return <p className="reward-line">⏳ {t('reward.checking')}</p>;
  }

  // Already won by someone (could be us, could be someone else)
  if (state.winner) {
    return (
      <p className="reward-line reward-already">
        🥈 {t('reward.alreadyWon', { name: state.winner.name })}
      </p>
    );
  }

  // No winner yet — show claim form
  if (state.status === 'error') {
    // API broken: still let them open the link
    return (
      <p className="reward-line">
        <a href={REWARD_URL} target="_blank" rel="noopener noreferrer" className="reward-link">
          🏆 {t('overlay.firstWinReward')}
        </a>
      </p>
    );
  }

  return (
    <form className="reward-claim" onSubmit={claim}>
      <p className="reward-claim-prompt">🏆 {t('reward.firstWinner')}</p>
      <div className="reward-claim-row">
        <input
          type="text"
          className="reward-claim-input"
          placeholder={t('reward.namePlaceholder')}
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={40}
          autoFocus
        />
        <button
          type="submit"
          className="reward-link"
          disabled={submitting || !name.trim()}
        >
          {submitting ? '…' : t('reward.claim')}
        </button>
      </div>
      {error && <p className="reward-error">{error}</p>}
    </form>
  );
}
