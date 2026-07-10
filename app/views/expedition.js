function renderExpedition() {
  const rank = S.getCampRank(state);
  const rankOrder = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
  const currentRankIdx = rankOrder.indexOf(rank.rank);
  const now = TimeService.now();
  const activeExpeditions = (state.expeditions || []).filter((e) => !e.collected);

  return `
    <div class="panel">
      <h2>🗺️ 自動遠征</h2>
      <p style="font-size:0.78rem;color:#888;margin-bottom:8px;">
        派遣怪物隊伍出發探索，回來後領取獎勵。
      </p>

      ${activeExpeditions.length > 0 ? `
        <div style="margin-bottom:12px;">
          <p style="font-size:0.75rem;font-weight:600;color:#888;margin-bottom:6px;">進行中</p>
          ${activeExpeditions.map((exp) => {
            const def = EXPEDITIONS[exp.id];
            if (!def) return '';
            if (exp.completed) {
              return `
                <div style="padding:10px;background:#f0f7f3;border:1px solid #2d6a4f;border-radius:8px;margin-bottom:6px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:0.85rem;">${def.icon} ${def.name} 已回來！</span>
                    <button type="button" data-action="collect-expedition" data-id="${exp.instanceId}"
                      style="padding:6px 14px;background:#2d6a4f;color:#fff;border-radius:6px;font-size:0.82rem;">
                      領取獎勵
                    </button>
                  </div>
                </div>
              `;
            }
            const remaining = Math.max(0, Math.ceil((exp.endMs - now) / 60000));
            const progress = Math.min(100, ((now - exp.startMs) / (exp.endMs - exp.startMs)) * 100);
            return `
              <div style="padding:10px;background:#f7f4f0;border:1px solid #e0d8d0;border-radius:8px;margin-bottom:6px;">
                <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:4px;">
                  <span>${def.icon} ${def.name}</span>
                  <span style="color:#aaa;">${remaining} 分鐘後回來</span>
                </div>
                <div style="background:#e0d8d0;border-radius:4px;height:4px;overflow:hidden;">
                  <div style="width:${progress}%;height:100%;background:#2d6a4f;border-radius:4px;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      <div class="stack">
        ${Object.values(EXPEDITIONS).map((exp) => {
          const check = S.canStartExpedition(state, exp.id);
          const reqRankIdx = rankOrder.indexOf(exp.unlockRank);
          const isLocked = currentRankIdx < reqRankIdx;
          const isActive = activeExpeditions.some((e) => e.id === exp.id && !e.collected);
          const durationHr = Math.ceil(exp.duration / 3600000);
          const rewardPreview = exp.rewards
            .filter((r) => r.chance >= 0.4)
            .map((r) => RESOURCES[r.key]?.name || r.key)
            .slice(0, 3).join('、');

          return `
            <div class="row-item" style="${isLocked ? 'opacity:0.5;' : ''}">
              <div>
                <strong>${exp.icon} ${exp.name}</strong>
                <span>${exp.desc}</span>
                <span style="font-size:0.72rem;color:#aaa;">
                  時間：${durationHr}小時 ｜
                  需要：${exp.requiredMonsters}隻${exp.requiredSpecialty ? MAPS[exp.requiredSpecialty]?.name + '專長' : '任意'}怪物
                </span>
                <span style="font-size:0.72rem;color:#aaa;">可能獲得：${rewardPreview}</span>
                ${isLocked ? `<span style="font-size:0.72rem;color:#e74c3c;">需要 ${exp.unlockRank} 級營地</span>` : ''}
                ${!check.can && !isLocked ? `<span style="font-size:0.72rem;color:#e74c3c;">${check.reason}</span>` : ''}
              </div>
              ${!isLocked && !isActive
                ? `<button type="button" data-action="open-expedition-select"
                    data-id="${exp.id}" ${check.can ? '' : 'disabled'}>
                    出發
                  </button>`
                : isActive
                  ? '<span style="font-size:0.75rem;color:#2d6a4f;">進行中</span>'
                  : ''
              }
            </div>
          `;
        }).join('')}
      </div>
    </div>

    ${renderExpeditionSelectModal()}
  `;
}

function renderExpeditionSelectModal() {
  if (!expeditionSelectId) return '';
  const exp = EXPEDITIONS[expeditionSelectId];
  if (!exp) return '';

  const check = S.canStartExpedition(state, expeditionSelectId);
  const availableMonsters = check.availableMonsters || [];

  return `
    <div class="modal-overlay">
      <div class="modal-sheet">
        <div class="modal-header">
          <h2>${exp.icon} ${exp.name} 選擇隊伍</h2>
          <button class="modal-close" type="button" data-action="close-expedition-select">關閉</button>
        </div>
        <p style="font-size:0.78rem;color:#888;margin-bottom:8px;">
          選擇 ${exp.requiredMonsters} 隻怪物組成隊伍出發。
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
          ${availableMonsters.map((m) => {
            const def = MONSTERS[m.type];
            return `
              <div class="vault-slot ${selectedExpeditionMonsters.includes(m.id) ? 'selected' : ''}"
                data-action="toggle-expedition-monster" data-id="${m.id}"
                style="width:90px;" id="exp-slot-${m.id}">
                <div class="vault-slot-icon">${def?.icon || '?'}</div>
                <div class="vault-slot-name">${def?.name || m.type}</div>
                <div class="vault-slot-status">天賦${m.talent}/10</div>
              </div>
            `;
          }).join('')}
        </div>
        <button type="button" data-action="confirm-expedition"
          data-id="${expeditionSelectId}"
          style="width:100%;padding:12px;background:#2d6a4f;color:#fff;border-radius:8px;font-size:0.88rem;">
          確認出發
        </button>
      </div>
    </div>
  `;
}
