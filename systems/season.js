const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];
const SEASON_INFO = {
  spring: { type: 'spring', name: '春季', icon: '🌸' },
  summer: { type: 'summer', name: '夏季', icon: '☀️' },
  autumn: { type: 'autumn', name: '秋季', icon: '🍂' },
  winter: { type: 'winter', name: '冬季', icon: '❄️' },
};

function normalizeSeason(season) {
  const raw = season && typeof season === 'object' ? season : {};
  const type = SEASON_INFO[raw.type] ? raw.type : 'spring';
  return {
    type,
    seasonDayCount: Number.isFinite(Number(raw.seasonDayCount))
      ? Math.max(0, Math.floor(Number(raw.seasonDayCount)))
      : 0,
    lastCheckedDate: typeof raw.lastCheckedDate === 'string' ? raw.lastCheckedDate : '',
  };
}

function getNextSeason(type) {
  const index = SEASON_ORDER.indexOf(type);
  return SEASON_ORDER[(index + 1 + SEASON_ORDER.length) % SEASON_ORDER.length];
}

function refreshSeason(state) {
  const today = new Date().toDateString();
  const current = normalizeSeason(state.season);
  if (!current.lastCheckedDate) {
    return Object.assign({}, state, {
      season: Object.assign({}, current, { lastCheckedDate: today }),
    });
  }

  if (current.lastCheckedDate === today) {
    return Object.assign({}, state, { season: current });
  }

  const daysPerSeason = CONFIG.seasonDays || 7;
  let nextType = current.type;
  let nextDayCount = current.seasonDayCount + 1;
  if (nextDayCount >= daysPerSeason) {
    nextType = getNextSeason(nextType);
    nextDayCount = 0;
  }

  return Object.assign({}, state, {
    season: {
      type: nextType,
      seasonDayCount: nextDayCount,
      lastCheckedDate: today,
    },
  });
}

function getSeasonInfo(type) {
  return SEASON_INFO[type] || SEASON_INFO.spring;
}

const seasonSystem = {
  refreshSeason,
  normalizeSeason,
  getSeasonInfo,
};
