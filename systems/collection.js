function preserveGene(state, monsterId, traitIndex) {
  const monster = state.monsters.find((m) => m.id === monsterId);
  if (!monster) return { state, message: '找不到怪物。' };

  const inventory = state.inventory || {};
  if (!inventory.gene_preserver || inventory.gene_preserver <= 0) {
    return { state, message: '背包裡沒有基因保留器。' };
  }

  const trait = (monster.traits || [])[traitIndex];
  if (!trait) return { state, message: '詞條不存在。' };

  const traitDef = TRAITS[trait.key || trait];
  if (!traitDef) return { state, message: '詞條定義不存在。' };

  if ((state.genePool || []).length >= 10) {
    return { state, message: '基因池已滿（最多10個），請先使用現有基因。' };
  }

  const genePool = [...(state.genePool || []), {
    id: 'gene_' + Date.now().toString(36),
    traitKey: trait.key || trait,
    traitLevel: trait.level || 1,
    sourceType: monster.type,
    preservedAt: TimeService.now(),
  }];
  const newInventory = Object.assign({}, inventory, {
    gene_preserver: inventory.gene_preserver - 1,
  });

  return {
    state: Object.assign({}, state, { genePool, inventory: newInventory }),
    message: `「${traitDef.name}」已保存至基因池！`,
  };
}

function removeFromGenePool(state, geneId) {
  const genePool = (state.genePool || []).filter((gene) => gene.id !== geneId);
  return Object.assign({}, state, { genePool });
}

function exchangeCert(state, exchangeId) {
  const exchange = CONFIG.certExchange[exchangeId];
  if (!exchange) return { state, message: '兌換項目不存在。' };

  if ((state.monsters || []).length >= S.getVaultLimit(state)) {
    return { state, message: '倉庫已滿，無法兌換。' };
  }

  const inventory = Object.assign({}, state.inventory || {});
  for (const [certKey, amount] of Object.entries(exchange.requires)) {
    if ((inventory[certKey] || 0) < amount) {
      const certName = RESOURCES[certKey]?.name || certKey;
      return { state, message: `${certName} 不足，需要 ${amount} 個。` };
    }
  }

  for (const [certKey, amount] of Object.entries(exchange.requires)) {
    inventory[certKey] = (inventory[certKey] || 0) - amount;
  }

  const resultType = exchange.resultType;
  if (!MONSTERS[resultType]) {
    MONSTERS[resultType] = {
      name: exchange.name,
      icon: exchange.icon,
      specialty: exchange.specialty,
      skillCaps: { farming: 8, logging: 8, mining: 8, hunting: 8, fishing: 8 },
      captureRate: 0,
      retireDrops: {},
      workDrops: null,
      mutations: {},
      isSpecial: true,
    };
  }

  const newMonster = S.createMonster(resultType);
  newMonster.talent = 8 + Math.floor(Math.random() * 3);

  const monsters = [...state.monsters, newMonster];
  const compendium = Object.assign({}, state.compendium || {});
  compendium.monsters = Object.assign({}, compendium.monsters, {
    [resultType]: {
      discovered: true,
      firstCaughtAt: (compendium.monsters?.[resultType] || {}).firstCaughtAt || TimeService.now(),
      count: ((compendium.monsters?.[resultType] || {}).count || 0) + 1,
    },
  });

  return {
    state: Object.assign({}, state, { inventory, monsters, compendium }),
    message: `成功兌換「${exchange.name}」！天賦 ${newMonster.talent}/10`,
  };
}

const collection = {
  preserveGene,
  removeFromGenePool,
  exchangeCert,
};
