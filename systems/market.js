function generateMarketPrices(state) {
  const prices = {};
  MARKET_SELL_RESOURCES.forEach((resource) => {
    const base = MARKET_BASE_PRICES[resource] || 1;
    const variance = (Math.random() - 0.5) * 0.4;
    prices[resource] = Math.max(1, Math.round(base * (1 + variance) * 10) / 10);
  });
  return prices;
}

function getOrRefreshMarketPrices(state) {
  const today = new Date().toDateString();
  if (state.marketDate === today && state.marketPrices) {
    return { prices: state.marketPrices, changed: false };
  }
  const prices = generateMarketPrices(state);
  return { prices, changed: true };
}

function applyMarketRefresh(state) {
  const today = new Date().toDateString();
  if (state.marketDate === today && state.marketPrices) {
    return state;
  }
  const { prices } = getOrRefreshMarketPrices(state);
  return Object.assign({}, state, {
    marketDate: today,
    marketPrices: prices,
  });
}

function sellResource(state, resource, amount) {
  amount = Math.min(amount, state.resources[resource] || 0);
  if (amount <= 0) return { state, message: '資源不足。' };

  state = applyMarketRefresh(state);
  const prices = state.marketPrices || {};
  const price = prices[resource] || MARKET_BASE_PRICES[resource] || 1;
  const earned = Math.floor(amount * price);
  let resources = Object.assign({}, state.resources, {
    [resource]: (state.resources[resource] || 0) - amount,
  });
  resources = addResourceToResources(resources, 'Coins', earned);

  return {
    state: Object.assign({}, state, { resources }),
    message: `賣出 ${RESOURCES[resource].name} ×${amount}，獲得 🪙${earned}`,
  };
}

function buyMarketItem(state, itemId) {
  const item = MARKET_ITEMS[itemId];
  if (!item) return { state, message: '商品不存在。' };

  const price = item.basePrice;
  if ((state.resources.Coins || 0) < price) {
    return { state, message: `營地幣不足，需要 🪙${price}。` };
  }

  const inventory = Object.assign({}, state.inventory || {});
  inventory[itemId] = (inventory[itemId] || 0) + 1;

  const resources = spendResources(state.resources, { Coins: price });

  return {
    state: Object.assign({}, state, { resources, inventory }),
    message: `購買「${item.name}」成功！`,
  };
}

const market = { getOrRefreshMarketPrices, applyMarketRefresh, sellResource, buyMarketItem };
