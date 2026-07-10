function getTutorialStep(state) {
  if (!state.started) return null;
  if (!state.buildings.researchTable) return {
    step: 1,
    title: '第一步：建造研究台',
    desc: '採集木材和礦石，建造研究台，解鎖更多功能。',
    highlight: 'build-table',
  };
  if (!(state.completedResearch || []).includes('capture_basic') && !state.research.capture) return {
    step: 2,
    title: '第二步：研究捕捉術',
    desc: '在研究台完成「基礎捕捉術」研究，才能前往野外捕捉怪物。',
    highlight: 'do-research',
  };
  if (state.monsters.length === 0) return {
    step: 3,
    title: '第三步：捕捉第一隻怪物',
    desc: '前往野外捕捉怪物，怪物是營地的核心！',
    highlight: 'view-wild',
  };
  if (!state.monsters.some((m) => !!m.assignedMap)) return {
    step: 4,
    title: '第四步：派工怪物',
    desc: '進入生產地圖，把怪物派去符合專長的區域工作，開始自動生產資源！',
    highlight: 'view-map',
  };
  return null;
}


function renderTutorial() {
  const step = getTutorialStep(state);
  if (!step) return '';

  return `
    <div style="
      background: linear-gradient(135deg, #2d6a4f, #40916c);
      border-radius: 12px;
      padding: 14px 16px;
      margin: 0 16px 12px;
      color: #fff;
    ">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="
          background:rgba(255,255,255,0.2);
          border-radius:20px;
          padding:2px 10px;
          font-size:0.72rem;
          font-weight:600;
        ">步驟 ${step.step}/4</span>
        <strong style="font-size:0.9rem;">${step.title}</strong>
      </div>
      <p style="font-size:0.8rem;opacity:0.9;">${step.desc}</p>
    </div>
  `;
}


function renderDevPanel() {
  if (!CONFIG.devMode) return '';
  return `
    <div class="panel" style="margin-top:8px;border:2px dashed #f0a500;background:#fffbf0;">
      <h2 style="color:#e65100;">🛠️ 開發面板</h2>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button type="button" data-action="dev-add-resources" class="ghost-button">+100 所有資源</button>
        <button type="button" data-action="dev-add-monster" class="ghost-button">生成怪物</button>
        <button type="button" data-action="dev-skip-time" class="ghost-button">跳過1小時</button>
        <button type="button" data-action="dev-clear-save" class="ghost-button" style="color:#c0392b;">清除存檔</button>
      </div>
      <p style="font-size:0.72rem;color:#aaa;margin-top:8px;">
        上線前記得把 CONFIG.devMode 改成 false
      </p>
    </div>
  `;
}


function renderCampTools() {
  return `
    <section class="panel">
      <h2>手動採集</h2>
      <div class="button-grid gather-grid">
        <div class="gather-action">
          <button type="button" data-action="gather" data-resource="Wood">伐木 +1 木材</button>
          ${floatingTexts.filter((item) => item.resource === 'Wood').map((item) => `
            <span class="floating-text">${item.text}</span>
          `).join('')}
        </div>
        <div class="gather-action">
          <button type="button" data-action="gather" data-resource="Ore">挖礦 +1 礦石</button>
          ${floatingTexts.filter((item) => item.resource === 'Ore').map((item) => `
            <span class="floating-text">${item.text}</span>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}


function renderCultivationTanks() {
  if (!S.hasUnlock(state, 'breeding')) return '';

  const builtTanks = state.cultivationTanks || [];
  const totalSlots = S.getAvailableBreedingSlots(state);
  const usedSlots = (state.breedingSlots || []).length;

  return `
    <div class="panel">
      <h2>🧪 培養槽</h2>
      <p style="font-size:0.78rem;color:#888;margin-bottom:8px;">
        配種位置：${usedSlots} / ${totalSlots} 使用中
      </p>
      <div class="stack">
        ${CONFIG.cultivationTanks.map((tank) => {
          const isBuilt = builtTanks.some((t) => t.id === tank.id);
          const costText = Object.entries(tank.price)
            .map(([r, a]) => `${RESOURCES[r]?.name || r}×${a}`)
            .join('、');
          return `
            <div class="row-item">
              <div>
                <strong>${tank.name} ${isBuilt ? '✅' : ''}</strong>
                <span>${tank.desc}</span>
                ${!isBuilt ? `<span style="font-size:0.72rem;color:#aaa;">材料：${costText}</span>` : ''}
              </div>
              ${!isBuilt
                ? `<button type="button" data-action="build-tank" data-id="${tank.id}">
                    建造
                  </button>`
                : '<span style="color:#2d6a4f;font-size:0.82rem;">已建造</span>'
              }
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}


function renderResearchPanel() {
  return `
    <section class="panel">
      <h2>研究台</h2>
      <div class="stack">
        <div class="row-item">
          <div>
            <strong>${BUILDINGS.researchTable.name}</strong>
            <span>${BUILDINGS.researchTable.description}</span>
            <span>成本：${S.formatCost(BUILDINGS.researchTable.cost)}</span>
          </div>
          <button type="button" data-action="build-table"
            ${buttonDisabled(state.buildings.researchTable || !S.canAfford(state.resources, BUILDINGS.researchTable.cost))}>
            ${state.buildings.researchTable ? '已建造' : '建造'}
          </button>
        </div>
        ${state.buildings.researchTable ? Object.entries(RESEARCH).map(([id, r]) => {
          const isDone = (state.completedResearch || []).includes(id) || state.research[id];
          const check = S.canResearch(state, id);
          const costText = Object.entries(r.cost || {})
            .map(([res, amt]) => `${RESOURCE_ICONS[res] || res}${amt}`)
            .join(' ');
          return `
            <div class="row-item">
              <div>
                <strong>${r.name} ${isDone ? '✅' : ''}</strong>
                <span>${r.description}</span>
                ${!isDone ? `<span style="font-size:0.72rem;color:#aaa;">${costText}</span>` : ''}
                ${!isDone && !check.can ? `<span style="font-size:0.72rem;color:#e74c3c;">${check.reason}</span>` : ''}
              </div>
              ${!isDone
                ? `<button type="button" data-action="do-research" data-id="${id}"
                    ${check.can ? '' : 'disabled'}>研究</button>`
                : ''
              }
            </div>
          `;
        }).join('') : ''}
        ${S.hasUnlock(state, 'gene_research') ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f0ebe5;">
            <p style="font-size:0.78rem;font-weight:600;color:#888;margin-bottom:4px;">
              基因研究
            </p>
            <p style="font-size:0.75rem;color:#aaa;margin-bottom:8px;">
              成功率：${state.geneResearchSuccessRate || 1}%
              已嘗試：${state.geneResearchProgress || 0} 次
              （成功後重置）
            </p>
            <button type="button" data-action="attempt-gene-research"
              style="width:100%;padding:10px;background:#f0f7f3;
                border:1px solid #2d6a4f;border-radius:8px;
                font-size:0.82rem;color:#2d6a4f;">
              嘗試基因研究（消耗木材10、礦石5）
            </button>
          </div>
        ` : ''}
      </div>
    </section>
  `;
}


function renderVisitors() {
  const visitors = state.activeVisitors || [];
  const reputation = state.campReputation || 0;
  const now = TimeService.now();

  return `
    <div class="panel">
      <h2>👥 訪客</h2>
      <p style="font-size:0.78rem;color:#888;margin-bottom:8px;">
        營地聲望：${reputation} 點
      </p>

      ${visitors.length === 0
        ? '<p class="empty-state">目前沒有訪客，提升營地評價可增加訪客機率。</p>'
        : visitors.map((visitor) => {
            const def = VISITOR_EVENTS[visitor.type];
            if (!def) return '';
            const remaining = Math.max(0, Math.ceil((visitor.expiresMs - now) / 60000));

            return `
              <div style="
                padding:12px;border-radius:10px;
                background:#f7f4f0;border:1px solid #e0d8d0;
                margin-bottom:8px;
              ">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                  <span style="font-size:1.5rem;">${def.icon}</span>
                  <div>
                    <strong style="font-size:0.9rem;">${def.name}</strong>
                    <p style="font-size:0.75rem;color:#aaa;">${def.desc}（${remaining}分鐘後離開）</p>
                  </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;">
                  ${def.actions.map((visitorAction) => {
                    const costText = visitorAction.cost
                      ? Object.entries(visitorAction.cost)
                        .map(([key, amount]) => key === 'researchPoints'
                          ? `研究點${amount}`
                          : `${RESOURCES[key]?.name || key}×${amount}`)
                        .join('、')
                      : '免費';
                    return `
                      <div class="row-item">
                        <div>
                          <strong style="font-size:0.82rem;">${visitorAction.label}</strong>
                          <span>${visitorAction.desc}</span>
                          <span style="font-size:0.72rem;color:#aaa;">費用：${costText}</span>
                        </div>
                        <button type="button" data-action="visitor-action"
                          data-visitor-id="${visitor.id}" data-action-id="${visitorAction.id}">
                          互動
                        </button>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')
      }
    </div>
  `;
}


function renderExhibition() {
  const exhibition = state.exhibition || [];
  const income = S.calcExhibitionIncome(state);
  const availableMonsters = state.monsters.filter((m) =>
    S.canEnterActivity(state, m.id, 'exhibition').can
  );

  return `
    <div class="panel">
      <h2>🏛️ 展覽館</h2>
      <p style="font-size:0.78rem;color:#888;margin-bottom:8px;">
        展示稀有怪物，每分鐘產生營地幣與研究點。
        目前每分鐘：🪙${income.coins} 研究點+${income.researchPoints}
      </p>

      ${exhibition.length > 0 ? `
        <div style="margin-bottom:12px;">
          <p style="font-size:0.75rem;font-weight:600;color:#888;margin-bottom:6px;">
            展示中 ${exhibition.length}/5
          </p>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${exhibition.map((id) => {
              const monster = state.monsters.find((m) => m.id === id);
              if (!monster) return '';
              const def = MONSTERS[monster.type];
              const hasRare = (monster.traits || []).some((t) => {
                const traitDef = TRAITS[t.key || t];
                return traitDef && traitDef.rarity === 'rare';
              });
              return `
                <div style="
                  padding:8px 10px;border-radius:8px;
                  background:#f0f7f3;border:1px solid #2d6a4f;
                  display:flex;align-items:center;gap:8px;
                ">
                  <span style="font-size:1.2rem;">${def.icon}</span>
                  <div>
                    <p style="font-size:0.78rem;font-weight:600;">${def.name}</p>
                    <p style="font-size:0.68rem;color:#888;">
                      天賦${monster.talent}/10 ${hasRare ? '✨稀有詞條' : ''}
                    </p>
                  </div>
                  <button type="button" data-action="remove-exhibition"
                    data-id="${id}" style="
                      padding:4px 8px;background:#fde8e8;
                      color:#c0392b;border-radius:6px;font-size:0.72rem;
                    ">移出</button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : '<p class="empty-state" style="margin-bottom:8px;">目前沒有展示的怪物。</p>'}

      ${exhibition.length < 5 && availableMonsters.length > 0 ? `
        <div>
          <p style="font-size:0.75rem;font-weight:600;color:#888;margin-bottom:6px;">加入展覽</p>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${availableMonsters.slice(0, 5).map((monster) => {
              const def = MONSTERS[monster.type];
              return `
                <div class="row-item">
                  <div>
                    <strong>${def.icon} ${def.name}</strong>
                    <span style="font-size:0.75rem;color:#888;">天賦 ${monster.talent}/10</span>
                  </div>
                  <button type="button" data-action="add-exhibition" data-id="${monster.id}">
                    展示
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}


function renderCompendium() {
  const compendium = state.compendium || { monsters: {}, mutations: {}, breeding: {} };
  const allMonsters = Object.keys(MONSTERS);
  const allRecipes = Object.keys(BREEDING_RECIPES);
  const allMutations = Object.values(MONSTERS)
    .flatMap((monster) => Object.keys(monster.mutations || {}));

  const discoveredMonsters = Object.keys(compendium.monsters).length;
  const discoveredMutations = Object.keys(compendium.mutations).length;
  const discoveredRecipes = Object.keys(compendium.breeding).length;

  return `
    <div class="panel">
      <h2>📖 研究圖鑑</h2>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
        <span style="font-size:0.82rem;">
          怪物：<strong>${discoveredMonsters}</strong>/${allMonsters.length}
        </span>
        <span style="font-size:0.82rem;">
          變異：<strong>${discoveredMutations}</strong>/${allMutations.length}
        </span>
        <span style="font-size:0.82rem;">
          配種：<strong>${discoveredRecipes}</strong>/${allRecipes.length}
        </span>
      </div>

      <div style="margin-bottom:12px;">
        <p style="font-size:0.75rem;font-weight:600;color:#888;margin-bottom:6px;">怪物</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${allMonsters.map((type) => {
            const def = MONSTERS[type];
            const disc = compendium.monsters[type];
            return `
              <div style="
                padding:6px 10px;border-radius:8px;
                background:${disc ? '#f0f7f3' : '#f7f4f0'};
                border:1px solid ${disc ? '#2d6a4f' : '#e0d8d0'};
                font-size:0.78rem;color:${disc ? '#2d6a4f' : '#aaa'};
              " title="${disc ? `捕捉 ${disc.count} 次` : '尚未發現'}">
                ${def?.icon || '?'} ${disc ? def?.name || type : '???'}
                ${disc ? `×${disc.count}` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <p style="font-size:0.75rem;font-weight:600;color:#888;margin-bottom:6px;">變異</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${allMutations.length === 0
            ? '<p style="font-size:0.78rem;color:#aaa;">尚無變異記錄</p>'
            : allMutations.map((mutationKey) => {
                const disc = compendium.mutations[mutationKey];
                const mutationDef = MONSTERS[mutationKey];
                return `
                  <div style="
                    padding:6px 10px;border-radius:8px;
                    background:${disc ? '#f5f0ff' : '#f7f4f0'};
                    border:1px solid ${disc ? '#9b59b6' : '#e0d8d0'};
                    font-size:0.78rem;color:${disc ? '#9b59b6' : '#aaa'};
                  ">
                    ${disc ? (mutationDef?.icon || '✨') : '?'} ${disc ? (mutationDef?.name || mutationKey) : '???'}
                  </div>
                `;
              }).join('')
          }
        </div>
      </div>

      <div>
        <p style="font-size:0.75rem;font-weight:600;color:#888;margin-bottom:6px;">配種配方</p>
        <div class="stack">
          ${allRecipes.map((key) => {
            const recipe = BREEDING_RECIPES[key];
            const disc = compendium.breeding[key];
            const [typeA, typeB] = recipe.parents;
            return `
              <div style="
                padding:6px 10px;border-radius:8px;
                background:${disc ? '#f0f7f3' : '#f7f4f0'};
                border:1px solid ${disc ? '#2d6a4f' : '#e0d8d0'};
                font-size:0.78rem;color:${disc ? '#555' : '#aaa'};
              ">
                ${disc
                  ? `${MONSTERS[typeA]?.name} × ${MONSTERS[typeB]?.name} → ${MONSTERS[disc.resultType]?.name || '???'} ${disc.isMutation ? '✨' : ''}`
                  : '未知配方'
                }
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}


function renderBlueprints() {
  const discovered = state.discoveredBlueprints || [];
  const hintCount = (state.inventory || {}).blueprint_hint || 0;
  const allBlueprints = Object.values(BLUEPRINTS);

  return `
    <div class="panel">
      <h2>📐 圖紙</h2>
      <p style="font-size:0.78rem;color:#888;margin-bottom:8px;">
        圖紙線索：${hintCount} 個
        已學會：${discovered.length}/${allBlueprints.length}
      </p>

      ${hintCount > 0 && discovered.length < allBlueprints.length ? `
        <div style="margin-bottom:12px;">
          <p style="font-size:0.75rem;font-weight:600;color:#888;margin-bottom:6px;">
            使用圖紙線索學習
          </p>
          <div class="stack">
            ${allBlueprints
              .filter((blueprint) => !discovered.includes(blueprint.id))
              .map((blueprint) => `
                <div class="row-item">
                  <div>
                    <strong>${blueprint.name}</strong>
                    <span>${blueprint.desc}</span>
                  </div>
                  <button type="button" data-action="learn-blueprint"
                    data-id="${blueprint.id}">學習</button>
                </div>
              `).join('')}
          </div>
        </div>
      ` : ''}

      ${discovered.length > 0 ? `
        <div>
          <p style="font-size:0.75rem;font-weight:600;color:#888;margin-bottom:6px;">
            已學會的圖紙
          </p>
          <div class="stack">
            ${discovered.map((id) => {
              const blueprint = BLUEPRINTS[id];
              if (!blueprint) return '';
              const hasCraftCost = !!blueprint.craftCost;
              const costText = hasCraftCost
                ? Object.entries(blueprint.craftCost)
                  .map(([key, amount]) => `${RESOURCES[key]?.name || key}×${amount}`)
                  .join('、')
                : '';

              return `
                <div class="row-item">
                  <div>
                    <strong>✅ ${blueprint.name}</strong>
                    <span>${blueprint.desc}</span>
                    ${hasCraftCost ? `<span style="font-size:0.72rem;color:#aaa;">材料：${costText}</span>` : ''}
                  </div>
                  ${hasCraftCost
                    ? `<button type="button" data-action="craft-blueprint"
                        data-id="${id}">製作</button>`
                    : '<span style="font-size:0.75rem;color:#2d6a4f;">已解鎖</span>'
                  }
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}


function renderGenePool() {
  const genePool = state.genePool || [];
  if (genePool.length === 0) return '';

  return `
    <div class="panel">
      <h2>🧬 基因池 ${genePool.length}/10</h2>
      <p style="font-size:0.78rem;color:#888;margin-bottom:8px;">
        保存的詞條可在繁殖時影響後代。
      </p>
      <div class="stack">
        ${genePool.map((gene) => {
          const traitDef = TRAITS[gene.traitKey];
          const sourceDef = MONSTERS[gene.sourceType];
          if (!traitDef) return '';
          const rarityColor = traitDef.rarity === 'rare' ? '#9b59b6' : '#888';
          return `
            <div class="row-item">
              <div>
                <strong style="color:${rarityColor};">${traitDef.name} Lv${gene.traitLevel}</strong>
                <span style="font-size:0.75rem;color:#aaa;">
                  來源：${sourceDef?.name || gene.sourceType}
                </span>
              </div>
              <button type="button" data-action="remove-gene"
                data-id="${gene.id}"
                style="padding:6px 10px;background:#fde8e8;color:#c0392b;
                  border-radius:6px;font-size:0.75rem;">
                移除
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}


function renderCamp() {
  return `
    <section class="camp-home">
      ${renderCampMapPreview()}

      ${renderCampTools()}

      ${renderCultivationTanks()}

      ${renderBreedingPanel()}

      ${renderGenePool()}

      <div class="panel">
        <h2>主要行動</h2>
        <div class="home-action-grid">
          <button type="button" data-action="view-wild" ${buttonDisabled(!state.research.capture)}>🌲 野外捕捉</button>
          <button type="button" data-action="open-vault">🎒 怪物倉庫</button>
          <button type="button" data-action="enter-arena">⚔️ 怪物試煉場</button>
          <button type="button" data-action="open-feature" data-feature="workshop">🧪 研究工坊</button>
          <button type="button" data-action="open-feature" data-feature="quests">📋 委託板</button>
          <button type="button" data-action="open-feature" data-feature="market">🛒 市場</button>
          <button type="button" data-action="open-feature" data-feature="camp-info">🏛️ 營地資訊</button>
          <button type="button" data-action="open-feature" data-feature="save">⚙️ 存檔</button>
          ${CONFIG.devMode ? '<button type="button" data-action="open-feature" data-feature="dev">🛠️ 開發</button>' : ''}
        </div>
      </div>
      ${renderNotificationCenter()}
    </section>
  `;
}


function renderMerchants(type = 'all') {
  const normalStock = (state.merchantStock || {}).normal || {};
  const blackStock = (state.merchantStock || {}).black || {};
  const mysteryCoins = state.resources.MysteryCoins || 0;

  const normalItems = Object.values(MERCHANT_ITEMS).filter((i) => i.merchant === 'normal');
  const blackItems = Object.values(MERCHANT_ITEMS)
    .filter((i) => i.merchant === 'black' && blackStock[i.id] !== undefined);

  const normalHtml = `
    <div style="margin-bottom:${type === 'all' ? '16px' : '0'};">
      <p style="font-size:0.82rem;font-weight:600;margin-bottom:8px;">
        一般商人 <span style="color:#aaa;font-weight:400;font-size:0.75rem;">（每日補貨）</span>
      </p>
      <div class="stack">
        ${normalItems.map((item) => {
          const stock = normalStock[item.id] || 0;
          const canBuy = (state.resources.Coins || 0) >= item.price && stock > 0;
          return `
            <div class="row-item">
              <div>
                <strong>${item.name}</strong>
                <span>${item.desc}</span>
                <span style="font-size:0.72rem;color:#aaa;">庫存：${stock} 個</span>
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:0.82rem;color:#888;">🪙${item.price}</span>
                <button type="button" data-action="buy-merchant"
                  data-id="${item.id}" data-type="normal"
                  ${canBuy ? '' : 'disabled'}>購買</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  const blackHtml = `
    <div>
      <p style="font-size:0.82rem;font-weight:600;margin-bottom:4px;">
        黑市商人
        <span style="color:#aaa;font-weight:400;font-size:0.75rem;">（持有 ${mysteryCoins} 神秘幣）</span>
      </p>
      <p style="font-size:0.72rem;color:#aaa;margin-bottom:8px;">
        將怪物賣給黑市可獲得神秘幣。
      </p>
      <div class="stack">
        ${blackItems.length === 0
          ? '<p class="empty-state">今日黑市無商品。</p>'
          : blackItems.map((item) => {
              const stock = blackStock[item.id] || 0;
              const canBuy = mysteryCoins >= item.price && stock > 0;
              return `
                <div class="row-item">
                  <div>
                    <strong>${item.name}</strong>
                    <span>${item.desc}</span>
                    <span style="font-size:0.72rem;color:#aaa;">庫存：${stock} 個</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:0.82rem;color:#9b59b6;">🔮${item.price}</span>
                    <button type="button" data-action="buy-merchant"
                      data-id="${item.id}" data-type="black"
                      ${canBuy ? '' : 'disabled'}>購買</button>
                  </div>
                </div>
              `;
            }).join('')
        }
      </div>
    </div>
  `;

  const content = type === 'merchant'
    ? normalHtml
    : type === 'black'
      ? blackHtml
      : `${normalHtml}${blackHtml}`;

  return `
    <div class="panel">
      <h2>🏪 商人</h2>
      ${content}
    </div>
  `;
}

function renderCertExchange() {
  const inventory = state.inventory || {};
  const exchanges = CONFIG.certExchange || {};

  return `
    <div class="panel">
      <h2>🎫 證明兌換</h2>
      <p style="font-size:0.78rem;color:#888;margin-bottom:8px;">
        野放怪物可獲得野放證明，累積後兌換稀有怪物。
      </p>
      <div class="stack">
        ${Object.entries(exchanges).map(([id, exchange]) => {
          const canExchange = Object.entries(exchange.requires)
            .every(([key, amount]) => (inventory[key] || 0) >= amount);
          const requireText = Object.entries(exchange.requires)
            .map(([key, amount]) => {
              const have = inventory[key] || 0;
              const name = RESOURCES[key]?.name || key;
              return `<span style="color:${have >= amount ? '#2d6a4f' : '#e74c3c'}">
                ${name} ${have}/${amount}
              </span>`;
            }).join('、');
          const alreadyHas = state.monsters.some((monster) => monster.type === exchange.resultType);

          return `
            <div class="row-item">
              <div>
                <strong>${exchange.icon} ${exchange.name}</strong>
                <span>${exchange.desc}</span>
                <span style="font-size:0.72rem;">${requireText}</span>
                ${alreadyHas ? '<span style="font-size:0.72rem;color:#2d6a4f;">✅ 已擁有</span>' : ''}
              </div>
              <button type="button" data-action="exchange-cert" data-id="${id}"
                ${canExchange && !alreadyHas ? '' : 'disabled'}>
                兌換
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}


function renderCrafting() {
  const now = TimeService.now();
  const queue = state.craftingQueue || [];

  return `
    <div class="panel">
      <h2>⚗ 加工坊</h2>

      ${queue.length > 0 ? `
        <div style="margin-bottom:12px;">
          <p style="font-size:0.78rem;font-weight:600;color:#888;margin-bottom:6px;">加工中</p>
          ${queue.map((job) => {
            const recipe = RECIPES[job.recipeId];
            if (!recipe) return '';
            const remaining = Math.max(0, Math.ceil((job.endMs - now) / 60000));
            const progress = Math.min(100, ((now - job.startMs) / (job.endMs - job.startMs)) * 100);
            return `
              <div style="padding:6px 0;border-bottom:1px solid #f0ebe5;">
                <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:4px;">
                  <span>${recipe.name}</span>
                  <span style="color:#aaa;">${remaining} 分鐘</span>
                </div>
                <div style="background:#f0ebe5;border-radius:4px;height:4px;overflow:hidden;">
                  <div style="width:${progress}%;height:100%;background:#2d6a4f;border-radius:4px;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      <p style="font-size:0.78rem;font-weight:600;color:#888;margin-bottom:8px;">
        可加工配方 ${queue.length}/3 佇列
      </p>
      <div class="stack">
        ${Object.values(RECIPES).map((recipe) => {
          const check = S.canCraft(state, recipe.id);
          const queueFull = queue.length >= 3;
          const inputText = Object.entries(recipe.inputs)
            .map(([key, amt]) => `${RESOURCES[key]?.name || key}×${amt}`)
            .join('、');
          const durationMin = Math.ceil(recipe.duration / 60000);

          return `
            <div class="row-item">
              <div>
                <strong>${recipe.name}</strong>
                <span>${recipe.desc}</span>
                <span style="font-size:0.72rem;color:#aaa;">材料：${inputText}</span>
                <span style="font-size:0.72rem;color:#aaa;">時間：${durationMin} 分鐘</span>
                ${!check.can ? `<span style="font-size:0.72rem;color:#e74c3c;">${check.reason}</span>` : ''}
              </div>
              <button type="button" data-action="start-crafting" data-id="${recipe.id}"
                ${check.can && !queueFull ? '' : 'disabled'}>
                加工
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}


function renderManagementReport() {
  const monsters = state.monsters || [];
  const total = monsters.length;
  const working = monsters.filter((m) => !!m.assignedMap).length;
  const idle = total - working;
  const locked = monsters.filter((m) => m.locked).length;
  const favorite = monsters.filter((m) => m.favorite).length;

  // 各區域工作怪物數
  const mapStats = Object.entries(MAPS).map(([mapId, map]) => {
    const count = monsters.filter((m) => m.assignedMap === mapId).length;
    const slots = (state.maps[mapId] || {}).unlockedSlots || 4;
    return { mapId, name: map.name, count, slots };
  });

  // 資源接近上限的警告
  const resourceWarnings = Object.entries(CONFIG.resourceCaps)
    .filter(([key]) => key !== 'Coins')
    .filter(([key, cap]) => ((state.resources[key] || 0) / cap) >= 0.8)
    .map(([key]) => RESOURCES[key]?.name || key);

  // 最高天賦怪物
  const topTalent = monsters.length > 0
    ? monsters.reduce((best, m) => (m.talent || 0) > (best.talent || 0) ? m : best, monsters[0])
    : null;

  // 閒置最久的怪物（沒有派工且沒有鎖定）
  const idleMonsters = monsters.filter((m) => !m.assignedMap && !m.locked);

  return `
    <div class="panel">
      <h2>📊 管理報表</h2>
      <div class="stack">

        <div>
          <p style="font-size:0.78rem;font-weight:600;color:#888;margin-bottom:6px;">怪物狀態</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <span style="font-size:0.82rem;">總數：<strong>${total}</strong> / ${S.getVaultLimit(state)}</span>
            <span style="font-size:0.82rem;color:#2d6a4f;">工作中：<strong>${working}</strong></span>
            <span style="font-size:0.82rem;color:#aaa;">待命：<strong>${idle}</strong></span>
            <span style="font-size:0.82rem;color:#f0a500;">鎖定：<strong>${locked}</strong></span>
          </div>
        </div>

        <div>
          <p style="font-size:0.78rem;font-weight:600;color:#888;margin-bottom:6px;">各區域狀況</p>
          ${mapStats.map((m) => `
            <div style="display:flex;justify-content:space-between;font-size:0.82rem;padding:3px 0;">
              <span>${MAPS[m.mapId]?.icon || ''} ${m.name}</span>
              <span style="color:${m.count === 0 ? '#aaa' : '#2d6a4f'};">
                ${m.count} / ${m.slots} 位
              </span>
            </div>
          `).join('')}
        </div>

        ${topTalent ? `
          <div>
            <p style="font-size:0.78rem;font-weight:600;color:#888;margin-bottom:4px;">最高天賦怪物</p>
            <span style="font-size:0.82rem;">
              ${MONSTERS[topTalent.type] ? renderMonsterArt(MONSTERS[topTalent.type], 'inline-monster-art') : ''} ${MONSTERS[topTalent.type]?.name || ''}
              天賦 <strong style="color:#9b59b6;">${topTalent.talent}/10</strong>
            </span>
          </div>
        ` : ''}

        ${idleMonsters.length > 0 ? `
          <div>
            <p style="font-size:0.78rem;font-weight:600;color:#e65100;margin-bottom:4px;">⚠️ 閒置怪物</p>
            <p style="font-size:0.78rem;color:#888;">
              ${idleMonsters.map((m) => MONSTERS[m.type]?.name || m.type).join('、')}
              共 ${idleMonsters.length} 隻尚未派工。
            </p>
          </div>
        ` : ''}

        ${resourceWarnings.length > 0 ? `
          <div>
            <p style="font-size:0.78rem;font-weight:600;color:#e65100;margin-bottom:4px;">⚠️ 資源警告</p>
            <p style="font-size:0.78rem;color:#888;">
              ${resourceWarnings.join('、')} 庫存超過 80%，記得賣出或使用。
            </p>
          </div>
        ` : ''}

      </div>
    </div>
  `;
}


function renderSpeciesResearch() {
  return `
    <div class="panel">
      <h2>物種研究</h2>
      <p style="font-size:0.78rem;color:#888;margin-bottom:8px;">
        野放怪物可累積該物種的研究進度，進度滿後解鎖捕捉提示。
      </p>
      <div class="stack">
        ${Object.entries(CONFIG.speciesResearch).map(([type, research]) => {
          const progress = (state.speciesProgress || {})[type] || 0;
          const max = research.maxProgress;
          const pct = Math.floor((progress / max) * 100);
          const def = MONSTERS[type];
          const hintUnlocked = (state.speciesHints || {})[type];

          return `
            <div style="padding:8px 0;border-bottom:1px solid #f0ebe5;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <strong style="font-size:0.88rem;">${def ? renderMonsterArt(def, 'inline-monster-art') : ''} ${research.name}</strong>
                <span style="font-size:0.78rem;color:#888;">${progress} / ${max}</span>
              </div>
              <div style="background:#f0ebe5;border-radius:4px;height:6px;overflow:hidden;margin-bottom:6px;">
                <div style="width:${pct}%;height:100%;background:#2d6a4f;border-radius:4px;"></div>
              </div>
              ${hintUnlocked
                ? `<div style="background:#f0f7f3;border:1px solid #2d6a4f;border-radius:8px;padding:8px;font-size:0.78rem;color:#2d6a4f;">
                    💡 ${research.hint}
                  </div>`
                : `<p style="font-size:0.72rem;color:#aaa;">
                    野放 ${Math.ceil((max - progress) / 3)} 隻${def ? def.name : ''}後解鎖捕捉提示
                  </p>`
              }
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}


function renderCampMapPreview() {
  const map = MAPS[activeMap];
  const assigned = state.monsters.filter((m) => m.assignedMap === activeMap);
  const isFull = S.getAssignedCount(state.monsters, activeMap) >= state.maps[activeMap].unlockedSlots;
  const eligibleMonsters = state.monsters.filter((m) =>
    S.canEnterActivity(state, m.id, 'working').can &&
    MONSTERS[m.type].specialty === activeMap
  );
  const ppm = calcMapPpm(activeMap);
  const slotCount = S.getAssignedCount(state.monsters, activeMap);
  const maxSlots = state.maps[activeMap].unlockedSlots;
  const nextTier = MAPS[activeMap].upgradeCosts.find((t) => t.slots > maxSlots);
  const mapIds = Object.keys(MAPS);
  const currentIndex = mapIds.indexOf(activeMap);
  const prevMap = mapIds[(currentIndex - 1 + mapIds.length) % mapIds.length];
  const nextMap = mapIds[(currentIndex + 1) % mapIds.length];
  const activeWeather = S.getActiveWeather ? S.getActiveWeather(state, activeMap) : null;
  const weatherDef = activeWeather ? WEATHER_TYPES[activeWeather.type] : null;
  const weatherEffect = activeWeather && S.formatWeatherEffect
    ? S.formatWeatherEffect(activeWeather)
    : '';
  const weatherRemaining = activeWeather
    ? TimeService.formatDuration(Math.max(0, activeWeather.expiresAt - TimeService.now()))
    : '';
  const weatherHtml = activeWeather && weatherDef
    ? `
      <div class="map-weather-badge" title="${weatherDef.desc}">
        ${weatherDef.icon} ${weatherDef.name}中，${weatherEffect}（剩餘${weatherRemaining}）
      </div>
    `
    : '';

  const workers = assigned.map((m) => {
    const def = MONSTERS[m.type];
    const pos = getOrInitPosition(m.id);
    const interval = S.getWorkInterval(m, activeMap, state);
    const progress = Math.min(100, ((m.workProgressMs || 0) / interval) * 100);
    const remainingSeconds = Math.max(0, Math.ceil((interval - (m.workProgressMs || 0)) / 1000));
    const relationship = S.getRelationshipSummary ? S.getRelationshipSummary(state, m) : null;
    const relationshipBadges = relationship
      ? [
          relationship.socialBonus ? '<span title="喜群居加成">👥</span>' : '',
          relationship.synergyCount > 0 ? `<span title="同場共鳴 +${relationship.synergyCount}">💚</span>` : '',
          relationship.conflictCount > 0 ? `<span title="同場衝突 ${relationship.conflictCount}">⚡</span>` : '',
        ].filter(Boolean).join('')
      : '';
    return `
      <div class="map-monster" data-monster-id="${m.id}" style="left:${pos.x}%;top:${pos.y}%;" title="${def.name}">
        ${renderMonsterWalkArt(def, pos, 'map-monster-sprite')}
        ${relationshipBadges ? `<div class="relationship-badges">${relationshipBadges}</div>` : ''}
        <div class="tiny-progress"><div class="progress-fill" style="width:${progress}%"></div></div>
        <span class="work-timer">${remainingSeconds}s</span>
      </div>
    `;
  }).join('');
  let assignmentControls = '<p class="assign-message">目前沒有可派遣的怪物</p>';
  if (isFull) {
    assignmentControls = '<button class="assign-map-button" type="button" disabled>工作位已滿</button>';
  } else if (eligibleMonsters.length > 0) {
    assignmentControls = eligibleMonsters.map((m) => `
      <button class="assign-map-button" type="button" data-action="assign-monster" data-id="${m.id}" data-map="${activeMap}">
        派遣 ${MONSTERS[m.type].name}
      </button>
    `).join('');
  }

  const upgradeHtml = nextTier
    ? `
      <button type="button" data-action="upgrade-map" data-map="${activeMap}" class="assign-map-button">
        擴建 → ${nextTier.slots} 位（${Object.entries(nextTier.cost).map(([r, a]) => `${RESOURCE_ICONS[r]}${a}`).join(' ')}）
      </button>
    `
    : '<p class="assign-message">已達最高工作位</p>';
  const specializationOptions = map.specializationOptions || [];
  const currentSpecializationId = state.maps[activeMap]?.specialization;
  const currentSpecialization = specializationOptions.find((option) => option.id === currentSpecializationId);
  const formatSpecializationEffect = (option) => {
    if (option.outputBonus) return `產量 +${Math.round(option.outputBonus * 100)}%`;
    if (option.dropChanceBonus) return `掉落機率 +${Math.round(option.dropChanceBonus * 100)}%`;
    return option.desc || '';
  };
  const specializationHtml = specializationOptions.length > 0
    ? `
      <div style="
        display:flex;flex-direction:column;gap:6px;width:100%;
        padding-top:6px;border-top:1px solid rgba(255,255,255,0.18);
      ">
        <p class="assign-message" style="margin:0;">專精</p>
        ${currentSpecialization
          ? `<button type="button" class="assign-map-button" disabled
              title="${currentSpecialization.desc}">
              ✅ ${currentSpecialization.name}（${formatSpecializationEffect(currentSpecialization)}）
            </button>`
          : specializationOptions.map((option) => `
              <button type="button" class="assign-map-button"
                data-action="set-specialization" data-map="${activeMap}" data-spec="${option.id}"
                title="${option.desc}">
                ${option.name}（${formatSpecializationEffect(option)}）
              </button>
            `).join('')
        }
      </div>
    `
    : '';
  const installedTools = state.installedTools || {};
  const mapTools = Object.values(WORK_TOOLS || {}).filter((tool) => tool.mapId === activeMap);
  const toolHtml = mapTools.length > 0
    ? `
      <div style="
        display:flex;flex-direction:column;gap:6px;width:100%;
        padding-top:6px;border-top:1px solid rgba(255,255,255,0.18);
      ">
        <p class="assign-message" style="margin:0;">工具</p>
        ${mapTools.map((tool) => {
          const isInstalled = Boolean(installedTools[tool.id]);
          const requiredTool = tool.requiresTool ? WORK_TOOLS[tool.requiresTool] : null;
          const missingRequiredTool = tool.requiresTool && !installedTools[tool.requiresTool];
          const requiredResearchDone = !tool.requires ||
            (state.completedResearch || []).includes(tool.requires) ||
            (state.research && state.research[tool.requires]);
          const requiredResearch = tool.requires ? RESEARCH[tool.requires] : null;
          const costText = Object.entries(tool.price || {})
            .map(([r, a]) => `${RESOURCE_ICONS[r] || ''}${a}`)
            .join(' ');
          const bonusText = `+${Math.round((tool.bonus || 0) * 100)}%`;

          if (isInstalled) {
            return `
              <button type="button" class="assign-map-button" disabled>
                ✅ ${tool.name} 已安裝（產量 ${bonusText}）
              </button>
            `;
          }

          if (!requiredResearchDone) {
            return `
              <button type="button" class="assign-map-button" disabled
                title="${tool.desc}">
                ${tool.name}：需要先完成「${requiredResearch?.name || tool.requires}」
              </button>
            `;
          }

          if (missingRequiredTool) {
            return `
              <button type="button" class="assign-map-button" disabled
                title="${tool.desc}">
                ${tool.name}：需要先安裝「${requiredTool?.name || tool.requiresTool}」
              </button>
            `;
          }

          return `
            <button type="button" data-action="install-tool" data-id="${tool.id}"
              class="assign-map-button" title="${tool.desc}">
              ${tool.name}（產量 ${bonusText}｜${costText}）
            </button>
          `;
        }).join('')}
      </div>
    `
    : '';

  return `
    <article class="production-map home-map-preview ${map.themeClass || ''}">
      <div class="home-map-info">
        <div>
          <p>生產地圖</p>
          <strong>${map.name}</strong>
          <span>生產：${RESOURCES[map.resource].name}</span>
        </div>
        <div>
          <span>工作位 ${slotCount}/${maxSlots}</span>
          <span>每分鐘 ${ppm > 0 ? ppm : '—'}</span>
        </div>
      </div>
      <div class="home-map-stage ${map.image ? 'has-map-art' : ''}"
        ${map.image ? `style="background-image:linear-gradient(rgba(0,0,0,0.06),rgba(0,0,0,0.06)),url('${map.image}');"` : ''}>
        ${map.image ? '' : renderDecorations(map)}
        <button type="button" class="map-page-arrow map-page-prev" data-action="switch-map" data-map="${prevMap}">‹</button>
        <button type="button" class="map-page-arrow map-page-next" data-action="switch-map" data-map="${nextMap}">›</button>
        ${weatherHtml}
        ${workers}
        <div class="home-map-controls">
          <div class="home-map-control-row">${assignmentControls}</div>
          <div class="home-map-control-row">${upgradeHtml}</div>
          ${specializationHtml ? `<div class="home-map-control-row">${specializationHtml}</div>` : ''}
          ${toolHtml ? `<div class="home-map-control-row">${toolHtml}</div>` : ''}
        </div>
      </div>
    </article>
  `;
}


function renderSaveTools() {
  return `
    <div class="panel">
      <h2>存檔工具</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" data-action="export-save" class="ghost-button">匯出存檔</button>
        <button type="button" data-action="import-save" class="ghost-button">匯入存檔</button>
        <button type="button" data-action="reset-game" class="ghost-button" style="color:#c0392b;">重置遊戲</button>
      </div>
    </div>
  `;
}


function renderLockedFeature(title, text) {
  return `
    <div class="panel">
      <h2>${title}</h2>
      <p style="font-size:0.85rem;color:#888;">${text}</p>
    </div>
  `;
}

function renderWorkshopHub() {
  const tabs = [
    { key: 'research', label: '🔬 研究台' },
    { key: 'crafting', label: '⚗ 加工坊' },
    { key: 'blueprints', label: '📐 圖紙' },
    { key: 'compendium', label: '📖 圖鑑' },
  ];
  const renderers = {
    research: () => `${renderResearchPanel()}${renderSpeciesResearch()}`,
    crafting: () => renderCrafting(),
    blueprints: () => renderBlueprints(),
    compendium: () => renderCompendium(),
  };
  const content = renderers[workshopTab]
    ? renderers[workshopTab]()
    : renderers.research();

  return `
    <div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;">
      ${tabs.map((tab) => `
        <button type="button" data-action="workshop-tab" data-tab="${tab.key}" style="
          flex:1;min-width:88px;padding:7px 10px;border-radius:8px;font-size:0.78rem;
          background:${workshopTab === tab.key ? '#2d6a4f' : '#f7f4f0'};
          color:${workshopTab === tab.key ? '#fff' : '#888'};
          border:1px solid ${workshopTab === tab.key ? '#2d6a4f' : '#e0d8d0'};
        ">${tab.label}</button>
      `).join('')}
    </div>
    ${content}
  `;
}

function renderCampInfoHub() {
  const season = state.season || { type: 'spring', seasonDayCount: 0 };
  const seasonInfo = S.getSeasonInfo ? S.getSeasonInfo(season.type) : { name: '春季', icon: '🌸' };
  const daysPerSeason = CONFIG.seasonDays || 7;
  const dayText = `${(season.seasonDayCount || 0) + 1}/${daysPerSeason}`;
  const tabs = [
    { key: 'exhibition', label: '🏛️ 展覽館' },
    { key: 'layout', label: '🎨 佈置' },
    { key: 'milestones', label: '🏆 里程碑' },
    { key: 'report', label: '📊 管理報表' },
  ];
  const renderers = {
    exhibition: () => renderExhibition(),
    layout: () => renderCampLayout(),
    milestones: () => renderMilestones(),
    report: () => renderManagementReport(),
  };
  const content = renderers[campInfoTab]
    ? renderers[campInfoTab]()
    : renderers.exhibition();

  return `
    <div class="panel" style="margin-bottom:12px;">
      <h2>營地資訊</h2>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <div>
          <strong style="font-size:1rem;">${seasonInfo.icon} ${seasonInfo.name}</strong>
          <p style="font-size:0.78rem;color:#888;margin-top:3px;">本季第 ${dayText} 天</p>
        </div>
        <span style="
          font-size:0.75rem;color:#2d6a4f;
          background:#f0f7f3;border:1px solid #2d6a4f;
          border-radius:999px;padding:4px 10px;
        ">季節會影響天氣與怕冷怪物心情</span>
      </div>
    </div>
    <div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;">
      ${tabs.map((tab) => `
        <button type="button" data-action="camp-info-tab" data-tab="${tab.key}" style="
          flex:1;min-width:100px;padding:7px 10px;border-radius:8px;font-size:0.78rem;
          background:${campInfoTab === tab.key ? '#2d6a4f' : '#f7f4f0'};
          color:${campInfoTab === tab.key ? '#fff' : '#888'};
          border:1px solid ${campInfoTab === tab.key ? '#2d6a4f' : '#e0d8d0'};
        ">${tab.label}</button>
      `).join('')}
    </div>
    ${content}
  `;
}


function renderCampLayout() {
  const layout = S.normalizeCampLayout(state.campLayout);
  const selectedSlot = Math.max(0, Math.min(decorationSlotIndex || 0, layout.length - 1));
  const ownedDecorations = S.getOwnedDecorations(state);
  const ownedIds = ownedDecorations.map((decoration) => decoration.id);
  const lockedDecorations = Object.values(DECORATIONS || {})
    .filter((decoration) => !ownedIds.includes(decoration.id));

  return `
    <div class="panel">
      <h2>🎨 營地佈置</h2>
      <p style="font-size:0.78rem;color:#888;margin-bottom:10px;">
        選擇格子後放入已解鎖的裝飾品，純視覺展示，不影響數值。
      </p>

      <div class="camp-decoration-grid">
        ${layout.map((decorationId, index) => {
          const decoration = DECORATIONS[decorationId];
          const selected = index === selectedSlot;
          return `
            <button type="button" data-action="select-decoration-slot" data-slot="${index}"
              class="camp-decoration-slot ${selected ? 'selected' : ''}">
              <span class="camp-decoration-icon">${decoration ? decoration.icon : '＋'}</span>
              <span class="camp-decoration-name">${decoration ? decoration.name : `空格 ${index + 1}`}</span>
            </button>
          `;
        }).join('')}
      </div>

      <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f0ebe5;">
        <p style="font-size:0.78rem;font-weight:600;color:#888;margin-bottom:8px;">
          第 ${selectedSlot + 1} 格
        </p>
        <div class="camp-decoration-palette">
          ${ownedDecorations.map((decoration) => {
            const isPlacedHere = layout[selectedSlot] === decoration.id;
            return `
              <button type="button" data-action="place-decoration"
                data-slot="${selectedSlot}" data-id="${decoration.id}"
                class="camp-decoration-choice ${isPlacedHere ? 'active' : ''}">
                <span>${decoration.icon}</span>
                <span>${decoration.name}</span>
              </button>
            `;
          }).join('')}
          <button type="button" data-action="clear-decoration-slot"
            data-slot="${selectedSlot}" class="camp-decoration-choice muted">
            <span>🧹</span>
            <span>清空</span>
          </button>
        </div>
      </div>

      ${lockedDecorations.length > 0 ? `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f0ebe5;">
          <p style="font-size:0.72rem;color:#aaa;margin-bottom:6px;">尚未解鎖</p>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${lockedDecorations.map((decoration) => `
              <span style="
                font-size:0.72rem;color:#aaa;background:#f7f4f0;
                border:1px solid #e0d8d0;border-radius:8px;padding:5px 8px;
              " title="${decoration.source?.label || ''}">
                ${decoration.icon} ${decoration.name}
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}


function renderFeatureModal() {
  if (!featureModal) return '';

  const featureTitles = {
    workshop: '研究工坊',
    'camp-info': '營地資訊',
    research: '研究台',
    quests: '委託板',
    market: '市場',
    crafting: '加工坊',
    exchange: '證明兌換',
    exhibition: '展覽館',
    visitors: '訪客',
    blueprints: '圖紙',
    compendium: '研究圖鑑',
    report: '管理報表',
    milestones: '里程碑',
    save: '存檔',
    dev: '開發面板',
  };
  const featureRenderers = {
    workshop: () => renderWorkshopHub(),
    'camp-info': () => renderCampInfoHub(),
    research: () => `${renderResearchPanel()}${renderSpeciesResearch()}`,
    quests: () => S.hasUnlock(state, 'quests')
      ? renderQuestBoard()
      : renderLockedFeature('委託板', '完成「委託板」研究後解鎖。'),
    market: () => renderMarketHub(),
    crafting: () => renderCrafting(),
    exchange: () => renderCertExchange(),
    exhibition: () => renderExhibition(),
    visitors: () => renderVisitors(),
    blueprints: () => renderBlueprints(),
    compendium: () => renderCompendium(),
    report: () => renderManagementReport(),
    milestones: () => renderMilestones(),
    save: () => renderSaveTools(),
    dev: () => renderDevPanel(),
  };
  const title = featureTitles[featureModal] || '功能';
  const content = featureModal && featureRenderers[featureModal]
    ? featureRenderers[featureModal]()
    : '';

  return `
    <div class="modal-overlay">
      <div class="modal-sheet">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close" type="button" data-action="close-feature-modal">關閉</button>
        </div>
        ${content}
      </div>
    </div>
  `;
}


function getNextStepHints() {
  const hints = [];

  if (!state.buildings.researchTable) {
    const canBuild = S.canAfford(state.resources, BUILDINGS.researchTable.cost);
    if (canBuild) hints.push('💡 資源充足，可以建造研究台了！');
    else hints.push('💡 採集木材和礦石，準備建造研究台。');
  } else if (!state.research.capture) {
    const canResearch = S.canAfford(state.resources, RESEARCH.capture.cost);
    if (canResearch) hints.push('💡 可以在研究台完成捕捉研究了！');
    else hints.push('💡 繼續採集資源，準備完成捕捉研究。');
  } else if (state.monsters.length === 0) {
    hints.push('💡 前往野外捕捉第一隻怪物！');
  } else {
    const idleMonsters = state.monsters.filter((m) => !m.assignedMap);
    if (idleMonsters.length > 0) {
      hints.push(`💡 有 ${idleMonsters.length} 隻怪物待命中，去生產地圖派工吧！`);
    }
    const hasCoins = (state.resources.Coins || 0) >= 50;
    if (hasCoins) hints.push('💡 營地幣充足，可以去市場購買道具！');

    const pendingQuests = (state.activeQuests || []).filter((q) => !q.completed);
    const completableQuests = pendingQuests.filter((q) => S.canCompleteQuest(state, q.id).can);
    if (completableQuests.length > 0) {
      hints.push(`💡 有 ${completableQuests.length} 個委託可以完成，記得領取獎勵！`);
    }

    const nearCapResources = Object.entries(CONFIG.resourceCaps)
      .filter(([key, cap]) => key !== 'Coins' && (state.resources[key] || 0) / cap >= 0.9);
    if (nearCapResources.length > 0) {
      const names = nearCapResources.map(([key]) => RESOURCES[key]?.name || key).join('、');
      hints.push(`⚠️ ${names} 快滿了，記得去市場賣出！`);
    }
  }

  return hints;
}


function renderNotificationCenter() {
  const hints = getNextStepHints();
  const recentNotifications = notifications.slice(-5).reverse();

  return `
    <div class="panel">
      <h2>📬 通知中心</h2>
      ${hints.length > 0
        ? `<div style="margin-bottom:10px;">
            ${hints.map((h) => `
              <p style="font-size:0.82rem;color:#555;padding:4px 0;border-bottom:1px solid #f0ebe5;">
                ${h}
              </p>
            `).join('')}
          </div>`
        : ''
      }
      ${recentNotifications.length > 0
        ? `<div>
            <p style="font-size:0.72rem;color:#aaa;margin-bottom:4px;">最近通知</p>
            ${recentNotifications.map((n) => `
              <p style="font-size:0.78rem;color:#888;padding:3px 0;">
                ${n.message}
              </p>
            `).join('')}
          </div>`
        : '<p style="font-size:0.78rem;color:#aaa;">目前沒有通知。</p>'
      }
    </div>
  `;
}


function renderMilestones() {
  const total = Object.keys(MILESTONES).length;
  const unlocked = (state.unlockedMilestones || []).length;

  return `
    <div class="panel">
      <h2>里程碑 ${unlocked}/${total}</h2>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${Object.values(MILESTONES).map((m) => {
          const done = (state.unlockedMilestones || []).includes(m.id);
          return `
            <div style="
              padding:6px 10px;border-radius:8px;
              background:${done ? '#f0f7f3' : '#f7f4f0'};
              border:1px solid ${done ? '#2d6a4f' : '#e0d8d0'};
              font-size:0.78rem;color:${done ? '#2d6a4f' : '#aaa'};
            " title="${m.desc}">
              ${m.icon} ${m.name}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}


function renderMarket() {
  const prices = state.marketPrices || {};

  return `
    <div class="panel">
      <h2>動態市場</h2>
      <div class="stack">
        <p style="font-size:0.78rem;color:#888;margin-bottom:4px;">今日收購價格（每單位）</p>
        ${MARKET_SELL_RESOURCES.map((resource) => {
          const base = MARKET_BASE_PRICES[resource];
          const price = prices[resource] || base;
          const isHigh = price > base;
          const isLow = price < base;
          const color = isHigh ? '#2d6a4f' : isLow ? '#e74c3c' : '#555';
          const trend = isHigh ? '↑' : isLow ? '↓' : '—';
          return `
            <div class="row-item">
              <div>
                <strong>${RESOURCE_ICONS[resource]} ${RESOURCES[resource].name}</strong>
                <span style="color:#aaa;">庫存：${state.resources[resource] || 0}</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="color:${color};font-weight:600;">🪙${price} ${trend}</span>
                <button type="button" data-action="sell-resource"
                  data-resource="${resource}" data-amount="10"
                  ${(state.resources[resource] || 0) < 10 ? 'disabled' : ''}>
                  賣10
                </button>
                <button type="button" data-action="sell-resource"
                  data-resource="${resource}" data-amount="50"
                  ${(state.resources[resource] || 0) < 50 ? 'disabled' : ''}>
                  賣50
                </button>
              </div>
            </div>
          `;
        }).join('')}

        <p style="font-size:0.78rem;color:#888;margin-top:8px;margin-bottom:4px;">消耗品購買</p>
        ${Object.values(MARKET_ITEMS).map((item) => {
          const owned = (state.inventory || {})[item.id] || 0;
          const canBuy = (state.resources.Coins || 0) >= item.basePrice;
          return `
            <div class="row-item">
              <div>
                <strong>${item.name}</strong>
                <span>${item.desc}</span>
                <span style="font-size:0.72rem;color:#aaa;">持有：${owned} 個</span>
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:0.82rem;color:#888;">🪙${item.basePrice}</span>
                <button type="button" data-action="buy-market-item"
                  data-id="${item.id}" ${canBuy ? '' : 'disabled'}>購買</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderMarketTabs() {
  const tabs = [
    { key: 'market', label: '市場' },
    { key: 'merchant', label: '商人' },
    { key: 'black', label: '黑市商人' },
    { key: 'visitors', label: '訪客' },
  ];

  return `
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
      ${tabs.map((tab) => `
        <button type="button" data-action="market-tab" data-tab="${tab.key}" style="
          flex:1;min-width:90px;padding:8px;border-radius:8px;font-size:0.82rem;
          background:${marketTab === tab.key ? '#2d6a4f' : '#f7f4f0'};
          color:${marketTab === tab.key ? '#fff' : '#888'};
          border:1px solid ${marketTab === tab.key ? '#2d6a4f' : '#e0d8d0'};
        ">${tab.label}</button>
      `).join('')}
    </div>
  `;
}

function renderMarketHub() {
  const content = marketTab === 'merchant'
    ? renderMerchants('merchant')
    : marketTab === 'black'
      ? renderMerchants('black')
      : marketTab === 'visitors'
        ? renderVisitors()
        : renderMarket();

  return `
    ${renderMarketTabs()}
    ${content}
  `;
}


function renderQuestBoard() {
  if (!S.hasUnlock(state, 'quests')) return '';

  const quests = state.activeQuests || [];
  if (quests.length === 0) {
    return `
      <div class="panel">
        <h2>委託板</h2>
        <button type="button" data-action="refresh-quests" style="width:100%;padding:10px;background:#2d6a4f;color:#fff;border-radius:8px;">
          刷新委託
        </button>
      </div>
    `;
  }

  return `
    <div class="panel">
      <h2>委託板</h2>
      <div class="stack">
        ${quests.map((q) => {
          const quest = QUESTS[q.id];
          if (!quest) return '';
          const check = S.canCompleteQuest(state, q.id);
          const diffColor = quest.difficulty === 'hard' ? '#e74c3c' : quest.difficulty === 'normal' ? '#f0a500' : '#2d6a4f';
          const rewardText = Object.entries(quest.reward)
            .map(([r, a]) => r === 'researchPoints'
              ? `研究點${a}`
              : `${RESOURCE_ICONS[r] || ''}${RESOURCES[r]?.name || r}${a}`)
            .join(' ');
          const requireText = quest.type === 'resource'
            ? Object.entries(quest.require).map(([r, a]) => `${RESOURCE_ICONS[r] || r}${a}`).join(' ')
            : quest.require.monsterSpecialty
              ? `${MAPS[quest.require.monsterSpecialty]?.name || ''} 專長怪物 ×${quest.require.monsterCount}`
              : `任意怪物 ×${quest.require.monsterCount}`;

          return `
            <div class="row-item" style="${q.completed ? 'opacity:0.5;' : ''}">
              <div>
                <strong style="color:${diffColor};">[${quest.difficulty === 'easy' ? '簡單' : quest.difficulty === 'normal' ? '普通' : '困難'}] ${quest.name}</strong>
                <span>${quest.desc}</span>
                ${quest.requiresQuest ? `<span style="font-size:0.72rem;color:#aaa;">連鎖：完成「${QUESTS[quest.requiresQuest]?.name || quest.requiresQuest}」後出現</span>` : ''}
                <span style="font-size:0.72rem;color:#aaa;">需要：${requireText}</span>
                <span style="font-size:0.72rem;color:#2d6a4f;">獎勵：${rewardText}</span>
                ${!check.can && !q.completed ? `<span style="font-size:0.72rem;color:#e74c3c;">${check.reason}</span>` : ''}
              </div>
              ${!q.completed
                ? `<button type="button" data-action="complete-quest" data-id="${q.id}"
                    ${check.can ? '' : 'disabled'}>完成</button>`
                : '<span style="color:#2d6a4f;font-size:0.82rem;">✅</span>'
              }
            </div>
          `;
        }).join('')}
        <button type="button" data-action="refresh-quests" class="ghost-button" style="width:100%;margin-top:4px;">
          明天再刷新
        </button>
      </div>
    </div>
  `;
}


