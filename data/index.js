function validateData() {
  const errors = [];
  const validResourceKeys = [
    ...Object.keys(RESOURCES),
    'Coins',
    ...CONFIG.MATERIAL_KEYS,
    ...CONFIG.CERT_KEYS,
  ];

  // 檢查 MONSTERS
  const monsterIds = Object.keys(MONSTERS);
  monsterIds.forEach((id) => {
    const m = MONSTERS[id];
    if (!m.name) errors.push(`MONSTERS.${id} 缺少 name`);
    if (!m.icon) errors.push(`MONSTERS.${id} 缺少 icon`);
    if (!m.specialty) errors.push(`MONSTERS.${id} 缺少 specialty`);
    if (typeof m.captureRate !== 'number') errors.push(`MONSTERS.${id} captureRate 不是數字`);
    if (!MAPS[m.specialty]) errors.push(`MONSTERS.${id} specialty 引用不存在的地圖: ${m.specialty}`);
  });

  // 檢查 MAPS
  const mapIds = Object.keys(MAPS);
  mapIds.forEach((id) => {
    const map = MAPS[id];
    if (!map.name) errors.push(`MAPS.${id} 缺少 name`);
    if (!map.resource) errors.push(`MAPS.${id} 缺少 resource`);
    if (!RESOURCES[map.resource]) errors.push(`MAPS.${id} resource 引用不存在的資源: ${map.resource}`);
    if (!map.themeClass) errors.push(`MAPS.${id} 缺少 themeClass`);
    if (!Array.isArray(map.decorations)) errors.push(`MAPS.${id} 缺少 decorations 陣列`);
  });

  // 檢查 RESOURCES
  const resourceIds = Object.keys(RESOURCES);
  resourceIds.forEach((id) => {
    const r = RESOURCES[id];
    if (!r.name) errors.push(`RESOURCES.${id} 缺少 name`);
  });

  // 檢查 MONSTERS skillCaps
  monsterIds.forEach((id) => {
    const m = MONSTERS[id];
    if (!m.skillCaps) {
      errors.push(`MONSTERS.${id} 缺少 skillCaps`);
    } else {
      const validSkills = Object.keys(CONFIG.skillNames);
      Object.keys(m.skillCaps).forEach((skill) => {
        if (!validSkills.includes(skill)) {
          errors.push(`MONSTERS.${id} skillCaps 包含未知技能: ${skill}`);
        }
      });
    }
  });

  // 檢查 TRAITS
  const validMapIds = Object.keys(MAPS);
  Object.keys(TRAITS).forEach((id) => {
    const t = TRAITS[id];
    if (!t.name) errors.push(`TRAITS.${id} 缺少 name`);
    if (!t.rarity) errors.push(`TRAITS.${id} 缺少 rarity`);
    if (!t.effect) errors.push(`TRAITS.${id} 缺少 effect`);
    if (t.effect && t.effect.map && !validMapIds.includes(t.effect.map)) {
      errors.push(`TRAITS.${id} effect.map 引用不存在的地圖: ${t.effect.map}`);
    }
    if (!Array.isArray(t.incompatible)) {
      errors.push(`TRAITS.${id} incompatible 必須是陣列`);
    } else {
      t.incompatible.forEach((k) => {
        if (!TRAITS[k]) errors.push(`TRAITS.${id} incompatible 引用不存在的詞條: ${k}`);
      });
    }
  });

  // 檢查地圖 upgradeCosts
  mapIds.forEach((id) => {
    const map = MAPS[id];
    if (!Array.isArray(map.upgradeCosts)) {
      errors.push(`MAPS.${id} 缺少 upgradeCosts 陣列`);
    } else {
      map.upgradeCosts.forEach((tier, i) => {
        if (typeof tier.slots !== 'number') {
          errors.push(`MAPS.${id} upgradeCosts[${i}] 缺少 slots`);
        }
        if (tier.cost) {
          Object.keys(tier.cost).forEach((r) => {
            if (!validResourceKeys.includes(r)) {
              errors.push(`MAPS.${id} upgradeCosts[${i}] cost 引用不存在的資源: ${r}`);
            }
          });
        }
      });
    }
  });

  // 檢查 vaultUpgradeCosts
  if (!Array.isArray(CONFIG.vaultUpgradeCosts)) {
    errors.push('CONFIG 缺少 vaultUpgradeCosts 陣列');
  } else {
    CONFIG.vaultUpgradeCosts.forEach((tier, i) => {
      if (typeof tier.slots !== 'number') {
        errors.push(`CONFIG.vaultUpgradeCosts[${i}] 缺少 slots`);
      }
      if (tier.cost) {
        Object.keys(tier.cost).forEach((r) => {
          if (!validResourceKeys.includes(r)) {
            errors.push(`CONFIG.vaultUpgradeCosts[${i}] cost 引用不存在的資源: ${r}`);
          }
        });
      }
    });
  }

  // 檢查 captureRate 範圍 0~1
  monsterIds.forEach((id) => {
    const m = MONSTERS[id];
    if (!m.isSpecial) {
      if (typeof m.captureRate !== 'number' || m.captureRate < 0 || m.captureRate > 1) {
        errors.push(`MONSTERS.${id} captureRate 必須在 0~1 之間，目前是 ${m.captureRate}`);
      }
    }
  });

  // 檢查 skillCaps 範圍 1~10
  monsterIds.forEach((id) => {
    const m = MONSTERS[id];
    if (m.skillCaps) {
      Object.entries(m.skillCaps).forEach(([skill, cap]) => {
        if (typeof cap !== 'number' || cap < 1 || cap > 10) {
          errors.push(`MONSTERS.${id} skillCaps.${skill} 必須在 1~10 之間，目前是 ${cap}`);
        }
      });
    }
  });

  // 檢查 trait rarity 是否存在於 TRAIT_RARITY_WEIGHTS
  const validRarities = Object.keys(TRAIT_RARITY_WEIGHTS);
  Object.keys(TRAITS).forEach((id) => {
    const t = TRAITS[id];
    if (!validRarities.includes(t.rarity)) {
      errors.push(`TRAITS.${id} rarity 不存在於 TRAIT_RARITY_WEIGHTS: ${t.rarity}`);
    }
  });

  // 檢查 upgradeCosts slots 是否遞增
  mapIds.forEach((id) => {
    const costs = MAPS[id].upgradeCosts || [];
    for (let i = 1; i < costs.length; i++) {
      if (costs[i].slots <= costs[i - 1].slots) {
        errors.push(`MAPS.${id} upgradeCosts slots 必須遞增，第 ${i} 項不符合`);
      }
    }
  });

  // 檢查 vaultUpgradeCosts slots 遞增且 cost 非負整數
  const vaultCosts = CONFIG.vaultUpgradeCosts || [];
  for (let i = 1; i < vaultCosts.length; i++) {
    if (vaultCosts[i].slots <= vaultCosts[i - 1].slots) {
      errors.push(`CONFIG.vaultUpgradeCosts slots 必須遞增，第 ${i} 項不符合`);
    }
  }
  vaultCosts.forEach((tier, i) => {
    Object.keys(tier.cost || {}).forEach((r) => {
      if (!validResourceKeys.includes(r)) {
        errors.push(`CONFIG.vaultUpgradeCosts[${i}] cost 引用不存在的資源: ${r}`);
      }
    });
    Object.entries(tier.cost || {}).forEach(([r, a]) => {
      if (typeof a !== 'number' || a < 0 || !Number.isInteger(a)) {
        errors.push(`CONFIG.vaultUpgradeCosts[${i}] cost.${r} 必須是非負整數，目前是 ${a}`);
      }
    });
  });

  // 檢查 TRAINING_COURSES
  Object.entries(TRAINING_COURSES || {}).forEach(([id, course]) => {
    if (!course.name) errors.push(`TRAINING_COURSES.${id} 缺少 name`);
    if (!course.targetSkill) errors.push(`TRAINING_COURSES.${id} 缺少 targetSkill`);
    if (course.targetSkill && !Object.keys(CONFIG.skillNames).includes(course.targetSkill)) {
      errors.push(`TRAINING_COURSES.${id} targetSkill 引用不存在的技能: ${course.targetSkill}`);
    }
    if (typeof course.successBase !== 'number' || course.successBase < 0 || course.successBase > 1) {
      errors.push(`TRAINING_COURSES.${id} successBase 必須在 0~1 之間`);
    }
  });

  // 檢查 QUESTS
  Object.entries(QUESTS || {}).forEach(([id, quest]) => {
    if (quest.id && quest.id !== id) {
      errors.push(`QUESTS.${id} id 應為 ${id}`);
    }
    if (!quest.name) errors.push(`QUESTS.${id} 缺少 name`);
    if (!quest.desc) errors.push(`QUESTS.${id} 缺少 desc`);
    if (!['easy', 'normal', 'hard'].includes(quest.difficulty)) {
      errors.push(`QUESTS.${id} difficulty 必須是 easy、normal 或 hard`);
    }
    if (!['resource', 'monster'].includes(quest.type)) {
      errors.push(`QUESTS.${id} type 必須是 resource 或 monster`);
    }
    if (quest.requiresQuest && !QUESTS[quest.requiresQuest]) {
      errors.push(`QUESTS.${id} requiresQuest 引用不存在的委託: ${quest.requiresQuest}`);
    }
    if (!quest.require || typeof quest.require !== 'object') {
      errors.push(`QUESTS.${id} 缺少 require`);
    }
    if (!quest.reward || typeof quest.reward !== 'object') {
      errors.push(`QUESTS.${id} 缺少 reward`);
    }
    if (quest.type === 'resource') {
      Object.entries(quest.require || {}).forEach(([key, amount]) => {
        if (!validResourceKeys.includes(key)) {
          errors.push(`QUESTS.${id} require 引用不存在的資源: ${key}`);
        }
        if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
          errors.push(`QUESTS.${id} require.${key} 必須是正整數，目前是 ${amount}`);
        }
      });
    }
    if (quest.type === 'monster') {
      const count = quest.require?.monsterCount;
      if (typeof count !== 'number' || count <= 0 || !Number.isInteger(count)) {
        errors.push(`QUESTS.${id} require.monsterCount 必須是正整數，目前是 ${count}`);
      }
      if (quest.require?.monsterSpecialty && !MAPS[quest.require.monsterSpecialty]) {
        errors.push(`QUESTS.${id} require.monsterSpecialty 引用不存在的地圖: ${quest.require.monsterSpecialty}`);
      }
    }
    Object.entries(quest.reward || {}).forEach(([key, amount]) => {
      if (key !== 'researchPoints' && !validResourceKeys.includes(key)) {
        errors.push(`QUESTS.${id} reward 引用不存在的資源或物品: ${key}`);
      }
      if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
        errors.push(`QUESTS.${id} reward.${key} 必須是正整數，目前是 ${amount}`);
      }
    });
  });

  // 檢查 BREEDING_RECIPES
  Object.entries(BREEDING_RECIPES || {}).forEach(([id, recipe]) => {
    if (!Array.isArray(recipe.parents) || recipe.parents.length !== 2) {
      errors.push(`BREEDING_RECIPES.${id} parents 必須是2個元素的陣列`);
    } else {
      recipe.parents.forEach((type) => {
        if (!MONSTERS[type]) errors.push(`BREEDING_RECIPES.${id} parents 引用不存在的怪物: ${type}`);
      });
    }
    if (recipe.normalResult && !MONSTERS[recipe.normalResult]) {
      errors.push(`BREEDING_RECIPES.${id} normalResult 引用不存在的怪物: ${recipe.normalResult}`);
    }
    if (recipe.mutationResult && !MONSTERS[recipe.mutationResult]) {
      errors.push(`BREEDING_RECIPES.${id} mutationResult 引用不存在的怪物: ${recipe.mutationResult}`);
    }
    if (typeof recipe.mutationChance !== 'number' || recipe.mutationChance < 0 || recipe.mutationChance > 1) {
      errors.push(`BREEDING_RECIPES.${id} mutationChance 必須在 0~1 之間`);
    }
    const sortedKey = recipe.parents.slice().sort().join('_');
    if (id !== sortedKey) {
      errors.push(`BREEDING_RECIPES.${id} key 應為排序後的 ${sortedKey}`);
    }
  });

  // 檢查 EXPEDITIONS
  Object.entries(EXPEDITIONS || {}).forEach(([id, exp]) => {
    if (!exp.name) errors.push(`EXPEDITIONS.${id} 缺少 name`);
    if (typeof exp.duration !== 'number' || exp.duration <= 0) {
      errors.push(`EXPEDITIONS.${id} duration 必須是正數`);
    }
    if (typeof exp.requiredMonsters !== 'number' || exp.requiredMonsters < 1) {
      errors.push(`EXPEDITIONS.${id} requiredMonsters 必須是正整數`);
    }
    if (exp.requiredSpecialty && !MAPS[exp.requiredSpecialty]) {
      errors.push(`EXPEDITIONS.${id} requiredSpecialty 引用不存在的地圖: ${exp.requiredSpecialty}`);
    }
    (exp.rewards || []).forEach((r, i) => {
      if (!r.key) errors.push(`EXPEDITIONS.${id} rewards[${i}] 缺少 key`);
      if (typeof r.chance !== 'number' || r.chance < 0 || r.chance > 1) {
        errors.push(`EXPEDITIONS.${id} rewards[${i}] chance 必須在 0~1 之間`);
      }
    });
  });

  // 檢查 ARENA_STAGES
  Object.entries(ARENA_STAGES || {}).forEach(([id, stage]) => {
    if (stage.id && stage.id !== id) {
      errors.push(`ARENA_STAGES.${id} id 應為 ${id}`);
    }
    if (!stage.name) errors.push(`ARENA_STAGES.${id} 缺少 name`);
    if (!stage.enemyName) errors.push(`ARENA_STAGES.${id} 缺少 enemyName`);
    if (!stage.enemyIcon) errors.push(`ARENA_STAGES.${id} 缺少 enemyIcon`);
    if (typeof stage.enemySkill !== 'number' || stage.enemySkill < 1) {
      errors.push(`ARENA_STAGES.${id} enemySkill 必須是正數`);
    }
    Object.entries(stage.reward || {}).forEach(([key, amount]) => {
      if (!validResourceKeys.includes(key) && key !== 'researchPoints') {
        errors.push(`ARENA_STAGES.${id} reward 引用不存在的資源或物品: ${key}`);
      }
      if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
        errors.push(`ARENA_STAGES.${id} reward.${key} 必須是正整數，目前是 ${amount}`);
      }
    });
  });

  // 檢查 WEATHER_TYPES
  Object.entries(WEATHER_TYPES || {}).forEach(([id, weather]) => {
    if (weather.id && weather.id !== id) {
      errors.push(`WEATHER_TYPES.${id} id 應為 ${id}`);
    }
    if (!weather.name) errors.push(`WEATHER_TYPES.${id} 缺少 name`);
    if (!weather.icon) errors.push(`WEATHER_TYPES.${id} 缺少 icon`);
    if (typeof weather.getBonus !== 'function') {
      errors.push(`WEATHER_TYPES.${id} 缺少 getBonus 函式`);
    }
  });

  // 檢查 WORK_TOOLS
  Object.entries(WORK_TOOLS || {}).forEach(([id, tool]) => {
    if (!tool.name) errors.push(`WORK_TOOLS.${id} 缺少 name`);
    if (!MAPS[tool.mapId]) errors.push(`WORK_TOOLS.${id} mapId 引用不存在的地圖: ${tool.mapId}`);
    if (tool.requiresTool && !WORK_TOOLS[tool.requiresTool]) {
      errors.push(`WORK_TOOLS.${id} requiresTool 引用不存在的工具: ${tool.requiresTool}`);
    }
  });

  // 檢查 MERCHANT_ITEMS
  Object.entries(MERCHANT_ITEMS || {}).forEach(([id, item]) => {
    if (!item.name) errors.push(`MERCHANT_ITEMS.${id} 缺少 name`);
    if (!['normal', 'black'].includes(item.merchant)) {
      errors.push(`MERCHANT_ITEMS.${id} merchant 必須是 normal 或 black`);
    }
    if (!['Coins', 'MysteryCoins'].includes(item.currency)) {
      errors.push(`MERCHANT_ITEMS.${id} currency 必須是 Coins 或 MysteryCoins`);
    }
    if (typeof item.price !== 'number' || item.price < 0) {
      errors.push(`MERCHANT_ITEMS.${id} price 必須是非負數`);
    }
  });

  // 檢查 RECIPES（加工配方）
  Object.entries(RECIPES || {}).forEach(([id, recipe]) => {
    if (!recipe.name) errors.push(`RECIPES.${id} 缺少 name`);
    Object.entries(recipe.inputs || {}).forEach(([key, amount]) => {
      if (!RESOURCES[key]) errors.push(`RECIPES.${id} inputs 引用不存在的資源: ${key}`);
      if (typeof amount !== 'number' || amount <= 0) {
        errors.push(`RECIPES.${id} inputs.${key} 必須是正數`);
      }
    });
    if (!recipe.output?.item) errors.push(`RECIPES.${id} output 缺少 item`);
  });

  // 檢查 VISITOR_EVENTS
  const visitorSpecialRewardKeys = ['random_gene_liquid', 'random_material'];
  const validVisitorValueKeys = [...validResourceKeys, 'researchPoints', ...visitorSpecialRewardKeys];
  Object.entries(VISITOR_EVENTS || {}).forEach(([id, visitor]) => {
    if (visitor.id && visitor.id !== id) {
      errors.push(`VISITOR_EVENTS.${id} id 應為 ${id}`);
    }
    if (!visitor.name) errors.push(`VISITOR_EVENTS.${id} 缺少 name`);
    if (!visitor.icon) errors.push(`VISITOR_EVENTS.${id} 缺少 icon`);
    if (!visitor.desc) errors.push(`VISITOR_EVENTS.${id} 缺少 desc`);
    if (!Array.isArray(visitor.actions) || visitor.actions.length === 0) {
      errors.push(`VISITOR_EVENTS.${id} 缺少 actions 陣列`);
      return;
    }

    visitor.actions.forEach((action, i) => {
      if (!action.id) errors.push(`VISITOR_EVENTS.${id} actions[${i}] 缺少 id`);
      if (!action.label) errors.push(`VISITOR_EVENTS.${id} actions[${i}] 缺少 label`);
      if (!action.desc) errors.push(`VISITOR_EVENTS.${id} actions[${i}] 缺少 desc`);
      if (!action.reward || typeof action.reward !== 'object') {
        errors.push(`VISITOR_EVENTS.${id} actions[${i}] 缺少 reward`);
      }

      Object.entries(action.cost || {}).forEach(([key, amount]) => {
        if (!validVisitorValueKeys.includes(key)) {
          errors.push(`VISITOR_EVENTS.${id} actions[${i}] cost 引用不存在的資源: ${key}`);
        }
        if (typeof amount !== 'number' || amount < 0 || !Number.isInteger(amount)) {
          errors.push(`VISITOR_EVENTS.${id} actions[${i}] cost.${key} 必須是非負整數，目前是 ${amount}`);
        }
      });

      Object.entries(action.reward || {}).forEach(([key, amount]) => {
        if (!validVisitorValueKeys.includes(key)) {
          errors.push(`VISITOR_EVENTS.${id} actions[${i}] reward 引用不存在的資源或特殊獎勵: ${key}`);
        }
        if (typeof amount !== 'number' || amount < 0 || !Number.isInteger(amount)) {
          errors.push(`VISITOR_EVENTS.${id} actions[${i}] reward.${key} 必須是非負整數，目前是 ${amount}`);
        }
      });
    });
  });

  // 檢查 BLUEPRINTS
  Object.entries(BLUEPRINTS || {}).forEach(([id, blueprint]) => {
    if (blueprint.id && blueprint.id !== id) {
      errors.push(`BLUEPRINTS.${id} id 應為 ${id}`);
    }
    if (!blueprint.name) errors.push(`BLUEPRINTS.${id} 缺少 name`);
    if (!blueprint.desc) errors.push(`BLUEPRINTS.${id} 缺少 desc`);
    if (!blueprint.category) errors.push(`BLUEPRINTS.${id} 缺少 category`);
    if (!blueprint.unlocks) errors.push(`BLUEPRINTS.${id} 缺少 unlocks`);

    Object.entries(blueprint.craftCost || {}).forEach(([key, amount]) => {
      if (!validResourceKeys.includes(key)) {
        errors.push(`BLUEPRINTS.${id} craftCost 引用不存在的資源: ${key}`);
      }
      if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
        errors.push(`BLUEPRINTS.${id} craftCost.${key} 必須是正整數，目前是 ${amount}`);
      }
    });

    Object.entries(blueprint.craftOutput || {}).forEach(([key, amount]) => {
      if (!validResourceKeys.includes(key)) {
        errors.push(`BLUEPRINTS.${id} craftOutput 引用不存在的資源: ${key}`);
      }
      if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
        errors.push(`BLUEPRINTS.${id} craftOutput.${key} 必須是正整數，目前是 ${amount}`);
      }
    });
  });

  // 檢查 COLLECTION_SETS
  Object.entries(COLLECTION_SETS || {}).forEach(([id, set]) => {
    if (set.id && set.id !== id) {
      errors.push(`COLLECTION_SETS.${id} id 應為 ${id}`);
    }
    if (!set.name) errors.push(`COLLECTION_SETS.${id} 缺少 name`);
    if (!set.desc) errors.push(`COLLECTION_SETS.${id} 缺少 desc`);
    if (!set.icon) errors.push(`COLLECTION_SETS.${id} 缺少 icon`);
    if (!Array.isArray(set.items) || set.items.length === 0) {
      errors.push(`COLLECTION_SETS.${id} 缺少 items 陣列`);
    } else {
      set.items.forEach((itemId) => {
        if (!validResourceKeys.includes(itemId)) {
          errors.push(`COLLECTION_SETS.${id} items 引用不存在的物品: ${itemId}`);
        }
      });
    }
    Object.entries(set.reward || {}).forEach(([key, amount]) => {
      if (!validResourceKeys.includes(key)) {
        errors.push(`COLLECTION_SETS.${id} reward 引用不存在的資源或物品: ${key}`);
      }
      if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
        errors.push(`COLLECTION_SETS.${id} reward.${key} 必須是正整數，目前是 ${amount}`);
      }
    });
  });

  // 檢查 CHRONICLES
  Object.entries(CHRONICLES || {}).forEach(([id, chronicle]) => {
    if (chronicle.id && chronicle.id !== id) {
      errors.push(`CHRONICLES.${id} id 應為 ${id}`);
    }
    if (typeof chronicle.condition !== 'function') {
      errors.push(`CHRONICLES.${id} 缺少 condition 函式`);
    }
    if (typeof chronicle.text !== 'function') {
      errors.push(`CHRONICLES.${id} 缺少 text 函式`);
    }
  });

  // 檢查 DECORATIONS
  Object.entries(DECORATIONS || {}).forEach(([id, decoration]) => {
    if (decoration.id && decoration.id !== id) {
      errors.push(`DECORATIONS.${id} id 應為 ${id}`);
    }
    if (!decoration.name) errors.push(`DECORATIONS.${id} 缺少 name`);
    if (!decoration.icon) errors.push(`DECORATIONS.${id} 缺少 icon`);
    if (!decoration.source || typeof decoration.source !== 'object') {
      errors.push(`DECORATIONS.${id} 缺少 source`);
      return;
    }
    if (!['default', 'collection', 'exhibitionCount', 'milestone'].includes(decoration.source.type)) {
      errors.push(`DECORATIONS.${id} source.type 不支援: ${decoration.source.type}`);
    }
    if (decoration.source.type === 'collection' && !COLLECTION_SETS[decoration.source.id]) {
      errors.push(`DECORATIONS.${id} source.id 引用不存在的套組: ${decoration.source.id}`);
    }
    if (decoration.source.type === 'milestone' && !MILESTONES[decoration.source.id]) {
      errors.push(`DECORATIONS.${id} source.id 引用不存在的里程碑: ${decoration.source.id}`);
    }
    if (decoration.source.type === 'exhibitionCount' &&
      (typeof decoration.source.count !== 'number' || decoration.source.count < 1)) {
      errors.push(`DECORATIONS.${id} source.count 必須是正數`);
    }
  });

  // 輸出結果
  if (errors.length > 0) {
    console.error('=== 資料格式驗證失敗 ===');
    errors.forEach((e) => console.error(e));
  } else {
    console.log('=== 資料格式驗證通過 ===');
  }
  return errors;
}

validateData();

// === 新增怪物模板 ===
// 複製以下格式加入 MONSTERS 物件：
// monsterKey: {
//   name: '怪物名稱',
//   icon: '😀',
//   specialty: 'mapId',
//   captureRate: 0.35,
//   trait: '專長描述',
// }

// === 新增地圖模板 ===
// 複製以下格式加入 MAPS 物件：
// mapKey: {
//   name: '地圖名稱',
//   resource: 'ResourceKey',
//   activity: '活動描述',
//   background: 'linear-gradient(...)',
//   themeClass: 'map-key',
//   decorations: ['🌾', '🌿'],
// }

// === 新增資源模板 ===
// 複製以下格式加入 RESOURCES 物件：
// ResourceKey: {
//   name: '資源名稱',
// }

window.MW_DATA = {
  CONFIG,
  RESOURCES,
  MAPS,
  MONSTERS,
  TRAITS,
  BUILDINGS,
  RESEARCH,
  QUESTS,
  TRAINING_COURSES,
  RECIPES,
  MERCHANT_ITEMS,
  BLACK_MARKET_PURCHASE,
  BREEDING_RECIPES,
  EXPEDITIONS,
  ARENA_STAGES,
  ARENA_TRAIT_EFFECTS,
  WORK_TOOLS,
  VISITOR_EVENTS,
  BLUEPRINTS,
  COLLECTION_SETS,
  DECORATIONS,
  CHRONICLES,
  WEATHER_TYPES,
  MILESTONES,
  MARKET_ITEMS,
  MARKET_SELL_RESOURCES,
  MARKET_BASE_PRICES,
};
