function renderDecorations(map) {
  const decos = map.decorations || [];
  const positions = [
    { left: '8%', top: '60%' },
    { left: '20%', top: '40%' },
    { left: '38%', top: '65%' },
    { left: '60%', top: '38%' },
    { left: '78%', top: '58%' },
  ];
  return `
    <div class="map-decorations" aria-hidden="true">
      ${decos.map((emoji, i) => {
        const pos = positions[i] || { left: `${15 + i * 18}%`, top: '55%' };
        return `<span class="map-deco-item" style="left:${pos.left};top:${pos.top}">${emoji}</span>`;
      }).join('')}
    </div>
  `;
}

function calcMapPpm(mapId) {
  const assigned = state.monsters.filter((m) => m.assignedMap === mapId);
  if (assigned.length === 0) return 0;
  const totalPerMin = assigned.reduce((sum, m) => {
    const intervalMs = S.getWorkInterval(m, mapId, state);
    return sum + (60000 / intervalMs);
  }, 0);
  return Math.round(totalPerMin * 10) / 10;
}
