const TRAITS = {
  // 生產類
  harvest_hand: {
    name: '豐收之手',
    desc: '農田產量 +15%',
    rarity: 'common',
    effect: { type: 'map_output', map: 'farm', bonus: 0.15 },
    incompatible: [],
    maxLevel: 3,
  },
  iron_skin: {
    name: '鐵皮',
    desc: '礦坑產量 +15%',
    rarity: 'common',
    effect: { type: 'map_output', map: 'mine', bonus: 0.15 },
    incompatible: [],
    maxLevel: 3,
  },
  timber_sense: {
    name: '木靈感應',
    desc: '森林產量 +15%',
    rarity: 'common',
    effect: { type: 'map_output', map: 'forest', bonus: 0.15 },
    incompatible: [],
    maxLevel: 3,
  },
  hunter_instinct: {
    name: '獵人本能',
    desc: '獵場產量 +15%',
    rarity: 'common',
    effect: { type: 'map_output', map: 'hunting', bonus: 0.15 },
    incompatible: [],
    maxLevel: 3,
  },
  water_affinity: {
    name: '水之親和',
    desc: '湖泊產量 +15%',
    rarity: 'common',
    effect: { type: 'map_output', map: 'lake', bonus: 0.15 },
    incompatible: [],
    maxLevel: 3,
  },
  // 效率類
  diligent: {
    name: '勤奮',
    desc: '工作速度 +10%',
    rarity: 'common',
    effect: { type: 'work_speed', bonus: 0.10 },
    incompatible: ['lazy'],
    maxLevel: 5,
  },
  lazy: {
    name: '懶散',
    desc: '工作速度 -10%',
    rarity: 'common',
    effect: { type: 'work_speed', bonus: -0.10 },
    incompatible: ['diligent'],
    maxLevel: 5,
  },
  // 稀有類
  double_harvest: {
    name: '豐饒',
    desc: '偶爾產出雙倍（10%機率）',
    rarity: 'rare',
    effect: { type: 'double_output', chance: 0.10 },
    incompatible: [],
    maxLevel: 2,
  },
  specialist: {
    name: '專家',
    desc: '專長地圖產量 +25%',
    rarity: 'rare',
    effect: { type: 'specialty_output', bonus: 0.25 },
    incompatible: [],
    maxLevel: 3,
  },
};

// 稀有度抽取權重
const TRAIT_RARITY_WEIGHTS = {
  common: 80,
  rare: 20,
};
