import { forwardRef } from 'react';
import '../styles/HpBar.css';

const HpBar = forwardRef(function HpBar({ current, max, type, shaking, block }, ref) {
  const pct = Math.max(0, current / max * 100);

  return (
    <div ref={ref} className={`hp-bar-container ${shaking ? 'shake' : ''}`}>
      <div
        className={`hp-bar-fill ${type}`}
        style={{ width: pct + '%' }}
      />
      <div className="hp-text">
        {Math.max(0, current)} / {max}
      </div>
      {type === 'player' && (
        <div className={`shield-bar ${block > 0 ? 'active' : ''}`} />
      )}
    </div>
  );
});

export default HpBar;
