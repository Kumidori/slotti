import { useState, useRef, useCallback, useEffect } from 'react';
import useGameState from '../hooks/useGameState';
import Enemy from './Enemy';
import SlotMachine from './SlotMachine';
import HpBar from './HpBar';
import Shop from './Shop';
import Overlay from './Overlay';
import FloatNumber from './FloatNumber';
import { ensureAudio, sfx } from '../audio';
import { calcInterest } from '../gameData';
import '../styles/Game.css';

export default function Game() {
  const {
    state, startRun, resolveCombo, enemyAttack,
    enemyDefeated, triggerGameOver, nextFloor,
    buyItem, setLockedItems, closeShop, setSpinning,
  } = useGameState();

  const [screenShake, setScreenShake] = useState(false);
  const [screenFlash, setScreenFlash] = useState(null);
  const [enemyAnim, setEnemyAnim] = useState(null);
  const [enemyHpShake, setEnemyHpShake] = useState(false);
  const [playerHpShake, setPlayerHpShake] = useState(false);
  const [floats, setFloats] = useState([]);
  const floatId = useRef(0);

  const enemySpriteRef = useRef(null);
  const enemyHpRef = useRef(null);
  const playerHpRef = useRef(null);

  const addFloat = useCallback((ref, text, type) => {
    const id = ++floatId.current;
    setFloats(prev => [...prev, { id, text, type, ref }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1000);
  }, []);

  const triggerShake = useCallback(() => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 500);
  }, []);

  const triggerFlash = useCallback((color) => {
    setScreenFlash(color);
    setTimeout(() => setScreenFlash(null), 400);
  }, []);

  const triggerEnemyAnim = useCallback((type) => {
    setEnemyAnim(type);
    setTimeout(() => setEnemyAnim(null), 600);
  }, []);

  const triggerBarShake = useCallback((which) => {
    if (which === 'enemy') {
      setEnemyHpShake(true);
      setTimeout(() => setEnemyHpShake(false), 500);
    } else {
      setPlayerHpShake(true);
      setTimeout(() => setPlayerHpShake(false), 500);
    }
  }, []);

  const handleResolve = useCallback((results) => {
    resolveCombo(results);
  }, [resolveCombo]);

  useEffect(() => {
    if (!state.comboType) return;

    const ct = state.comboType;
    if (ct === 'skull-triple' || ct === 'skull') {
      sfx.skull();
      triggerShake();
      triggerFlash('red');
      triggerBarShake('player');
      const selfDmg = ct === 'skull-triple' ? 15 : 5;
      addFloat(playerHpRef, `-${selfDmg}`, 'self-damage');
    } else if (ct === 'triple') {
      sfx.jackpot();
      triggerFlash('gold');
    } else if (ct === 'double') {
      sfx.comboDouble();
    } else if (ct === 'weak') {
      sfx.comboWeak();
    }

    if (state.dmg > 0) {
      sfx.damage();
      triggerEnemyAnim('shake');
      triggerBarShake('enemy');
      addFloat(enemySpriteRef, `-${state.dmg}`, 'damage');
    }
    if (state.heal > 0) {
      addFloat(playerHpRef, `+${state.heal}`, 'heal');
      if (ct !== 'double' && ct !== 'triple') sfx.heal();
    }
    if (state.blockGained > 0) {
      addFloat(playerHpRef, `🛡️+${state.blockGained}`, 'shield-block');
      if (ct !== 'double' && ct !== 'triple') sfx.shield();
    }

    if (state.enemy.hp <= 0) {
      setTimeout(() => {
        enemyDefeated();
        sfx.victory();
      }, 300);
    } else if (state.playerHp <= 0) {
      setTimeout(() => {
        triggerGameOver();
        sfx.gameOver();
      }, 300);
    } else if (state.spinsLeft <= 0) {
      setTimeout(() => doEnemyAttack(), 600);
    }
  }, [state.comboType, state.spinsLeft, state.dmg]);

  const doEnemyAttack = useCallback(() => {
    triggerEnemyAnim('attack');

    setTimeout(() => {
      const blocked = Math.min(state.enemy.atk, state.block);
      const incoming = Math.max(0, state.enemy.atk - state.block);

      if (blocked > 0) {
        sfx.shieldBreak();
        addFloat(playerHpRef, `🛡️-${blocked}`, 'shield-block');
      }
      if (incoming > 0) {
        sfx.playerHit();
        triggerShake();
        triggerFlash('red');
        triggerBarShake('player');
        addFloat(playerHpRef, `-${incoming}`, 'damage');
      }

      enemyAttack();
    }, 350);
  }, [state.enemy, state.block, enemyAttack, triggerShake, triggerFlash, triggerBarShake, addFloat]);

  const handleBuy = useCallback((item) => {
    buyItem(item);
  }, [buyItem]);

  const handleNextFloor = useCallback(() => {
    sfx.buttonClick();
    nextFloor();
  }, [nextFloor]);

  const handleStartRun = useCallback(() => {
    ensureAudio();
    sfx.buttonClick();
    startRun();
  }, [startRun]);

  const slotRef = useRef(null);
  const interest = calcInterest(state.gold);
  const spinDisabled = state.phase !== 'combat';
  const handleSpin = useCallback(() => {
    slotRef.current?.spin();
  }, []);

  return (
    <>
      <div className={`screen-flash ${screenFlash ? `flash-${screenFlash}` : ''}`} />
      <div className={`game ${screenShake ? 'screen-shake' : ''}`}>
        <div className="floor-info">Floor {state.floor}</div>

        <Enemy
          enemy={state.enemy}
          spriteAnim={enemyAnim}
          hpShaking={enemyHpShake}
          hpBarRef={enemyHpRef}
          spriteRef={enemySpriteRef}
        />

        <div className="slot-machine-zone">
          <SlotMachine
            ref={slotRef}
            state={state}
            onResolve={handleResolve}
            disabled={spinDisabled}
          />
        </div>

        <div className="bottom-zone">
          <div className="player-stats">
            <div className="gold-section">
              <div className="gold-display">💰 {state.gold}</div>
              <div className="interest-preview">
                {interest > 0 ? `+${interest} at shop` : ''}
              </div>
            </div>
            <HpBar
              ref={playerHpRef}
              current={state.playerHp}
              max={state.playerMaxHp}
              type="player"
              shaking={playerHpShake}
              block={state.block}
            />
          </div>
          <div className="spins-left">{state.spinsLeft} spins left</div>
          <button
            className="spin-btn"
            onClick={handleSpin}
            disabled={spinDisabled || state.spinsLeft <= 0}
          >
            SPIN
          </button>
        </div>
      </div>

      {state.phase === 'victory' && (
        <Overlay>
          <h2>⚔️ Enemy Defeated!</h2>
          <p>+{state.lastGoldEarned} gold</p>
          <button onClick={handleNextFloor}>Continue</button>
        </Overlay>
      )}

      {state.phase === 'gameOver' && (
        <Overlay>
          <h2>💀 Game Over</h2>
          <p>Reached Floor {state.floor}</p>
          <p>Gold earned: {state.gold}</p>
          <button onClick={handleStartRun}>Try Again</button>
        </Overlay>
      )}

      {state.phase === 'shop' && (
        <Shop
          state={state}
          onBuy={handleBuy}
          onClose={closeShop}
          onSetLockedItems={setLockedItems}
        />
      )}

      {floats.map(f => (
        <FloatNumber key={f.id} text={f.text} type={f.type} targetRef={f.ref} />
      ))}
    </>
  );
}
