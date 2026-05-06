import { useState, useRef, useCallback, useEffect } from 'react';
import useGameState from '../hooks/useGameState';
import Enemy from './Enemy';
import SlotMachine from './SlotMachine';
import HpBar from './HpBar';
import Shop from './Shop';
import Overlay from './Overlay';
import FloatNumber from './FloatNumber';
import SymbolPicker from './SymbolPicker';
import SacrificeRoom from './SacrificeRoom';
import SymbolPool from './SymbolPool';
import RelicTray from './RelicTray';
import LangToggle from './LangToggle';
import { ensureAudio, sfx, speak } from '../audio';
import { calcInterest } from '../gameData';
import { useTranslation } from '../i18n/useTranslation.jsx';
import '../styles/Game.css';

function comboKeyFromText(text) {
  // Map fixed English combo strings (set in reducer) to translation keys.
  switch (text) {
    case '☠️ TRIPLE SKULL!': return 'combo.tripleSkull';
    case '⚔️ TRIPLE SLASH!': return 'combo.tripleSlash';
    case '✨ ARCANE BURST!': return 'combo.arcaneBurst';
    case '🛡️ FORTRESS!': return 'combo.fortress';
    case '🧪 FULL RESTORE!': return 'combo.fullRestore';
    case '⚔️ Double Strike': return 'combo.doubleStrike';
    case '✨ Spell Cast': return 'combo.spellCast';
    case '🛡️ Shield Wall': return 'combo.shieldWall';
    case '🧪 Quick Heal': return 'combo.quickHeal';
    case '💀 Cursed!': return 'combo.cursed';
    case 'Weak hit': return 'combo.weakHit';
    case '⭐ Rainbow Combo': return 'combo.rainbow';
    default: return null;
  }
}

function buildComboDetail(state, t) {
  const parts = [];
  if (state.dmg > 0) parts.push(t('combo.detail.damage', { amount: state.dmg }));
  if (state.heal > 0) parts.push(t('combo.detail.heal', { amount: state.heal }));
  if (state.blockGained > 0) parts.push(t('combo.detail.block', { amount: state.blockGained }));
  if (state.comboType === 'skull' || state.comboType === 'skull-triple') {
    const selfDmg = state.comboType === 'skull-triple' ? 15 : 5;
    parts.push(t('combo.detail.selfDamage', { amount: selfDmg }));
  }
  return parts.join(' · ') || null;
}

export default function Game() {
  const { t, lang } = useTranslation();
  const {
    state, startRun, resolveCombo, enemyAttack,
    enemyDefeated, triggerGameOver,
    buyItem, setLockedItems, closeShop, setSpinning,
    nextFloor, debugKillEnemy, useLockTokens,
    pickSymbol, skipSymbol, rerollPicks,
    sacrificeSymbol, skipSacrifice, finishSacrifice,
  } = useGameState();

  const handleNextFloor = useCallback(() => {
    sfx.buttonClick();
    nextFloor();
  }, [nextFloor]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'b' || e.key === 'B') debugKillEnemy(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [debugKillEnemy]);

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
      const detail = buildComboDetail(state, t);
      const key = comboKeyFromText(state.comboText);
      const text = key ? t(key) : state.comboText;
      setComboAnim({ text, type: state.comboType, detail, key: Date.now() });
      // Speak the combo name on triples (and skull-triple).
      if (state.comboType === 'triple' || state.comboType === 'skull-triple') {
        speak(text, lang);
      }
    }
  }, [state.comboText, state.spinsLeft, t, lang]);

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
          text: t('enemy.intent.enraged.lili').split(',')[0] + '!',
          type: 'enrage',
          detail: t('enemy.intent.enraged.lili').split(',').slice(1).join(',').trim(),
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
      if (incoming > 0) parts.push(t('enemy.attack.detail.damage', { amount: incoming }));
      if (blocked > 0) parts.push(t('enemy.attack.detail.blocked', { amount: blocked }));
      if (incoming === 0 && blocked > 0) parts.unshift(t('enemy.attack.detail.fullyBlocked'));
      setComboAnim({
        text: isFrenzy
          ? t('enemy.frenzy', { name: state.enemy.name })
          : t('enemy.attack', { name: state.enemy.name }),
        type: isFrenzy ? 'enrage' : 'enemy-attack',
        detail: isFrenzy
          ? `${t('enemy.attack.detail.bites', { count: hits })} · ${parts.join(' · ') || t('enemy.attack.detail.noDamage')}`
          : parts.join(' · ') || null,
        key: Date.now(),
      });

      enemyAttack();
    }, 350);
  }, [state.enemy, state.block, enemyAttack, triggerShake, triggerFlash, triggerBarShake, addFloat, t]);

  const handleBuy = useCallback((item) => {
    buyItem(item);
  }, [buyItem]);

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

        <SymbolPool pool={state.symbolPool} />
        <RelicTray relics={state.relics} />

        <div className="top-bar">
          <div className="top-left">
            <div className="gold-badge">💰 {state.gold}</div>
            <LangToggle />
          </div>
          <div className="floor-progress">
            <span className="floor-label">{t('ui.floor', { floor: state.floor })}</span>
            {[1, 2, 3, 4, 5].map(r => {
              const type = state.floorRoomTypes?.[r - 1] || 'fight';
              const done = r < state.room;
              const current = r === state.room;
              const icon = type === 'shop' ? '💰' : type === 'sacrifice' ? '🪦' : type === 'boss' ? '💀' : '';
              return (
                <span
                  key={r}
                  className={`floor-dot ${type}${done ? ' done' : ''}${current ? ' current' : ''}`}
                >
                  {icon}
                </span>
              );
            })}
          </div>
        </div>

        <Enemy
          enemy={state.enemy}
          spriteAnim={enemyAnim}
          hpShaking={enemyHpShake}
          hpBarRef={enemyHpRef}
          spriteRef={enemySpriteRef}
        />

        <div className={`enemy-intent${state.enemy?.enraged ? ' enraged' : ''}${comboAnim ? ' hidden' : ''}`}>
          {state.enemy
            ? state.enemy.enraged
              ? t('enemy.intent.enraged.lili')
              : state.enemy.frenzyEvery
                ? (() => {
                    const next = state.enemy.frenzyEvery - ((state.enemy.attackCount || 0) % state.enemy.frenzyEvery);
                    return next === 1
                      ? t('enemy.intent.frenzyIncoming', { name: state.enemy.name })
                      : t('enemy.intent.frenzyCountdown', { name: state.enemy.name, count: next });
                  })()
                : state.enemy.isBoss
                  ? t('enemy.intent.bossPrepares', { name: state.enemy.name })
                  : t('enemy.intent.prepares', { name: state.enemy.name })
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
            onUseLockTokens={useLockTokens}
            disabled={spinDisabled}
          />
        </div>

        <div className="bottom-zone">
          <div className="bottom-panel">
            <div className="player-hp-section">
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
                <span className="stat-value">{state.spinsLeft}</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🔒</span>
                <span className="stat-value">{state.locksLeft}</span>
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

      {state.phase === 'victory' && state.symbolPicks && (
        <SymbolPicker
          picks={state.symbolPicks}
          gold={state.gold}
          lastGoldEarned={state.lastGoldEarned}
          rerollCount={state.pickRerollCount}
          luckBonus={state.luckBonus}
          onPick={(id) => { sfx.victory(); pickSymbol(id); }}
          onSkip={() => { sfx.buttonClick(); skipSymbol(); }}
          onReroll={() => { sfx.buttonClick(); rerollPicks(); }}
        />
      )}

      {state.phase === 'floorComplete' && (
        <Overlay>
          <h2>{t('overlay.floorComplete', { floor: state.floor })}</h2>
          <p>{t('overlay.bossDefeated')}</p>
          <p>{t('picker.goldEarned', { amount: state.lastGoldEarned })}</p>
          <button onClick={handleNextFloor}>{t('overlay.continueToFloor', { floor: state.floor + 1 })}</button>
        </Overlay>
      )}

      {state.phase === 'runComplete' && (
        <Overlay>
          <h2>{t('overlay.runComplete')}</h2>
          <p>{t('overlay.allBossesDefeated')}</p>
          <p>{t('overlay.totalGold', { gold: state.gold })}</p>
          <button onClick={handleStartRun}>{t('overlay.playAgain')}</button>
        </Overlay>
      )}

      {state.phase === 'gameOver' && (
        <Overlay>
          <h2>{t('overlay.gameOver')}</h2>
          <p>{t('overlay.position', { floor: state.floor, room: state.room })}</p>
          <p>{t('overlay.goldEarned', { gold: state.gold })}</p>
          <button onClick={handleStartRun}>{t('overlay.tryAgain')}</button>
        </Overlay>
      )}

      {state.phase === 'sacrifice' && (
        <SacrificeRoom
          pool={state.symbolPool}
          sacrificeChosen={state.sacrificeChosen}
          sacrificeReward={state.sacrificeReward}
          onSacrifice={sacrificeSymbol}
          onSkip={skipSacrifice}
          onFinish={finishSacrifice}
        />
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
