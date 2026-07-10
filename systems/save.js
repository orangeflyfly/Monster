function getAmount(state, key) {
  if (CONFIG.CORE_RESOURCE_KEYS.includes(key) || CONFIG.CURRENCY_KEYS.includes(key)) {
    return state.resources[key] || 0;
  }
  return (state.inventory || {})[key] || 0;
}

function deductAmount(resources, inventory, key, amount) {
  if (CONFIG.CORE_RESOURCE_KEYS.includes(key) || CONFIG.CURRENCY_KEYS.includes(key)) {
    resources[key] -= amount;
  } else {
    inventory[key] = (inventory[key] || 0) - amount;
  }
}

function createInitialState() {
  const resources = {};
  CONFIG.CORE_RESOURCE_KEYS.forEach((key) => {
    resources[key] = 0;
  });
  CONFIG.CURRENCY_KEYS.forEach((key) => {
    resources[key] = key === 'Coins' ? CONFIG.startingCoins : 0;
  });

  const maps = {};
  Object.keys(MAPS).forEach((id) => {
    maps[id] = {
      unlockedSlots: CONFIG.initialSlots,
      maxSlots: CONFIG.maxMapSlots,
      specialization: null,
      weather: null,
    };
  });

  return {
    saveVersion: CONFIG.saveVersion,
    playerName: '',
    campName: '',
    started: false,
    resources,
    buildings: { researchTable: false },
    research: { capture: false },
    completedResearch: [],
    researchPoints: 0,
    activeQuests: [],
    completedQuestIds: [],
    questDate: '',
    unlockedMilestones: [],
    season: { type: 'spring', seasonDayCount: 0, lastCheckedDate: '' },
    wildResourceIndex: CONFIG.wildResourceDefault || 100,
    lastWildResourceRecoveryAt: TimeService.now(),
    marketDate: '',
    marketPrices: null,
    weatherDate: '',
    merchantDate: '',
    merchantStock: null,
    installedTools: {},
    inventory: {},
    craftingQueue: [],
    cultivationTanks: [],
    breedingSlots: [],
    eggs: [],
    breedingRecordIds: [],
    hintRevealed: [],
    expeditions: [],
    exhibition: [],
    campReputation: 0,
    activeVisitors: [],
    visitorHistory: [],
    genePool: [],
    geneResearchProgress: 0,
    geneResearchSuccessRate: 1,
    discoveredBlueprints: [],
    claimedCollectionSets: [],
    campLayout: Array(CONFIG.campDecorationSlots || 10).fill(null),
    lastMoodDecayAt: TimeService.now(),
    discoveredMutations: [],
    compendium: {
      monsters: {},
      mutations: {},
      breeding: {},
    },
    speciesProgress: {
      grassSpirit: 0,
      goblin: 0,
      stoneMonster: 0,
      wolfDog: 0,
      kappa: 0,
    },
    speciesHints: {
      grassSpirit: false,
      goblin: false,
      stoneMonster: false,
      wolfDog: false,
      kappa: false,
    },
    maps,
    monsters: [],
    vaultSlots: 30,
    campScore: 0,
    lastSavedAt: TimeService.now(),
    lastProcessedAt: TimeService.now(),
  };
}

function normalizePosition(position) {
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    return randomMapPosition();
  }

  return {
    x: Math.max(0, Math.min(100, position.x)),
    y: Math.max(0, Math.min(100, position.y)),
  };
}

function normalizeState(raw) {
  const initial = createInitialState();
  if (!raw || typeof raw !== 'object') {
    return initial;
  }

  const resources = {};
  CONFIG.CORE_RESOURCE_KEYS.forEach((key) => {
    const value = Number(raw.resources && raw.resources[key]);
    const cap = CONFIG.resourceCaps[key] || 9999;
    resources[key] = Math.min(
      Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0,
      cap
    );
  });
  CONFIG.CURRENCY_KEYS.forEach((key) => {
    const value = Number(raw.resources && raw.resources[key]);
    const cap = CONFIG.resourceCaps[key] || 9999;
    resources[key] = Math.min(
      Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0,
      cap
    );
  });

  const inventory = {};
  const rawInventory = raw.inventory && typeof raw.inventory === 'object' ? raw.inventory : {};
  Object.keys(rawInventory).forEach((key) => {
    if (CONFIG.CORE_RESOURCE_KEYS.includes(key) || CONFIG.CURRENCY_KEYS.includes(key)) return;
    const value = Number(rawInventory[key]);
    if (Number.isFinite(value) && value > 0) {
      inventory[key] = Math.floor(value);
    }
  });

  const maps = {};
  Object.keys(MAPS).forEach((id) => {
    const map = raw.maps && raw.maps[id] ? raw.maps[id] : {};
    const slots = Number(map.unlockedSlots);
    const weather = map.weather && typeof map.weather === 'object' && WEATHER_TYPES[map.weather.type]
      ? {
          type: String(map.weather.type),
          bonus: Number.isFinite(Number(map.weather.bonus))
            ? Number(map.weather.bonus)
            : WEATHER_TYPES[map.weather.type].getBonus(id),
          expiresAt: Number.isFinite(Number(map.weather.expiresAt)) ? Number(map.weather.expiresAt) : 0,
        }
      : null;
    maps[id] = {
      unlockedSlots: Number.isFinite(slots)
        ? Math.max(0, Math.min(CONFIG.maxMapSlots, Math.floor(slots)))
        : CONFIG.initialSlots,
      maxSlots: CONFIG.maxMapSlots,
      specialization: typeof map.specialization === 'string' ? map.specialization : null,
      weather,
    };
  });

  const vaultSlots = Math.min(
    Math.max(30, Math.floor(Number(raw.vaultSlots) || 30)),
    getMaxVaultLimit()
  );

  if (Array.isArray(raw.monsters)) {
    raw.monsters.forEach((monster) => {
      const baseDef = monster && MONSTERS[monster.originalType];
      const mutation = baseDef && baseDef.mutations && baseDef.mutations[monster.type];
      if (monster && !MONSTERS[monster.type] && mutation) {
        MONSTERS[monster.type] = {
          name: mutation.name,
          icon: mutation.icon,
          specialty: mutation.specialty,
          skillCaps: Object.assign({}, baseDef.skillCaps),
          captureRate: 0,
          retireDrops: baseDef.retireDrops || {},
          workDrops: baseDef.workDrops || null,
          mutations: {},
        };
      }
      if (monster && !MONSTERS[monster.type]) {
        const exchange = Object.values(CONFIG.certExchange || {})
          .find((item) => item.resultType === monster.type);
        if (exchange) {
          MONSTERS[monster.type] = {
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
      }
    });
  }

  const monsters = Array.isArray(raw.monsters)
    ? raw.monsters
        .filter((monster) => monster && monster.id && MONSTERS[monster.type])
        .slice(0, vaultSlots)
        .map((monster) => {
          const skills = monster.skills && typeof monster.skills === 'object' && !Array.isArray(monster.skills)
            ? monster.skills
            : {};
          const traits = Array.isArray(monster.traits) ? monster.traits.map((t) => {
            if (typeof t === 'string') return { key: t, level: 1 };
            return {
              key: typeof t.key === 'string' ? t.key : '',
              level: Number.isFinite(Number(t.level)) ? Math.max(1, Math.floor(Number(t.level))) : 1,
            };
          }).filter((t) => TRAITS[t.key]) : [];
          return {
            id: String(monster.id),
            type: String(monster.type),
            originalType: monster.originalType ? String(monster.originalType) : null,
            assignedMap: monster.assignedMap && MAPS[monster.assignedMap] ? String(monster.assignedMap) : null,
            workProgressMs: Number.isFinite(Number(monster.workProgressMs)) ? Math.max(0, Number(monster.workProgressMs)) : 0,
            position: normalizePosition(monster.position),
            target: normalizePosition(monster.target),
            home: MONSTERS[monster.type].specialty,
            level: Number.isFinite(Number(monster.level)) ? Math.max(1, Math.floor(Number(monster.level))) : 1,
            skills: Object.keys(skills).length === 0 ? generateInitialSkills(monster.type) : skills,
            talent: Number.isFinite(Number(monster.talent))
              ? Math.max(CONFIG.talentMin, Math.min(CONFIG.talentMax, Math.floor(Number(monster.talent))))
              : generateTalent(),
            traits: traits.length === 0 ? generateTraits() : traits,
            personality: monster.personality ?? generatePersonality(),
            mood: Number.isFinite(Number(monster.mood))
              ? Math.max(0, Math.min(CONFIG.moodMax || 100, Math.floor(Number(monster.mood))))
              : (CONFIG.moodDefault || 70),
            locked: Boolean(monster.locked),
            favorite: Boolean(monster.favorite),
            trainingCourse: typeof monster.trainingCourse === 'string' ? monster.trainingCourse : null,
            trainingStartMs: Number.isFinite(Number(monster.trainingStartMs)) ? Number(monster.trainingStartMs) : null,
            trainingEndMs: Number.isFinite(Number(monster.trainingEndMs)) ? Number(monster.trainingEndMs) : null,
            trainingCooldown: Number.isFinite(Number(monster.trainingCooldown)) ? Number(monster.trainingCooldown) : null,
            breedCooldown: Number.isFinite(Number(monster.breedCooldown)) ? Number(monster.breedCooldown) : null,
            expeditionId: typeof monster.expeditionId === 'string' ? monster.expeditionId : null,
            expeditionInstanceId: typeof monster.expeditionInstanceId === 'string'
              ? monster.expeditionInstanceId : null,
            expeditionEndMs: Number.isFinite(Number(monster.expeditionEndMs)) ? Number(monster.expeditionEndMs) : null,
            arenaSessionId: typeof monster.arenaSessionId === 'string' ? monster.arenaSessionId : null,
          };
        })
    : [];

  return {
    saveVersion: CONFIG.saveVersion,
    playerName: typeof raw.playerName === 'string' ? raw.playerName : '',
    campName: typeof raw.campName === 'string' ? raw.campName : '',
    started: typeof raw.started === 'boolean'
      ? raw.started
      : Boolean(typeof raw.playerName === 'string' && raw.playerName),
    resources,
    buildings: { researchTable: Boolean(raw.buildings && raw.buildings.researchTable) },
    research: { capture: Boolean(raw.research && raw.research.capture) },
    completedResearch: Array.isArray(raw.completedResearch) ? raw.completedResearch : [],
    researchPoints: Number.isFinite(Number(raw.researchPoints)) ? Math.max(0, Number(raw.researchPoints)) : 0,
    activeQuests: Array.isArray(raw.activeQuests) ? raw.activeQuests : [],
    completedQuestIds: Array.isArray(raw.completedQuestIds) ? raw.completedQuestIds : [],
    questDate: typeof raw.questDate === 'string' ? raw.questDate : '',
    unlockedMilestones: Array.isArray(raw.unlockedMilestones) ? raw.unlockedMilestones : [],
    season: typeof normalizeSeason === 'function'
      ? normalizeSeason(raw.season)
      : {
          type: raw.season && typeof raw.season.type === 'string' ? raw.season.type : 'spring',
          seasonDayCount: Number.isFinite(Number(raw.season && raw.season.seasonDayCount))
            ? Math.max(0, Math.floor(Number(raw.season.seasonDayCount)))
            : 0,
          lastCheckedDate: raw.season && typeof raw.season.lastCheckedDate === 'string'
            ? raw.season.lastCheckedDate
            : '',
        },
    wildResourceIndex: Number.isFinite(Number(raw.wildResourceIndex))
      ? Math.max(0, Math.min(CONFIG.wildResourceMax || 100, Math.floor(Number(raw.wildResourceIndex))))
      : (CONFIG.wildResourceDefault || 100),
    lastWildResourceRecoveryAt: Number.isFinite(Number(raw.lastWildResourceRecoveryAt))
      ? Number(raw.lastWildResourceRecoveryAt) : TimeService.now(),
    marketDate: typeof raw.marketDate === 'string' ? raw.marketDate : '',
    marketPrices: raw.marketPrices && typeof raw.marketPrices === 'object' ? raw.marketPrices : null,
    weatherDate: typeof raw.weatherDate === 'string' ? raw.weatherDate : '',
    merchantDate: typeof raw.merchantDate === 'string' ? raw.merchantDate : '',
    merchantStock: raw.merchantStock && typeof raw.merchantStock === 'object' ? raw.merchantStock : null,
    installedTools: raw.installedTools && typeof raw.installedTools === 'object'
      ? raw.installedTools : {},
    inventory,
    craftingQueue: Array.isArray(raw.craftingQueue) ? raw.craftingQueue.filter((j) =>
      j && typeof j.recipeId === 'string' && Number.isFinite(Number(j.endMs))
    ) : [],
    cultivationTanks: Array.isArray(raw.cultivationTanks) ? raw.cultivationTanks : [],
    breedingSlots: Array.isArray(raw.breedingSlots) ? raw.breedingSlots : [],
    eggs: Array.isArray(raw.eggs) ? raw.eggs.filter((e) =>
      e && typeof e.recipeId === 'string' && Number.isFinite(Number(e.hatchMs))
    ) : [],
    breedingRecordIds: Array.isArray(raw.breedingRecordIds) ? raw.breedingRecordIds : [],
    hintRevealed: Array.isArray(raw.hintRevealed) ? raw.hintRevealed : [],
    expeditions: Array.isArray(raw.expeditions) ? raw.expeditions
      .filter((e) => e && typeof e.id === 'string')
      .map((e) => Object.assign({}, e, {
        instanceId: typeof e.instanceId === 'string' ? e.instanceId
          : 'exp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
      })) : [],
    exhibition: Array.isArray(raw.exhibition) ? raw.exhibition : [],
    campReputation: Number.isFinite(Number(raw.campReputation))
      ? Math.max(0, Math.floor(Number(raw.campReputation))) : 0,
    activeVisitors: Array.isArray(raw.activeVisitors) ? raw.activeVisitors : [],
    visitorHistory: Array.isArray(raw.visitorHistory) ? raw.visitorHistory.slice(-20) : [],
    genePool: Array.isArray(raw.genePool) ? raw.genePool.slice(0, 10) : [],
    geneResearchProgress: Number.isFinite(Number(raw.geneResearchProgress))
      ? Math.max(0, Math.floor(Number(raw.geneResearchProgress))) : 0,
    geneResearchSuccessRate: Number.isFinite(Number(raw.geneResearchSuccessRate))
      ? Math.max(1, Math.min(5, Math.floor(Number(raw.geneResearchSuccessRate)))) : 1,
    discoveredBlueprints: Array.isArray(raw.discoveredBlueprints) ? raw.discoveredBlueprints : [],
    claimedCollectionSets: Array.isArray(raw.claimedCollectionSets) ? raw.claimedCollectionSets : [],
    campLayout: typeof normalizeCampLayout === 'function'
      ? normalizeCampLayout(raw.campLayout)
      : (Array.isArray(raw.campLayout) ? raw.campLayout : []),
    lastMoodDecayAt: Number.isFinite(Number(raw.lastMoodDecayAt))
      ? Number(raw.lastMoodDecayAt) : TimeService.now(),
    discoveredMutations: Array.isArray(raw.discoveredMutations) ? raw.discoveredMutations : [],
    compendium: raw.compendium && typeof raw.compendium === 'object' ? {
      monsters: raw.compendium.monsters || {},
      mutations: raw.compendium.mutations || {},
      breeding: raw.compendium.breeding || {},
    } : { monsters: {}, mutations: {}, breeding: {} },
    speciesProgress: (() => {
      const sp = raw.speciesProgress && typeof raw.speciesProgress === 'object' ? raw.speciesProgress : {};
      const result = {};
      Object.keys(CONFIG.speciesResearch).forEach((type) => {
        const val = Number(sp[type]);
        const max = CONFIG.speciesResearch[type].maxProgress;
        result[type] = Number.isFinite(val) ? Math.max(0, Math.min(max, Math.floor(val))) : 0;
      });
      return result;
    })(),
    speciesHints: (() => {
      const sh = raw.speciesHints && typeof raw.speciesHints === 'object' ? raw.speciesHints : {};
      const result = {};
      Object.keys(CONFIG.speciesResearch).forEach((type) => {
        result[type] = Boolean(sh[type]);
      });
      return result;
    })(),
    maps,
    monsters,
    vaultSlots,
    campScore: Number.isFinite(Number(raw.campScore)) ? Math.max(0, Math.floor(Number(raw.campScore))) : 0,
    lastSavedAt: Number.isFinite(Number(raw.lastSavedAt)) ? Number(raw.lastSavedAt) : TimeService.now(),
    lastProcessedAt: Number.isFinite(Number(raw.lastProcessedAt)) ? Number(raw.lastProcessedAt) : TimeService.now(),
  };
}

function saveGame(state) {
  const payload = normalizeState(Object.assign({}, state, {
    saveVersion: CONFIG.saveVersion,
    lastSavedAt: TimeService.now(),
    lastProcessedAt: TimeService.now(),
  }));
  localStorage.setItem(CONFIG.saveKey, JSON.stringify(payload));
  return payload;
}

function migrateV1ToV2(raw) {
  const materialKeys = [
    'herb_bundle', 'green_essence', 'goblin_tooth', 'wood_chip',
    'ore_fragment', 'stone_essence', 'wolf_meat', 'wolf_pelt',
    'kappa_gel', 'fish_scale',
  ];
  const certKeys = [
    'cert_grassSpirit', 'cert_goblin', 'cert_stoneMonster',
    'cert_wolfDog', 'cert_kappa', 'cert_elite', 'cert_rare',
    'cert_sprite',
  ];
  const itemKeys = [
    'basic_trap', 'enhanced_trap', 'monster_food', 'monster_toy',
    'premium_feed', 'cooked_meat', 'dried_fish', 'fish_jelly',
    'tool_parts', 'metal_parts', 'slime_jelly',
    'basic_gene_liquid', 'mutation_gene_liquid', 'talent_gene_liquid',
    'trait_gene_liquid', 'purify_gene_liquid', 'gene_preserver',
    'blueprint_hint', 'breeding_hint', 'map_fragment',
    'basic_farming', 'basic_logging', 'basic_mining',
    'basic_hunting', 'basic_fishing', 'advanced_farming', 'advanced_mining',
  ];

  const allMigrateKeys = [...materialKeys, ...certKeys, ...itemKeys];
  const resources = Object.assign({}, raw.resources || {});
  const inventory = Object.assign({}, raw.inventory || {});

  allMigrateKeys.forEach((key) => {
    if (resources[key] && resources[key] > 0) {
      inventory[key] = (inventory[key] || 0) + resources[key];
      delete resources[key];
    }
  });

  if (inventory.cert_sprite && inventory.cert_sprite > 0) {
    inventory.cert_grassSpirit = (inventory.cert_grassSpirit || 0) + inventory.cert_sprite;
    delete inventory.cert_sprite;
  }

  return Object.assign({}, raw, { resources, inventory, saveVersion: 2 });
}

function loadGame() {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    if (!raw) {
      return createInitialState();
    }
    const parsed = JSON.parse(raw);
    let migrated = parsed;

    if (!migrated.saveVersion || migrated.saveVersion < 2) {
      migrated = migrateV1ToV2(migrated);
    }
    const savedState = normalizeState(migrated);
    savedState.monsters = savedState.monsters.map((monster) =>
      Object.assign({}, monster, { arenaSessionId: null })
    );

    // 防止系統時間被往回調
    if (savedState.lastSavedAt > TimeService.now()) {
      savedState.lastSavedAt = TimeService.now();
    }

    return savedState;
  } catch (error) {
    console.error('存檔讀取失敗，重置遊戲', error);
    return createInitialState();
  }
}

function resetGame() {
  localStorage.removeItem(CONFIG.saveKey);
  return createInitialState();
}

function exportSave(state) {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'monster_workshop_save.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importSave(onSuccess) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const loaded = JSON.parse(ev.target.result);
        const migrated = normalizeState(loaded);
        localStorage.setItem(CONFIG.saveKey, JSON.stringify(migrated));
        onSuccess(migrated);
      } catch (err) {
        alert('存檔格式錯誤，無法匯入。');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function calcCampScore(state) {
  let score = 0;
  // 怪物數量
  score += state.monsters.length * 5;
  // 工作中怪物
  score += state.monsters.filter((m) => !!m.assignedMap).length * 3;
  // 區域工作位升級
  Object.keys(state.maps || {}).forEach((mapId) => {
    const slots = state.maps[mapId].unlockedSlots || 4;
    score += (slots - 4) * 10;
  });
  // 資源總量
  const totalResources = CONFIG.CORE_RESOURCE_KEYS
    .reduce((sum, key) => sum + ((state.resources || {})[key] || 0), 0);
  score += Math.floor(totalResources / 10);
  // 里程碑（之後加）
  score += (state.unlockedMilestones || []).length * 20;
  return Math.floor(score);
}

function getCampRank(state) {
  const score = calcCampScore(state);
  const ranks = CONFIG.campRanks;
  let current = ranks[0];
  for (const r of ranks) {
    if (score >= r.minScore) current = r;
  }
  return { ...current, score };
}

function checkMilestones(state) {
  const newUnlocked = [];
  Object.values(MILESTONES).forEach((milestone) => {
    if (state.unlockedMilestones.includes(milestone.id)) return;
    if (!milestone.check(state)) return;

    newUnlocked.push(milestone.id);
    state = Object.assign({}, state, {
      resources: addResourcesToResources(state.resources, milestone.reward || {}),
    });
  });

  if (newUnlocked.length > 0) {
    state = Object.assign({}, state, {
      unlockedMilestones: [...state.unlockedMilestones, ...newUnlocked],
    });
  }

  return { state, newUnlocked };
}

function applyOfflineProduction(state, now) {
  if (!state.lastSavedAt) {
    return { state, offlineMs: 0 };
  }

  const savedState = Object.assign({}, state);

  // 防止系統時間被往回調
  if (savedState.lastSavedAt > TimeService.now()) {
    savedState.lastSavedAt = TimeService.now();
  }

  // 防止離線時間超過上限
  const offlineMs = TimeService.getOfflineMs(savedState.lastSavedAt);

  // 防止同一分鐘重複結算
  // 在 state 加入 lastProcessedAt 欄位
  // 如果 lastProcessedAt 與現在時間差小於 tickMs，跳過結算
  if (savedState.lastProcessedAt &&
      TimeService.now() - savedState.lastProcessedAt < CONFIG.tickMs) {
    return { state: savedState, offlineMs: 0 };
  }

  return {
    state: processWork(savedState, offlineMs),
    offlineMs,
  };
}

const save = {
  getAmount,
  deductAmount,
  createInitialState,
  saveGame,
  loadGame,
  resetGame,
  exportSave,
  importSave,
  calcCampScore,
  getCampRank,
  checkMilestones,
  applyOfflineProduction,
};
