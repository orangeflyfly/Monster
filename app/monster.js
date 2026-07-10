// ── 怪物動畫位置管理器 ──────────────────────────────────────
// key: monsterId, value: { x: 0~85, y: 20~75, vx, vy, nextMoveMs }
const monsterPositions = {};

function getOrInitPosition(monsterId) {
  if (!monsterPositions[monsterId]) {
    monsterPositions[monsterId] = {
      x: 10 + Math.random() * 70,
      y: 25 + Math.random() * 45,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      direction: 'down',
      lastTickMs: TimeService.now(),
      nextMoveMs: TimeService.now() + 1200 + Math.random() * 1800,
    };
  }
  return monsterPositions[monsterId];
}

function tickMonsterPositions() {
  const now = TimeService.now();
  Object.keys(monsterPositions).forEach((id) => {
    const p = monsterPositions[id];
    const elapsedSeconds = Math.min(1, Math.max(0, (now - (p.lastTickMs || now)) / 1000));
    p.lastTickMs = now;

    if (now >= p.nextMoveMs) {
      p.vx += (Math.random() - 0.5) * 0.28;
      p.vy += (Math.random() - 0.5) * 0.28;

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 0.45) {
        p.vx = (p.vx / speed) * 0.45;
        p.vy = (p.vy / speed) * 0.45;
      }

      p.nextMoveMs = now + 1200 + Math.random() * 1800;
    }

    p.x += p.vx * elapsedSeconds * 5;
    p.y += p.vy * elapsedSeconds * 5;

    if (p.x < 5) { p.x = 5; p.vx = Math.abs(p.vx); }
    if (p.x > 85) { p.x = 85; p.vx = -Math.abs(p.vx); }
    if (p.y < 20) { p.y = 20; p.vy = Math.abs(p.vy); }
    if (p.y > 75) { p.y = 75; p.vy = -Math.abs(p.vy); }

    if (Math.abs(p.vx) > Math.abs(p.vy)) {
      p.direction = p.vx >= 0 ? 'right' : 'left';
    } else {
      p.direction = p.vy >= 0 ? 'down' : 'up';
    }
  });
}

function prunePositions(monsters) {
  const ids = new Set(monsters.map((m) => m.id));
  Object.keys(monsterPositions).forEach((id) => {
    if (!ids.has(id)) delete monsterPositions[id];
  });
}

function updateResourceDisplays() {
  document.querySelectorAll('[data-resource-key]').forEach((element) => {
    const key = element.dataset.resourceKey;
    const value = element.querySelector('[data-resource-value]');
    if (value) value.textContent = state.resources[key] || 0;
  });

  const campRank = S.getCampRank(state);
  const rankElement = document.querySelector('[data-camp-rank]');
  const scoreElement = document.querySelector('[data-camp-score]');
  if (rankElement) rankElement.textContent = `${campRank.rank} 級`;
  if (scoreElement) scoreElement.textContent = `${campRank.score} 分`;
}

function updateMapVisuals() {
  if (activeView !== 'camp') return;

  state.monsters
    .filter((monster) => monster.assignedMap === activeMap)
    .forEach((monster) => {
      const element = document.querySelector(`.map-monster[data-monster-id="${monster.id}"]`);
      if (!element) return;

      const position = getOrInitPosition(monster.id);
      const def = MONSTERS[monster.type];
      element.style.left = `${position.x}%`;
      element.style.top = `${position.y}%`;

      const image = element.querySelector('.map-monster-sprite');
      if (image && def.spriteBase) {
        const direction = position.direction || 'down';
        const frame = (Math.floor(TimeService.now() / 260) % 4) + 1;
        image.src = `${def.spriteBase}/walk_${direction}_${String(frame).padStart(2, '0')}.png`;
      }

      const interval = S.getWorkInterval(monster, activeMap, state);
      const progress = Math.min(100, ((monster.workProgressMs || 0) / interval) * 100);
      const progressFill = element.querySelector('.progress-fill');
      const timer = element.querySelector('.work-timer');
      if (progressFill) progressFill.style.width = `${progress}%`;
      if (timer) {
        timer.textContent = `${Math.max(0, Math.ceil((interval - (monster.workProgressMs || 0)) / 1000))}s`;
      }
    });
}
// ────────────────────────────────────────────────────────────
