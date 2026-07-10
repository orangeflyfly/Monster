function getWeatherBonus(type, mapId) {
  const weather = WEATHER_TYPES[type] || WEATHER_TYPES.sunny;
  return typeof weather.getBonus === 'function' ? weather.getBonus(mapId) : 0;
}

function getActiveWeather(state, mapId, now = TimeService.now()) {
  const weather = state.maps?.[mapId]?.weather;
  if (!weather || !weather.type || !WEATHER_TYPES[weather.type]) return null;
  if (!Number.isFinite(Number(weather.expiresAt)) || Number(weather.expiresAt) <= now) return null;
  return weather;
}

function getSeasonWeatherWeights(seasonType) {
  const weights = {
    spring: { sunny: 72, rainy: 16, windy: 8, drought: 4 },
    summer: { sunny: 82, rainy: 6, windy: 4, drought: 8 },
    autumn: { sunny: 74, rainy: 8, windy: 14, drought: 4 },
    winter: { sunny: 68, rainy: 4, windy: 20, drought: 8 },
  };
  return weights[seasonType] || weights.spring;
}

function rollWeightedWeather(weights, mapId) {
  const entries = Object.entries(weights).filter(([type]) =>
    type === 'sunny' || getWeatherBonus(type, mapId) !== 0
  );
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [type, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return 'sunny';
}

function rollWeatherForMap(state, mapId) {
  const maps = Object.assign({}, state.maps || {});
  const mapState = Object.assign({}, maps[mapId] || {});
  const seasonType = state.season?.type || 'spring';
  const type = rollWeightedWeather(getSeasonWeatherWeights(seasonType), mapId);
  if (type === 'sunny') {
    maps[mapId] = Object.assign({}, mapState, { weather: null });
    return Object.assign({}, state, { maps });
  }

  const duration = (4 + Math.floor(Math.random() * 5)) * 60 * 60 * 1000;
  maps[mapId] = Object.assign({}, mapState, {
    weather: {
      type,
      bonus: getWeatherBonus(type, mapId),
      expiresAt: TimeService.now() + duration,
    },
  });

  return Object.assign({}, state, { maps });
}

function clearExpiredWeather(state, now = TimeService.now()) {
  let changed = false;
  const maps = {};
  Object.keys(MAPS).forEach((mapId) => {
    const mapState = state.maps?.[mapId] || {};
    const weather = mapState.weather;
    if (weather && Number(weather.expiresAt) <= now) {
      maps[mapId] = Object.assign({}, mapState, { weather: null });
      changed = true;
    } else {
      maps[mapId] = mapState;
    }
  });
  return changed ? Object.assign({}, state, { maps }) : state;
}

function refreshWeatherEvents(state) {
  const today = new Date().toDateString();
  let nextState = clearExpiredWeather(state);
  if (nextState.weatherDate === today) {
    return nextState;
  }

  nextState = Object.assign({}, nextState, { weatherDate: today });
  Object.keys(MAPS).forEach((mapId) => {
    nextState = rollWeatherForMap(nextState, mapId);
  });
  return nextState;
}

function formatWeatherEffect(weather) {
  if (!weather || !weather.bonus) return '';
  const sign = weather.bonus > 0 ? '+' : '';
  return `產量 ${sign}${Math.round(weather.bonus * 100)}%`;
}

const weatherSystem = {
  getWeatherBonus,
  getActiveWeather,
  rollWeatherForMap,
  clearExpiredWeather,
  refreshWeatherEvents,
  formatWeatherEffect,
};
