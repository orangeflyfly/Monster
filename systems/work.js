function canRemoveMonster(state, id) {
  const monster = state.monsters.find((m) => m.id === id);
  if (!monster) return { can: false, reason: '找不到該怪物。' };
  if (monster.locked) {
    return { can: false, reason: `${MONSTERS[monster.type]?.name} 已鎖定，請先解鎖。` };
  }
  const activityCheck = canEnterActivity(state, id, 'remove');
  if (!activityCheck.can) return activityCheck;
  const now = TimeService.now();
  if (monster.breedCooldown && monster.breedCooldown > now) {
    return { can: false, reason: `${MONSTERS[monster.type]?.name} 配種冷卻中，無法移除。` };
  }
  return { can: true };
}

function getMonsterActivity(state, monsterId) {
  const monster = state.monsters.find((m) => m.id === monsterId);
  if (!monster) return null;

  if (monster.assignedMap) return { type: 'working', detail: MAPS[monster.assignedMap]?.name };
  if (monster.trainingCourse) return { type: 'training', detail: TRAINING_COURSES[monster.trainingCourse]?.name };
  if ((state.exhibition || []).includes(monsterId)) return { type: 'exhibition', detail: '展覽館' };
  if (monster.expeditionId) return { type: 'expedition', detail: EXPEDITIONS[monster.expeditionId]?.name };
  if (monster.arenaSessionId) return { type: 'arena', detail: '試煉場戰鬥中' };
  if ((state.breedingSlots || []).some((s) => s.monsterAId === monsterId || s.monsterBId === monsterId)) {
    return { type: 'breeding', detail: '繁殖中' };
  }
  if (monster.breedCooldown && monster.breedCooldown > TimeService.now()) {
    return { type: 'breedCooldown', detail: '配種冷卻' };
  }
  return { type: 'idle', detail: '待命' };
}

function canEnterActivity(state, monsterId, activityType) {
  const activity = getMonsterActivity(state, monsterId);
  if (!activity) return { can: false, reason: '找不到怪物。' };

  const monster = state.monsters.find((m) => m.id === monsterId);

  const destructiveActions = ['release', 'retire', 'sell', 'donate'];
  if (monster.locked && destructiveActions.includes(activityType)) {
    return { can: false, reason: `${MONSTERS[monster.type]?.name} 已鎖定，請先解鎖。` };
  }

  if (activity.type === 'idle' || activity.type === 'breedCooldown') return { can: true };

  const blocked = ['working', 'training', 'exhibition', 'expedition', 'breeding', 'arena'];

  if (blocked.includes(activity.type)) {
    return {
      can: false,
      reason: `${MONSTERS[monster.type]?.name} 正在${activity.detail}中，無法進行其他活動。`,
    };
  }

  return { can: true };
}

function randomMapPosition() {
  return {
    x: 10 + Math.random() * 80,
    y: 14 + Math.random() * 70,
  };
}

function getAssignedCount(monsters, mapId) {
  return monsters.filter((monster) => monster.assignedMap === mapId).length;
}

function canAssignMonster(state, monsterId, mapId) {
  const monster = state.monsters.find((item) => item.id === monsterId);
  const mapState = state.maps[mapId];
  if (!monster || !mapState || !MAPS[mapId]) {
    return false;
  }
  if (monster.assignedMap === mapId) return true;
  if (!canEnterActivity(state, monsterId, 'working').can) return false;
  return getAssignedCount(state.monsters, mapId) < mapState.unlockedSlots;
}

function assignMonster(state, monsterId, mapId) {
  if (!canAssignMonster(state, monsterId, mapId)) {
    return state;
  }

  return Object.assign({}, state, {
    monsters: state.monsters.map((monster) => {
      if (monster.id !== monsterId) {
        return monster;
      }
      return Object.assign({}, monster, {
        assignedMap: mapId,
        workProgressMs: 0,
        position: monster.position || randomMapPosition(),
        target: randomMapPosition(),
      });
    }),
  });
}

function unassignMonster(state, monsterId) {
  return Object.assign({}, state, {
    monsters: state.monsters.map((monster) => {
      if (monster.id !== monsterId) {
        return monster;
      }
      return Object.assign({}, monster, {
        assignedMap: null,
        workProgressMs: 0,
      });
    }),
  });
}

function addSpeciesProgress(state, monsterType) {
  const research = CONFIG.speciesResearch[monsterType];
  if (!research) return state;

  const current = (state.speciesProgress || {})[monsterType] || 0;
  const max = research.maxProgress;
  const newProgress = Math.min(current + 3, max);

  const speciesProgress = Object.assign({}, state.speciesProgress, {
    [monsterType]: newProgress,
  });

  // 進度滿了解鎖捕捉提示
  const speciesHints = Object.assign({}, state.speciesHints);
  if (newProgress >= max && !speciesHints[monsterType]) {
    speciesHints[monsterType] = true;
  }

  return Object.assign({}, state, { speciesProgress, speciesHints });
}

function releaseMonster(state, id) {
  const check = canRemoveMonster(state, id);
  if (!check.can) return { state, message: check.reason };
  const monster = state.monsters.find((m) => m.id === id);

  const def = MONSTERS[monster.type];
  const inventory = Object.assign({}, state.inventory || {});

  // 基本野放證明
  const certKey = `cert_${monster.type}`;
  inventory[certKey] = (inventory[certKey] || 0) + 1;

  // 精英證明：天賦8以上
  if ((monster.talent || 0) >= 8) {
    inventory['cert_elite'] = (inventory['cert_elite'] || 0) + 1;
  }

  // 稀有詞條證明：有稀有詞條
  const hasRareTrait = (monster.traits || []).some((t) => {
    const traitDef = TRAITS[t.key || t];
    return traitDef && traitDef.rarity === 'rare';
  });
  if (hasRareTrait) {
    inventory['cert_rare'] = (inventory['cert_rare'] || 0) + 1;
  }

  const certText = [`${def.name}證明 ×1`];
  if ((monster.talent || 0) >= 8) certText.push('精英證明 ×1');
  if (hasRareTrait) certText.push('稀有詞條證明 ×1');

  const monsters = state.monsters.filter((m) => m.id !== id);
  let newState = Object.assign({}, state, { monsters, inventory });
  newState = addSpeciesProgress(newState, monster.type);

  return {
    state: newState,
    message: `${def.name} 已野放，獲得：${certText.join('、')}`,
  };
}

function retireMonster(state, id) {
  const check = canRemoveMonster(state, id);
  if (!check.can) return { state, message: check.reason };
  const monster = state.monsters.find((m) => m.id === id);

  const def = MONSTERS[monster.type];
  const drops = def.retireDrops || {};
  const inventory = Object.assign({}, state.inventory || {});

  Object.entries(drops).forEach(([item, amount]) => {
    inventory[item] = (inventory[item] || 0) + amount;
  });

  const dropText = Object.entries(drops)
    .map(([item, amount]) => {
      const res = RESOURCES[item];
      return `${res ? res.name : item} ×${amount}`;
    })
    .join('、');

  const monsters = state.monsters.filter((m) => m.id !== id);
  return {
    state: Object.assign({}, state, { monsters, inventory }),
    message: `${def.name} 已退役，獲得：${dropText}`,
  };
}

function getWorkInterval(monster, mapId, currentState) {
  const baseInterval = MONSTERS[monster.type].specialty === mapId
    ? CONFIG.workIntervalMs
    : CONFIG.workIntervalSlowMs;
  const moodMultiplier = typeof getMoodWorkMultiplier === 'function'
    ? getMoodWorkMultiplier(monster)
    : 1;
  const relationshipMultiplier = currentState && typeof getRelationshipMultiplier === 'function'
    ? getRelationshipMultiplier(currentState, monster)
    : 1;
  return Math.max(1000, Math.round(baseInterval / (
    getTraitWorkSpeedMultiplier(monster) *
    getPersonalityWorkSpeedMultiplier(monster) *
    moodMultiplier *
    relationshipMultiplier
  )));
}

function getTraitLevel(trait) {
  return Math.max(1, Number(trait.level) || 1);
}

function getTraitDef(trait) {
  return TRAITS[trait.key || trait];
}

function getTraitWorkSpeedMultiplier(monster) {
  return (monster.traits || []).reduce((multiplier, trait) => {
    const traitDef = getTraitDef(trait);
    if (!traitDef || traitDef.effect.type !== 'work_speed') return multiplier;
    return multiplier + (traitDef.effect.bonus || 0) * getTraitLevel(trait);
  }, 1);
}

function getTraitOutputMultiplier(monster, mapId) {
  return (monster.traits || []).reduce((multiplier, trait) => {
    const traitDef = getTraitDef(trait);
    if (!traitDef) return multiplier;

    const level = getTraitLevel(trait);
    if (traitDef.effect.type === 'map_output' && traitDef.effect.map === mapId) {
      return multiplier + (traitDef.effect.bonus || 0) * level;
    }
    if (traitDef.effect.type === 'specialty_output' && MONSTERS[monster.type].specialty === mapId) {
      return multiplier + (traitDef.effect.bonus || 0) * level;
    }
    return multiplier;
  }, 1);
}

function rollTraitDoubleOutput(monster) {
  return (monster.traits || []).some((trait) => {
    const traitDef = getTraitDef(trait);
    if (!traitDef || traitDef.effect.type !== 'double_output') return false;
    const chance = Math.min(0.95, (traitDef.effect.chance || 0) * getTraitLevel(trait));
    return Math.random() < chance;
  });
}

function calculateWorkOutput(monster, mapId, baseAmount, produced) {
  const multiplier = getTraitOutputMultiplier(monster, mapId);
  const expected = produced * baseAmount * multiplier;
  let amount = Math.floor(expected);
  if (Math.random() < expected - amount) {
    amount += 1;
  }
  if (rollTraitDoubleOutput(monster)) {
    amount *= 2;
  }
  return Math.max(0, amount);
}

function moveTowardTarget(monster) {
  if (!monster.assignedMap) {
    return monster;
  }

  const position = monster.position || randomMapPosition();
  let target = monster.target || randomMapPosition();
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 4) {
    target = randomMapPosition();
  }

  const speed = 2.6;
  const nextPosition = distance === 0
    ? position
    : {
        x: Math.max(6, Math.min(94, position.x + (dx / distance) * speed)),
        y: Math.max(10, Math.min(88, position.y + (dy / distance) * speed)),
      };

  return Object.assign({}, monster, {
    position: nextPosition,
    target,
  });
}

function processWork(state, elapsedMs) {
  if (elapsedMs <= 0) {
    return state;
  }

  const resources = Object.assign({}, state.resources);
  let inventory = state.inventory || {};
  const monsters = state.monsters.map((monster) => {
    if (!monster.assignedMap || !MAPS[monster.assignedMap]) {
      return monster;
    }

    const interval = getWorkInterval(monster, monster.assignedMap, state);
    let progress = (monster.workProgressMs || 0) + elapsedMs;
    const produced = Math.floor(progress / interval);
    let nextMonster = monster;

    if (produced > 0) {
      progress %= interval;
      const map = MAPS[monster.assignedMap];
      const amount = MONSTERS[monster.type].specialty === monster.assignedMap
        ? CONFIG.work.matchingAmount
        : CONFIG.work.wrongAmount;
      const resource = map.resource;
      const toolBonus = S.getMapToolBonus ? S.getMapToolBonus(state, monster.assignedMap) : 0;
      const mapSpec = MAPS[monster.assignedMap]?.specializationOptions?.find(
        (option) => option.id === state.maps[monster.assignedMap]?.specialization
      );
      const specBonus = mapSpec ? (mapSpec.outputBonus || 0) : 0;
      const dropChanceBonus = mapSpec ? (mapSpec.dropChanceBonus || 0) : 0;
      const weather = state.maps[monster.assignedMap]?.weather;
      const weatherBonus = (weather && weather.expiresAt > TimeService.now())
        ? weather.bonus
        : 0;
      const finalOutput = Math.max(0.1, 1 + toolBonus + specBonus + weatherBonus);
      const totalOutput = calculateWorkOutput(
        monster,
        monster.assignedMap,
        amount * finalOutput,
        produced
      );
      Object.assign(resources, addResourceToResources(resources, resource, totalOutput));
      nextMonster = Object.assign({}, nextMonster, { _justProduced: true });

      const def = MONSTERS[monster.type];
      if (def.workDrops) {
        const { chance, items } = def.workDrops;
        if (Math.random() < chance * (1 + dropChanceBonus)) {
          const nextInventory = Object.assign({}, inventory || {});
          Object.entries(items).forEach(([item, amount]) => {
            nextInventory[item] = (nextInventory[item] || 0) + amount;
          });
          inventory = nextInventory;
        }
      }
    }

    nextMonster = Object.assign({}, nextMonster, { workProgressMs: progress });
    return elapsedMs <= CONFIG.tickMs ? moveTowardTarget(nextMonster) : nextMonster;
  });

  return Object.assign({}, state, { resources, monsters, inventory });
}

const work = {
  canRemoveMonster,
  getMonsterActivity,
  canEnterActivity,
  getAssignedCount,
  canAssignMonster,
  assignMonster,
  unassignMonster,
  addSpeciesProgress,
  releaseMonster,
  retireMonster,
  getWorkInterval,
  getTraitWorkSpeedMultiplier,
  getTraitOutputMultiplier,
  calculateWorkOutput,
  processWork,
};
