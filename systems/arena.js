const ARENA_SPECIALTY_SKILLS = {
  farm: 'farming',
  forest: 'logging',
  mine: 'mining',
  hunting: 'hunting',
  lake: 'fishing',
};

function getArenaTraitBonuses(monster) {
  return (monster.traits || []).reduce((bonuses, trait) => {
    const key = trait.key || trait;
    const level = trait.level || 1;
    const effect = ARENA_TRAIT_EFFECTS[key];
    if (!effect) return bonuses;
    return {
      atkBonus: bonuses.atkBonus + ((effect.atkBonus || 0) * level),
      hpBonus: bonuses.hpBonus + ((effect.hpBonus || 0) * level),
      speedBonus: bonuses.speedBonus + ((effect.speedBonus || 0) * level),
    };
  }, { atkBonus: 0, hpBonus: 0, speedBonus: 0 });
}

function calcArenaMonsterStats(monster) {
  const def = MONSTERS[monster.type];
  const specialty = def?.specialty || 'farm';
  const skillKey = ARENA_SPECIALTY_SKILLS[specialty] || 'farming';
  const skillValue = Math.max(1, Number(monster.skills?.[skillKey] || 1));
  const traitBonuses = getArenaTraitBonuses(monster);
  const maxHp = Math.round((CONFIG.arenaBaseHp || 100) * (1 + traitBonuses.hpBonus));
  const attack = Math.max(1, Math.round(skillValue * (1 + traitBonuses.atkBonus)));

  return {
    skillKey,
    skillValue,
    attack,
    maxHp,
    traitBonuses,
  };
}

function applyArenaReward(state, rewards) {
  let resources = Object.assign({}, state.resources);
  let inventory = Object.assign({}, state.inventory || {});
  let researchPoints = state.researchPoints || 0;
  const texts = [];

  Object.entries(rewards || {}).forEach(([key, amount]) => {
    if (key === 'researchPoints') {
      researchPoints += amount;
      texts.push(`研究點×${amount}`);
    } else if (CONFIG.CORE_RESOURCE_KEYS.includes(key) || CONFIG.CURRENCY_KEYS.includes(key)) {
      resources = addResourceToResources(resources, key, amount);
      texts.push(`${RESOURCES[key]?.name || key}×${amount}`);
    } else {
      inventory[key] = (inventory[key] || 0) + amount;
      texts.push(`${RESOURCES[key]?.name || key}×${amount}`);
    }
  });

  return {
    state: Object.assign({}, state, { resources, inventory, researchPoints }),
    texts,
  };
}

function startArenaBattle(state, monsterId, stageId) {
  const check = S.canEnterActivity(state, monsterId, 'arena');
  if (!check.can) return { state, message: check.reason };

  const monster = state.monsters.find((m) => m.id === monsterId);
  if (!monster) return { state, message: '找不到怪物。' };

  const stage = ARENA_STAGES[stageId];
  if (!stage) return { state, message: '試煉關卡不存在。' };

  const sessionId = 'arena_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5);
  const monsterDef = MONSTERS[monster.type];
  const stats = calcArenaMonsterStats(monster);
  const enemyHp = CONFIG.arenaBaseHp || 100;

  const monsters = state.monsters.map((m) =>
    m.id === monsterId ? Object.assign({}, m, { arenaSessionId: sessionId }) : m
  );

  return {
    state: Object.assign({}, state, { monsters }),
    message: `${monsterDef?.name || monster.type} 進入「${stage.name}」！`,
    battle: {
      sessionId,
      monsterId,
      stageId,
      startedAt: TimeService.now(),
      player: {
        name: monsterDef?.name || monster.type,
        icon: monsterDef?.icon || '❔',
        type: monster.type,
        hp: stats.maxHp,
        maxHp: stats.maxHp,
        attack: stats.attack,
        skillName: CONFIG.skillNames[stats.skillKey] || stats.skillKey,
        x: 18,
        y: 44,
        vx: 0.055 + (stats.traitBonuses.speedBonus || 0),
        vy: 0.035,
      },
      enemy: {
        name: stage.enemyName,
        icon: stage.enemyIcon,
        hp: enemyHp,
        maxHp: enemyHp,
        attack: Math.max(1, stage.enemySkill),
        x: 78,
        y: 42,
        vx: -0.045,
        vy: 0.032,
      },
      nextHitAt: TimeService.now() + 850,
      log: [`${monsterDef?.name || monster.type} 挑戰 ${stage.enemyName}。`],
      status: 'running',
    },
  };
}

function resolveArenaBattle(state, monsterId, result) {
  const monster = state.monsters.find((m) => m.id === monsterId);
  if (!monster) return { state, message: '找不到怪物。', reports: [] };

  const stage = ARENA_STAGES[result.stageId];
  const win = result.outcome === 'win';
  const rewards = win ? (stage?.reward || {}) : (stage?.consolation || {});
  const rewardResult = applyArenaReward(state, rewards);
  const monsters = rewardResult.state.monsters.map((m) =>
    m.id === monsterId ? Object.assign({}, m, { arenaSessionId: null }) : m
  );
  const rewardText = rewardResult.texts.length > 0 ? rewardResult.texts.join('、') : '無';
  const reports = (result.reports || []).concat(
    win
      ? `勝利！獲得 ${rewardText}。`
      : `戰鬥結束，獲得安慰獎勵：${rewardText}。`
  );

  return {
    state: Object.assign({}, rewardResult.state, { monsters }),
    message: win
      ? `${stage?.name || '試煉'} 勝利！`
      : `${stage?.name || '試煉'} 結束。`,
    reports,
  };
}

const arena = {
  startArenaBattle,
  resolveArenaBattle,
  calcArenaMonsterStats,
};
