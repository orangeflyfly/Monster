function renderWildTabs() {
  const tabs = [
    { key: 'capture', label: '🌲 捕捉' },
    { key: 'expedition', label: '🗺️ 遠征' },
  ];

  return `
    <div style="display:flex;gap:8px;margin-bottom:12px;">
      ${tabs.map((tab) => `
        <button type="button" data-action="wild-tab" data-tab="${tab.key}" style="
          flex:1;padding:9px 10px;border-radius:8px;font-size:0.85rem;
          background:${wildTab === tab.key ? '#2d6a4f' : '#f7f4f0'};
          color:${wildTab === tab.key ? '#fff' : '#555'};
          border:1px solid ${wildTab === tab.key ? '#2d6a4f' : '#e0d8d0'};
        ">
          ${tab.label}
        </button>
      `).join('')}
    </div>
  `;
}


function renderWildCapture() {
  const wildIndex = Number.isFinite(Number(state.wildResourceIndex))
    ? Math.max(0, Math.min(100, Math.floor(Number(state.wildResourceIndex))))
    : 100;
  const wildIndexColor = wildIndex >= 70 ? '#2d6a4f' : wildIndex >= 40 ? '#f0a500' : '#c0392b';
  const wildIndexText = wildIndex < 40
    ? '野外的蹤跡有點稀少，稍後再來看看。'
    : wildIndex < 70
      ? '野外活動略微減少，搜尋可能偶爾落空。'
      : '野外生態穩定，容易發現怪物蹤跡。';
  const encounterHtml = encounter
    ? `
      <div class="encounter">
        <div class="encounter-icon">${renderMonsterArt(encounter, 'encounter-sprite')}</div>
        <strong>${encounter.name}</strong>
        <span>專長：${encounter.trait}</span>
        <span>捕捉成功率：${Math.round(encounter.captureRate * 100)}%</span>
      </div>
    `
    : '<p>搜尋野外，尋找可捕捉的怪物。</p>';
  const trapCount = (state.inventory && state.inventory['basic_trap']) || 0;
  const hasTrapUnlock = S.hasUnlock(state, 'trap');

  return `
    <div class="wild-layout">
      <div class="wild-scene">${encounterHtml}</div>
      <div class="stack">
        <div style="padding:8px 0;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
            <span style="font-size:0.78rem;font-weight:700;color:#555;">野外資源指數</span>
            <span style="font-size:0.78rem;font-weight:700;color:${wildIndexColor};">${wildIndex}/100</span>
          </div>
          <div style="height:7px;background:#f0ebe5;border-radius:999px;overflow:hidden;margin-bottom:5px;">
            <div style="width:${wildIndex}%;height:100%;background:${wildIndexColor};border-radius:999px;"></div>
          </div>
          <p style="font-size:0.72rem;color:#888;">${wildIndexText}</p>
        </div>
        ${hasTrapUnlock ? `
          <div style="font-size:0.82rem;color:#888;padding:4px 0;">
            🪤 陷阱：${trapCount} 個
            ${trapCount === 0 ? '<span style="color:#e74c3c;">（不足，請去市場購買）</span>' : ''}
          </div>
        ` : ''}
        <button type="button" data-action="find-encounter" ${buttonDisabled(!state.research.capture)}>搜尋怪物</button>
        <button type="button" data-action="capture" ${buttonDisabled(!S.canAttemptCapture(state) || !encounter)}>嘗試捕捉</button>
      </div>
    </div>
  `;
}


function renderWild() {
  return `
    <section class="panel wide wild-panel">
      <h2>野外</h2>
      ${renderWildTabs()}
      ${wildTab === 'expedition' ? renderExpedition() : renderWildCapture()}
      <div style="margin-top:12px;">
        <button type="button" data-action="view-camp" style="width:100%;">返回營地</button>
      </div>
    </section>
  `;
}


