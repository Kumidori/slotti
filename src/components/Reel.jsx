import { useMemo } from 'react';
import { SYMBOLS } from '../gameData';
import '../styles/Reel.css';

const FILLERS = 18;

export default function Reel({ icon, spinning, spinDuration = 1000, spinKey, highlight }) {
  const strip = useMemo(() => {
    if (!spinning) return [icon];
    const fillers = Array.from({ length: FILLERS }, () =>
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].icon
    );
    return [icon, ...fillers];
  }, [spinKey, spinning, icon]);

  const classes = ['reel'];
  if (highlight) classes.push(highlight);

  if (!spinning) {
    return (
      <div className={classes.join(' ')}>
        <div className="reel-item">{icon}</div>
      </div>
    );
  }

  return (
    <div className={classes.join(' ')}>
      <div
        key={spinKey}
        className="reel-strip"
        style={{
          '--strip-count': strip.length,
          animationDuration: `${spinDuration}ms`,
        }}
      >
        {strip.map((s, i) => (
          <div key={i} className="reel-item">{s}</div>
        ))}
      </div>
    </div>
  );
}
