function canCraft(state, recipeId) {
  const recipe = RECIPES[recipeId];
  if (!recipe) return { can: false, reason: '配方不存在。' };

  for (const [key, amount] of Object.entries(recipe.inputs)) {
    const total = S.getAmount(state, key);
    if (total < amount) {
      const name = RESOURCES[key]?.name || key;
      return { can: false, reason: `${name} 不足（需要 ${amount}，現有 ${total}）` };
    }
  }
  return { can: true };
}

function startCrafting(state, recipeId) {
  const check = canCraft(state, recipeId);
  if (!check.can) return { state, message: check.reason };

  if (state.craftingQueue && state.craftingQueue.length >= 3) {
    return { state, message: '加工佇列已滿（最多3個）。' };
  }

  const recipe = RECIPES[recipeId];
  let resources = Object.assign({}, state.resources);
  let inventory = Object.assign({}, state.inventory || {});

  for (const [key, amount] of Object.entries(recipe.inputs)) {
    S.deductAmount(resources, inventory, key, amount);
  }

  const craftingQueue = [...(state.craftingQueue || []), {
    recipeId,
    startMs: TimeService.now(),
    endMs: TimeService.now() + recipe.duration,
  }];

  return {
    state: Object.assign({}, state, { resources, inventory, craftingQueue }),
    message: `開始加工「${recipe.name}」！`,
  };
}

function checkCraftingComplete(state) {
  const now = TimeService.now();
  if (!state.craftingQueue || state.craftingQueue.length === 0) {
    return { state, changed: false, messages: [] };
  }

  let changed = false;
  let messages = [];
  let inventory = Object.assign({}, state.inventory || {});

  const craftingQueue = state.craftingQueue.filter((job) => {
    if (now < job.endMs) return true;
    const recipe = RECIPES[job.recipeId];
    if (!recipe) return false;
    const { item, amount } = recipe.output;
    inventory[item] = (inventory[item] || 0) + amount;
    messages.push(`✅ 「${recipe.name}」加工完成！獲得 ×${amount}`);
    changed = true;
    return false;
  });

  return {
    state: changed ? Object.assign({}, state, { inventory, craftingQueue }) : state,
    messages,
    changed,
  };
}

const crafting = { canCraft, startCrafting, checkCraftingComplete };
