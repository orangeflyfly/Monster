const WEATHER_TYPES = {
  sunny: {
    id: 'sunny',
    name: '晴朗',
    icon: '☀️',
    desc: '天氣穩定，產量不變。',
    getBonus: () => 0,
  },
  windy: {
    id: 'windy',
    name: '颳風',
    icon: '🌬️',
    desc: '強風吹亂作業節奏，該區域產量 -10%。',
    getBonus: () => -0.1,
  },
  rainy: {
    id: 'rainy',
    name: '下雨',
    icon: '🌧️',
    desc: '雨水滋養農田與湖泊，但其他區域作業變慢。',
    getBonus: (mapId) => (['farm', 'lake'].includes(mapId) ? 0.1 : -0.05),
  },
  drought: {
    id: 'drought',
    name: '乾旱',
    icon: '☀️',
    desc: '乾旱讓農田產量下降。',
    getBonus: (mapId) => (mapId === 'farm' ? -0.15 : 0),
  },
};
