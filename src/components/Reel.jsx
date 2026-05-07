import { useMemo } from 'react';
import { SYMBOLS, ROWS } from '../gameData';
import '../styles/Reel.css';

const FILLERS = 18;

export default function Reel({ icons, icon, spinning, spinDuration = 1000, spinKey, locked, canLock, onToggleLock, highlightedRows = [], rarity }) {
  // Accept either an icons[] array (3-row mode) or a single icon (legacy 1-row mode for picker/sacrifice).
  const iconList = Array.isArray(icons) ? icons : [icon];
  const isMultiRow = iconList.length > 1;
  // Build a strip whose top items are the targets, then fillers below.
  const strip = useMemo(() => {
    if (!spinning) return iconList;
    const fillers = Array.from({ length: FILLERS }, () =>
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].icon
    );
    return [...iconList, ...fillers];
  }, [spinKey, spinning, icons, icon]);

  const classes = ['reel'];
  if (isMultiRow) classes.push('reel-3row');
  if (locked) classes.push('locked');
  if (canLock && !spinning) classes.push('clickable');
  if (!spinning && rarity && rarity !== 'common') classes.push(`reel-rarity-${rarity}`);

  const handleClick = () => {
    if (canLock && !spinning) onToggleLock?.();
  };

  return (
    <div className={classes.join(' ')} onClick={handleClick}>
      {locked && <span className="reel-lock-badge">🔒</span>}
      {!spinning ? (
        isMultiRow ? (
          <div className="reel-stack">
            {iconList.map((ic, r) => (
              <div
                key={r}
                className={`reel-item ${highlightedRows.includes(r) ? 'highlighted' : ''}`}
              >
                {ic}
              </div>
            ))}
          </div>
        ) : (
          <div className="reel-item">{iconList[0]}</div>
        )
      ) : (
        <div
          key={spinKey}
          className="reel-strip"
          style={{
            '--strip-count': strip.length,
            '--rows': isMultiRow ? ROWS : 1,
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
