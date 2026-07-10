const MARKET_ITEMS = {
  // 買入類（消耗品）
  monster_food: {
    id: 'monster_food',
    name: '怪物飼料',
    desc: '提升怪物心情，維持工作效率。',
    type: 'buy',
    basePrice: 10,
    resource: 'Coins',
  },
  monster_toy: {
    id: 'monster_toy',
    name: '怪物玩具',
    desc: '大幅提升怪物心情。',
    type: 'buy',
    basePrice: 25,
    resource: 'Coins',
  },
  basic_trap: {
    id: 'basic_trap',
    name: '基礎陷阱',
    desc: '用於野外捕捉怪物。',
    type: 'buy',
    basePrice: 15,
    resource: 'Coins',
  },
};

// 可賣出的資源
const MARKET_SELL_RESOURCES = ['Food', 'Wood', 'Ore', 'Meat', 'Fish'];

// 每種資源的基礎賣價（每單位）
const MARKET_BASE_PRICES = {
  Food: 2,
  Wood: 2,
  Ore: 3,
  Meat: 5,
  Fish: 5,
};
