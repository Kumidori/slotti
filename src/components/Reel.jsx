import { useMemo } from 'react';
import { SYMBOLS, ROWS } from '../gameData';
import '../styles/Reel.css';

const FILLERS = 18;

export default function Reel({ icons, spinning, spinDuration = 1000, spinKey, locked, canLock, onToggleLock, highlightedRows = [] }) {
  // Build a strip whose top ROWS items are the targets, then fillers below.
  const strip = useMemo(() => {
    if (!spinning) return icons;
    const fillers = Array.from({ length: FILLERS }, () =>
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].icon
    );
    return [...icons, ...fillers];
  }, [spinKey, spinning, icons]);

  const classes = ['reel', 'reel-3row'];
  if (locked) classes.push('locked');
  if (canLock && !spinning) classes.push('clickable');

  const handleClick = () => {
    if (canLock && !spinning) onToggleLock?.();
  };

  return (
    <div className={classes.join(' ')} onClick={handleClick}>
      {locked && <span className="reel-lock-badge">🔒</span>}
      {!spinning ? (
        <div className="reel-stack">
          {icons.map((ic, r) => (
            <div
              key={r}
              className={`reel-item ${highlightedRows.includes(r) ? 'highlighted' : ''}`}
            >
              {ic}
            </div>
          ))}
        </div>
      ) : (
        <div
          key={spinKey}
          className="reel-strip"
          style={{
            '--strip-count': strip.length,
            '--rows': ROWS,
            animationDuration: `${spinDuration}ms`,
          }}
        >
          {strip.map((s, i) => (
            <div key={i} className="reel-item">{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}
