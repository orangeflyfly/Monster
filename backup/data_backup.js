(function () {
  const CONFIG = {
    saveKey: 'monster-workshop-save-static-v1',
    tickMs: 1000,
    autosaveMs: 2000,
    maxOfflineMs: 8 * 60 * 60 * 1000,
    maxMonsters: 30,
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
      grassSpirit: 0.42,
      goblin: 0.34,
      stoneMonster: 0.26,
      wolfDog: 0.3,
      kappa: 0.32,
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
      captureRate: CONFIG.captureRates.grassSpirit,
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
      captureRate: CONFIG.captureRates.stoneMonster,
    },
    wolfDog: {
      id: 'wolfDog',
      name: '狼犬',
      icon: '狼',
      specialty: 'hunting',
      trait: '狩獵',
      captureRate: CONFIG.captureRates.wolfDog,
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
  };
}());
