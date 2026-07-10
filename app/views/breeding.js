function renderBreedingPanel() {
  if (!S.hasUnlock(state, 'breeding')) return '';

  const now = TimeService.now();
  const eggs = state.eggs || [];
  const totalSlots = Math.min(S.getAvailableBreedingSlots(state), CONFIG.breedingConfig.maxEggSlots);
  const availableMonsters = state.monsters.filter((m) =>
    S.canEnterActivity(state, m.id, 'breeding').can &&
    (!m.breedCooldown || m.breedCooldown <= now)
  );
  const geneLiquids = [
    'basic_gene_liquid',
    'talent_gene_liquid',
    'mutation_gene_liquid',
    'trait_gene_liquid',
  ]
    .filter((id) => ((state.inventory || {})[id] || 0) > 0);
  const hintCount = ((state.inventory || {}).breeding_hint || 0);

  return `
    <div class="panel">
      <h2>🥚 繁殖室</h2>

      ${eggs.length > 0 ? `
        <div style="margin-bottom:12px;">
          <p style="font-size:0.78rem;font-weight:600;color:#888;margin-bottom:6px;">
            孵化中 ${eggs.length}/${totalSlots}
          </p>
          ${eggs.map((egg) => {
            const remaining = Math.max(0, Math.ceil((egg.hatchMs - now) / 60000));
            const progress = Math.min(100, ((now - (egg.hatchMs - CONFIG.breedingConfig.eggHatchTime))
              / CONFIG.breedingConfig.eggHatchTime) * 100);
            const parentAName = MONSTERS[egg.parentAType]?.name || egg.parentAType;
            const parentBName = MONSTERS[egg.parentBType]?.name || egg.parentBType;
            return `
              <div style="padding:8px;background:#f7f4f0;border-radius:8px;margin-bottom:6px;">
                <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:4px;">
                  <span>🥚 ${parentAName} × ${parentBName}</span>
                  <span style="color:#aaa;">${remaining} 分鐘</span>
                </div>
                <div style="background:#e0d8d0;border-radius:4px;height:6px;overflow:hidden;">
                  <div style="width:${progress}%;height:100%;background:#2d6a4f;border-radius:4px;"></div>
                </div>
                ${egg.talentBonus > 0
                  ? '<p style="font-size:0.68rem;color:#9b59b6;margin-top:3px;">✨ 天賦基因液已使用</p>'
                  : ''
                }
                ${egg.traitBonus
                  ? '<p style="font-size:0.68rem;color:#2980b9;margin-top:3px;">✨ 詞條基因液已使用</p>'
                  : ''
                }
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      ${eggs.length < totalSlots ? `
        <div>
          <p style="font-size:0.78rem;font-weight:600;color:#888;margin-bottom:6px;">選擇配種怪物</p>
          ${availableMonsters.length < 2
            ? '<p style="font-size:0.78rem;color:#aaa;">需要至少2隻待命中且不在冷卻的怪物才能配種。</p>'
            : `
              <div style="margin-bottom:8px;">
                <p style="font-size:0.72rem;color:#aaa;margin-bottom:4px;">選擇父本</p>
                <select id="breed-parent-a" style="width:100%;padding:8px;border:1px solid #e0d8d0;border-radius:8px;font-size:0.82rem;">
                  <option value="">-- 選擇怪物 --</option>
                  ${availableMonsters.map((m) => `
                    <option value="${m.id}">
                      ${MONSTERS[m.type]?.name || m.type}（天賦${m.talent}/10）
                    </option>
                  `).join('')}
                </select>
              </div>
              <div style="margin-bottom:8px;">
                <p style="font-size:0.72rem;color:#aaa;margin-bottom:4px;">選擇母本</p>
                <select id="breed-parent-b" style="width:100%;padding:8px;border:1px solid #e0d8d0;border-radius:8px;font-size:0.82rem;">
                  <option value="">-- 選擇怪物 --</option>
                  ${availableMonsters.map((m) => `
                    <option value="${m.id}">
                      ${MONSTERS[m.type]?.name || m.type}（天賦${m.talent}/10）
                    </option>
                  `).join('')}
                </select>
              </div>
              ${geneLiquids.length > 0 ? `
                <div style="margin-bottom:8px;">
                  <p style="font-size:0.72rem;color:#aaa;margin-bottom:4px;">使用基因液（可多選）</p>
                  ${geneLiquids.map((id) => `
                    <label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;margin-bottom:4px;">
                      <input type="checkbox" data-gene="${id}">
                      ${RESOURCES[id]?.name || id}（剩 ${(state.inventory || {})[id]} 個）
                    </label>
                  `).join('')}
                </div>
              ` : ''}
              <button type="button" data-action="start-breeding" style="
                width:100%;padding:12px;background:#2d6a4f;
                color:#fff;border-radius:8px;font-size:0.88rem;font-weight:600;
              ">開始配種</button>
            `
          }
        </div>
      ` : `
        <p style="font-size:0.78rem;color:#aaa;">培養槽已滿，請等待孵化完成。</p>
      `}

      ${hintCount > 0 ? `
        <button type="button" data-action="use-breeding-hint" style="
          width:100%;padding:8px;margin-top:8px;
          background:#f0f7f3;border:1px solid #2d6a4f;
          border-radius:8px;font-size:0.78rem;color:#2d6a4f;
        ">使用繁殖線索（剩 ${hintCount} 個）</button>
      ` : ''}

      ${state.breedingRecordIds?.length > 0 ? `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f0ebe5;">
          <p style="font-size:0.75rem;font-weight:600;color:#888;margin-bottom:4px;">
            配種紀錄 ${state.breedingRecordIds.length} 筆
          </p>
          ${state.breedingRecordIds.map((key) => {
            const recipe = BREEDING_RECIPES[key];
            if (!recipe) return '';
            const [typeA, typeB] = recipe.parents;
            return `
              <p style="font-size:0.72rem;color:#888;padding:2px 0;">
                ${MONSTERS[typeA]?.name || typeA} × ${MONSTERS[typeB]?.name || typeB}
                → ${MONSTERS[recipe.normalResult]?.name || '???'}
              </p>
            `;
          }).join('')}
        </div>
      ` : ''}

      ${(state.hintRevealed || []).length > 0 ? `
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid #f0ebe5;">
          <p style="font-size:0.72rem;color:#888;margin-bottom:4px;">💡 已知線索：</p>
          ${(state.hintRevealed || []).map((key) => {
            const recipe = BREEDING_RECIPES[key];
            if (!recipe) return '';
            const [typeA, typeB] = recipe.parents;
            return `
              <p style="font-size:0.72rem;color:#2d6a4f;padding:2px 0;">
                ${MONSTERS[typeA]?.name} × ${MONSTERS[typeB]?.name} → 有效配方
              </p>
            `;
          }).join('')}
        </div>
      ` : ''}
    </div>
  `;
}
