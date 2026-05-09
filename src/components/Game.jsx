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
import MusicToggle from './MusicToggle';
import CharacterSelect from './CharacterSelect';
import WinnerClaim from './WinnerClaim';
import FloorMap from './FloorMap';
import RestRoom from './RestRoom';
import { getCharacter } from '../characters';
import liliPortrait from '../assets/lili.webp';
import rubyPortrait from '../assets/ruby.png';
import furzkopfPortrait from '../assets/furzkopf.webp';

const CHAR_PORTRAITS = { lili: liliPortrait, ruby: rubyPortrait, furzkopf: furzkopfPortrait };
import { ensureAudio, sfx, playComboVoice, startMusic, setMusicIntensity, stopMusic } from '../audio';
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
  if (state.packHunterTriggered) parts.push('🐕 PACK HUNTER ✖2');
  if (state.multFactor > 1) parts.push(`✖️${state.multFactor}`);
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
  const { t } = useTranslation();
  const {
    state, startRun, resolveCombo, applyLineEffects, enemyAttack,
    enemyDefeated, triggerGameOver,
    buyItem, setLockedItems, closeShop, setSpinning,
    nextFloor, debugKillEnemy, useLockTokens,
    pickSymbol, skipSymbol, rerollPicks,
    sacrificeSymbol, skipSacrifice, finishSacrifice,
    rerollShop, goToMenu, selectPlanOption, commitPlan, finishRest, useAbility,
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
  const goldBadgeRef = useRef(null);

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

  // Re-triggerable animation: clears, then sets on next frame so the same
  // class-name reapplies and CSS animation restarts.
  const flashEnemyAnim = useCallback((type, duration) => {
    setEnemyAnim(null);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setEnemyAnim(type);
        setTimeout(() => setEnemyAnim(null), duration);
      });
    });
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

  const handleResolve = useCallback((grid) => {
    resolveCombo(grid);
  }, [resolveCombo]);

  useEffect(() => {
    const lines = state.lineResults;
    if (!lines || lines.length === 0) {
      // No winning lines — show a basic Weak hit pulse so something happens
      if (state.comboText) {
        const text = comboKeyFromText(state.comboText) ? t(comboKeyFromText(state.comboText)) : state.comboText;
        setComboAnim({ text, type: state.comboType, detail: null, key: Date.now() });
      }
      return;
    }
    // Schedule each winning line's combo float and cell highlight in sequence
    let cancelled = false;
    const timers = [];
    const STEP = 600;
    lines.forEach((line, i) => {
      timers.push(setTimeout(() => {
        if (cancelled) return;
        const key = comboKeyFromText(line.comboText);
        const text = key ? t(key) : line.comboText;
        const parts = [];
        if (line.dmg > 0) parts.push(t('combo.detail.damage', { amount: line.dmg }));
        if (line.heal > 0) parts.push(t('combo.detail.heal', { amount: line.heal }));
        if (line.block > 0) parts.push(t('combo.detail.block', { amount: line.block }));
        if (line.selfDmg > 0) parts.push(t('combo.detail.selfDamage', { amount: line.selfDmg }));
        if (line.multFactor > 1) parts.unshift(`✖️${line.multFactor}`);
        setComboAnim({ text, type: line.comboType, detail: parts.join(' · ') || null, key: Date.now() + i });
        slotRef.current?.highlightCells?.(line.cells);
        if (line.comboType === 'triple' || line.comboType === 'skull-triple') {
          if (key) playComboVoice(key.replace('combo.', ''));
        }
        // Apply this line's HP/block changes NOW so the bar drops in chunk
        applyLineEffects(i);
        if (line.dmg > 0) {
          sfx.damage();
          triggerEnemyAnim('shake');
          triggerBarShake('enemy');
          addFloat(enemySpriteRef, `-${line.dmg}`, 'damage');
        }
        if (line.heal > 0) {
          sfx.heal();
          addFloat(playerHpRef, `+${line.heal}`, 'heal');
        }
        if (line.block > 0) {
          sfx.shield();
          addFloat(playerHpRef, `🛡️+${line.block}`, 'shield-block');
        }
        if (line.selfDmg > 0) {
          sfx.skull();
          triggerBarShake('player');
          addFloat(playerHpRef, `-${line.selfDmg}`, 'self-damage');
        }
      }, i * STEP));
    });
    // Clear highlight after the last combo
    timers.push(setTimeout(() => {
      if (cancelled) return;
      slotRef.current?.highlightCells?.([]);
    }, lines.length * STEP + 400));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [state.lineResults, t]);

  useEffect(() => {
    if (state.spinning) setComboAnim(null);
  }, [state.spinning]);

  useEffect(() => {
    if (!state.comboType) return;

    const ct = state.comboType;
    // One-shot reactions for the whole spin — per-line reactions live in the
    // sequential animation effect above.
    if (ct === 'triple') {
      triggerFlash('gold');
    }
    if (state.dmg > 0) {
      triggerEnemyAnim('shake');
      triggerBarShake('enemy');
    }

    if (state.poisonDmg > 0) {
      addFloat(playerHpRef, `🌫️-${state.poisonDmg}`, 'poison');
      triggerBarShake('player');
    }

    if (state.coinGold > 0) {
      addFloat(goldBadgeRef, `+${state.coinGold}💰`, 'coin');
      sfx.buy();
    }

    if (state.justRevived) {
      addFloat(playerHpRef, `🪶 REVIVED!`, 'heal');
      triggerFlash('gold');
      sfx.heal();
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

    // Schedule enemy attack only if we still have spins (the enemy.hp watcher
    // below handles enemy death after per-line damage applies)
    const lineCount = state.lineResults?.length || 0;
    const animDelay = Math.max(300, lineCount * 600 + 200);
    let attackTimer;
    if (state.spinsLeft <= 0) {
      attackTimer = setTimeout(() => doEnemyAttack(), animDelay + 200);
    }
    return () => {
      if (attackTimer) clearTimeout(attackTimer);
    };
  }, [state.comboType, state.spinsLeft, state.dmg]);

  // Watch for enemy death (per-line damage may finish them mid-animation)
  useEffect(() => {
    if (state.phase === 'combat' && state.enemy && state.enemy.hp <= 0) {
      const t = setTimeout(() => {
        enemyDefeated();
        sfx.victory();
      }, 250);
      return () => clearTimeout(t);
    }
  }, [state.enemy?.hp, state.phase, enemyDefeated]);

  // Latest-state ref so deferred callbacks (setTimeouts) see fresh values
  const stateRef = useRef(state);
  stateRef.current = state;

  const doEnemyAttack = useCallback(() => {
    // Read CURRENT state, not the closure's stale snapshot — otherwise
    // a timer scheduled during the previous fight fires here and uses
    // the dead enemy's name/frenzy data.
    const cur = stateRef.current;
    if (!cur.enemy || cur.enemy.hp <= 0 || cur.phase !== 'combat') return;
    const state = cur; // shadow so the rest of the function uses fresh state
    const isFrenzy = state.enemy.frenzyEvery &&
      ((state.enemy.attackCount || 0) + 1) % state.enemy.frenzyEvery === 0;
    const hits = isFrenzy ? state.enemy.frenzyHits : 1;
    const perHit = isFrenzy ? Math.ceil(state.enemy.atk * state.enemy.frenzyMult) : state.enemy.atk;
    const totalDmg = perHit * hits;
    const blocked = Math.min(totalDmg, state.block);
    const incoming = Math.max(0, totalDmg - state.block);

    const finishAttack = () => {
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
      if (incoming > 0 && state.relics?.includes('spikeShield')) {
        setTimeout(() => {
          addFloat(enemySpriteRef, '🌵-3', 'damage');
          triggerBarShake('enemy');
        }, 200);
      }
    };

    if (isFrenzy) {
      // Per-bite animation + sfx + float; total dmg applied at the end via enemyAttack()
      const BITE_GAP = 200;
      for (let i = 0; i < hits; i++) {
        setTimeout(() => {
          flashEnemyAnim('bite', 180);
          if (incoming > 0) {
            sfx.playerHit();
            triggerBarShake('player');
            addFloat(playerHpRef, `-${perHit}`, 'damage');
            if (i === 0) {
              triggerShake();
              triggerFlash('red');
            }
          } else if (blocked > 0 && i === 0) {
            sfx.shieldBreak();
            addFloat(playerHpRef, `🛡️-${blocked}`, 'shield-block');
          }
        }, i * BITE_GAP);
      }
      setTimeout(finishAttack, hits * BITE_GAP + 100);
      return;
    }

    triggerEnemyAnim('attack');
    setTimeout(() => {
      if (blocked > 0) {
        sfx.shieldBreak();
        addFloat(playerHpRef, `🛡️-${blocked}`, 'shield-block');
      }
      if (incoming > 0) {
        if (state.enemy.poisonOnHit) sfx.fart();
        else sfx.playerHit();
        triggerShake();
        triggerFlash('red');
        triggerBarShake('player');
        addFloat(playerHpRef, `-${incoming}`, 'damage');
      }
      finishAttack();
    }, 350);
  }, [state.enemy, state.block, enemyAttack, triggerShake, triggerFlash, triggerBarShake, addFloat, flashEnemyAnim, triggerEnemyAnim, t]);

  const handleBuy = useCallback((item) => {
    buyItem(item);
  }, [buyItem]);

  const handleStartRun = useCallback((characterId) => {
    ensureAudio();
    startMusic('calm');
    sfx.buttonClick();
    startRun(characterId);
  }, [startRun]);

  const handleBackToMenu = useCallback(() => {
    sfx.buttonClick();
    goToMenu();
  }, [goToMenu]);

  // Switch BGM intensity for boss fights — each boss has its own theme
  useEffect(() => {
    const inBossFight = state.phase === 'combat' && state.enemy?.isBoss;
    if (inBossFight) {
      setMusicIntensity(state.enemy.sprite || 'boss');
    } else {
      setMusicIntensity('calm');
    }
  }, [state.phase, state.enemy?.isBoss, state.enemy?.sprite]);

  // Stop music on game over / run complete
  useEffect(() => {
    if (state.phase === 'gameOver' || state.phase === 'runComplete') {
      stopMusic();
    }
  }, [state.phase]);

  // Try to start music as soon as the player first interacts (any tap)
  useEffect(() => {
    const onFirstInteract = () => {
      startMusic('calm');
      window.removeEventListener('pointerdown', onFirstInteract);
    };
    window.addEventListener('pointerdown', onFirstInteract, { once: true });
    return () => window.removeEventListener('pointerdown', onFirstInteract);
  }, []);

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
            <div className="gold-badge" ref={goldBadgeRef}>💰 {state.gold}</div>
            <LangToggle />
            <MusicToggle />
          </div>
          <div className="floor-progress">
            <span className="floor-label">{t('ui.floor', { floor: state.floor })}</span>
            {(() => {
              const visited = state.floorPath || [];
              const plan = state.floorPlan || [];
              const ROOMS = 5;
              const dots = [];
              for (let i = 0; i < ROOMS; i++) {
                const type = visited[i] || plan[i] || null;
                const isVisited = i < visited.length;
                const isCurrent = i === visited.length - 1 && state.phase !== 'planning' && state.phase !== 'floorComplete';
                const icon = !type ? '?' :
                  type === 'shop' ? '💰' :
                  type === 'sacrifice' ? '🪦' :
                  type === 'rest' ? '🏕' :
                  type === 'elite' ? '👹' : '';
                dots.push(
                  <span
                    key={i}
                    className={`floor-dot ${type || 'unknown'}${isVisited && !isCurrent ? ' done' : ''}${isCurrent ? ' current' : ''}${!isVisited ? ' future' : ''}`}
                  >
                    {icon}
                  </span>
                );
              }
              const bossCurrent = visited[visited.length - 1] === 'boss';
              dots.push(
                <span key="boss" className={`floor-dot boss${bossCurrent ? ' current' : ''}`}>💀</span>
              );
              return dots;
            })()}
          </div>
        </div>

        <div className="enemy-area">
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
              ? t('enemy.intent.enraged.lili')
              : state.enemy.frenzyEvery
                ? (() => {
                    const next = state.enemy.frenzyEvery - ((state.enemy.attackCount || 0) % state.enemy.frenzyEvery);
                    return next === 1
                      ? t('enemy.intent.frenzyIncoming', { name: state.enemy.name })
                      : t('enemy.intent.frenzyCountdown', { name: state.enemy.name, count: next });
                  })()
                : state.enemy.poisonOnHit
                  ? state.poisonStacks.length > 0
                    ? t('enemy.intent.poisonActive', { name: state.enemy.name, dmg: state.poisonStacks.reduce((a, b) => a + b.dmg, 0) })
                    : t('enemy.intent.poisonous', { name: state.enemy.name })
                  : state.enemy.isBoss
                    ? t('enemy.intent.bossPrepares', { name: state.enemy.name })
                    : t('enemy.intent.prepares', { name: state.enemy.name })
            : ''}
        </div>
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
            {(() => {
              const c = getCharacter(state.character);
              const portrait = CHAR_PORTRAITS[state.character];
              return (
                <span className="player-portrait" title={c ? t(`char.${c.id}.name`) : ''}>
                  {portrait
                    ? <img src={portrait} alt="" className="player-portrait-img" />
                    : <span className="player-portrait-emoji">{c?.icon || '❤️'}</span>}
                </span>
              );
            })()}
            <div className="bottom-panel-content">
              <div className="player-hp-section">
                <div className="player-hp-row">
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
                {(() => {
                  const c = getCharacter(state.character);
                  if (c?.passive !== 'packHunter') return null;
                  // Next spin number after this one
                  const nextSpinNumber = (state.maxSpins - state.spinsLeft) + 1;
                  if (nextSpinNumber > 0 && nextSpinNumber % 3 === 0) {
                    return <span className="pack-hunter-ready" title="Next spin: Pack Hunter ×2!">🐕</span>;
                  }
                  return null;
                })()}
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
          </div>

          {(() => {
            const c = getCharacter(state.character);
            const ab = c?.ability;
            if (!ab || state.phase !== 'combat') return null;
            const left = state.abilityChargesLeft || 0;
            const ready = left > 0 && !state.spinning;
            return (
              <button
                className={`ability-btn ${ready ? '' : 'disabled'} ${state.bloodragePending ? 'pending' : ''}`}
                onClick={() => { if (ready) { sfx.buttonClick(); useAbility(); } }}
                disabled={!ready}
                title={t(`ability.${ab.id}.desc`)}
              >
                <span className="ability-icon">{ab.icon}</span>
                <span className="ability-name">{t(`ability.${ab.id}.name`)}</span>
                <span className="ability-charges">{left}/{ab.charges}</span>
              </button>
            );
          })()}

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
          {state.justUnlocked && (
            <p className="unlock-line">🎁 {t('overlay.unlocked', { name: t(`char.${state.justUnlocked}.name`) })}</p>
          )}
          {state.justUnlockedRows && (
            <p className="unlock-line">✨ {t('overlay.unlockedRows')}</p>
          )}
          <button onClick={handleNextFloor}>{t('overlay.continueToFloor', { floor: state.floor + 1 })}</button>
        </Overlay>
      )}

      {state.phase === 'runComplete' && (
        <Overlay>
          <h2>{t('overlay.runComplete')}</h2>
          <p>{t('overlay.allBossesDefeated')}</p>
          <p>{t('overlay.totalGold', { gold: state.gold })}</p>
          {state.justUnlocked && (
            <p className="unlock-line">🎁 {t('overlay.unlocked', { name: t(`char.${state.justUnlocked}.name`) })}</p>
          )}
          <WinnerClaim />
          <button onClick={handleBackToMenu}>{t('overlay.playAgain')}</button>
        </Overlay>
      )}

      {state.phase === 'gameOver' && (
        <Overlay>
          <h2>{t('overlay.gameOver')}</h2>
          <p>{t('overlay.position', { floor: state.floor, room: state.room })}</p>
          <p>{t('overlay.goldEarned', { gold: state.gold })}</p>
          <button onClick={handleBackToMenu}>{t('overlay.tryAgain')}</button>
        </Overlay>
      )}

      {state.phase === 'planning' && state.planningLevels && (
        <FloorMap
          floor={state.floor}
          levels={state.planningLevels}
          onSelect={selectPlanOption}
          onCommit={commitPlan}
        />
      )}

      {state.phase === 'rest' && (
        <RestRoom
          playerHp={state.playerHp}
          playerMaxHp={state.playerMaxHp}
          onContinue={finishRest}
        />
      )}

      {state.phase === 'menu' && (
        <CharacterSelect
          unlockedChars={state.unlockedChars}
          onStart={handleStartRun}
        />
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
          onReroll={rerollShop}
        />
      )}

      {floats.map(f => (
        <FloatNumber key={f.id} text={f.text} type={f.type} targetRef={f.ref} />
      ))}
    </>
  );
}
