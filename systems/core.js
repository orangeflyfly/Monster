const TimeService = {
  now() {
    return Date.now();
  },

  getOfflineMs(lastSavedAt) {
    const elapsed = TimeService.now() - lastSavedAt;
    return Math.min(Math.max(elapsed, 0), CONFIG.maxOfflineMs);
  },

  formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}小時${minutes}分`;
    if (minutes > 0) return `${minutes}分鐘`;
    return '不到1分鐘';
  },
};

function getResourceCap(resource) {
  return CONFIG.resourceCaps[resource] || 9999;
}

function clampResource(resource, amount) {
  const value = Number(amount);
  return Math.min(
    Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0,
    getResourceCap(resource)
  );
}

function addResourceToResources(resources, resource, amount) {
  const next = Object.assign({}, resources);
  next[resource] = clampResource(resource, (next[resource] || 0) + amount);
  return next;
}

function addResourcesToResources(resources, gains) {
  return Object.entries(gains || {}).reduce(
    (next, [resource, amount]) => addResourceToResources(next, resource, amount),
    Object.assign({}, resources)
  );
}

function canAfford(resources, cost) {
  return Object.keys(cost || {}).every((resource) => (resources[resource] || 0) >= cost[resource]);
}

function spendResources(resources, cost) {
  if (!canAfford(resources, cost || {})) {
    return resources;
  }

  const next = Object.assign({}, resources);
  Object.keys(cost || {}).forEach((resource) => {
    next[resource] = Math.max(0, (next[resource] || 0) - cost[resource]);
  });
  return next;
}

function formatCost(cost) {
  return Object.keys(cost || {})
    .map((resource) => `${RESOURCES[resource]?.name || resource} ${cost[resource]}`)
    .join('、');
}

function getVaultLimit(state) {
  return state.vaultSlots || 30;
}

function getMaxVaultLimit() {
  const tiers = CONFIG.vaultUpgradeCosts || [];
  if (tiers.length === 0) return 30;
  return tiers[tiers.length - 1].slots;
}

const core = {
  TimeService,
  getResourceCap,
  clampResource,
  addResourceToResources,
  addResourcesToResources,
  canAfford,
  spendResources,
  formatCost,
  getVaultLimit,
  getMaxVaultLimit,
};
