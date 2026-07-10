function getDecorationSlots() {
  return CONFIG.campDecorationSlots || 10;
}

function normalizeCampLayout(layout) {
  const slotCount = getDecorationSlots();
  const result = Array.isArray(layout)
    ? layout.slice(0, slotCount).map((id) => (typeof id === 'string' && DECORATIONS[id] ? id : null))
    : [];
  while (result.length < slotCount) result.push(null);
  return result;
}

function isDecorationUnlocked(state, decoration) {
  const source = decoration.source || {};
  if (source.type === 'default') return true;
  if (source.type === 'collection') {
    return (state.claimedCollectionSets || []).includes(source.id);
  }
  if (source.type === 'exhibitionCount') {
    return (state.exhibition || []).length >= (source.count || 0);
  }
  if (source.type === 'milestone') {
    return (state.unlockedMilestones || []).includes(source.id);
  }
  return false;
}

function getOwnedDecorations(state) {
  return Object.values(DECORATIONS || {}).filter((decoration) =>
    isDecorationUnlocked(state, decoration)
  );
}

function placeDecoration(state, slotIndex, decorationId) {
  const slot = Number(slotIndex);
  const slotCount = getDecorationSlots();
  if (!Number.isInteger(slot) || slot < 0 || slot >= slotCount) {
    return { state, message: '裝飾格不存在。' };
  }

  const decoration = DECORATIONS[decorationId];
  if (!decoration) return { state, message: '裝飾品不存在。' };
  if (!isDecorationUnlocked(state, decoration)) {
    return { state, message: '尚未解鎖此裝飾品。' };
  }

  const campLayout = normalizeCampLayout(state.campLayout)
    .map((id) => (id === decorationId ? null : id));
  campLayout[slot] = decorationId;

  return {
    state: Object.assign({}, state, { campLayout }),
    message: `${decoration.name} 已放入第 ${slot + 1} 格。`,
  };
}

function clearDecorationSlot(state, slotIndex) {
  const slot = Number(slotIndex);
  const slotCount = getDecorationSlots();
  if (!Number.isInteger(slot) || slot < 0 || slot >= slotCount) {
    return { state, message: '裝飾格不存在。' };
  }

  const campLayout = normalizeCampLayout(state.campLayout);
  campLayout[slot] = null;

  return {
    state: Object.assign({}, state, { campLayout }),
    message: `第 ${slot + 1} 格已清空。`,
  };
}

const decorationSystem = {
  normalizeCampLayout,
  getOwnedDecorations,
  placeDecoration,
  clearDecorationSlot,
};
