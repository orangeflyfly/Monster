function hasCollectionItem(state, itemId) {
  return S.getAmount(state, itemId) > 0;
}

function checkCollectionComplete(state, setId) {
  const set = COLLECTION_SETS[setId];
  if (!set) return { complete: false, reason: '收藏套組不存在。' };

  const missing = (set.items || []).filter((itemId) => !hasCollectionItem(state, itemId));
  return {
    complete: missing.length === 0,
    missing,
  };
}

function claimCollectionReward(state, setId) {
  const set = COLLECTION_SETS[setId];
  if (!set) return { state, message: '收藏套組不存在。' };

  if ((state.claimedCollectionSets || []).includes(setId)) {
    return { state, message: '已領取此收藏套組獎勵。' };
  }

  const check = checkCollectionComplete(state, setId);
  if (!check.complete) {
    return { state, message: '收藏套組尚未完成。' };
  }

  let resources = Object.assign({}, state.resources);
  const inventory = Object.assign({}, state.inventory || {});
  Object.entries(set.reward || {}).forEach(([key, amount]) => {
    if (CONFIG.CORE_RESOURCE_KEYS.includes(key) || CONFIG.CURRENCY_KEYS.includes(key)) {
      resources = S.addResourceToResources(resources, key, amount);
    } else {
      inventory[key] = (inventory[key] || 0) + amount;
    }
  });

  return {
    state: Object.assign({}, state, {
      resources,
      inventory,
      claimedCollectionSets: [...(state.claimedCollectionSets || []), setId],
    }),
    message: `收藏套組「${set.name}」完成，獎勵已領取！`,
  };
}

const collections = {
  checkCollectionComplete,
  claimCollectionReward,
};
