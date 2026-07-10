(function () {
  const {
    CONFIG,
    RESOURCES,
    RESOURCE_KEYS,
    MAPS,
    MAP_IDS,
    MONSTERS,
    BUILDINGS,
    RESEARCH,
  } = window.MW_DATA;

  const S = window.MW_SYSTEMS;
  const app = document.getElementById('app');

  let loaded = S.loadGame();
  const offline = S.applyOfflineProduction(loaded, Date.now());
  let state = offline.state;
  let activeView = 'camp';
  let activeMap = 'forest';
  let selectedMonsterId = '';
  let encounter = null;
  let message = state.playerName ? formatOffline(offline.offlineMs) : '請輸入玩家名稱，開始建立營地。';
  let messageTimer = null;

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
        nextMoveMs: Date.now() + 2000 + Math.random() * 2000,
      };
    }
    return monsterPositions[monsterId];
  }

  function tickMonsterPositions() {
    const now = Date.now();
    Object.keys(monsterPositions).forEach((id) => {
      const p = monsterPositions[id];
      if (now < p.nextMoveMs) return;

      p.vx += (Math.random() - 0.5) * 0.3;
      p.vy += (Math.random() - 0.5) * 0.3;

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 0.5) {
        p.vx = (p.vx / speed) * 0.5;
        p.vy = (p.vy / speed) * 0.5;
      }

      p.x += p.vx * 8;
      p.y += p.vy * 8;

      if (p.x < 5) { p.x = 5; p.vx = Math.abs(p.vx); }
      if (p.x > 85) { p.x = 85; p.vx = -Math.abs(p.vx); }
      if (p.y < 20) { p.y = 20; p.vy = Math.abs(p.vy); }
      if (p.y > 75) { p.y = 75; p.vy = -Math.abs(p.vy); }

      p.nextMoveMs = now + 2000 + Math.random() * 2000;
    });
  }

  function prunePositions(monsters) {
    const ids = new Set(monsters.map((m) => m.id));
    Object.keys(monsterPositions).forEach((id) => {
      if (!ids.has(id)) delete monsterPositions[id];
    });
  }
  // ────────────────────────────────────────────────────────────

  function formatOffline(ms) {
    if (ms < 1000) {
      return '目前沒有離線收益。';
    }

    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const restMinutes = minutes % 60;

    if (hours > 0) {
      return `已結算離線收益：${hours} 小時 ${restMinutes} 分`;
    }

    return `已結算離線收益：${Math.max(1, restMinutes)} 分`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function buttonDisabled(condition) {
    return condition ? 'disabled' : '';
  }

  function scheduleMessageClear() {
    if (messageTimer) {
      clearTimeout(messageTimer);
    }
    messageTimer = setTimeout(() => {
      message = '';
      render();
    }, 3500);
  }

  function showMessage(nextMessage) {
    message = nextMessage;
    scheduleMessageClear();
  }

  function renderEntry() {
    app.innerHTML = `
      <main class="entry-screen">
        <form class="entry-panel" id="entry-form">
          <p class="eyebrow">Monster Workshop</p>
          <h1>建立你的怪物工坊</h1>
          <label for="player-name">玩家名稱</label>
          <input id="player-name" maxlength="16" placeholder="輸入名稱" value="${escapeHtml(state.playerName)}" />
          <button type="submit">進入營地</button>
          <p class="status-line">${escapeHtml(message)}</p>
        </form>
      </main>
    `;

    document.getElementById('entry-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const name = document.getElementById('player-name').value.trim();
      if (!name) {
        showMessage('請先輸入玩家名稱。');
        render();
        return;
      }

      state = Object.assign({}, state, { playerName: name });
      showMessage(`${name} 抵達營地。先伐木與挖礦，建造研究台。`);
      S.saveGame(state);
      render();
    });
  }

  function renderResources() {
    return RESOURCE_KEYS.map((resource) => `
      <div class="resource">
        <span>${RESOURCES[resource].name}</span>
        <strong>${state.resources[resource] || 0}</strong>
      </div>
    `).join('');
  }

  function renderCampTools() {
    const canBuildTable = S.canAfford(state.resources, BUILDINGS.researchTable.cost);
    const canResearchCapture = state.buildings.researchTable && S.canAfford(state.resources, RESEARCH.capture.cost);

    return `
      <section class="panel">
        <h2>手動採集</h2>
        <div class="button-grid">
          <button type="button" data-action="gather" data-resource="Wood">伐木 +1 木材</button>
          <button type="button" data-action="gather" data-resource="Ore">挖礦 +1 礦石</button>
        </div>
      </section>

      <section class="panel">
        <h2>研究台</h2>
        <div class="stack">
          <div class="row-item">
            <div>
              <strong>${BUILDINGS.researchTable.name}</strong>
              <span>${BUILDINGS.researchTable.description}</span>
              <span>成本：${S.formatCost(BUILDINGS.researchTable.cost)}</span>
            </div>
            <button type="button" data-action="build-table" ${buttonDisabled(state.buildings.researchTable || !canBuildTable)}>
              ${state.buildings.researchTable ? '已建造' : '建造'}
            </button>
          </div>
          <div class="row-item">
            <div>
              <strong>${RESEARCH.capture.name}</strong>
              <span>${RESEARCH.capture.description}</span>
              <span>成本：${S.formatCost(RESEARCH.capture.cost)}</span>
            </div>
            <button type="button" data-action="research-capture" ${buttonDisabled(state.research.capture || !canResearchCapture)}>
              ${state.research.capture ? '已完成' : '研究'}
            </button>
          </div>
        </div>
      </section>

      <section class="panel">
        <h2>派工狀態</h2>
        <div class="capture-box">
          <p>倉庫 ${state.monsters.length}/${CONFIG.maxMonsters}</p>
          <p>捕捉研究：${state.research.capture ? '已完成' : '未完成'}</p>
          <button type="button" data-action="view-wild" ${buttonDisabled(!state.research.capture)}>前往野外</button>
        </div>
      </section>
    `;
  }

  function renderMonsterStorage() {
    const cards = state.monsters.length === 0
      ? '<p class="empty-state">尚未捕獲怪物。</p>'
      : state.monsters.map((monster) => {
          const def = MONSTERS[monster.type];
          const selected = monster.id === selectedMonsterId ? 'selected' : '';
          const statusClass = monster.assignedMap ? 'working' : 'idle';
          const statusText = monster.assignedMap ? `工作中：${MAPS[monster.assignedMap].name}` : '待命中';
          const action = monster.assignedMap
            ? `<button type="button" data-action="recall" data-id="${monster.id}">撤回</button>`
            : `<button type="button" data-action="release" data-id="${monster.id}">野放</button>`;

          return `
            <article class="monster-card ${selected}">
              <button class="monster-main" type="button" data-action="select-monster" data-id="${monster.id}">
                <strong>${def.icon} ${def.name}</strong>
                <span>專長：${def.trait}</span>
                <span class="monster-status ${statusClass}">${statusText}</span>
              </button>
              <div class="mini-actions">${action}</div>
            </article>
          `;
        }).join('');

    return `
      <section class="panel wide">
        <h2>怪物倉庫</h2>
        <div class="monster-grid">${cards}</div>
      </section>
    `;
  }

  function renderMapTabs() {
    return MAP_IDS.map((mapId) => `
      <button class="${activeMap === mapId ? 'active' : ''}" type="button" data-action="switch-map" data-map="${mapId}">
        ${MAPS[mapId].name}
      </button>
    `).join('');
  }

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
      const intervalMs = S.getWorkInterval(m, mapId);
      return sum + (60000 / intervalMs);
    }, 0);
    return Math.round(totalPerMin * 10) / 10;
  }

  function renderProductionMap() {
    const map = MAPS[activeMap];
    const assigned = state.monsters.filter((m) => m.assignedMap === activeMap);
    const isFull = S.getAssignedCount(state.monsters, activeMap) >= state.maps[activeMap].unlockedSlots;
    const eligibleMonsters = state.monsters.filter((m) =>
      !m.assignedMap && MONSTERS[m.type].specialty === activeMap
    );

    let assignmentControls = '<p class="assign-message">目前沒有可派遣的怪物</p>';
    if (isFull) {
      assignmentControls = '<button class="assign-map-button" type="button" disabled>工作位已滿</button>';
    } else if (eligibleMonsters.length > 0) {
      assignmentControls = `
        <div class="assign-list">
          ${eligibleMonsters.map((m) => `
            <button class="assign-map-button" type="button" data-action="assign-monster" data-id="${m.id}" data-map="${activeMap}">
              派遣 ${MONSTERS[m.type].name} 到 ${map.name}
            </button>
          `).join('')}
        </div>
      `;
    }

    const ppm = calcMapPpm(activeMap);
    const slotCount = S.getAssignedCount(state.monsters, activeMap);
    const maxSlots = state.maps[activeMap].unlockedSlots;

    const workers = assigned.map((m) => {
      const def = MONSTERS[m.type];
      const pos = getOrInitPosition(m.id);
      const interval = S.getWorkInterval(m, activeMap);
      const progress = Math.min(100, ((m.workProgressMs || 0) / interval) * 100);
      return `
        <div class="map-monster" style="left:${pos.x}%;top:${pos.y}%;" title="${def.name}">
          <span>${def.icon}</span>
          <div class="tiny-progress"><div class="progress-fill" style="width:${progress}%"></div></div>
        </div>
      `;
    }).join('');

    return `
      <section class="panel wide">
        <h2>生產地圖</h2>
        <div class="map-tabs">${renderMapTabs()}</div>
        <article class="production-map ${map.themeClass || ''}">
          ${renderDecorations(map)}
          <div class="map-info-bar">
            <div>
              <strong>${map.name}</strong>
              <span>生產：${RESOURCES[map.resource].name}</span>
            </div>
            <span>工作位：${slotCount} / ${maxSlots}</span>
            <span>每分鐘產量：${ppm > 0 ? ppm : '—'}</span>
          </div>
          <div class="map-assign-area">${assignmentControls}</div>
          ${workers}
          ${assigned.length === 0 ? '<p class="map-empty" style="position:relative;z-index:2;padding:8px 14px;">符合專長且待命中的怪物可在下方派遣。</p>' : ''}
        </article>
      </section>
    `;
  }

  function renderCamp() {
    return `
      ${renderCampTools()}
      ${renderMonsterStorage()}
      ${renderProductionMap()}
    `;
  }

  function renderWild() {
    const encounterHtml = encounter
      ? `
        <div class="encounter">
          <div class="encounter-icon">${encounter.icon}</div>
          <strong>${encounter.name}</strong>
          <span>專長：${encounter.trait}</span>
          <span>捕捉成功率：${Math.round(encounter.captureRate * 100)}%</span>
        </div>
      `
      : '<p>搜尋野外，尋找可捕捉的怪物。</p>';

    return `
      <section class="panel wide wild-panel">
        <h2>野外捕捉</h2>
        <div class="wild-layout">
          <div class="wild-scene">${encounterHtml}</div>
          <div class="stack">
            <button type="button" data-action="find-encounter" ${buttonDisabled(!state.research.capture)}>搜尋怪物</button>
            <button type="button" data-action="capture" ${buttonDisabled(!S.canAttemptCapture(state) || !encounter)}>嘗試捕捉</button>
            <button type="button" data-action="view-camp">返回營地</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderGame() {
    app.innerHTML = `
      <main class="app-shell">
        <header class="top-bar">
          <div>
            <p class="eyebrow">${escapeHtml(state.playerName)} 的 ${escapeHtml(state.campName)}</p>
            <h1>Monster Workshop</h1>
          </div>
          <button class="ghost-button" type="button" data-action="reset">重置</button>
        </header>

        <section class="resource-strip" aria-label="Resources">${renderResources()}</section>
        <p class="status-line">${escapeHtml(message)}</p>

        <nav class="view-tabs" aria-label="主要畫面">
          <button class="${activeView === 'camp' ? 'active' : ''}" type="button" data-action="view-camp">營地</button>
          <button class="${activeView === 'wild' ? 'active' : ''}" type="button" data-action="view-wild" ${buttonDisabled(!state.research.capture)}>野外捕捉</button>
        </nav>

        <div class="layout-grid">${activeView === 'camp' ? renderCamp() : renderWild()}</div>
      </main>
    `;
  }

  function render() {
    if (!state.playerName) {
      renderEntry();
      return;
    }

    renderGame();
  }

  function handleAction(target) {
    const action = target.dataset.action;
    if (!action) {
      return;
    }

    if (action === 'gather') {
      const result = S.gatherResource(state, target.dataset.resource);
      state = result.state;
      showMessage(`取得 ${RESOURCES[target.dataset.resource].name} +${result.amount}`);
      render();
      return;
    }

    if (action === 'build-table') {
      const result = S.buildStructure(state, 'researchTable');
      state = result.state;
      showMessage(result.message);
      render();
      return;
    }

    if (action === 'research-capture') {
      const result = S.completeResearch(state, 'capture');
      state = result.state;
      showMessage(result.message);
      render();
      return;
    }

    if (action === 'view-wild') {
      if (!state.research.capture) {
        showMessage('需要先完成捕捉研究。');
      } else {
        activeView = 'wild';
      }
      render();
      return;
    }

    if (action === 'view-camp') {
      activeView = 'camp';
      render();
      return;
    }

    if (action === 'find-encounter') {
      encounter = S.getWildEncounter();
      showMessage(`野外發現${encounter.name}，捕捉率 ${Math.round(encounter.captureRate * 100)}%。`);
      render();
      return;
    }

    if (action === 'capture') {
      const targetMonster = encounter || S.getWildEncounter();
      const result = S.attemptCapture(state, targetMonster.id);
      state = result.state;
      encounter = result.caught ? null : targetMonster;
      showMessage(result.message);
      render();
      return;
    }

    if (action === 'select-monster') {
      selectedMonsterId = target.dataset.id;
      const monster = state.monsters.find((item) => item.id === selectedMonsterId);
      showMessage(monster && monster.assignedMap ? '這隻怪物工作中，只能撤回。' : '已選取待命怪物。');
      render();
      return;
    }

    if (action === 'recall') {
      const monster = state.monsters.find((item) => item.id === target.dataset.id);
      if (!monster || !monster.assignedMap) {
        showMessage('只有工作中的怪物可以撤回。');
        render();
        return;
      }
      state = S.unassignMonster(state, target.dataset.id);
      showMessage('怪物已撤回倉庫。');
      render();
      return;
    }

    if (action === 'release') {
      const monster = state.monsters.find((item) => item.id === target.dataset.id);
      if (monster && monster.assignedMap) {
        showMessage('工作中的怪物必須先撤回，才能野放。');
        render();
        return;
      }
      state = S.releaseMonster(state, target.dataset.id);
      if (selectedMonsterId === target.dataset.id) {
        selectedMonsterId = '';
      }
      showMessage(`${monster ? MONSTERS[monster.type].name : '怪物'}已野放。`);
      render();
      return;
    }

    if (action === 'switch-map') {
      activeMap = target.dataset.map;
      render();
      return;
    }

    if (action === 'reset') {
      state = S.resetGame();
      activeView = 'camp';
      activeMap = 'forest';
      selectedMonsterId = '';
      encounter = null;
      showMessage('已重置營地。');
      render();
      return;
    }

    if (action === 'assign-monster') {
      const mapId = target.dataset.map;
      const monsterId = target.dataset.id;
      const monster = state.monsters.find((item) => item.id === monsterId);
      if (!mapId || !monster) {
        showMessage('目前沒有可派遣的怪物。');
        render();
        return;
      }

      if (MONSTERS[monster.type].specialty !== mapId || monster.assignedMap) {
        showMessage('只能派遣待命且專長符合該區域的怪物。');
        render();
        return;
      }

      if (!S.canAssignMonster(state, monsterId, mapId)) {
        showMessage(`${MAPS[mapId].name}工作位已滿。`);
        render();
        return;
      }

      state = S.assignMonster(state, monsterId, mapId);
      selectedMonsterId = monsterId;
      showMessage(`怪物已派往${MAPS[mapId].name}。`);
      render();
    }
  }

  app.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (target) {
      handleAction(target);
    }
  });

  setInterval(() => {
    if (!state.playerName) {
      return;
    }

    state = S.processWork(state, CONFIG.tickMs);
    tickMonsterPositions();
    prunePositions(state.monsters);
    render();
  }, CONFIG.tickMs);

  setInterval(() => {
    if (state.playerName) {
      state = S.saveGame(state);
    }
  }, CONFIG.autosaveMs);

  window.addEventListener('beforeunload', () => {
    if (state.playerName) {
      S.saveGame(state);
    }
  });

  render();
  if (state.playerName && message) {
    scheduleMessageClear();
  }
}());
