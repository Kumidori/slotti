import { useState } from 'react';
import { SYMBOLS } from '../gameData';
import '../styles/SymbolPool.css';

export default function SymbolPool({ pool }) {
  const [open, setOpen] = useState(false);

  const counts = {};
  pool.forEach(id => { counts[id] = (counts[id] || 0) + 1; });

  return (
    <>
      <button className="pool-badge" onClick={() => setOpen(true)} title="View symbol pool">
        {SYMBOLS.map(s => counts[s.id] ? (
          <span key={s.id} className="pool-badge-item">
            <span className="pool-badge-icon">{s.icon}</span>
            <span className="pool-badge-count">{counts[s.id]}</span>
          </span>
        ) : null)}
      </button>

      {open && (
        <div className="pool-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="pool-modal" onClick={e => e.stopPropagation()}>
            <h3>Symbol Pool ({pool.length})</h3>
            <p className="pool-sub">Each symbol's chance is its count divided by the total.</p>
            <div className="pool-list">
              {SYMBOLS.map(s => {
                const c = counts[s.id] || 0;
                if (c === 0) return null;
                const pct = Math.round((c / pool.length) * 100);
                return (
                  <div key={s.id} className="pool-row">
                    <span className="pool-row-icon">{s.icon}</span>
                    <span className="pool-row-name">{s.id}</span>
                    <span className="pool-row-count">×{c}</span>
                    <span className="pool-row-pct">{pct}%</span>
                  </div>
                );
              })}
            </div>
            <button className="pool-close" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
