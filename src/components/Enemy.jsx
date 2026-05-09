import { forwardRef } from 'react';
import HpBar from './HpBar';
import liliImg from '../assets/lili.webp';
import rubyImg from '../assets/ruby.png';
import furzkopfImg from '../assets/furzkopf.webp';
import '../styles/Enemy.css';

const SPRITE_IMAGES = { lili: liliImg, ruby: rubyImg, furzkopf: furzkopfImg };
const SYMBOL_ICONS = { sword: '⚔️', magic: '✨', shield: '🛡️', potion: '🧪', skull: '💀' };

const Enemy = forwardRef(function Enemy({ enemy, spriteAnim, hpShaking, hpBarRef, spriteRef }, ref) {
  if (!enemy) return null;

  const isEnraged = enemy.enrageAt && enemy.hp <= enemy.maxHp * enemy.enrageAt && enemy.hp > 0;
  const isPoisonous = !!enemy.poisonOnHit;
  const spriteImage = SPRITE_IMAGES[enemy.sprite];

  return (
    <div className={`enemy-section ${isEnraged ? 'enraged' : ''} ${isPoisonous ? 'poisonous' : ''}`} ref={ref}>
      <div className="enemy-name">{enemy.name}</div>
      {(enemy.weakTo?.length > 0 || enemy.resists?.length > 0) && (
        <div className="enemy-affinities">
          {enemy.weakTo?.map(sym => (
            <span key={`w-${sym}`} className="affinity weak" title={`Weak to ${sym}: 150% damage`}>
              {SYMBOL_ICONS[sym]}↑
            </span>
          ))}
          {enemy.resists?.map(sym => (
            <span key={`r-${sym}`} className="affinity resist" title={`Resists ${sym}: 50% damage`}>
              {SYMBOL_ICONS[sym]}↓
            </span>
          ))}
        </div>
      )}
      <div ref={spriteRef} className={`enemy-sprite ${spriteAnim || ''}`}>
        {spriteImage
          ? <img src={spriteImage} alt={enemy.name} className="enemy-img" />
          : enemy.sprite
        }
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
