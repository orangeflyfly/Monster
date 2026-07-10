(function () {
  const CONFIG = {
    saveKey: 'monster-workshop-save-static-v1',
    saveVersion: 1,
    tickMs: 1000,
    autosaveMs: 30000,
    maxOfflineMs: 8 * 60 * 60 * 1000,
    maxMonsters: 30,
    gatherAmount: 1,
    workIntervalMs: 8000,
    workIntervalSlowMs: 16000,
    initialSlots: 4,
    maxOfflineHours: 8,
    startingUnlockedSlots: 4,
    maxMapSlots: 16,
    manualGather: {
      Wood: 1,
      Ore: 1,
    },
    buildings: {
      researchTable: {
        cost: { Wood: 12, Ore: 6 },
      },
    },
    research: {
      capture: {
        cost: { Wood: 8, Ore: 4 },
      },
    },
    work: {
      matchingSpecialtyMs: 8000,
      wrongSpecialtyMs: 16000,
      matchingAmount: 1,
      wrongAmount: 1,
    },
    captureRates: {
      sprite: 0.42,
      goblin: 0.38,
      rockMonster: 0.30,
      wolfdog: 0.35,
      kappa: 0.26,
    },
  };

  const RESOURCES = {
    Food: { key: 'Food', name: '食物' },
    Wood: { key: 'Wood', name: '木材' },
    Ore: { key: 'Ore', name: '礦石' },
    Meat: { key: 'Meat', name: '肉類' },
    Fish: { key: 'Fish', name: '魚類' },
  };

  const MAPS = {
    farm: {
      id: 'farm',
      name: '農田',
      resource: 'Food',
      activity: '種植',
      themeClass: 'map-farm',
      decorations: ['🌾', '🌾', '🌿', '🟫', '🌱'],
    },
    forest: {
      id: 'forest',
      name: '森林',
      resource: 'Wood',
      activity: '伐木',
      themeClass: 'map-forest',
      decorations: ['🌲', '🌳', '🌲', '🌿', '🍃'],
    },
    mine: {
      id: 'mine',
      name: '礦坑',
      resource: 'Ore',
      activity: '採礦',
      themeClass: 'map-mine',
      decorations: ['🪨', '⛏️', '🪨', '💎', '🟤'],
    },
    hunting: {
      id: 'hunting',
      name: '獵場',
      resource: 'Meat',
      activity: '狩獵',
      themeClass: 'map-hunting',
      decorations: ['🌿', '🌾', '🦌', '🌿', '🍂'],
    },
    lake: {
      id: 'lake',
      name: '湖泊',
      resource: 'Fish',
      activity: '釣魚',
      themeClass: 'map-lake',
      decorations: ['🌊', '💧', '🐟', '🌿', '🪸'],
    },
  };

  const MONSTERS = {
    grassSpirit: {
      id: 'grassSpirit',
      name: '草精靈',
      icon: '草',
      specialty: 'farm',
      trait: '種植',
      captureRate: CONFIG.captureRates.sprite,
    },
    goblin: {
      id: 'goblin',
      name: '哥布林',
      icon: '哥',
      specialty: 'forest',
      trait: '伐木',
      captureRate: CONFIG.captureRates.goblin,
    },
    stoneMonster: {
      id: 'stoneMonster',
      name: '石頭怪',
      icon: '石',
      specialty: 'mine',
      trait: '採礦',
      captureRate: CONFIG.captureRates.rockMonster,
    },
    wolfDog: {
      id: 'wolfDog',
      name: '狼犬',
      icon: '狼',
      specialty: 'hunting',
      trait: '狩獵',
      captureRate: CONFIG.captureRates.wolfdog,
    },
    kappa: {
      id: 'kappa',
      name: '河童',
      icon: '河',
      specialty: 'lake',
      trait: '釣魚',
      captureRate: CONFIG.captureRates.kappa,
    },
  };

  const BUILDINGS = {
    researchTable: {
      id: 'researchTable',
      name: '研究台',
      description: '解鎖營地研究與捕捉準備。',
      cost: CONFIG.buildings.researchTable.cost,
    },
  };

  const RESEARCH = {
    capture: {
      id: 'capture',
      name: '捕捉研究',
      description: '完成後可前往野外捕捉怪物。',
      requiresBuilding: 'researchTable',
      cost: CONFIG.research.capture.cost,
    },
  };

  function validateData() {
    const errors = [];

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

    // 輸出結果
    if (errors.length > 0) {
      console.error('=== 資料格式驗證失敗 ===');
      errors.forEach((e) => console.error(e));
    } else {
      console.log('=== 資料格式驗證通過 ===');
    }
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
    RESOURCE_KEYS: Object.keys(RESOURCES),
    MAPS,
    MAP_IDS: Object.keys(MAPS),
    MONSTERS,
    MONSTER_IDS: Object.keys(MONSTERS),
    BUILDINGS,
    RESEARCH,
    validateData,
  };
}());
