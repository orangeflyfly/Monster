function getMysteryCoins(state) {
  return (state.resources && state.resources.MysteryCoins) || 0;
}

function generateMerchantStock(state) {
  const today = new Date().toDateString();
  if (state.merchantDate === today && state.merchantStock) {
    return state;
  }

  // 一般商人：固定商品加隨機補充
  const normalItems = Object.values(MERCHANT_ITEMS)
    .filter((item) => item.merchant === 'normal')
    .reduce((acc, item) => {
      acc[item.id] = item.stock;
      return acc;
    }, {});

  // 黑市商人：隨機選3個商品
  const blackItems = Object.values(MERCHANT_ITEMS)
    .filter((item) => item.merchant === 'black')
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .reduce((acc, item) => {
      acc[item.id] = item.stock;
      return acc;
    }, {});

  return Object.assign({}, state, {
    merchantDate: today,
    merchantStock: { normal: normalItems, black: blackItems },
  });
}

function buyFromMerchant(state, itemId, merchantType) {
  state = generateMerchantStock(state);

  const item = MERCHANT_ITEMS[itemId];
  if (!item) return { state, message: '商品不存在。' };
  if (item.merchant !== merchantType) return { state, message: '此商人沒有這個商品。' };

  const stock = (state.merchantStock[merchantType] || {})[itemId] || 0;
  if (stock <= 0) return { state, message: '此商品已售完。' };

  const currency = item.currency;
  const price = item.price;
  const currentCoins = state.resources[currency] || 0;

  if (currentCoins < price) {
    return { state, message: `${currency === 'Coins' ? '營地幣' : '神秘幣'}不足，需要 ${price}。` };
  }

  const resources = spendResources(state.resources, { [currency]: price });

  const inventory = Object.assign({}, state.inventory || {}, {
    [itemId]: ((state.inventory || {})[itemId] || 0) + 1,
  });

  const merchantStock = Object.assign({}, state.merchantStock, {
    [merchantType]: Object.assign({}, state.merchantStock[merchantType], {
      [itemId]: stock - 1,
    }),
  });

  return {
    state: Object.assign({}, state, { resources, inventory, merchantStock }),
    message: `購買「${item.name}」成功！`,
  };
}

function sellToBlackMarket(state, monsterId) {
  const check = S.canRemoveMonster(state, monsterId);
  if (!check.can) return { state, message: check.reason };
  const monster = state.monsters.find((m) => m.id === monsterId);

  let earned = BLACK_MARKET_PURCHASE.normal;
  const reasons = ['普通怪物'];

  if ((monster.talent || 0) >= 8) {
    earned += BLACK_MARKET_PURCHASE.elite;
    reasons.push('天賦精英');
  }

  const hasRareTrait = (monster.traits || []).some((t) => {
    const traitDef = TRAITS[t.key || t];
    return traitDef && traitDef.rarity === 'rare';
  });
  if (hasRareTrait) {
    earned += BLACK_MARKET_PURCHASE.rare_trait;
    reasons.push('稀有詞條');
  }

  const resources = addResourceToResources(state.resources, 'MysteryCoins', earned);

  const monsters = state.monsters.filter((m) => m.id !== monsterId);
  const def = MONSTERS[monster.type];

  return {
    state: Object.assign({}, state, { resources, monsters }),
    message: `${def.name} 賣給黑市，獲得 ${earned} 神秘幣（${reasons.join('+')}）`,
  };
}

const merchants = { generateMerchantStock, buyFromMerchant, sellToBlackMarket, getMysteryCoins };
