import { useTranslation } from '../i18n/useTranslation.jsx';
import '../styles/RunSummary.css';

// state contains all the totalDmg* / totalGoldEarned / score fields written
// in the reducer. result tells us if it's a win or loss for the bonus row.
export default function RunSummary({ state, result }) {
  const { t } = useTranslation();
  const dmgDealt    = state.totalDmgDealt    || 0;
  const dmgBlocked  = state.totalDmgBlocked  || 0;
  const dmgHealed   = state.totalDmgHealed   || 0;
  const dmgTaken    = state.totalDmgTaken    || 0;
  const goldEarned  = state.totalGoldEarned  || 0;
  const enemies     = state.totalEnemiesDefeated || 0;
  const speedBonus  = state.totalSpeedBonus  || 0;
  const speedScore  = speedBonus * 100;
  const floorBonus  = (state.floor || 1) * 250;
  const winBonus    = result === 'win' ? 1000 : 0;
  const score       = goldEarned + dmgDealt + dmgBlocked + dmgHealed + speedScore + floorBonus + winBonus;

  const rows = [
    { icon: '⚔️', label: t('summary.dmgDealt'),   value: dmgDealt },
    { icon: '🛡️', label: t('summary.dmgBlocked'), value: dmgBlocked },
    { icon: '🧪', label: t('summary.dmgHealed'),  value: dmgHealed },
    { icon: '💔', label: t('summary.dmgTaken'),   value: dmgTaken },
    { icon: '💀', label: t('summary.enemies'),    value: enemies },
    { icon: '💰', label: t('summary.goldEarned'), value: goldEarned + 'g' },
    { icon: '⚡', label: t('summary.speedBonus'), value: `${speedBonus} (×100)` },
  ];

  return (
    <div className="run-summary">
      <div className="run-summary-rows">
        {rows.map((r, i) => (
          <div key={i} className="run-summary-row">
            <span className="run-summary-icon">{r.icon}</span>
            <span className="run-summary-label">{r.label}</span>
            <span className="run-summary-value">{r.value}</span>
          </div>
        ))}
      </div>
      <div className="run-summary-score-block">
        <div className="run-summary-formula">
          {goldEarned} + {dmgDealt} + {dmgBlocked} + {dmgHealed} + {speedScore} + {floorBonus}
          {winBonus ? ` + ${winBonus}` : ''}
        </div>
        <div className="run-summary-score">
          🏆 {t('summary.score')}: <strong>{score}</strong>
        </div>
      </div>
    </div>
  );
}
