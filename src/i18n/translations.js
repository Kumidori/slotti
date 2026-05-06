export const SUPPORTED_LANGS = ['en', 'de', 'bg'];
export const DEFAULT_LANG = 'en';

const en = {
  // Top bar
  'ui.floor': 'Floor {floor}',
  'ui.spins': '{count} spins',

  // Slot machine
  'slot.lockHint': '💡 Tap a reel to lock it for the next spin',
  'slot.locked': '🔒 Locked — will keep on next spin',
  'slot.lockHintWithCount': '💡 Tap a reel to lock — {count} locks left',
  'slot.lockedWithCount': '🔒 Locked — {count} more available',
  'slot.noLocks': '🔒 No locks left this fight',

  // Combo names
  'combo.tripleSkull': '☠️ TRIPLE SKULL!',
  'combo.tripleSlash': '⚔️ TRIPLE SLASH!',
  'combo.arcaneBurst': '✨ ARCANE BURST!',
  'combo.fortress': '🛡️ FORTRESS!',
  'combo.fullRestore': '🧪 FULL RESTORE!',
  'combo.doubleStrike': '⚔️ Double Strike',
  'combo.spellCast': '✨ Spell Cast',
  'combo.shieldWall': '🛡️ Shield Wall',
  'combo.quickHeal': '🧪 Quick Heal',
  'combo.cursed': '💀 Cursed!',
  'combo.weakHit': 'Weak hit',
  'combo.rainbow': '⭐ Rainbow Combo',

  // Combo detail parts
  'combo.detail.damage': '{amount} damage',
  'combo.detail.heal': '+{amount} HP',
  'combo.detail.block': '+{amount} 🛡️',
  'combo.detail.selfDamage': '{amount} self damage',

  // Enemy intent / attacks
  'enemy.intent.prepares': '{name} prepares to strike!',
  'enemy.intent.bossPrepares': '👹 BOSS — {name} prepares to strike!',
  'enemy.intent.enraged.lili': 'Lili got her period, all outgoing and incoming damage increased!',
  'enemy.intent.frenzyIncoming': '🐕 {name} growls... FRENZY incoming!',
  'enemy.intent.frenzyCountdown': '🐕 {name} winds up... {count} attacks until FRENZY',
  'enemy.attack': '{name} attacks!',
  'enemy.frenzy': '🐕 {name} FRENZY!',
  'enemy.attack.detail.damage': '{amount} damage',
  'enemy.attack.detail.blocked': '{amount} blocked',
  'enemy.attack.detail.fullyBlocked': 'fully blocked!',
  'enemy.attack.detail.bites': '{count} bites',
  'enemy.attack.detail.noDamage': 'no damage',

  // Sacrifice room
  'sacrifice.title': '🪦 Sacrifice',
  'sacrifice.subtitle': 'Choose one symbol to sacrifice — a random new one takes its place.',
  'sacrifice.resultSub': 'The exchange is complete.',
  'sacrifice.choose': 'Sacrifice',
  'sacrifice.skip': 'Leave',
  'sacrifice.gave': 'Sacrificed',
  'sacrifice.got': 'Received',
  'sacrifice.continue': 'Continue',

  // Symbol picker
  'picker.victory': '⚔️ Victory!',
  'picker.goldEarned': '+{amount} gold',
  'picker.subtitle': 'Add a symbol to your pool — or skip.',
  'picker.choose': 'Choose',
  'picker.skip': 'Skip',
  'picker.reroll': '🎲 Reroll',

  // Symbol pool viewer
  'pool.title': 'Symbol Pool ({count})',
  'pool.subtitle': "Each symbol's chance is its count divided by the total.",
  'pool.close': 'Close',
  'pool.tapToView': 'View symbol pool',

  // Shop
  'shop.title': '🏪 Shop',
  'shop.interestEarned': '+{interest} interest earned! ({next} next)',
  'shop.interestPrompt': 'Save 10+ gold to earn interest (max +5)',
  'shop.choose': 'Choose',
  'shop.leave': 'Leave Shop →',

  // Shop items
  'item.extraSpin.name': 'Extra Spin',
  'item.extraSpin.desc': '+1 spin per fight',
  'item.healPotion.name': 'Heal Potion',
  'item.healPotion.desc': 'Restore 20 HP',
  'item.maxHpUp.name': 'Max HP Up',
  'item.maxHpUp.desc': '+10 max HP',
  'item.sharpBlade.name': 'Sharp Blade',
  'item.sharpBlade.desc': '+2 sword damage',
  'item.magicTome.name': 'Magic Tome',
  'item.magicTome.desc': '+3 magic damage',
  'item.luckyCharm.name': 'Lucky Charm',
  'item.luckyCharm.desc': 'Cheaper symbol rerolls',

  // Relics
  'relic.vampiricCharm.name': 'Vampiric Charm',
  'relic.vampiricCharm.desc': 'Heal for 20% of damage you deal',
  'relic.cursedCoin.name': 'Cursed Coin',
  'relic.cursedCoin.desc': 'Skulls heal you instead of damaging',
  'relic.glassCannon.name': 'Glass Cannon',
  'relic.glassCannon.desc': 'Triple combos deal 2× damage',
  'relic.ironWill.name': 'Iron Will',
  'relic.ironWill.desc': 'Block carries over to next turn',
  'relic.magnet.name': 'Magnet',
  'relic.magnet.desc': '+50% gold from enemies',

  // Overlays
  'overlay.gameOver': '💀 Game Over',
  'overlay.position': 'Floor {floor} — Room {room}',
  'overlay.goldEarned': 'Gold earned: {gold}',
  'overlay.tryAgain': 'Try Again',
  'overlay.floorComplete': '👑 Floor {floor} Complete!',
  'overlay.bossDefeated': 'You defeated the boss!',
  'overlay.continueToFloor': 'Continue to Floor {floor}',
  'overlay.runComplete': '🏆 Run Complete!',
  'overlay.allBossesDefeated': 'You defeated all bosses!',
  'overlay.totalGold': 'Total gold: {gold}',
  'overlay.playAgain': 'Play Again',
};

const de = {
  // Top bar
  'ui.floor': 'Etage {floor}',
  'ui.spins': '{count} Drehs',

  // Slot machine
  'slot.lockHint': '💡 Tippe eine Walze zum Sperren für den nächsten Dreh',
  'slot.locked': '🔒 Gesperrt — bleibt beim nächsten Dreh',
  'slot.lockHintWithCount': '💡 Tippe zum Sperren — {count} Sperren übrig',
  'slot.lockedWithCount': '🔒 Gesperrt — noch {count} verfügbar',
  'slot.noLocks': '🔒 Keine Sperren mehr in diesem Kampf',

  // Combo names
  'combo.tripleSkull': '☠️ DREIFACH-SCHÄDEL!',
  'combo.tripleSlash': '⚔️ DREIFACH-HIEB!',
  'combo.arcaneBurst': '✨ ARKANE EXPLOSION!',
  'combo.fortress': '🛡️ FESTUNG!',
  'combo.fullRestore': '🧪 VOLLE HEILUNG!',
  'combo.doubleStrike': '⚔️ Doppelschlag',
  'combo.spellCast': '✨ Zauber',
  'combo.shieldWall': '🛡️ Schildwand',
  'combo.quickHeal': '🧪 Schnellheilung',
  'combo.cursed': '💀 Verflucht!',
  'combo.weakHit': 'Schwacher Treffer',
  'combo.rainbow': '⭐ Regenbogen-Combo',

  // Combo detail parts
  'combo.detail.damage': '{amount} Schaden',
  'combo.detail.heal': '+{amount} LP',
  'combo.detail.block': '+{amount} 🛡️',
  'combo.detail.selfDamage': '{amount} Eigenschaden',

  // Enemy intent / attacks
  'enemy.intent.prepares': '{name} holt zum Schlag aus!',
  'enemy.intent.bossPrepares': '👹 BOSS — {name} holt zum Schlag aus!',
  'enemy.intent.enraged.lili': 'Lili hat ihre Tage – ausgehender und eingehender Schaden erhöht!',
  'enemy.intent.frenzyIncoming': '🐕 {name} knurrt... RASEREI kommt!',
  'enemy.intent.frenzyCountdown': '🐕 {name} holt aus... {count} Angriffe bis zur RASEREI',
  'enemy.attack': '{name} greift an!',
  'enemy.frenzy': '🐕 {name} RASEREI!',
  'enemy.attack.detail.damage': '{amount} Schaden',
  'enemy.attack.detail.blocked': '{amount} geblockt',
  'enemy.attack.detail.fullyBlocked': 'komplett geblockt!',
  'enemy.attack.detail.bites': '{count} Bisse',
  'enemy.attack.detail.noDamage': 'kein Schaden',

  // Sacrifice room
  'sacrifice.title': '🪦 Opfer',
  'sacrifice.subtitle': 'Wähle ein Symbol zum Opfern — ein zufälliges neues nimmt seinen Platz ein.',
  'sacrifice.resultSub': 'Der Tausch ist abgeschlossen.',
  'sacrifice.choose': 'Opfern',
  'sacrifice.skip': 'Verlassen',
  'sacrifice.gave': 'Geopfert',
  'sacrifice.got': 'Erhalten',
  'sacrifice.continue': 'Weiter',

  // Symbol picker
  'picker.victory': '⚔️ Sieg!',
  'picker.goldEarned': '+{amount} Gold',
  'picker.subtitle': 'Füge ein Symbol zu deinem Pool hinzu — oder überspringe.',
  'picker.choose': 'Wählen',
  'picker.skip': 'Überspringen',
  'picker.reroll': '🎲 Neu würfeln',

  // Symbol pool viewer
  'pool.title': 'Symbol-Pool ({count})',
  'pool.subtitle': 'Die Chance jedes Symbols entspricht seiner Anzahl geteilt durch die Gesamtzahl.',
  'pool.close': 'Schließen',
  'pool.tapToView': 'Symbol-Pool ansehen',

  // Shop
  'shop.title': '🏪 Shop',
  'shop.interestEarned': '+{interest} Zinsen erhalten! ({next} als Nächstes)',
  'shop.interestPrompt': 'Spare 10+ Gold für Zinsen (max +5)',
  'shop.choose': 'Kaufen',
  'shop.leave': 'Shop verlassen →',

  // Shop items
  'item.extraSpin.name': 'Extra-Dreh',
  'item.extraSpin.desc': '+1 Dreh pro Kampf',
  'item.healPotion.name': 'Heiltrank',
  'item.healPotion.desc': '20 LP wiederherstellen',
  'item.maxHpUp.name': 'Max LP +',
  'item.maxHpUp.desc': '+10 maximale LP',
  'item.sharpBlade.name': 'Scharfe Klinge',
  'item.sharpBlade.desc': '+2 Schwertschaden',
  'item.magicTome.name': 'Zauberbuch',
  'item.magicTome.desc': '+3 Magieschaden',
  'item.luckyCharm.name': 'Glücksbringer',
  'item.luckyCharm.desc': 'Günstigere Symbol-Rerolls',

  // Relics
  'relic.vampiricCharm.name': 'Vampir-Amulett',
  'relic.vampiricCharm.desc': 'Heile für 20% des verursachten Schadens',
  'relic.cursedCoin.name': 'Verfluchte Münze',
  'relic.cursedCoin.desc': 'Schädel heilen dich, statt Schaden zu machen',
  'relic.glassCannon.name': 'Glaskanone',
  'relic.glassCannon.desc': 'Dreifach-Combos machen 2× Schaden',
  'relic.ironWill.name': 'Eiserner Wille',
  'relic.ironWill.desc': 'Block überträgt sich auf den nächsten Zug',
  'relic.magnet.name': 'Magnet',
  'relic.magnet.desc': '+50% Gold von Gegnern',

  // Overlays
  'overlay.gameOver': '💀 Spiel vorbei',
  'overlay.position': 'Etage {floor} — Raum {room}',
  'overlay.goldEarned': 'Gold verdient: {gold}',
  'overlay.tryAgain': 'Nochmal',
  'overlay.floorComplete': '👑 Etage {floor} geschafft!',
  'overlay.bossDefeated': 'Du hast den Boss besiegt!',
  'overlay.continueToFloor': 'Weiter zu Etage {floor}',
  'overlay.runComplete': '🏆 Run abgeschlossen!',
  'overlay.allBossesDefeated': 'Du hast alle Bosse besiegt!',
  'overlay.totalGold': 'Gesamtes Gold: {gold}',
  'overlay.playAgain': 'Nochmal spielen',
};

const bg = {
  // Top bar
  'ui.floor': 'Етаж {floor}',
  'ui.spins': '{count} завъртания',

  // Slot machine
  'slot.lockHint': '💡 Докоснете барабан, за да го заключите за следващото завъртане',
  'slot.locked': '🔒 Заключено — ще остане при следващото завъртане',
  'slot.lockHintWithCount': '💡 Докоснете за заключване — {count} заключвания',
  'slot.lockedWithCount': '🔒 Заключено — още {count}',
  'slot.noLocks': '🔒 Няма повече заключвания в този бой',

  // Combo names
  'combo.tripleSkull': '☠️ ТРОЕН ЧЕРЕП!',
  'combo.tripleSlash': '⚔️ ТРОЕН УДАР!',
  'combo.arcaneBurst': '✨ МАГИЧЕСКИ ИЗБУХ!',
  'combo.fortress': '🛡️ КРЕПОСТ!',
  'combo.fullRestore': '🧪 ПЪЛНО ВЪЗСТАНОВЯВАНЕ!',
  'combo.doubleStrike': '⚔️ Двоен удар',
  'combo.spellCast': '✨ Заклинание',
  'combo.shieldWall': '🛡️ Стена от щитове',
  'combo.quickHeal': '🧪 Бързо лечение',
  'combo.cursed': '💀 Прокълнат!',
  'combo.weakHit': 'Слаб удар',
  'combo.rainbow': '⭐ Дъгово комбо',

  // Combo detail parts
  'combo.detail.damage': '{amount} щета',
  'combo.detail.heal': '+{amount} HP',
  'combo.detail.block': '+{amount} 🛡️',
  'combo.detail.selfDamage': '{amount} щета на себе си',

  // Enemy intent / attacks
  'enemy.intent.prepares': '{name} се готви да удари!',
  'enemy.intent.bossPrepares': '👹 БОС — {name} се готви да удари!',
  'enemy.intent.enraged.lili': 'Лили има цикъл — нанесените и получените щети са увеличени!',
  'enemy.intent.frenzyIncoming': '🐕 {name} ръмжи... ЯРОСТТА идва!',
  'enemy.intent.frenzyCountdown': '🐕 {name} се подготвя... {count} атаки до ЯРОСТ',
  'enemy.attack': '{name} атакува!',
  'enemy.frenzy': '🐕 {name} ЯРОСТ!',
  'enemy.attack.detail.damage': '{amount} щета',
  'enemy.attack.detail.blocked': '{amount} блокирани',
  'enemy.attack.detail.fullyBlocked': 'напълно блокирано!',
  'enemy.attack.detail.bites': '{count} ухапвания',
  'enemy.attack.detail.noDamage': 'без щети',

  // Sacrifice room
  'sacrifice.title': '🪦 Жертва',
  'sacrifice.subtitle': 'Избери символ, който да пожертваш — случаен нов го заменя.',
  'sacrifice.resultSub': 'Размяната е завършена.',
  'sacrifice.choose': 'Пожертвай',
  'sacrifice.skip': 'Излез',
  'sacrifice.gave': 'Пожертвано',
  'sacrifice.got': 'Получено',
  'sacrifice.continue': 'Напред',

  // Symbol picker
  'picker.victory': '⚔️ Победа!',
  'picker.goldEarned': '+{amount} злато',
  'picker.subtitle': 'Добави символ към своя пул — или пропусни.',
  'picker.choose': 'Избери',
  'picker.skip': 'Пропусни',
  'picker.reroll': '🎲 Прехвърли',

  // Symbol pool viewer
  'pool.title': 'Пул от символи ({count})',
  'pool.subtitle': 'Шансът на всеки символ е броят му разделен на общия брой.',
  'pool.close': 'Затвори',
  'pool.tapToView': 'Виж пула от символи',

  // Shop
  'shop.title': '🏪 Магазин',
  'shop.interestEarned': '+{interest} лихва! ({next} следваща)',
  'shop.interestPrompt': 'Запази 10+ злато за лихва (макс. +5)',
  'shop.choose': 'Купи',
  'shop.leave': 'Напусни магазина →',

  // Shop items
  'item.extraSpin.name': 'Допълнително завъртане',
  'item.extraSpin.desc': '+1 завъртане на бой',
  'item.healPotion.name': 'Лечебна отвара',
  'item.healPotion.desc': 'Възстановява 20 HP',
  'item.maxHpUp.name': 'Макс. HP +',
  'item.maxHpUp.desc': '+10 максимални HP',
  'item.sharpBlade.name': 'Остро острие',
  'item.sharpBlade.desc': '+2 щета на меч',
  'item.magicTome.name': 'Магическа книга',
  'item.magicTome.desc': '+3 щета на магия',
  'item.luckyCharm.name': 'Талисман',
  'item.luckyCharm.desc': 'По-евтини прехвърляния',

  // Relics
  'relic.vampiricCharm.name': 'Вампирски амулет',
  'relic.vampiricCharm.desc': 'Лекуваш се за 20% от нанесените щети',
  'relic.cursedCoin.name': 'Прокълната монета',
  'relic.cursedCoin.desc': 'Черепите те лекуват, вместо да нанасят щети',
  'relic.glassCannon.name': 'Стъклено оръдие',
  'relic.glassCannon.desc': 'Тройните комбота нанасят 2× щети',
  'relic.ironWill.name': 'Желязна воля',
  'relic.ironWill.desc': 'Блокът се пренася в следващия ход',
  'relic.magnet.name': 'Магнит',
  'relic.magnet.desc': '+50% злато от враговете',

  // Overlays
  'overlay.gameOver': '💀 Край на играта',
  'overlay.position': 'Етаж {floor} — Стая {room}',
  'overlay.goldEarned': 'Спечелено злато: {gold}',
  'overlay.tryAgain': 'Опитай пак',
  'overlay.floorComplete': '👑 Етаж {floor} е завършен!',
  'overlay.bossDefeated': 'Победи боса!',
  'overlay.continueToFloor': 'Към етаж {floor}',
  'overlay.runComplete': '🏆 Преминат път!',
  'overlay.allBossesDefeated': 'Победи всички босове!',
  'overlay.totalGold': 'Общо злато: {gold}',
  'overlay.playAgain': 'Играй пак',
};

export const TRANSLATIONS = { en, de, bg };

export function detectBrowserLang() {
  const stored = typeof localStorage !== 'undefined' && localStorage.getItem('lang');
  if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
  const nav = typeof navigator !== 'undefined' ? (navigator.language || '') : '';
  const prefix = nav.toLowerCase().slice(0, 2);
  return SUPPORTED_LANGS.includes(prefix) ? prefix : DEFAULT_LANG;
}

export function interpolate(template, params = {}) {
  return template.replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? params[k] : `{${k}}`);
}
