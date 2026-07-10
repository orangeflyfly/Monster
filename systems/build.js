function buildStructure(state, buildingId) {
  const building = BUILDINGS[buildingId];
  if (!building || state.buildings[buildingId]) {
    return { state, message: '已完成建造。' };
  }

  if (!canAfford(state.resources, building.cost)) {
    return { state, message: `資源不足，需要 ${formatCost(building.cost)}。` };
  }

  return {
    state: Object.assign({}, state, {
      resources: spendResources(state.resources, building.cost),
      buildings: Object.assign({}, state.buildings, { [buildingId]: true }),
    }),
    message: `${building.name}建造完成。`,
  };
}

function completeResearch(state, researchId) {
  const research = RESEARCH[researchId];
  if (!research || state.research[researchId]) {
    return { state, message: '研究已完成。' };
  }

  if (research.requiresBuilding && !state.buildings[research.requiresBuilding]) {
    return { state, message: '需要先建造研究台。' };
  }

  if (!canAfford(state.resources, research.cost)) {
    return { state, message: `資源不足，需要 ${formatCost(research.cost)}。` };
  }

  return {
    state: Object.assign({}, state, {
      resources: spendResources(state.resources, research.cost),
      research: Object.assign({}, state.research, { [researchId]: true }),
    }),
    message: `${research.name}完成，野外捕捉已開放。`,
  };
}

function upgradeMap(state, mapId) {
  const map = MAPS[mapId];
  if (!map || !state.maps[mapId]) {
    return { state, message: '找不到可擴建的地圖。' };
  }

  const currentSlots = state.maps[mapId].unlockedSlots;
  const nextTier = map.upgradeCosts.find((t) => t.slots > currentSlots);
  if (!nextTier) return { state, message: '已達最高工作位數量。' };

  const cost = nextTier.cost;
  for (const [resource, amount] of Object.entries(cost)) {
    if ((state.resources[resource] || 0) < amount) {
      return { state, message: '資源不足，無法擴建。' };
    }
  }

  const resources = spendResources(state.resources, cost);

  return {
    state: Object.assign({}, state, {
      resources,
      maps: Object.assign({}, state.maps, {
        [mapId]: Object.assign({}, state.maps[mapId], { unlockedSlots: nextTier.slots }),
      }),
    }),
    message: `${MAPS[mapId].name} 已擴建至 ${nextTier.slots} 個工作位！`,
  };
}

function upgradeVault(state) {
  const currentSlots = state.vaultSlots || 30;
  const nextTier = CONFIG.vaultUpgradeCosts.find((t) => t.slots > currentSlots);
  if (!nextTier) return { state, message: '倉庫已達最大容量。' };

  const cost = nextTier.cost;
  for (const [resource, amount] of Object.entries(cost)) {
    if ((state.resources[resource] || 0) < amount) {
      return { state, message: '資源不足，無法擴建倉庫。' };
    }
  }

  const resources = spendResources(state.resources, cost);

  return {
    state: Object.assign({}, state, {
      resources,
      vaultSlots: nextTier.slots,
    }),
    message: `倉庫已擴建至 ${nextTier.slots} 格！`,
  };
}

function canResearch(state, researchId) {
  const researchDef = RESEARCH[researchId];
  if (!researchDef) return { can: false, reason: '研究項目不存在。' };
  if (state.completedResearch && state.completedResearch.includes(researchId)) {
    return { can: false, reason: '已完成此研究。' };
  }
  if (researchDef.requiresBuilding && !state.buildings[researchDef.requiresBuilding]) {
    return { can: false, reason: '需要先建造研究台。' };
  }
  const missingReqs = (researchDef.requires || []).filter(
    (r) => !(state.completedResearch || []).includes(r) && !state.research[r]
  );
  if (missingReqs.length > 0) {
    return { can: false, reason: '需要先完成前置研究。' };
  }
  for (const [resource, amount] of Object.entries(researchDef.cost || {})) {
    const available = resource === 'researchPoints'
      ? (state.researchPoints || 0)
      : (state.resources[resource] || 0);
    if (available < amount) {
      return { can: false, reason: '資源不足。' };
    }
  }
  return { can: true };
}

function doResearch(state, researchId) {
  const check = canResearch(state, researchId);
  if (!check.can) return { state, message: check.reason };

  const researchDef = RESEARCH[researchId];
  const resourceCost = Object.fromEntries(
    Object.entries(researchDef.cost || {}).filter(([key]) => key !== 'researchPoints')
  );
  const resources = spendResources(state.resources, resourceCost);
  const researchPoints = Math.max(
    0,
    (state.researchPoints || 0) - (researchDef.cost?.researchPoints || 0)
  );

  const completedResearch = [...(state.completedResearch || []), researchId];

  // 同步舊研究狀態，確保 capture.js 等舊系統能正確讀取
  const research = Object.assign({}, state.research || {});
  if (RESEARCH[researchId] && RESEARCH[researchId].unlocks) {
    const unlockKey = RESEARCH[researchId].unlocks;
    if (unlockKey === 'capture') research.capture = true;
  }

  return {
    state: Object.assign({}, state, { resources, researchPoints, completedResearch, research }),
    message: `「${researchDef.name}」研究完成！`,
  };
}

function hasUnlock(state, unlockKey) {
  return Object.entries(RESEARCH).some(([id, r]) =>
    r.unlocks === unlockKey &&
    ((state.completedResearch || []).includes(id) || (state.research && state.research[id]))
  );
}

function buildCultivationTank(state, tankId) {
  if (!S.hasUnlock(state, 'breeding')) {
    return { state, message: '需要先完成「繁殖基礎」研究。' };
  }

  const tank = CONFIG.cultivationTanks.find((t) => t.id === tankId);
  if (!tank) return { state, message: '培養槽不存在。' };

  const alreadyBuilt = (state.cultivationTanks || []).find((t) => t.id === tankId);
  if (alreadyBuilt) return { state, message: '已建造此培養槽。' };

  for (const [resource, amount] of Object.entries(tank.price)) {
    if (S.getAmount(state, resource) < amount) {
      return { state, message: `資源不足，無法建造${tank.name}。` };
    }
  }

  let resources = Object.assign({}, state.resources);
  let inventory = Object.assign({}, state.inventory || {});

  for (const [resource, amount] of Object.entries(tank.price)) {
    S.deductAmount(resources, inventory, resource, amount);
  }

  const cultivationTanks = [...(state.cultivationTanks || []), { id: tankId, builtAt: TimeService.now() }];

  return {
    state: Object.assign({}, state, { resources, inventory, cultivationTanks }),
    message: `${tank.name} 建造完成！`,
  };
}

function getAvailableBreedingSlots(state) {
  const tanks = state.cultivationTanks || [];
  return tanks.reduce((total, t) => {
    const def = CONFIG.cultivationTanks.find((c) => c.id === t.id);
    return total + (def ? def.slots : 0);
  }, 0);
}

function getBestTankReduction(state) {
  const tanks = state.cultivationTanks || [];
  return tanks.reduce((best, t) => {
    const def = CONFIG.cultivationTanks.find((c) => c.id === t.id);
    return def ? Math.max(best, def.deadEggReduction) : best;
  }, 0);
}

function attemptGeneResearch(state) {
  if (!S.hasUnlock(state, 'gene_research')) {
    return { state, message: '需要先解鎖「基礎基因研究」。' };
  }

  const cost = { Wood: 10, Ore: 5 };
  for (const [key, amount] of Object.entries(cost)) {
    if ((state.resources[key] || 0) < amount) {
      return { state, message: '資源不足，無法進行基因研究。' };
    }
  }

  const resources = Object.assign({}, state.resources, {
    Wood: state.resources.Wood - cost.Wood,
    Ore: state.resources.Ore - cost.Ore,
  });
  const successRate = state.geneResearchSuccessRate || 1;
  const success = Math.random() * 100 < successRate;

  if (success) {
    const undisc = Object.keys(BREEDING_RECIPES)
      .filter((key) => !BREEDING_RECIPES[key].discovered);
    let message = '基因研究大成功！';
    const inventory = Object.assign({}, state.inventory || {});

    if (undisc.length > 0) {
      inventory.breeding_hint = (inventory.breeding_hint || 0) + 1;
      message = '基因研究成功！獲得繁殖線索！';
    } else {
      inventory.blueprint_hint = (inventory.blueprint_hint || 0) + 1;
      message = '基因研究成功！獲得圖紙線索！';
    }

    return {
      state: Object.assign({}, state, {
        resources,
        inventory,
        geneResearchProgress: 0,
        geneResearchSuccessRate: 1,
      }),
      message,
    };
  }

  const newProgress = (state.geneResearchProgress || 0) + 1;
  const newRate = Math.min(5, 1 + Math.floor(newProgress / 3));
  return {
    state: Object.assign({}, state, {
      resources,
      geneResearchProgress: newProgress,
      geneResearchSuccessRate: newRate,
    }),
    message: `基因研究失敗，繼續努力！（目前成功率 ${newRate}%，已嘗試 ${newProgress} 次）`,
  };
}

function learnBlueprint(state, blueprintId) {
  const blueprint = BLUEPRINTS[blueprintId];
  if (!blueprint) return { state, message: '圖紙不存在。' };

  const inventory = state.inventory || {};
  if (!inventory.blueprint_hint || inventory.blueprint_hint <= 0) {
    return { state, message: '沒有圖紙線索可使用。' };
  }
  if ((state.discoveredBlueprints || []).includes(blueprintId)) {
    return { state, message: '已學會此圖紙。' };
  }

  const newInventory = Object.assign({}, inventory, {
    blueprint_hint: inventory.blueprint_hint - 1,
  });
  const discoveredBlueprints = [...(state.discoveredBlueprints || []), blueprintId];

  return {
    state: Object.assign({}, state, { inventory: newInventory, discoveredBlueprints }),
    message: `學會「${blueprint.name}」！`,
  };
}

function craftFromBlueprint(state, blueprintId) {
  const blueprint = BLUEPRINTS[blueprintId];
  if (!blueprint) return { state, message: '圖紙不存在。' };
  if (!(state.discoveredBlueprints || []).includes(blueprintId)) {
    return { state, message: '尚未學會此圖紙。' };
  }
  if (!blueprint.craftCost) return { state, message: '此圖紙不能直接製作。' };

  const resources = Object.assign({}, state.resources);
  const inventory = Object.assign({}, state.inventory || {});

  for (const [key, amount] of Object.entries(blueprint.craftCost)) {
    if (S.getAmount(state, key) < amount) {
      return { state, message: `${RESOURCES[key]?.name || key} 不足。` };
    }
  }
  for (const [key, amount] of Object.entries(blueprint.craftCost)) {
    S.deductAmount(resources, inventory, key, amount);
  }

  for (const [key, amount] of Object.entries(blueprint.craftOutput || {})) {
    inventory[key] = (inventory[key] || 0) + amount;
  }

  return {
    state: Object.assign({}, state, { resources, inventory }),
    message: `製作完成！獲得 ${Object.entries(blueprint.craftOutput || {})
      .map(([key, amount]) => `${RESOURCES[key]?.name || key}×${amount}`).join('、')}`,
  };
}

function installTool(state, toolId) {
  const tool = WORK_TOOLS[toolId];
  if (!tool) return { state, message: '工具不存在。' };

  const installedTools = state.installedTools || {};
  if (installedTools[toolId]) return { state, message: '此工具已安裝。' };

  if (tool.requiresTool && !installedTools[tool.requiresTool]) {
    const reqTool = WORK_TOOLS[tool.requiresTool];
    return { state, message: `需要先安裝「${reqTool?.name || tool.requiresTool}」。` };
  }

  for (const [key, amount] of Object.entries(tool.price)) {
    if (S.getAmount(state, key) < amount) {
      return { state, message: `資源不足，無法安裝${tool.name}。` };
    }
  }

  const resources = Object.assign({}, state.resources);
  const inventory = Object.assign({}, state.inventory || {});
  for (const [key, amount] of Object.entries(tool.price)) {
    S.deductAmount(resources, inventory, key, amount);
  }

  const newInstalledTools = Object.assign({}, installedTools, { [toolId]: true });
  return {
    state: Object.assign({}, state, {
      resources,
      inventory,
      installedTools: newInstalledTools,
    }),
    message: `${tool.name} 安裝完成！${MAPS[tool.mapId]?.name} 產量提升。`,
  };
}

function getMapToolBonus(state, mapId) {
  const installedTools = state.installedTools || {};
  return Object.values(WORK_TOOLS)
    .filter((tool) => tool.mapId === mapId && installedTools[tool.id])
    .reduce((total, tool) => total + (tool.bonus || 0), 0);
}

function setMapSpecialization(state, mapId, specId) {
  const map = MAPS[mapId];
  const mapState = state.maps[mapId];
  if (!map || !mapState) return { state, message: '找不到指定區域。' };
  if (mapState.specialization) return { state, message: '此區域已選擇專精方向。' };

  const specialization = (map.specializationOptions || []).find((option) => option.id === specId);
  if (!specialization) return { state, message: '專精方向不存在。' };

  return {
    state: Object.assign({}, state, {
      maps: Object.assign({}, state.maps, {
        [mapId]: Object.assign({}, mapState, { specialization: specId }),
      }),
    }),
    message: `${map.name} 已選擇「${specialization.name}」專精。`,
  };
}

const build = {
  buildStructure,
  completeResearch,
  upgradeMap,
  upgradeVault,
  canResearch,
  doResearch,
  hasUnlock,
  buildCultivationTank,
  getAvailableBreedingSlots,
  getBestTankReduction,
  attemptGeneResearch,
  learnBlueprint,
  craftFromBlueprint,
  installTool,
  getMapToolBonus,
  setMapSpecialization,
};
