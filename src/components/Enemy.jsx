import { forwardRef } from 'react';
import HpBar from './HpBar';
import '../styles/Enemy.css';

const Enemy = forwardRef(function Enemy({ enemy, spriteAnim, hpShaking, hpBarRef, spriteRef }, ref) {
  if (!enemy) return null;

  return (
    <div className="enemy-section" ref={ref}>
      <div className="enemy-name">{enemy.name}</div>
      <div ref={spriteRef} className={`enemy-sprite ${spriteAnim || ''}`}>
        {enemy.sprite}
      </div>
      <HpBar
        ref={hpBarRef}
        current={enemy.hp}
        max={enemy.maxHp}
        type="enemy"
        shaking={hpShaking}
      />
    </div>
  );
});

export default Enemy;
