function addToExhibition(state, monsterId) {
  const check = S.canEnterActivity(state, monsterId, 'exhibition');
  if (!check.can) return { state, message: check.reason };
  const monster = state.monsters.find((m) => m.id === monsterId);
  if (!monster) return { state, message: '找不到怪物。' };
  if ((state.exhibition || []).length >= 5) {
    return { state, message: '展覽館最多展示5隻怪物。' };
  }
  const exhibition = [...(state.exhibition || []), monsterId];
  const def = MONSTERS[monster.type];
  return {
    state: Object.assign({}, state, { exhibition }),
    message: `${def.name} 已加入展覽館！`,
  };
}

function removeFromExhibition(state, monsterId) {
  const exhibition = (state.exhibition || []).filter((id) => id !== monsterId);
  return {
    state: Object.assign({}, state, { exhibition }),
    message: '怪物已從展覽館移出。',
  };
}

function calcExhibitionIncome(state) {
  const exhibition = state.exhibition || [];
  let coins = 0;
  let researchPoints = 0;

  exhibition.forEach((id) => {
    const monster = state.monsters.find((m) => m.id === id);
    if (!monster) return;
    const talent = monster.talent || 1;
    const hasRareTrait = (monster.traits || []).some((t) => {
      const def = TRAITS[t.key || t];
      return def && def.rarity === 'rare';
    });

    coins += 2 + Math.floor(talent / 3);
    if (hasRareTrait) coins += 3;
    researchPoints += 1;
  });

  return { coins, researchPoints };
}

function processExhibition(state) {
  const income = calcExhibitionIncome(state);
  if (income.coins === 0 && income.researchPoints === 0) return state;

  const cap = CONFIG.resourceCaps.Coins || 9999;
  const resources = Object.assign({}, state.resources, {
    Coins: Math.min((state.resources.Coins || 0) + income.coins, cap),
  });
  const researchPoints = Math.min(
    (state.researchPoints || 0) + income.researchPoints,
    999
  );

  return Object.assign({}, state, { resources, researchPoints });
}

function addReputation(state, amount) {
  const newRep = (state.campReputation || 0) + amount;
  return Object.assign({}, state, { campReputation: newRep });
}

function generateVisitor(state) {
  const rank = S.getCampRank(state);
  const chance = CONFIG.visitorConfig.baseVisitChance +
    (rank.score / 1000) * 0.1;

  if (Math.random() > chance) return state;
  if ((state.activeVisitors || []).length >= CONFIG.visitorConfig.maxVisitors) return state;

  const types = CONFIG.visitorConfig.visitorTypes;
  const type = types[Math.floor(Math.random() * types.length)];
  const visitor = {
    id: 'visitor_' + Date.now().toString(36),
    type,
    arrivalMs: TimeService.now(),
    expiresMs: TimeService.now() + 4 * 60 * 60 * 1000,
  };

  return Object.assign({}, state, {
    activeVisitors: [...(state.activeVisitors || []), visitor],
  });
}

function handleVisitorAction(state, visitorId, actionId) {
  const visitor = (state.activeVisitors || []).find((v) => v.id === visitorId);
  if (!visitor) return { state, message: '訪客已離開。' };

  const visitorDef = VISITOR_EVENTS[visitor.type];
  if (!visitorDef) return { state, message: '訪客資料不存在。' };

  const action = visitorDef.actions.find((item) => item.id === actionId);
  if (!action) return { state, message: '行動不存在。' };

  const resources = Object.assign({}, state.resources);
  const inventory = Object.assign({}, state.inventory || {});
  let researchPoints = state.researchPoints || 0;

  if (actionId === 'donate_monster') {
    const availableMonster = state.monsters.find((monster) =>
      S.canEnterActivity(state, monster.id, 'donate').can &&
      (!monster.breedCooldown || monster.breedCooldown <= TimeService.now())
    );

    if (!availableMonster) {
      return { state, message: '沒有可捐贈的怪物（需要待命中且無鎖定）。' };
    }

    const monsters = state.monsters.filter((monster) => monster.id !== availableMonster.id);
    const newResearchPoints = (state.researchPoints || 0) + (action.reward.researchPoints || 10);
    const activeVisitors = (state.activeVisitors || []).filter((item) => item.id !== visitorId);
    const visitorHistory = [...(state.visitorHistory || []), {
      type: visitor.type,
      actionId,
      time: TimeService.now(),
    }];

    return {
      state: Object.assign({}, state, {
        monsters,
        researchPoints: newResearchPoints,
        activeVisitors,
        visitorHistory,
      }),
      message: `捐贈了 ${MONSTERS[availableMonster.type]?.name}，獲得 ${action.reward.researchPoints || 10} 研究點！`,
    };
  }

  if (action.cost) {
    for (const [key, amount] of Object.entries(action.cost)) {
      if (key === 'researchPoints') {
        if (researchPoints < amount) return { state, message: '研究點數不足。' };
        researchPoints -= amount;
      } else {
        const inRes = resources[key] || 0;
        const inInv = inventory[key] || 0;
        if (inRes + inInv < amount) {
          return { state, message: `${RESOURCES[key]?.name || key} 不足。` };
        }
        let remaining = amount;
        if (inRes > 0) {
          const fromRes = Math.min(inRes, remaining);
          resources[key] -= fromRes;
          remaining -= fromRes;
        }
        if (remaining > 0) inventory[key] = (inventory[key] || 0) - remaining;
      }
    }
  }

  if (action.reward) {
    for (const [key, amount] of Object.entries(action.reward)) {
      if (key === 'researchPoints') {
        researchPoints += amount;
      } else if (key === 'random_gene_liquid') {
        const liquids = ['basic_gene_liquid', 'mutation_gene_liquid', 'talent_gene_liquid'];
        const picked = liquids[Math.floor(Math.random() * liquids.length)];
        inventory[picked] = (inventory[picked] || 0) + 1;
      } else if (key === 'random_material') {
        const materials = CONFIG.MATERIAL_KEYS;
        const picked = materials[Math.floor(Math.random() * materials.length)];
        inventory[picked] = (inventory[picked] || 0) + 1;
      } else {
        inventory[key] = (inventory[key] || 0) + amount;
      }
    }
  }

  const activeVisitors = (state.activeVisitors || []).filter((v) => v.id !== visitorId);
  const visitorHistory = [...(state.visitorHistory || []), {
    type: visitor.type,
    actionId,
    time: TimeService.now(),
  }];

  return {
    state: Object.assign({}, state, {
      resources, inventory, researchPoints,
      activeVisitors, visitorHistory,
    }),
    message: `與${visitorDef.name}的交易完成！`,
  };
}

function processVisitors(state) {
  const now = TimeService.now();
  const activeVisitors = (state.activeVisitors || []).filter((v) => v.expiresMs > now);
  return Object.assign({}, state, { activeVisitors });
}

const exhibition = {
  addToExhibition,
  removeFromExhibition,
  calcExhibitionIncome,
  processExhibition,
  addReputation,
  generateVisitor,
  handleVisitorAction,
  processVisitors,
};
