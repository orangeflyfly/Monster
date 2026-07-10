function handleAction(target) {
  try {
    handleActionUnsafe(target);
  } catch (err) {
    console.error('[handleAction] 操作失敗：', err);
    if (typeof showMessage === 'function') {
      showMessage('操作失敗，請重試。');
    }
  }
}

function handleActionUnsafe(target) {
  const action = target.dataset.action;
  if (!action) {
    return;
  }

  if (action === 'start-game') {
    const playerName = document.getElementById('player-name')?.value?.trim();
    const campName = document.getElementById('camp-name')?.value?.trim();
    if (!playerName) { message = '請輸入你的名字！'; render(); return; }
    if (!campName) { message = '請輸入營地名稱！'; render(); return; }
    state.playerName = playerName;
    state.campName = campName;
    state.started = true;
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'continue-game') {
    state.started = true;
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'close-offline-modal') {
    offlineEarnings = null;
    render();
    return;
  }

  if (action === 'open-feature') {
    featureModal = target.dataset.feature || '';
    render();
    return;
  }

  if (action === 'close-feature-modal') {
    featureModal = '';
    render();
    return;
  }

  if (action === 'market-tab') {
    marketTab = target.dataset.tab || 'market';
    render();
    return;
  }

  if (action === 'vault-tab') {
    vaultTab = target.dataset.tab || 'vault';
    vaultSelectedId = '';
    render();
    return;
  }

  if (action === 'workshop-tab') {
    workshopTab = target.dataset.tab || 'research';
    render();
    return;
  }

  if (action === 'camp-info-tab') {
    campInfoTab = target.dataset.tab || 'exhibition';
    render();
    return;
  }

  if (action === 'select-decoration-slot') {
    const slot = Number(target.dataset.slot);
    if (Number.isInteger(slot)) {
      decorationSlotIndex = slot;
    }
    render();
    return;
  }

  if (action === 'place-decoration') {
    const result = S.placeDecoration(state, target.dataset.slot, target.dataset.id);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'clear-decoration-slot') {
    const result = S.clearDecorationSlot(state, target.dataset.slot);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'open-expedition-select') {
    expeditionSelectId = target.dataset.id;
    selectedExpeditionMonsters = [];
    render();
    return;
  }

  if (action === 'close-expedition-select') {
    expeditionSelectId = '';
    selectedExpeditionMonsters = [];
    render();
    return;
  }

  if (action === 'toggle-expedition-monster') {
    const mId = target.dataset.id;
    const exp = EXPEDITIONS[expeditionSelectId];
    if (!exp) return;

    if (selectedExpeditionMonsters.includes(mId)) {
      selectedExpeditionMonsters = selectedExpeditionMonsters.filter((id) => id !== mId);
      document.getElementById(`exp-slot-${mId}`)?.classList.remove('selected');
    } else if (selectedExpeditionMonsters.length < exp.requiredMonsters) {
      selectedExpeditionMonsters.push(mId);
      document.getElementById(`exp-slot-${mId}`)?.classList.add('selected');
    }
    return;
  }

  if (action === 'confirm-expedition') {
    const expId = target.dataset.id;
    const exp = EXPEDITIONS[expId];
    if (!exp) return;
    if (selectedExpeditionMonsters.length < exp.requiredMonsters) {
      showMessage(`請選擇 ${exp.requiredMonsters} 隻怪物。`);
      return;
    }
    const result = S.startExpedition(state, expId, selectedExpeditionMonsters);
    state = result.state;
    expeditionSelectId = '';
    selectedExpeditionMonsters = [];
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'collect-expedition') {
    const result = S.collectExpeditionReward(state, target.dataset.id);
    state = result.state;
    showMessage(result.message);
    (result.chronicleMessages || []).forEach((msg) => showMessage(msg));
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'open-vault') {
    vaultOpen = true;
    vaultSelectedId = '';
    render();
    return;
  }

  if (action === 'close-vault') {
    vaultOpen = false;
    vaultSelectedId = '';
    render();
    return;
  }

  if (action === 'open-backpack') {
    backpackOpen = true;
    render();
    return;
  }

  if (action === 'close-backpack') {
    backpackOpen = false;
    render();
    return;
  }

  if (action === 'backpack-tab') {
    backpackTab = target.dataset.tab;
    render();
    return;
  }

  if (action === 'claim-collection') {
    const result = S.claimCollectionReward(state, target.dataset.id);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'vault-select') {
    vaultSelectedId = target.dataset.id;
    render();
    return;
  }

  if (action === 'vault-filter') {
    vaultFilter = target.dataset.filter;
    render();
    return;
  }

  if (action === 'toggle-lock') {
    const monster = state.monsters.find((m) => m.id === target.dataset.id);
    if (monster) {
      monster.locked = !monster.locked;
      state = S.saveGame(state);
      render();
    }
    return;
  }

  if (action === 'toggle-favorite') {
    const monster = state.monsters.find((m) => m.id === target.dataset.id);
    if (monster) {
      monster.favorite = !monster.favorite;
      state = S.saveGame(state);
      render();
    }
    return;
  }

  if (action === 'apply-purify') {
    const result = S.applyPurifyLiquid(state, target.dataset.id);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'use-mood-item') {
    const result = S.useMoodItem(state, target.dataset.monsterId, target.dataset.itemId);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'start-training') {
    const monsterId = target.dataset.monsterId;
    const courseId = target.dataset.courseId;
    const result = S.startTraining(state, monsterId, courseId);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'start-crafting') {
    const result = S.startCrafting(state, target.dataset.id);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'buy-merchant') {
    const result = S.buyFromMerchant(state, target.dataset.id, target.dataset.type);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'exchange-cert') {
    const result = S.exchangeCert(state, target.dataset.id);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'export-save') {
    S.exportSave(state);
    return;
  }

  if (action === 'import-save') {
    S.importSave((newState) => {
      stopArenaLoop();
      arenaBattle = null;
      state = newState;
      activeView = 'camp';
      render();
    });
    return;
  }

  if (action === 'reset-game') {
    if (confirm('確定要重置遊戲嗎？所有進度將會清除。')) {
      stopArenaLoop();
      arenaBattle = null;
      state = S.resetGame();
      activeView = 'camp';
      render();
    }
    return;
  }

  if (action === 'dev-add-resources') {
    if (!CONFIG.devMode) return;
    CONFIG.CORE_RESOURCE_KEYS.forEach((key) => {
      state.resources = S.addResourceToResources(state.resources, key, 100);
    });
    state.resources = S.addResourceToResources(state.resources, 'Coins', 100);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'dev-add-monster') {
    if (!CONFIG.devMode) return;
    const types = Object.keys(MONSTERS);
    const type = types[Math.floor(Math.random() * types.length)];
    const newMonster = S.createMonster(type);
    if (state.monsters.length < S.getVaultLimit(state)) {
      state.monsters.push(newMonster);
      state = S.saveGame(state);
    }
    render();
    return;
  }

  if (action === 'dev-skip-time') {
    if (!CONFIG.devMode) return;
    const oneHourMs = 60 * 60 * 1000;
    state.lastSavedAt = TimeService.now() - oneHourMs;
    state.lastProcessedAt = 0;
    state = S.applyOfflineProduction(state, TimeService.now()).state;
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'dev-clear-save') {
    if (!CONFIG.devMode) return;
    if (confirm('確定清除所有存檔？')) {
      stopArenaLoop();
      arenaBattle = null;
      state = S.resetGame();
      activeView = 'camp';
      render();
    }
    return;
  }

  if (action === 'gather') {
    const result = S.gatherResource(state, target.dataset.resource);
    state = result.state;
    addFloatingText(`+${result.amount}`, target.dataset.resource);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'build-table') {
    const result = S.buildStructure(state, 'researchTable');
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'research-capture') {
    const result = S.completeResearch(state, 'capture');
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'build-tank') {
    const result = S.buildCultivationTank(state, target.dataset.id);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'install-tool') {
    const result = S.installTool(state, target.dataset.id);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'set-specialization') {
    const mapId = target.dataset.map;
    const specId = target.dataset.spec;
    if (!confirm('確定要選擇此專精方向嗎？選擇後無法更改。')) return;
    const result = S.setMapSpecialization(state, mapId, specId);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'do-research') {
    const result = S.doResearch(state, target.dataset.id);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'view-wild') {
    if (!state.research.capture) {
      showMessage('需要先完成捕捉研究。');
    } else {
      if (activeView === 'arena' && arenaBattle) {
        leaveArenaView();
        return;
      }
      activeView = 'wild';
    }
    render();
    return;
  }

  if (action === 'view-camp') {
    if (activeView === 'arena' && arenaBattle) {
      leaveArenaView();
      return;
    }
    activeView = 'camp';
    render();
    return;
  }

  if (action === 'enter-arena') {
    activeView = 'arena';
    render();
    if (arenaBattle) startArenaLoop();
    return;
  }

  if (action === 'leave-arena') {
    leaveArenaView();
    return;
  }

  if (action === 'select-arena-monster') {
    arenaSelectedMonsterId = target.dataset.id || '';
    render();
    return;
  }

  if (action === 'select-arena-stage') {
    arenaSelectedStageId = target.dataset.id || 'trial_1';
    render();
    return;
  }

  if (action === 'start-arena-battle') {
    const monsterId = target.dataset.monsterId || arenaSelectedMonsterId;
    const stageId = target.dataset.stageId || arenaSelectedStageId;
    const result = S.startArenaBattle(state, monsterId, stageId);
    state = result.state;
    showMessage(result.message);
    if (result.battle) {
      arenaBattle = result.battle;
      activeView = 'arena';
      render();
      startArenaLoop();
    } else {
      render();
    }
    return;
  }

  if (action === 'find-encounter') {
    state = S.processWildResourceRecovery(state);
    const findChance = 0.5 + ((state.wildResourceIndex || 0) / 100) * 0.5;
    if (Math.random() > findChance) {
      encounter = null;
      showMessage('這次搜尋沒有發現任何蹤跡，野外的怪物似乎變少了。');
      render();
      return;
    }

    encounter = S.getWildEncounter();
    const rate = S.getCaptureRateRange(state, encounter);
    showMessage(`野外發現${encounter.name}，捕捉率約 ${Math.round(rate.min * 100)}%–${Math.round(rate.max * 100)}%。`);
    render();
    return;
  }

  if (action === 'capture') {
    const targetMonster = encounter || S.getWildEncounter();
    const result = S.attemptCapture(state, targetMonster.id);
    state = result.state;
    encounter = result.caught ? null : targetMonster;
    showMessage(result.message);
    state = S.saveGame(state);
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
    vaultOpen = false;
    vaultSelectedId = '';
    showMessage('怪物已撤回倉庫。');
    state = S.saveGame(state);
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
    const result = S.releaseMonster(state, target.dataset.id);
    state = result.state;
    if (selectedMonsterId === target.dataset.id) {
      selectedMonsterId = '';
    }
    vaultOpen = false;
    vaultSelectedId = '';
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'retire-monster') {
    if (!confirm('確定要讓這隻怪物退役嗎？將獲得材料但怪物會消失。')) return;
    const result = S.retireMonster(state, target.dataset.id);
    state = result.state;
    vaultSelectedId = '';
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'sell-black-market') {
    const def = MONSTERS[state.monsters.find((m) => m.id === target.dataset.id)?.type];
    if (!confirm(`確定要把${def?.name || '這隻怪物'}賣給黑市嗎？`)) return;
    const result = S.sellToBlackMarket(state, target.dataset.id);
    state = result.state;
    vaultSelectedId = '';
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'switch-map') {
    activeMap = target.dataset.map;
    render();
    return;
  }

  if (action === 'start-breeding') {
    const parentA = document.getElementById('breed-parent-a')?.value;
    const parentB = document.getElementById('breed-parent-b')?.value;

    if (!parentA || !parentB) {
      showMessage('請選擇兩隻怪物。');
      return;
    }
    if (parentA === parentB) {
      showMessage('不能選擇同一隻怪物。');
      return;
    }

    const checkedLiquids = [...document.querySelectorAll('input[data-gene]:checked')]
      .map((element) => element.dataset.gene);
    const result = S.startBreeding(state, parentA, parentB, checkedLiquids);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'use-breeding-hint') {
    const result = S.useBreedingHint(state);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'add-exhibition') {
    const result = S.addToExhibition(state, target.dataset.id);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'remove-exhibition') {
    const result = S.removeFromExhibition(state, target.dataset.id);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'visitor-action') {
    const visitorId = target.dataset.visitorId;
    const actionId = target.dataset.actionId;
    const result = S.handleVisitorAction(state, visitorId, actionId);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'preserve-gene') {
    const monsterId = target.dataset.id;
    const traitIndex = parseInt(target.dataset.index, 10);
    const result = S.preserveGene(state, monsterId, traitIndex);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'remove-gene') {
    state = S.removeFromGenePool(state, target.dataset.id);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'attempt-gene-research') {
    const result = S.attemptGeneResearch(state);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'learn-blueprint') {
    const result = S.learnBlueprint(state, target.dataset.id);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'craft-blueprint') {
    const result = S.craftFromBlueprint(state, target.dataset.id);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'upgrade-map') {
    const mapId = target.dataset.map;
    const result = S.upgradeMap(state, mapId);
    state = result.state;
    message = result.message;
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'upgrade-vault') {
    const result = S.upgradeVault(state);
    state = result.state;
    message = result.message;
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'refresh-quests') {
    const result = S.refreshQuests(state);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'complete-quest') {
    const result = S.completeQuest(state, target.dataset.id);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'sell-resource') {
    const resource = target.dataset.resource;
    const amount = parseInt(target.dataset.amount, 10);
    const result = S.sellResource(state, resource, amount);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'buy-market-item') {
    const result = S.buyMarketItem(state, target.dataset.id);
    state = result.state;
    showMessage(result.message);
    state = S.saveGame(state);
    render();
    return;
  }

  if (action === 'reset') {
    stopArenaLoop();
    arenaBattle = null;
    state = S.resetGame();
    activeView = 'camp';
    activeMap = 'forest';
    selectedMonsterId = '';
    vaultOpen = false;
    vaultSelectedId = '';
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

    if (monster.assignedMap) {
      showMessage('只能派遣待命中的怪物。');
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
    state = S.saveGame(state);
    render();
    return;
  }
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (target) {
    handleAction(target);
  }
});
