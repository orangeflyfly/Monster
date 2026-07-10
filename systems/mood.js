const MOOD_ITEMS = {
  monster_food: { mood: 15 },
  monster_toy: { mood: 25 },
  premium_feed: { mood: 30 },
  slime_jelly: { mood: 20 },
};

function normalizeMoodValue(value) {
  const mood = Number(value);
  const max = CONFIG.moodMax || 100;
  if (!Number.isFinite(mood)) return CONFIG.moodDefault || 70;
  return Math.max(0, Math.min(max, Math.floor(mood)));
}

function useMoodItem(state, monsterId, itemId) {
  const item = MOOD_ITEMS[itemId];
  if (!item) return { state, message: '這個道具不能提升心情。' };

  const monster = state.monsters.find((m) => m.id === monsterId);
  if (!monster) return { state, message: '找不到怪物。' };

  const inventory = state.inventory || {};
  const count = inventory[itemId] || 0;
  if (count <= 0) {
    return { state, message: `背包裡沒有「${RESOURCES[itemId]?.name || itemId}」。` };
  }

  const currentMood = normalizeMoodValue(monster.mood);
  if (currentMood >= (CONFIG.moodMax || 100)) {
    return { state, message: `${MONSTERS[monster.type]?.name || '怪物'} 心情已經很好了。` };
  }

  const nextMood = Math.min(CONFIG.moodMax || 100, currentMood + item.mood);
  const monsters = state.monsters.map((m) =>
    m.id === monsterId ? Object.assign({}, m, { mood: nextMood }) : m
  );
  const newInventory = Object.assign({}, inventory, { [itemId]: count - 1 });

  return {
    state: Object.assign({}, state, { monsters, inventory: newInventory }),
    message: `${MONSTERS[monster.type]?.name || '怪物'} 使用「${RESOURCES[itemId]?.name || itemId}」，心情 ${currentMood} → ${nextMood}！`,
  };
}

function processMoodDecay(state, now = TimeService.now()) {
  if (!state.monsters || state.monsters.length === 0) {
    return Object.assign({}, state, { lastMoodDecayAt: now });
  }

  const lastDecayAt = Number.isFinite(Number(state.lastMoodDecayAt))
    ? Number(state.lastMoodDecayAt)
    : now;
  const decayMs = CONFIG.moodDecayMs || (60 * 60 * 1000);
  const steps = Math.floor(Math.max(0, now - lastDecayAt) / decayMs);
  if (steps <= 0) return state;

  const minMood = CONFIG.moodMin || 30;
  const decayAmount = (CONFIG.moodDecayAmount || 1) * steps;
  const monsters = state.monsters.map((monster) => {
    const currentMood = normalizeMoodValue(monster.mood);
    const finalDecay = state.season?.type === 'winter' && monster.personality === 'timid'
      ? Math.ceil(decayAmount * 1.5)
      : decayAmount;
    return Object.assign({}, monster, {
      mood: Math.max(minMood, currentMood - finalDecay),
    });
  });

  return Object.assign({}, state, {
    monsters,
    lastMoodDecayAt: lastDecayAt + steps * decayMs,
  });
}

function getMoodWorkMultiplier(monster) {
  const mood = normalizeMoodValue(monster.mood);
  if (mood >= 80) return 1.08;
  if (mood < 40) return 0.92;
  return 1;
}

function getPersonalityWorkSpeedMultiplier(monster) {
  if (monster.personality === 'diligent') return 1.15;
  if (monster.personality === 'lazy') return 0.85;
  return 1;
}

const moodSystem = {
  MOOD_ITEMS,
  useMoodItem,
  processMoodDecay,
  getMoodWorkMultiplier,
  getPersonalityWorkSpeedMultiplier,
};
