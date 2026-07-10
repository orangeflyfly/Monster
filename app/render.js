function spawnFloatText(targetEl, text) {
  const floatEl = document.createElement('div');
  floatEl.className = 'float-text';
  floatEl.textContent = text;
  floatEl.style.left = '50%';
  floatEl.style.top = '0';
  floatEl.style.transform = 'translateX(-50%)';
  if (getComputedStyle(targetEl).position === 'static') {
    targetEl.style.position = 'relative';
  }
  targetEl.appendChild(floatEl);
  setTimeout(() => floatEl.remove(), 1200);
}

const RESOURCE_ICONS = {
  Food: '🌾',
  Wood: '🪵',
  Ore: '⛏️',
  Meat: '🥩',
  Fish: '🐟',
  Coins: '🪙',
};

const RESOURCE_KEYS = CONFIG.CORE_RESOURCE_KEYS;

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


function renderMonsterArt(def, className = '') {
  if (def && def.sprite) {
    return `<img class="monster-art ${className}" src="${def.sprite}" alt="${escapeHtml(def.name)}" loading="lazy">`;
  }
  return `<span class="${className}">${def ? def.icon : '?'}</span>`;
}


function renderMonsterWalkArt(def, position, className = '') {
  if (!def || !def.spriteBase) {
    return renderMonsterArt(def, className);
  }

  const direction = position && position.direction ? position.direction : 'down';
  const frame = (Math.floor(TimeService.now() / 260) % 4) + 1;
  const src = `${def.spriteBase}/walk_${direction}_${String(frame).padStart(2, '0')}.png`;
  return `<img class="monster-art ${className}" src="${src}" alt="${escapeHtml(def.name)}" loading="lazy">`;
}


function scheduleMessageClear() {
  if (messageTimer) {
    clearTimeout(messageTimer);
  }
  messageTimer = setTimeout(() => {
    message = '';
  }, 3500);
}


function showMessage(nextMessage) {
  message = nextMessage;
  if (nextMessage) {
    notifications.push({
      id: Date.now(),
      message: nextMessage,
      time: new Date().toLocaleTimeString(),
    });
    if (notifications.length > 20) notifications = notifications.slice(-20);
  }
  scheduleMessageClear();
}


function addFloatingText(text, resource) {
  const id = Date.now() + Math.random();
  floatingTexts.push({
    id,
    text,
    resource,
  });
  if (floatingTexts.length > 8) floatingTexts = floatingTexts.slice(-8);
  setTimeout(() => {
    floatingTexts = floatingTexts.filter((item) => item.id !== id);
  }, 900);
}


function renderEntry() {
  return `
    <div class="entry-screen">
      <h1>🏕️ 怪物工坊</h1>
      <p>建立你的怪物營地，開始冒險吧！</p>
      <input type="text" id="player-name" placeholder="你的名字"
        maxlength="12" value="${escapeHtml(state.playerName || '')}"
        style="text-align:center;" />
      <input type="text" id="camp-name" placeholder="營地名稱"
        maxlength="12" value="${escapeHtml(state.campName || '')}"
        style="text-align:center;" />
      <button type="button" data-action="start-game">開始冒險</button>
      ${state.playerName
        ? `<button type="button" data-action="continue-game"
            style="background:#f7f4f0;color:#555;font-size:0.85rem;">
            繼續 ${escapeHtml(state.playerName)} 的 ${escapeHtml(state.campName)}
          </button>`
        : ''
      }
    </div>
  `;
}


function renderResources() {
  const campRank = S.getCampRank(state);
  const regularResources = RESOURCE_KEYS.filter((resource) => resource !== 'Coins');
  const renderResourceItem = (key, extraStyle = '') => {
    const cap = CONFIG.resourceCaps[key];
    const ratio = cap ? (state.resources[key] || 0) / cap : 0;
    const nearCap = ratio >= 0.9;
    const style = `${nearCap ? 'border-color:#e65100;' : ''}${extraStyle}`;
    return `
    <div class="resource" data-resource-key="${key}" style="${style}">
      <span>${RESOURCE_ICONS[key] || ''}</span>
      <strong data-resource-value>${state.resources[key] || 0}</strong>
      ${nearCap ? '<span style="font-size:0.65rem;color:#e65100;">滿</span>' : ''}
    </div>
  `;
  };
  return `
    ${regularResources.map((resource) => renderResourceItem(resource)).join('')}
    ${renderResourceItem('Coins', 'border-color:#f0a500;background:#fffbf0;')}
    <div class="resource rank-resource">
      <span data-camp-rank>${campRank.rank} 級</span>
      <strong data-camp-score>${campRank.score} 分</strong>
    </div>
  `;
}


function renderOfflineModal() {
  if (!offlineEarnings) return '';

  const duration = TimeService.formatDuration(offlineEarnings.ms);
  const resources = offlineEarnings.resources || {};
  const hasEarnings = Object.values(resources).some((v) => v > 0);

  return `
    <div class="modal-overlay" style="z-index:200;">
      <div class="modal-sheet" style="max-height:70vh;">
        <div class="modal-header">
          <h2>🌙 離線收益</h2>
          <button class="modal-close" type="button" data-action="close-offline-modal">收下</button>
        </div>
        <p style="font-size:0.85rem;color:#888;margin-bottom:12px;">
          你離開了 ${duration}，怪物們一直認真工作！
        </p>
        ${hasEarnings
          ? `<div class="stack">
              ${Object.entries(resources)
                .filter(([, v]) => v > 0)
                .map(([resource, amount]) => `
                  <div class="row-item">
                    <div>
                      <strong>${RESOURCE_ICONS[resource] || resource} ${RESOURCES[resource]?.name || resource}</strong>
                    </div>
                    <span style="font-weight:700;color:#2d6a4f;">+${amount}</span>
                  </div>
                `).join('')}
            </div>`
          : '<p style="color:#aaa;font-size:0.85rem;">這段時間沒有怪物在工作。</p>'
        }
      </div>
    </div>
  `;
}


function renderGame() {
  if (!state.started) {
    app.innerHTML = renderEntry();
    return;
  }

  app.innerHTML = `
    <main class="app-shell">
      <header class="top-bar">
        <div>
          <p class="eyebrow">${escapeHtml(state.playerName)} 的營地</p>
          <h1>${escapeHtml(state.campName) || '怪物工坊'}</h1>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="ghost-button" type="button" data-action="open-backpack">🎒</button>
          <button class="ghost-button" type="button" data-action="open-vault">
            📦 ${state.monsters.length}/${S.getVaultLimit(state)}
          </button>
        </div>
      </header>

      <section class="resource-strip" aria-label="Resources">${renderResources()}</section>
      ${renderTutorial()}
      <div class="layout-grid ${activeView === 'camp' ? 'camp-layout' : ''}">
        ${activeView === 'camp' ? renderCamp() : activeView === 'arena' ? renderArena() : renderWild()}
      </div>
      ${renderVaultModal()}
      ${renderFeatureModal()}
      ${renderBackpackModal()}
      ${renderOfflineModal()}
    </main>
  `;
}


function render() {
  renderGame();
}

