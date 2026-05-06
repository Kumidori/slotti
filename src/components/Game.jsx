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

function buildComboDetail(state) {
  const parts = [];
  if (state.dmg > 0) parts.push(`${state.dmg} damage`);
  if (state.heal > 0) parts.push(`+${state.heal} HP`);
  if (state.blockGained > 0) parts.push(`+${state.blockGained} 🛡️`);
  if (state.comboType === 'skull' || state.comboType === 'skull-triple') {
    const selfDmg = state.comboType === 'skull-triple' ? 15 : 5;
    parts.push(`${selfDmg} self damage`);
  }
  return parts.join(' · ') || null;
}

export default function Game() {
  const {
    state, startRun, resolveCombo, enemyAttack,
    enemyDefeated, triggerGameOver, nextRoom,
    buyItem, setLockedItems, closeShop, setSpinning,
    nextFloor, debugSkipToRuby,
  } = useGameState();

  const handleNextFloor = useCallback(() => {
    sfx.buttonClick();
    nextFloor();
  }, [nextFloor]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'b' || e.key === 'B') debugSkipToRuby(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [debugSkipToRuby]);

  const [screenShake, setScreenShake] = useState(false);
  const [screenFlash, setScreenFlash] = useState(null);
  const [enemyAnim, setEnemyAnim] = useState(null);
  const [enemyHpShake, setEnemyHpShake] = useState(false);
  const [playerHpShake, setPlayerHpShake] = useState(false);
  const [floats, setFloats] = useState([]);
  const [comboAnim, setComboAnim] = useState(null);
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
    if (state.comboText) {
      const detail = buildComboDetail(state);
      setComboAnim({ text: state.comboText, type: state.comboType, detail, key: Date.now() });
    }
  }, [state.comboText, state.spinsLeft]);

  useEffect(() => {
    if (state.spinning) setComboAnim(null);
  }, [state.spinning]);

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

    if (state.justEnraged) {
      setTimeout(() => {
        setComboAnim({
          text: 'Lili got her period!',
          type: 'enrage',
          detail: 'All outgoing and incoming damage increased!',
          key: Date.now() + 1,
        });
        triggerShake();
        triggerFlash('red');
      }, 800);
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
      const isFrenzy = state.enemy.frenzyEvery &&
        ((state.enemy.attackCount || 0) + 1) % state.enemy.frenzyEvery === 0;
      const hits = isFrenzy ? state.enemy.frenzyHits : 1;
      const perHit = isFrenzy ? Math.ceil(state.enemy.atk * state.enemy.frenzyMult) : state.enemy.atk;
      const totalDmg = perHit * hits;
      const blocked = Math.min(totalDmg, state.block);
      const incoming = Math.max(0, totalDmg - state.block);

      if (blocked > 0) {
        sfx.shieldBreak();
        addFloat(playerHpRef, `🛡️-${blocked}`, 'shield-block');
      }
      if (incoming > 0) {
        sfx.playerHit();
        triggerShake();
        triggerFlash('red');
        triggerBarShake('player');
        if (isFrenzy) {
          for (let i = 0; i < hits; i++) {
            setTimeout(() => addFloat(playerHpRef, `-${perHit}`, 'damage'), i * 120);
          }
        } else {
          addFloat(playerHpRef, `-${incoming}`, 'damage');
        }
      }

      const parts = [];
      if (incoming > 0) parts.push(`${incoming} damage`);
      if (blocked > 0) parts.push(`${blocked} blocked`);
      if (incoming === 0 && blocked > 0) parts.unshift('fully blocked!');
      setComboAnim({
        text: isFrenzy ? `🐕 ${state.enemy.name} FRENZY!` : `${state.enemy.name} attacks!`,
        type: isFrenzy ? 'enrage' : 'enemy-attack',
        detail: isFrenzy
          ? `${hits} bites · ${parts.join(' · ') || 'no damage'}`
          : parts.join(' · ') || null,
        key: Date.now(),
      });

      enemyAttack();
    }, 350);
  }, [state.enemy, state.block, enemyAttack, triggerShake, triggerFlash, triggerBarShake, addFloat]);

  const handleBuy = useCallback((item) => {
    buyItem(item);
  }, [buyItem]);

  const handleNextRoom = useCallback(() => {
    sfx.buttonClick();
    nextRoom();
  }, [nextRoom]);

  const handleStartRun = useCallback(() => {
    ensureAudio();
    sfx.buttonClick();
    startRun();
  }, [startRun]);

  const slotRef = useRef(null);
  const interest = calcInterest(state.gold);
  const spinDisabled = state.phase !== 'combat' || state.spinning;
  const handleSpin = useCallback(() => {
    slotRef.current?.spin();
  }, []);

  return (
    <>
      <div className={`screen-flash ${screenFlash ? `flash-${screenFlash}` : ''}`} />
      <div className={`game ${screenShake ? 'screen-shake' : ''}`}>

        <div className="top-bar">
          <div className="gold-badge">💰 {state.gold}</div>
          <div className="floor-badge">
            <span>Floor {state.floor}</span>
            <div className="floor-progress">
              {[1, 2, 3, 4, 5].map(r => {
                const isShop = r === 2 || r === 4;
                const isBoss = r === 5;
                const done = r < state.room;
                const current = r === state.room;
                return (
                  <span
                    key={r}
                    className={`floor-dot${isShop ? ' shop' : ''}${isBoss ? ' boss' : ''}${done ? ' done' : ''}${current ? ' current' : ''}`}
                  >
                    {isShop ? '🛒' : isBoss ? '💀' : ''}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <Enemy
          enemy={state.enemy}
          spriteAnim={enemyAnim}
          hpShaking={enemyHpShake}
          hpBarRef={enemyHpRef}
          spriteRef={enemySpriteRef}
        />

        <div className={`enemy-intent${state.enemy?.enraged ? ' enraged' : ''}`}>
          {state.enemy
            ? state.enemy.enraged
              ? 'Lili got her period, all outgoing and incoming damage increased!'
              : state.enemy.frenzyEvery
                ? (() => {
                    const next = state.enemy.frenzyEvery - ((state.enemy.attackCount || 0) % state.enemy.frenzyEvery);
                    return next === 1
                      ? `🐕 ${state.enemy.name} growls... FRENZY incoming!`
                      : `🐕 ${state.enemy.name} winds up... ${next} attacks until FRENZY`;
                  })()
                : `${state.enemy.isBoss ? '👹 BOSS — ' : ''}${state.enemy.name} prepares to strike!`
            : ''}
        </div>

        <div className="mid-zone">
          {comboAnim && (
            <div className={`combo-float combo-${comboAnim.type}`} key={comboAnim.key}>
              <span className="combo-float-text">{comboAnim.text}</span>
              {comboAnim.detail && (
                <span className="combo-float-detail">{comboAnim.detail}</span>
              )}
            </div>
          )}
        </div>

        <div className="slot-machine-zone">
          <SlotMachine
            ref={slotRef}
            state={state}
            onResolve={handleResolve}
            onSpinningChange={setSpinning}
            disabled={spinDisabled}
          />
        </div>

        <div className="bottom-zone">
          <div className="bottom-panel">
            <div className="player-hp-section">
              <span className="player-hp-label">Your HP</span>
              <div className="player-hp-row">
                <span className="heart-icon">❤️</span>
                <HpBar
                  ref={playerHpRef}
                  current={state.playerHp}
                  max={state.playerMaxHp}
                  type="player"
                  shaking={playerHpShake}
                  block={state.block}
                />
              </div>
            </div>

            <div className="stats-row">
              <div className="stat-item">
                <span className="stat-icon">🔄</span>
                <span className="stat-value">{state.spinsLeft} spins</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🛡️</span>
                <span className="stat-value">{state.block}</span>
              </div>
            </div>
          </div>

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
          <button onClick={handleNextRoom}>Continue</button>
        </Overlay>
      )}

      {state.phase === 'floorComplete' && (
        <Overlay>
          <h2>👑 Floor {state.floor} Complete!</h2>
          <p>You defeated the boss!</p>
          <p>+{state.lastGoldEarned} gold</p>
          <button onClick={handleNextFloor}>Continue to Floor {state.floor + 1}</button>
        </Overlay>
      )}

      {state.phase === 'runComplete' && (
        <Overlay>
          <h2>🏆 Run Complete!</h2>
          <p>You defeated all bosses!</p>
          <p>Total gold: {state.gold}</p>
          <button onClick={handleStartRun}>Play Again</button>
        </Overlay>
      )}

      {state.phase === 'gameOver' && (
        <Overlay>
          <h2>💀 Game Over</h2>
          <p>Floor {state.floor} — Room {state.room}</p>
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
