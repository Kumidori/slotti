import { useTranslation } from '../i18n/useTranslation.jsx';
import { sfx } from '../audio';
import '../styles/FloorMap.css';

const ROOM_META = {
  fight:     { icon: '⚔️',  labelKey: 'path.fight' },
  elite:     { icon: '👹',  labelKey: 'path.elite' },
  shop:      { icon: '💰',  labelKey: 'path.shop' },
  sacrifice: { icon: '🪦',  labelKey: 'path.sacrifice' },
  rest:      { icon: '🏕️', labelKey: 'path.rest' },
};

// Layout constants
const SLOT_X = [60, 160, 260];   // x-center of slots 0, 1, 2
const ROW_H = 78;
const NODE_W = 80;
const NODE_H = 64;
const SVG_W = 320;

export default function FloorMap({ floor, levels, mapPath, onChoose }) {
  const { t } = useTranslation();
  const currentLevel = mapPath.length;
  const lastPos = mapPath[mapPath.length - 1] || null;
  const totalLevels = levels.length;
  const svgH = (totalLevels + 1) * ROW_H + 24;

  // Determine which slots on the current level are reachable
  const reachableSlots = (() => {
    if (currentLevel >= totalLevels) return [];
    if (!lastPos) {
      // First room — all slots on level 0 are reachable
      return levels[0].map(n => n.slot);
    }
    const prevNode = levels[lastPos.level].find(n => n.slot === lastPos.slot);
    return prevNode?.edges || [];
  })();

  const pick = (slot) => {
    if (!reachableSlots.includes(slot)) return;
    sfx.buttonClick();
    onChoose(slot);
  };

  // Build edge list for SVG (visited path is highlighted, others are dim)
  const edgesForSvg = [];
  for (let lvl = 0; lvl < totalLevels - 1; lvl++) {
    for (const node of levels[lvl]) {
      for (const targetSlot of node.edges) {
        const visited =
          mapPath.some(p => p.level === lvl && p.slot === node.slot) &&
          mapPath.some(p => p.level === lvl + 1 && p.slot === targetSlot);
        edgesForSvg.push({
          from: { lvl, slot: node.slot },
          to: { lvl: lvl + 1, slot: targetSlot },
          visited,
        });
      }
    }
  }
  // Edges to boss (final level → boss center)
  for (const node of levels[totalLevels - 1]) {
    const visited = mapPath.some(p => p.level === totalLevels - 1 && p.slot === node.slot);
    edgesForSvg.push({
      from: { lvl: totalLevels - 1, slot: node.slot },
      to: { lvl: totalLevels, slot: 1 },
      visited,
    });
  }

  // Y for a row index (0 = bottom, totalLevels = boss top)
  const yFor = (rowFromBottom) => svgH - 24 - rowFromBottom * ROW_H - NODE_H / 2;

  return (
    <div className="floor-map">
      <div className="floor-map-inner">
        <h2>{t('plan.title', { floor })}</h2>
        <p className="plan-sub">{t('plan.subtitle')}</p>

        <div className="map-graph" style={{ width: SVG_W, height: svgH }}>
          <svg className="map-edges" width={SVG_W} height={svgH}>
            {edgesForSvg.map((e, i) => {
              const x1 = SLOT_X[e.from.slot];
              const y1 = yFor(e.from.lvl);
              const x2 = SLOT_X[e.to.slot];
              const y2 = yFor(e.to.lvl);
              return (
                <line
                  key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  className={`map-edge ${e.visited ? 'visited' : ''}`}
                />
              );
            })}
          </svg>

          {/* Boss node at the top */}
          <div
            className="map-node boss"
            style={{
              left: SLOT_X[1] - NODE_W / 2,
              top: yFor(totalLevels) - NODE_H / 2,
            }}
          >
            <span className="map-node-icon">💀</span>
            <span className="map-node-label">{t('plan.boss')}</span>
          </div>

          {levels.map((row, lvl) =>
            row.map(node => {
              const meta = ROOM_META[node.type] || ROOM_META.fight;
              const visited = mapPath.some(p => p.level === lvl && p.slot === node.slot);
              const isCurrent = lvl === currentLevel && reachableSlots.includes(node.slot);
              const isFuture = lvl > currentLevel;
              const className = [
                'map-node',
                `type-${node.type}`,
                visited ? 'chosen' : '',
                isCurrent ? 'available' : '',
                isFuture ? 'future' : '',
                !isCurrent && !visited && lvl === currentLevel ? 'locked-out' : '',
              ].join(' ');
              return (
                <button
                  key={`${lvl}-${node.slot}`}
                  className={className}
                  style={{
                    left: SLOT_X[node.slot] - NODE_W / 2,
                    top: yFor(lvl) - NODE_H / 2,
                  }}
                  onClick={() => pick(node.slot)}
                  disabled={!isCurrent}
                >
                  <span className="map-node-icon">{meta.icon}</span>
                  <span className="map-node-label">{t(meta.labelKey)}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
