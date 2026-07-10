function refreshQuests(state) {
  const today = new Date().toDateString();

  // 同一天已刷新過，不重複刷新
  if (state.questDate === today && (state.activeQuests || []).length > 0) {
    return { state, message: '今天的委託已刷新，明天再來！' };
  }

  const completedQuestIds = state.completedQuestIds || [];
  const allIds = Object.keys(QUESTS).filter((id) => {
    const quest = QUESTS[id];
    return !quest.requiresQuest || completedQuestIds.includes(quest.requiresQuest);
  });
  const shuffled = allIds.slice().sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  return {
    state: Object.assign({}, state, {
      questDate: today,
      activeQuests: selected.map((id) => ({
        id,
        accepted: false,
        completed: false,
      })),
    }),
    message: '今日委託已刷新！',
  };
}

function canCompleteQuest(state, questId) {
  const quest = QUESTS[questId];
  if (!quest) return { can: false, reason: '委託不存在。' };

  if (quest.type === 'resource') {
    for (const [resource, amount] of Object.entries(quest.require)) {
      if ((state.resources[resource] || 0) < amount) {
        return { can: false, reason: '資源不足。' };
      }
    }
  }

  if (quest.type === 'monster') {
    const specialty = quest.require.monsterSpecialty;
    const count = quest.require.monsterCount || 1;
    const eligible = state.monsters.filter((m) =>
      !specialty || MONSTERS[m.type].specialty === specialty
    );
    if (eligible.length < count) {
      return { can: false, reason: '怪物數量不足。' };
    }
  }

  return { can: true };
}

function completeQuest(state, questId) {
  const activeQuest = (state.activeQuests || []).find((q) => q.id === questId);
  if (!activeQuest) return { state, message: '委託不存在。' };
  if (activeQuest.completed) return { state, message: '委託已完成。' };

  const check = canCompleteQuest(state, questId);
  if (!check.can) return { state, message: check.reason };

  const quest = QUESTS[questId];
  let resources = Object.assign({}, state.resources);
  let inventory = Object.assign({}, state.inventory || {});
  let researchPoints = state.researchPoints || 0;

  if (quest.type === 'resource') {
    resources = spendResources(resources, quest.require);
  }

  Object.entries(quest.reward || {}).forEach(([key, amount]) => {
    if (key === 'researchPoints') {
      researchPoints += amount;
    } else if (CONFIG.CORE_RESOURCE_KEYS.includes(key) || CONFIG.CURRENCY_KEYS.includes(key)) {
      resources = addResourceToResources(resources, key, amount);
    } else {
      inventory[key] = (inventory[key] || 0) + amount;
    }
  });

  const activeQuests = state.activeQuests.map((q) =>
    q.id === questId ? Object.assign({}, q, { completed: true }) : q
  );
  const completedQuestIds = (state.completedQuestIds || []).includes(questId)
    ? state.completedQuestIds
    : [...(state.completedQuestIds || []), questId];

  return {
    state: Object.assign({}, state, { resources, inventory, researchPoints, activeQuests, completedQuestIds }),
    message: `委託「${quest.name}」完成！`,
  };
}

const quests = { refreshQuests, canCompleteQuest, completeQuest };
