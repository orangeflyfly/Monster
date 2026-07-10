(function () {
  const {
    CONFIG,
    RESOURCES,
    RESOURCE_KEYS,
    MAPS,
    MAP_IDS,
    MONSTERS,
    MONSTER_IDS,
    BUILDINGS,
    RESEARCH,
  } = window.MW_DATA;

  function createInitialState() {
    const resources = {};
    RESOURCE_KEYS.forEach((key) => {
      resources[key] = 0;
    });

    const maps = {};
    MAP_IDS.forEach((id) => {
      maps[id] = {
        unlockedSlots: CONFIG.startingUnlockedSlots,
        maxSlots: CONFIG.maxMapSlots,
      };
    });

    return {
      playerName: '',
      campName: '新手營地',
      resources,
      buildings: { researchTable: false },
      research: { capture: false },
      maps,
      monsters: [],
      lastSavedAt: Date.now(),
    };
  }

  function canAfford(resources, cost) {
    return Object.keys(cost).every((resource) => (resources[resource] || 0) >= cost[resource]);
  }

  function spendResources(resources, cost) {
    if (!canAfford(resources, cost)) {
      return resources;
    }

    const next = Object.assign({}, resources);
    Object.keys(cost).forEach((resource) => {
      next[resource] -= cost[resource];
    });
    return next;
  }

  function formatCost(cost) {
    return Object.keys(cost)
      .map((resource) => `${RESOURCES[resource].name} ${cost[resource]}`)
      .join('、');
  }

  function gatherResource(state, resource) {
    const amount = CONFIG.manualGather[resource] || 0;
    const resources = Object.assign({}, state.resources);
    resources[resource] = (resources[resource] || 0) + amount;
    return {
      state: Object.assign({}, state, { resources }),
      amount,
    };
  }

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

  function randomMapPosition() {
    return {
      x: 10 + Math.random() * 80,
      y: 14 + Math.random() * 70,
    };
  }

  function createMonster(type) {
    const monster = MONSTERS[type];
    return {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      assignedMap: null,
      workProgressMs: 0,
      position: randomMapPosition(),
      target: randomMapPosition(),
      home: monster.specialty,
    };
  }

  function getWildEncounter() {
    const type = MONSTER_IDS[Math.floor(Math.random() * MONSTER_IDS.length)];
    return MONSTERS[type];
  }

  function canAttemptCapture(state) {
    return Boolean(state.research.capture) && state.monsters.length < CONFIG.maxMonsters;
  }

  function attemptCapture(state, targetType) {
    if (!state.research.capture) {
      return { state, message: '需要先完成捕捉研究。', caught: false };
    }

    if (state.monsters.length >= CONFIG.maxMonsters) {
      return { state, message: '怪物倉庫已滿。', caught: false };
    }

    const target = MONSTERS[targetType];
    if (!target) {
      return { state, message: '沒有可捕捉目標。', caught: false };
    }

    if (Math.random() >= target.captureRate) {
      return { state, message: `${target.name}掙脫了，捕捉失敗。`, caught: false };
    }

    const monster = createMonster(targetType);
    return {
      state: Object.assign({}, state, { monsters: state.monsters.concat(monster) }),
      message: `成功捕獲${target.name}！`,
      caught: true,
      monster,
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
    return monster.assignedMap === mapId || getAssignedCount(state.monsters, mapId) < mapState.unlockedSlots;
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

  function releaseMonster(state, monsterId) {
    return Object.assign({}, state, {
      monsters: state.monsters.filter((monster) => monster.id !== monsterId),
    });
  }

  function getWorkInterval(monster, mapId) {
    return MONSTERS[monster.type].specialty === mapId
      ? CONFIG.work.matchingSpecialtyMs
      : CONFIG.work.wrongSpecialtyMs;
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
    const monsters = state.monsters.map((monster) => {
      if (!monster.assignedMap || !MAPS[monster.assignedMap]) {
        return monster;
      }

      const interval = getWorkInterval(monster, monster.assignedMap);
      let progress = (monster.workProgressMs || 0) + elapsedMs;
      const produced = Math.floor(progress / interval);
      let nextMonster = monster;

      if (produced > 0) {
        progress %= interval;
        const map = MAPS[monster.assignedMap];
        const amount = MONSTERS[monster.type].specialty === monster.assignedMap
          ? CONFIG.work.matchingAmount
          : CONFIG.work.wrongAmount;
        resources[map.resource] = (resources[map.resource] || 0) + produced * amount;
      }

      nextMonster = Object.assign({}, nextMonster, { workProgressMs: progress });
      return elapsedMs <= CONFIG.tickMs ? moveTowardTarget(nextMonster) : nextMonster;
    });

    return Object.assign({}, state, { resources, monsters });
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
    RESOURCE_KEYS.forEach((key) => {
      const value = Number(raw.resources && raw.resources[key]);
      resources[key] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    });

    const maps = {};
    MAP_IDS.forEach((id) => {
      const map = raw.maps && raw.maps[id] ? raw.maps[id] : {};
      const slots = Number(map.unlockedSlots);
      maps[id] = {
        unlockedSlots: Number.isFinite(slots)
          ? Math.max(0, Math.min(CONFIG.maxMapSlots, Math.floor(slots)))
          : CONFIG.startingUnlockedSlots,
        maxSlots: CONFIG.maxMapSlots,
      };
    });

    const monsters = Array.isArray(raw.monsters)
      ? raw.monsters
          .filter((monster) => monster && monster.id && MONSTERS[monster.type])
          .slice(0, CONFIG.maxMonsters)
          .map((monster) => ({
            id: String(monster.id),
            type: String(monster.type),
            assignedMap: monster.assignedMap && MAPS[monster.assignedMap] ? String(monster.assignedMap) : null,
            workProgressMs: Number.isFinite(Number(monster.workProgressMs)) ? Math.max(0, Number(monster.workProgressMs)) : 0,
            position: normalizePosition(monster.position),
            target: normalizePosition(monster.target),
            home: MONSTERS[monster.type].specialty,
          }))
      : [];

    return {
      playerName: typeof raw.playerName === 'string' ? raw.playerName : '',
      campName: typeof raw.campName === 'string' ? raw.campName : initial.campName,
      resources,
      buildings: { researchTable: Boolean(raw.buildings && raw.buildings.researchTable) },
      research: { capture: Boolean(raw.research && raw.research.capture) },
      maps,
      monsters,
      lastSavedAt: Number.isFinite(Number(raw.lastSavedAt)) ? Number(raw.lastSavedAt) : Date.now(),
    };
  }

  function saveGame(state) {
    const payload = normalizeState(Object.assign({}, state, { lastSavedAt: Date.now() }));
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(payload));
    return payload;
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(CONFIG.saveKey);
      if (!raw) {
        return createInitialState();
      }
      return normalizeState(JSON.parse(raw));
    } catch (error) {
      return createInitialState();
    }
  }

  function resetGame() {
    localStorage.removeItem(CONFIG.saveKey);
    return createInitialState();
  }

  function applyOfflineProduction(state, now) {
    if (!state.lastSavedAt) {
      return { state, offlineMs: 0 };
    }

    const elapsedMs = Math.min(Math.max(0, now - state.lastSavedAt), CONFIG.maxOfflineMs);
    return {
      state: processWork(state, elapsedMs),
      offlineMs: elapsedMs,
    };
  }

  window.MW_SYSTEMS = {
    createInitialState,
    canAfford,
    formatCost,
    gatherResource,
    buildStructure,
    completeResearch,
    getWildEncounter,
    canAttemptCapture,
    attemptCapture,
    getAssignedCount,
    canAssignMonster,
    assignMonster,
    unassignMonster,
    releaseMonster,
    getWorkInterval,
    processWork,
    saveGame,
    loadGame,
    resetGame,
    applyOfflineProduction,
  };
}());
