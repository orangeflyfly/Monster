function canStartExpedition(state, expeditionId) {
  const exp = EXPEDITIONS[expeditionId];
  if (!exp) return { can: false, reason: '遠征不存在。' };

  const rank = S.getCampRank(state);
  const rankOrder = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
  const currentRankIdx = rankOrder.indexOf(rank.rank);
  const requiredRankIdx = rankOrder.indexOf(exp.unlockRank);
  if (currentRankIdx < requiredRankIdx) {
    return { can: false, reason: `需要營地評價達到 ${exp.unlockRank} 級才能解鎖。` };
  }

  const activeExp = (state.expeditions || []).find((e) => e.id === expeditionId && !e.completed);
  if (activeExp) return { can: false, reason: '此遠征已在進行中。' };

  const availableMonsters = state.monsters.filter((m) => {
    if (!S.canEnterActivity(state, m.id, 'expedition').can) return false;
    if (exp.requiredSpecialty) {
      return MONSTERS[m.type]?.specialty === exp.requiredSpecialty;
    }
    return true;
  });

  if (availableMonsters.length < exp.requiredMonsters) {
    return {
      can: false,
      reason: `需要 ${exp.requiredMonsters} 隻${exp.requiredSpecialty ? MAPS[exp.requiredSpecialty]?.name + '專長的' : ''}待命怪物。`,
    };
  }

  return { can: true, availableMonsters };
}

function startExpedition(state, expeditionId, monsterIds) {
  const check = canStartExpedition(state, expeditionId);
  if (!check.can) return { state, message: check.reason };

  const exp = EXPEDITIONS[expeditionId];
  const uniqueIds = [...new Set(monsterIds)];

  if (uniqueIds.length !== exp.requiredMonsters) {
    return { state, message: `需要剛好 ${exp.requiredMonsters} 隻不同的怪物。` };
  }

  for (const mId of uniqueIds) {
    const monster = state.monsters.find((m) => m.id === mId);
    if (!monster) return { state, message: '找不到指定怪物。' };

    const actCheck = S.canEnterActivity(state, mId, 'expedition');
    if (!actCheck.can) return { state, message: actCheck.reason };

    if (exp.requiredSpecialty) {
      if (MONSTERS[monster.type]?.specialty !== exp.requiredSpecialty) {
        return { state, message: `${MONSTERS[monster.type]?.name} 不符合專長要求。` };
      }
    }
  }

  const now = TimeService.now();
  const instanceId = 'exp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5);

  const monsters = state.monsters.map((m) =>
    uniqueIds.includes(m.id)
      ? Object.assign({}, m, {
          expeditionId,
          expeditionInstanceId: instanceId,
          expeditionEndMs: now + exp.duration,
        })
      : m
  );

  const expeditionEntry = {
    instanceId,
    id: expeditionId,
    monsterIds: uniqueIds,
    startMs: now,
    endMs: now + exp.duration,
    completed: false,
    collected: false,
  };

  const expeditions = [...(state.expeditions || []), expeditionEntry];

  return {
    state: Object.assign({}, state, { monsters, expeditions }),
    message: `${exp.name} 遠征隊出發！預計 ${Math.ceil(exp.duration / 3600000)} 小時後回來。`,
  };
}

function checkExpeditionComplete(state) {
  const now = TimeService.now();
  const expeditions = state.expeditions || [];
  let changed = false;
  const messages = [];

  const updated = expeditions.map((exp) => {
    if (exp.completed || now < exp.endMs) return exp;
    changed = true;
    const def = EXPEDITIONS[exp.id];
    messages.push(`🎒 ${def?.name || exp.id} 遠征隊回來了！點擊領取獎勵。`);
    return Object.assign({}, exp, { completed: true });
  });

  const monsters = state.monsters.map((m) => {
    if (!m.expeditionId) return m;
    const exp = m.expeditionInstanceId
      ? updated.find((e) => e.instanceId === m.expeditionInstanceId)
      : updated.find((e) =>
          e.id === m.expeditionId &&
          (e.monsterIds || []).includes(m.id) &&
          !e.collected
        );
    if (exp && exp.completed) {
      return Object.assign({}, m, {
        expeditionId: null,
        expeditionInstanceId: null,
        expeditionEndMs: null,
      });
    }
    return m;
  });

  return {
    state: changed ? Object.assign({}, state, { expeditions: updated, monsters }) : state,
    messages,
    changed,
  };
}

function collectExpeditionReward(state, instanceId) {
  const exp = (state.expeditions || []).find((e) =>
    e.instanceId === instanceId && e.completed && !e.collected
  );
  if (!exp) return { state, message: '找不到可領取的遠征獎勵。' };

  const expDef = EXPEDITIONS[exp.id];
  if (!expDef) return { state, message: '遠征定義不存在。' };

  const resources = Object.assign({}, state.resources);
  const inventory = Object.assign({}, state.inventory || {});
  const earnedItems = [];
  const earnedKeys = [];

  expDef.rewards.forEach((reward) => {
    if (Math.random() > reward.chance) return;
    earnedKeys.push(reward.key);
    if (reward.type === 'resource') {
      const cap = CONFIG.resourceCaps[reward.key] || 9999;
      resources[reward.key] = Math.min((resources[reward.key] || 0) + reward.amount, cap);
      earnedItems.push(`${RESOURCES[reward.key]?.name || reward.key} ×${reward.amount}`);
    } else {
      inventory[reward.key] = (inventory[reward.key] || 0) + reward.amount;
      earnedItems.push(`${RESOURCES[reward.key]?.name || reward.key} ×${reward.amount}`);
    }
  });
  const chronicleMessages = S.getChronicleMessages(state, {
    event: 'expedition_reward',
    expeditionId: exp.id,
    expeditionName: expDef.name,
    earnedCount: earnedItems.length,
    earnedKeys,
  });

  const expeditions = (state.expeditions || []).map((e) =>
    e.instanceId === instanceId ? Object.assign({}, e, { collected: true }) : e
  );

  const message = earnedItems.length > 0
    ? `${expDef.name} 獎勵：${earnedItems.join('、')}`
    : `${expDef.name} 這次沒有收穫。`;

  return {
    state: Object.assign({}, state, { resources, inventory, expeditions }),
    message,
    chronicleMessages,
  };
}

const expedition = {
  canStartExpedition,
  startExpedition,
  checkExpeditionComplete,
  collectExpeditionReward,
};
