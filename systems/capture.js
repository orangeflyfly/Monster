function generateMonsterID() {
  return 'mon_' + TimeService.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function generateInitialSkills(monsterType) {
  const caps = MONSTERS[monsterType].skillCaps;
  const skills = {};
  Object.keys(caps).forEach((skill) => {
    skills[skill] = Math.max(1, Math.floor(Math.random() * 3));
  });
  return skills;
}

function generateTraits() {
  const traitKeys = Object.keys(TRAITS);
  const count = Math.random() < 0.3 ? 2 : 1;
  const result = [];

  for (let i = 0; i < count; i++) {
    const pool = traitKeys.filter((k) => {
      const t = TRAITS[k];
      return !result.some((r) =>
        TRAITS[r.key].incompatible.includes(k) || t.incompatible.includes(r.key)
      );
    });
    if (pool.length === 0) break;

    const weights = pool.map((k) => TRAIT_RARITY_WEIGHTS[TRAITS[k].rarity] || 50);
    const total = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    for (let j = 0; j < pool.length; j++) {
      rand -= weights[j];
      if (rand <= 0) {
        result.push({ key: pool[j], level: 1 });
        break;
      }
    }
  }
  return result;
}

function generatePersonality() {
  const keys = Object.keys(CONFIG.personalities);
  return keys[Math.floor(Math.random() * keys.length)];
}

function generateTalent() {
  return Math.floor(Math.random() * (CONFIG.talentMax - CONFIG.talentMin + 1)) + CONFIG.talentMin;
}

function createMonster(type, forcedTalent) {
  return {
    id: generateMonsterID(),
    type,
    assignedMap: null,
    workProgressMs: 0,
    position: null,
    level: 1,
    skills: generateInitialSkills(type),
    talent: forcedTalent !== undefined ? forcedTalent : generateTalent(),
    traits: generateTraits(),
    personality: generatePersonality(),
    mood: CONFIG.moodDefault || 70,
    locked: false,
    favorite: false,
  };
}

function getWildEncounter() {
  const monsterIds = Object.keys(MONSTERS).filter((id) => !MONSTERS[id].exchangeOnly);
  const type = monsterIds[Math.floor(Math.random() * monsterIds.length)];
  return MONSTERS[type];
}

function canAttemptCapture(state) {
  return Boolean(state.research.capture) && state.monsters.length < getVaultLimit(state);
}

function spendWildResource(state) {
  const current = Number.isFinite(Number(state.wildResourceIndex))
    ? Number(state.wildResourceIndex)
    : (CONFIG.wildResourceDefault || 100);
  const nextValue = Math.max(0, Math.floor(current) - (CONFIG.wildResourceCatchCost || 3));
  return Object.assign({}, state, { wildResourceIndex: nextValue });
}

function processWildResourceRecovery(state, now = TimeService.now()) {
  const max = CONFIG.wildResourceMax || 100;
  const current = Number.isFinite(Number(state.wildResourceIndex))
    ? Math.max(0, Math.min(max, Math.floor(Number(state.wildResourceIndex))))
    : (CONFIG.wildResourceDefault || 100);
  const lastRecoveryAt = Number.isFinite(Number(state.lastWildResourceRecoveryAt))
    ? Number(state.lastWildResourceRecoveryAt)
    : now;
  const recoverMs = CONFIG.wildResourceRecoverMs || (60 * 60 * 1000);
  const steps = Math.floor(Math.max(0, now - lastRecoveryAt) / recoverMs);
  if (steps <= 0) {
    return state;
  }

  return Object.assign({}, state, {
    wildResourceIndex: Math.min(max, current + steps * (CONFIG.wildResourceRecoverAmount || 2)),
    lastWildResourceRecoveryAt: lastRecoveryAt + steps * recoverMs,
  });
}

function attemptCapture(state, targetType) {
  if (!state.research.capture) {
    return { state, message: '需要先完成捕捉研究。', caught: false };
  }

  if (state.monsters.length >= getVaultLimit(state)) {
    return { state, message: '倉庫已滿，請先野放怪物。', caught: false };
  }

  const target = MONSTERS[targetType];
  if (!target) {
    return { state, message: '沒有可捕捉目標。', caught: false };
  }

  // 陷阱消耗檢查
  const hasTrap = hasUnlock(state, 'trap');
  const enhancedTrapCount = (state.inventory && state.inventory.enhanced_trap) || 0;
  const basicTrapCount = (state.inventory && state.inventory.basic_trap) || 0;
  const useEnhanced = enhancedTrapCount > 0;
  if (hasTrap && enhancedTrapCount <= 0 && basicTrapCount <= 0) {
    return { state, message: '陷阱不足，請先在市場購買陷阱。', caught: false };
  }

  const rolledTalent = generateTalent();

  // 消耗陷阱
  let newState = spendWildResource(state);
  if (hasTrap) {
    const inventory = Object.assign({}, newState.inventory, useEnhanced
      ? { enhanced_trap: enhancedTrapCount - 1 }
      : { basic_trap: basicTrapCount - 1 }
    );
    newState = Object.assign({}, newState, { inventory });
  }

  const trapBonus = useEnhanced ? 0.15 : 0;
  const talentRange = CONFIG.talentMax - CONFIG.talentMin;
  const talentPenalty = talentRange > 0
    ? ((rolledTalent - CONFIG.talentMin) / talentRange) * 0.2
    : 0;
  const finalCaptureRate = Math.min(0.95, Math.max(0.05, target.captureRate + trapBonus - talentPenalty));
  if (Math.random() >= finalCaptureRate) {
    return { state: newState, message: `${target.name}掙脫了，捕捉失敗。（陷阱已消耗）`, caught: false };
  }

  const monster = createMonster(targetType, rolledTalent);
  if (newState.monsters.length >= getVaultLimit(newState)) {
    return { state: newState, message: '倉庫已滿，請先野放怪物。', caught: false };
  }

  const compendium = Object.assign({}, newState.compendium || {});
  compendium.monsters = Object.assign({}, compendium.monsters, {
    [monster.type]: {
      discovered: true,
      firstCaughtAt: TimeService.now(),
      count: ((compendium.monsters?.[monster.type] || {}).count || 0) + 1,
    },
  });
  newState = Object.assign({}, newState, {
    monsters: newState.monsters.concat(monster),
    compendium,
  });

  return {
    state: newState,
    message: `成功捕獲${target.name}！`,
    caught: true,
    monster,
  };
}

const capture = {
  createMonster,
  getWildEncounter,
  canAttemptCapture,
  processWildResourceRecovery,
  attemptCapture,
};
