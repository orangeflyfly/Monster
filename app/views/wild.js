function renderWild() {
  const wildIndex = Number.isFinite(Number(state.wildResourceIndex))
    ? Math.max(0, Math.min(100, Math.floor(Number(state.wildResourceIndex))))
    : 100;
  const wildIndexColor = wildIndex >= 70 ? '#2d6a4f' : wildIndex >= 40 ? '#f0a500' : '#c0392b';
  const wildIndexText = wildIndex < 40
    ? '野外的蹤跡有點稀少，稍後再來看看。'
    : wildIndex < 70
      ? '野外活動略微減少，搜尋可能偶爾落空。'
      : '野外生態穩定，容易發現怪物蹤跡。';
  const captureRateRange = encounter ? S.getCaptureRateRange(state, encounter) : null;
  const encounterHtml = encounter
    ? `
      <div class="encounter">
        <div class="encounter-icon">${renderMonsterArt(encounter, 'encounter-sprite')}</div>
        <strong>${encounter.name}</strong>
        <span>專長：${encounter.trait}</span>
        <span>捕捉成功率：約 ${Math.round(captureRateRange.min * 100)}%–${Math.round(captureRateRange.max * 100)}%（依對方天賦而定${captureRateRange.usingEnhancedTrap ? '，已含強化陷阱加成' : ''}）</span>
      </div>
    `
    : '<p>搜尋野外，尋找可捕捉的怪物。</p>';
  const trapCount = (state.inventory && state.inventory['basic_trap']) || 0;
  const enhancedTrapCount = (state.inventory && state.inventory['enhanced_trap']) || 0;
  const hasTrapUnlock = S.hasUnlock(state, 'trap');

  return `
    <section class="panel wide wild-panel">
      <h2>野外捕捉</h2>
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
              🪤 一般陷阱：${trapCount} 個　✨ 強化陷阱：${enhancedTrapCount} 個
              ${enhancedTrapCount > 0 ? '<span style="color:#2d6a4f;">（將優先使用強化陷阱）</span>' : ''}
              ${trapCount === 0 && enhancedTrapCount === 0 ? '<span style="color:#e74c3c;">（不足，請去市場購買）</span>' : ''}
            </div>
          ` : ''}
          <button type="button" data-action="find-encounter" ${buttonDisabled(!state.research.capture)}>搜尋怪物</button>
          <button type="button" data-action="capture" ${buttonDisabled(!S.canAttemptCapture(state) || !encounter)}>嘗試捕捉</button>
          <button type="button" data-action="view-camp">返回營地</button>
        </div>
      </div>
    </section>
  `;
}


