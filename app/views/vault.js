function renderVaultButton() {
  const total = state.monsters.length;
  const max = S.getVaultLimit(state);
  return `
    <button type="button" data-action="open-vault" style="
      width:100%;padding:12px;background:#fff;
      border:1px solid #e0d8d0;border-radius:10px;
      display:flex;align-items:center;justify-content:space-between;
      font-size:0.9rem;color:#2d2d2d;
    ">
      <span>📦 怪物倉庫</span>
      <span style="color:#888;font-size:0.82rem;">${total} / ${max}</span>
    </button>
  `;
}


function renderVaultModal() {
  if (!vaultOpen) return '';

  const currentSlots = S.getVaultLimit(state);
  const nextVaultTier = CONFIG.vaultUpgradeCosts.find((t) => t.slots > currentSlots);
  const vaultUpgradeHtml = nextVaultTier
    ? `
    <button type="button" data-action="upgrade-vault" style="
      width:100%;padding:8px;margin-bottom:12px;
      background:#f7f4f0;border:1px solid #e0d8d0;
      border-radius:8px;font-size:0.8rem;color:#555;
    ">
      擴建倉庫 → ${nextVaultTier.slots} 格
      （${Object.entries(nextVaultTier.cost).map(([r, a]) => `${RESOURCE_ICONS[r]}${a}`).join(' ')}）
    </button>
  `
    : '';

  function getFilteredMonsters() {
    switch (vaultFilter) {
      case 'working':  return state.monsters.filter((m) => !!m.assignedMap);
      case 'idle':     return state.monsters.filter((m) => S.getMonsterActivity(state, m.id)?.type === 'idle');
      case 'locked':   return state.monsters.filter((m) => m.locked);
      case 'favorite': return state.monsters.filter((m) => m.favorite);
      default:         return state.monsters;
    }
  }

  const filtered = getFilteredMonsters();
  const slots = [];
  filtered.forEach((monster) => {
    const def = MONSTERS[monster.type];
    const isSelected = monster.id === vaultSelectedId;
    const isWorking = !!monster.assignedMap;
    const isLocked = monster.locked;
    const isFavorite = monster.favorite;
    slots.push(`
      <div class="vault-slot ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}"
           data-action="vault-select" data-id="${monster.id}">
        <div class="vault-slot-icon">${renderMonsterArt(def, 'vault-monster-sprite')}${isFavorite ? '<span class="favorite-mark">⭐</span>' : ''}</div>
        <div class="vault-slot-name">${def.name}</div>
        <div class="vault-slot-status ${isWorking ? 'working' : ''}">
          ${isLocked ? '🔒' : ''}${isWorking ? '工作中' : '待命'}
        </div>
      </div>
    `);
  });

  const selected = vaultSelectedId ? state.monsters.find((m) => m.id === vaultSelectedId) : null;
  let detailHtml = '';
  if (selected) {
    const def = MONSTERS[selected.type];
    const isWorking = !!selected.assignedMap;
    const isLocked = selected.locked;
    const hasPurify = ((state.inventory || {}).purify_gene_liquid || 0) > 0;
    const hasNegativeTrait = (selected.traits || []).some((t) => {
      const def = TRAITS[t.key || t];
      return def && def.effect && def.effect.bonus < 0;
    });
    const hasPreserver = ((state.inventory || {}).gene_preserver || 0) > 0;
    const genePoolFull = (state.genePool || []).length >= 10;
    const talentValue = selected.talent || 1;
    const talentLabel = talentValue >= 8 ? '天才' : talentValue >= 5 ? '普通' : '遲鈍';
    const talentColor = talentValue >= 8 ? '#9b59b6' : talentValue >= 5 ? '#2d6a4f' : '#aaa';
    const moodValue = Number.isFinite(Number(selected.mood))
      ? Math.max(0, Math.min(CONFIG.moodMax || 100, Math.floor(Number(selected.mood))))
      : (CONFIG.moodDefault || 70);
    const moodLabel = moodValue >= 80 ? '愉快（工作加速）' : moodValue < 40 ? '低落（工作變慢）' : '穩定';
    const moodColor = moodValue >= 80 ? '#2d6a4f' : moodValue < 40 ? '#c0392b' : '#888';
    const moodItems = Object.entries(MOOD_ITEMS || {})
      .map(([itemId, item]) => ({
        id: itemId,
        name: RESOURCES[itemId]?.name || itemId,
        count: (state.inventory || {})[itemId] || 0,
        mood: item.mood,
      }))
      .filter((item) => item.count > 0);
    const activePersonality = ['diligent', 'lazy', 'social', 'timid'].includes(selected.personality)
      ? CONFIG.personalities[selected.personality]
      : null;
    const personalityColor = selected.personality === 'diligent' || selected.personality === 'social'
      ? '#2d6a4f'
      : selected.personality === 'timid'
        ? '#2980b9'
        : '#c0392b';
    const now = TimeService.now();
    const isTraining = !!selected.trainingCourse;
    const isCooling = selected.trainingCooldown && selected.trainingCooldown > now;
    const cooldownLeft = isCooling ? Math.ceil((selected.trainingCooldown - now) / 60000) : 0;

    const availableCourses = Object.values(TRAINING_COURSES).filter((course) => {
      const hasInInventory = ((state.inventory || {})[course.id] || 0) > 0;
      const isUnlocked = !course.requires || S.hasUnlock(state, course.requires);
      return hasInInventory && isUnlocked;
    });

    const trainingHtml = `
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid #f0ebe5;">
        <p style="font-size:0.75rem;font-weight:600;color:#888;margin-bottom:6px;">訓練</p>
        ${isTraining
          ? `<p style="font-size:0.82rem;color:#2d6a4f;">
              訓練中：${TRAINING_COURSES[selected.trainingCourse]?.name || ''}
              （剩餘 ${Math.ceil((selected.trainingEndMs - now) / 60000)} 分鐘）
            </p>`
          : isCooling
            ? `<p style="font-size:0.82rem;color:#aaa;">冷卻中（剩餘 ${cooldownLeft} 分鐘）</p>`
            : availableCourses.length === 0
              ? `<p style="font-size:0.78rem;color:#aaa;">背包中沒有訓練課程，請去市場購買。</p>`
              : `<div style="display:flex;flex-wrap:wrap;gap:6px;">
                  ${availableCourses.map((course) => `
                    <button type="button" data-action="start-training"
                      data-monster-id="${selected.id}" data-course-id="${course.id}"
                      style="padding:6px 12px;background:#f0f7f3;border:1px solid #2d6a4f;
                        border-radius:8px;font-size:0.78rem;color:#2d6a4f;">
                      ${course.name}（剩 ${(state.inventory || {})[course.id] || 0} 個）
                    </button>
                  `).join('')}
                </div>`
        }
      </div>
    `;
    detailHtml = `
      <div class="vault-detail">
        <div class="vault-detail-header">
          <div class="vault-detail-icon">${renderMonsterArt(def, 'vault-detail-sprite')}</div>
          <div>
            <div class="vault-detail-name">${def.name}</div>
            <div class="vault-detail-trait">專長：${def.trait}</div>
            <div class="vault-detail-trait">${isWorking ? '工作中：' + MAPS[selected.assignedMap].name : '待命中'}</div>
          </div>
        </div>
        <div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #f0ebe5;">
          <p style="font-size:0.75rem;font-weight:600;color:#888;margin-bottom:4px;">天賦</p>
          <span style="
            font-size:0.82rem;font-weight:700;color:${talentColor};
            background:#f7f4f0;border:1px solid ${talentColor};
            border-radius:6px;padding:3px 10px;
          ">
            ${talentValue}/10 ${talentLabel}
          </span>
        </div>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid #f0ebe5;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
            <p style="font-size:0.75rem;font-weight:600;color:#888;">心情</p>
            <span style="font-size:0.78rem;font-weight:700;color:${moodColor};">${moodValue}/100 ${moodLabel}</span>
          </div>
          <div style="height:6px;background:#f0ebe5;border-radius:999px;overflow:hidden;margin-bottom:8px;">
            <div style="width:${moodValue}%;height:100%;background:${moodColor};border-radius:999px;"></div>
          </div>
          ${moodItems.length === 0
            ? '<p style="font-size:0.72rem;color:#aaa;">背包裡沒有可提升心情的道具。</p>'
            : `<div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${moodItems.map((item) => `
                  <button type="button" data-action="use-mood-item"
                    data-monster-id="${selected.id}" data-item-id="${item.id}"
                    style="padding:5px 9px;background:#fff;border:1px solid #e0d8d0;
                      border-radius:8px;font-size:0.72rem;color:#555;">
                    ${item.name} +${item.mood}（${item.count}）
                  </button>
                `).join('')}
              </div>`
          }
        </div>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid #f0ebe5;">
          <p style="font-size:0.75rem;font-weight:600;color:#888;margin-bottom:6px;">能力</p>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">
            ${Object.entries(selected.skills || {}).map(([skill, level]) => {
              const cap = MONSTERS[selected.type].skillCaps?.[skill] || 10;
              return `
                <span style="
                  font-size:0.72rem;background:#f7f4f0;
                  border:1px solid #e0d8d0;border-radius:6px;
                  padding:3px 8px;color:#555;
                ">
                  ${CONFIG.skillNames[skill] || skill} ${level}/${cap}
                </span>
              `;
            }).join('')}
          </div>
        </div>

        <div style="margin-top:8px;padding-top:8px;border-top:1px solid #f0ebe5;">
          <p style="font-size:0.75rem;font-weight:600;color:#888;margin-bottom:6px;">
            詞條
            <span style="font-size:0.68rem;color:#bbb;font-weight:400;">（系統開發中）</span>
          </p>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">
            ${(selected.traits || []).length === 0
              ? '<span style="font-size:0.72rem;color:#bbb;">無詞條</span>'
              : (selected.traits || []).map((trait, index) => {
                  const traitDef = TRAITS[trait.key || trait];
                  if (!traitDef) return '';
                  const rarityColor = traitDef.rarity === 'rare' ? '#9b59b6' : '#888';
                  return `
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                      <span style="
                        font-size:0.72rem;background:#f7f4f0;
                        border:1px solid ${rarityColor};border-radius:6px;
                        padding:3px 8px;color:${rarityColor};
                      " title="${traitDef.desc}">
                        ${traitDef.name} Lv${trait.level || 1}/${traitDef.maxLevel}
                      </span>
                      ${hasPreserver && !genePoolFull
                        ? `<button type="button" data-action="preserve-gene"
                            data-id="${selected.id}" data-index="${index}"
                            style="padding:2px 6px;background:#f0f7f3;border:1px solid #2d6a4f;
                              border-radius:4px;font-size:0.68rem;color:#2d6a4f;">
                            保留
                          </button>`
                        : ''
                      }
                    </div>
                  `;
                }).join('')
            }
          </div>
        </div>
        ${activePersonality ? `
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid #f0ebe5;">
            <p style="font-size:0.75rem;font-weight:600;color:#888;margin-bottom:6px;">個性</p>
            <span style="
              font-size:0.78rem;background:#f7f4f0;
              border:1px solid ${personalityColor};border-radius:6px;
              padding:3px 8px;color:${personalityColor};font-weight:700;
            ">
              ${activePersonality.name}（已生效）
            </span>
            <p style="font-size:0.72rem;color:#aaa;margin-top:4px;">${activePersonality.desc}</p>
          </div>
        ` : `
          <!-- TODO: 其餘個性效果啟用（階段四A）後再恢復顯示，目前先隱藏避免玩家誤解為功能故障。
               注意：generatePersonality() 與 selected.personality 資料本身仍正常生成保留，只隱藏未生效個性的顯示區塊。 -->
        `}
        ${trainingHtml}
        <div class="vault-detail-actions">
          ${isWorking
            ? `<button type="button" data-action="recall" data-id="${selected.id}">撤回</button>`
            : `<button type="button" data-action="release" data-id="${selected.id}" class="danger" ${isLocked ? 'disabled' : ''}>野放</button>`
          }
          ${!isWorking && !isLocked
            ? `<button type="button" data-action="retire-monster"
                data-id="${selected.id}" style="
                  padding:8px 14px;background:#fff3e0;
                  color:#e65100;border-radius:8px;font-size:0.82rem;
                ">
                退役（取得材料）
              </button>`
            : ''
          }
          ${!isWorking && !isLocked
            ? `<button type="button" data-action="sell-black-market"
                data-id="${selected.id}" style="
                  padding:8px 14px;background:#f3e5f5;
                  color:#9b59b6;border-radius:8px;font-size:0.82rem;
                ">
                賣給黑市 🔮
              </button>`
            : ''
          }
          ${hasPurify && hasNegativeTrait
            ? `<button type="button" data-action="apply-purify"
                data-id="${selected.id}" style="
                  padding:8px 14px;background:#e8f4f8;
                  color:#2980b9;border-radius:8px;font-size:0.82rem;
                ">
                純化基因液
              </button>`
            : ''
          }
          <button type="button" data-action="toggle-lock" data-id="${selected.id}" class="warning">
            ${isLocked ? '🔒 解鎖' : '🔓 鎖定'}
          </button>
          <button type="button" data-action="toggle-favorite" data-id="${selected.id}" class="warning">
            ${selected.favorite ? '⭐ 取消最愛' : '☆ 標記最愛'}
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="modal-overlay">
      <div class="modal-sheet">
        <div class="modal-header">
          <h2>📦 怪物管理</h2>
          <button class="modal-close" type="button" data-action="close-vault">關閉</button>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:12px;">
          ${[
            { key: 'vault', label: `🎒 怪物倉庫 ${state.monsters.length}/${currentSlots}` },
            { key: 'exchange', label: '🎫 證明兌換' },
          ].map((tab) => `
            <button type="button" data-action="vault-tab" data-tab="${tab.key}" style="
              flex:1;padding:8px;border-radius:8px;font-size:0.82rem;
              background:${vaultTab === tab.key ? '#2d6a4f' : '#f7f4f0'};
              color:${vaultTab === tab.key ? '#fff' : '#888'};
              border:1px solid ${vaultTab === tab.key ? '#2d6a4f' : '#e0d8d0'};
            ">${tab.label}</button>
          `).join('')}
        </div>
        ${vaultTab === 'exchange'
          ? renderCertExchange()
          : `
            ${vaultUpgradeHtml}
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
              ${[
                { key: 'all',      label: '全部' },
                { key: 'working',  label: '工作中' },
                { key: 'idle',     label: '待命' },
                { key: 'locked',   label: '🔒 已鎖定' },
                { key: 'favorite', label: '⭐ 最愛' },
              ].map(({ key, label }) => `
                <button type="button" data-action="vault-filter" data-filter="${key}" style="
                  padding:5px 12px;border-radius:20px;font-size:0.78rem;
                  background:${vaultFilter === key ? '#2d6a4f' : '#f7f4f0'};
                  color:${vaultFilter === key ? '#fff' : '#888'};
                  border:1px solid ${vaultFilter === key ? '#2d6a4f' : '#e0d8d0'};
                ">${label}</button>
              `).join('')}
            </div>
            <div class="monster-vault-grid">${slots.join('')}</div>
            ${detailHtml}
          `
        }
      </div>
    </div>
  `;
}


function renderBackpackModal() {
  if (!backpackOpen) return '';

  const inventory = state.inventory || {};

  const materialItems = Object.entries(inventory)
    .filter(([key, count]) => count > 0 && RESOURCES[key]?.category === 'material')
    .map(([key, count]) => ({ key, name: RESOURCES[key].name, count }));

  const certItems = Object.entries(inventory)
    .filter(([key, count]) => count > 0 && RESOURCES[key]?.category === 'cert')
    .map(([key, count]) => ({ key, name: RESOURCES[key].name, count }));

  const processedItems = Object.entries(inventory)
    .filter(([key, count]) => count > 0 && RESOURCES[key]?.category === 'processed')
    .map(([key, count]) => ({ key, name: RESOURCES[key].name, count }));

  const itemItems = Object.entries(inventory)
    .filter(([key, count]) => {
      if (count <= 0) return false;
      const res = RESOURCES[key];
      return res?.category === 'item' || Boolean(TRAINING_COURSES?.[key]);
    })
    .map(([key, count]) => ({
      key,
      name: RESOURCES[key]?.name || TRAINING_COURSES?.[key]?.name || key,
      count,
    }));

  const uncategorized = Object.entries(inventory)
    .filter(([key, count]) => {
      if (count <= 0) return false;
      const res = RESOURCES[key];
      if (CONFIG.CORE_RESOURCE_KEYS.includes(key) || CONFIG.CURRENCY_KEYS.includes(key)) return false;
      if (TRAINING_COURSES?.[key]) return false;
      return !res || !['material', 'cert', 'processed', 'item'].includes(res.category);
    })
    .map(([key, count]) => ({
      key,
      name: RESOURCES[key]?.name || MARKET_ITEMS?.[key]?.name || key,
      count,
    }));
  const collectionSets = Object.values(COLLECTION_SETS || {});
  const claimedCollections = state.claimedCollectionSets || [];

  const tabs = [
    { key: 'material', label: `材料 (${materialItems.length})`, items: materialItems },
    { key: 'cert', label: `證明 (${certItems.length})`, items: certItems },
    { key: 'processed', label: `加工品 (${processedItems.length})`, items: processedItems },
    {
      key: 'item',
      label: `道具 (${itemItems.length + uncategorized.length})`,
      items: [...itemItems, ...uncategorized],
    },
    { key: 'collections', label: `套組 (${claimedCollections.length}/${collectionSets.length})`, items: [] },
  ];

  const currentTab = tabs.find((t) => t.key === backpackTab) || tabs[0];
  const collectionHtml = `
    <div class="stack">
      ${collectionSets.map((set) => {
        const check = S.checkCollectionComplete(state, set.id);
        const isClaimed = claimedCollections.includes(set.id);
        const ownedCount = (set.items || []).filter((itemId) => S.getAmount(state, itemId) > 0).length;
        const rewardText = Object.entries(set.reward || {})
          .map(([key, amount]) => `${RESOURCE_ICONS[key] || ''}${RESOURCES[key]?.name || key}×${amount}`)
          .join('、');
        return `
          <div class="row-item">
            <div>
              <strong>${set.icon || ''} ${set.name} ${isClaimed ? '✅' : ''}</strong>
              <span>${set.desc}</span>
              <span style="font-size:0.72rem;color:#888;">
                進度：${ownedCount}/${(set.items || []).length}
              </span>
              <span style="font-size:0.72rem;color:#aaa;">
                需要：${(set.items || []).map((itemId) => {
                  const owned = S.getAmount(state, itemId) > 0;
                  return `${owned ? '✅' : '□'} ${RESOURCES[itemId]?.name || itemId}`;
                }).join('、')}
              </span>
              <span style="font-size:0.72rem;color:#2d6a4f;">獎勵：${rewardText}</span>
            </div>
            ${isClaimed
              ? '<span style="color:#2d6a4f;font-size:0.82rem;">已領取</span>'
              : `<button type="button" data-action="claim-collection" data-id="${set.id}"
                  ${check.complete ? '' : 'disabled'}>領取</button>`
            }
          </div>
        `;
      }).join('')}
    </div>
  `;

  return `
    <div class="modal-overlay">
      <div class="modal-sheet">
        <div class="modal-header">
          <h2>🎒 背包</h2>
          <button class="modal-close" type="button" data-action="close-backpack">關閉</button>
        </div>
        <div class="backpack-tabs">
          ${tabs.map((t) => `
            <div class="backpack-tab ${backpackTab === t.key ? 'active' : ''}"
              data-action="backpack-tab" data-tab="${t.key}">
              ${t.label}
            </div>
          `).join('')}
        </div>
        ${currentTab.key === 'collections'
          ? collectionHtml
          : currentTab.items.length === 0
          ? '<p class="empty-state">目前沒有物品。</p>'
          : `<div class="backpack-grid">
              ${currentTab.items.map((item) => `
                <div class="backpack-item">
                  <div class="backpack-item-name">${item.name}</div>
                  <div class="backpack-item-count">${item.count}</div>
                </div>
              `).join('')}
            </div>`
        }
      </div>
    </div>
  `;
}


