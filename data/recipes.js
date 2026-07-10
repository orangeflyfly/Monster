const RECIPES = {
  // 食物類加工
  premium_feed: {
    id: 'premium_feed',
    name: '特級飼料',
    desc: '大幅提升怪物心情，效果優於普通飼料。',
    category: 'food',
    inputs: { Food: 10, herb_bundle: 2 },
    output: { item: 'premium_feed', amount: 1 },
    duration: 5 * 60 * 1000,
  },
  // 肉類加工
  cooked_meat: {
    id: 'cooked_meat',
    name: '煮熟狼肉',
    desc: '高級委託材料，也可以賣給商人換取高價。',
    category: 'meat',
    inputs: { wolf_meat: 2, Wood: 5 },
    output: { item: 'cooked_meat', amount: 1 },
    duration: 10 * 60 * 1000,
  },
  // 魚類加工
  dried_fish: {
    id: 'dried_fish',
    name: '魚乾',
    desc: '保存期長的魚類加工品，適合委託交付。',
    category: 'fish',
    inputs: { Fish: 5, fish_scale: 1 },
    output: { item: 'dried_fish', amount: 2 },
    duration: 8 * 60 * 1000,
  },
  fish_jelly: {
    id: 'fish_jelly',
    name: '精緻魚凍',
    desc: '高價市場商品，使用河童膠製作。',
    category: 'fish',
    inputs: { Fish: 3, kappa_gel: 1 },
    output: { item: 'fish_jelly', amount: 1 },
    duration: 12 * 60 * 1000,
  },
  // 材料加工
  tool_parts: {
    id: 'tool_parts',
    name: '工具零件',
    desc: '設施升級材料，由哥布林牙和木材製成。',
    category: 'material',
    inputs: { goblin_tooth: 2, Wood: 10 },
    output: { item: 'tool_parts', amount: 1 },
    duration: 15 * 60 * 1000,
  },
  metal_parts: {
    id: 'metal_parts',
    name: '金屬零件',
    desc: '高級設施升級材料。',
    category: 'material',
    inputs: { ore_fragment: 3, Ore: 10 },
    output: { item: 'metal_parts', amount: 1 },
    duration: 20 * 60 * 1000,
  },
  slime_jelly: {
    id: 'slime_jelly',
    name: '史萊姆果凍',
    desc: '怪物心情道具，使用綠色精華製作。',
    category: 'food',
    inputs: { green_essence: 2, Food: 5 },
    output: { item: 'slime_jelly', amount: 2 },
    duration: 8 * 60 * 1000,
  },
};
