function buildOfflineEarnings(loadedState, offlineResult) {
  if (offlineResult.offlineMs <= 60000 || !loadedState.playerName) {
    return null;
  }

  const before = loadedState.resources;
  const after = offlineResult.state.resources;
  const earned = {};
  Object.keys(after).forEach((key) => {
    const diff = (after[key] || 0) - (before[key] || 0);
    if (diff > 0) earned[key] = diff;
  });
  return { ms: offlineResult.offlineMs, resources: earned };
}

function refreshDailyState(nextState) {
  return S.refreshWeatherEvents(S.generateMerchantStock(S.applyMarketRefresh(S.refreshSeason(nextState))));
}

function processGameTick() {
  try {
    processGameTickUnsafe();
  } catch (err) {
    console.error('[processGameTick] 發生錯誤，本次tick已跳過：', err);
  }
}

function processGameTickUnsafe() {
    state = refreshDailyState(state);
    if (!state.playerName) {
      return;
    }

    state = S.processMoodDecay(state);
    state = S.processWildResourceRecovery(state);
    state = S.processWork(state, CONFIG.tickMs);
    if (typeof spawnFloatText === 'function') {
      state.monsters.forEach((monster) => {
        if (monster._justProduced) {
          const mapElement = document.querySelector(`.map-monster[data-monster-id="${monster.id}"]`);
          if (mapElement) {
            const resource = MAPS[monster.assignedMap]?.resource;
            spawnFloatText(mapElement, `+1 ${RESOURCE_ICONS[resource] || ''}`);
          }
          delete monster._justProduced;
        }
      });
    }
    state = S.processVisitors(state);
    if (Math.random() < 0.01) {
      state = S.generateVisitor(state);
    }
    if (TimeService.now() % 60000 < CONFIG.tickMs) {
      state = S.processExhibition(state);
    }

    const trainingResult = S.checkTrainingComplete(state);
    state = trainingResult.state;
    const trainingMessages = trainingResult.messages || [];
    if (trainingMessages.length > 0) {
      trainingMessages.forEach((msg) => showMessage(msg));
    }

    state.monsters.forEach((monster) => {
      if (!monster.assignedMap) return;
      if (!MONSTERS[monster.type]?.mutations) return;
      if (Math.random() > 0.001) return;

      const result = S.checkMonsterMutation(state, monster.id);
      if (result.mutated) {
        state = result.state;
        showMessage(`✨ ${result.mutationIcon} 變異！怪物變成了「${result.mutationName}」！`);
        state = S.saveGame(state);
      }
    });

    const craftingResult = S.checkCraftingComplete(state);
    state = craftingResult.state;
    const craftingMessages = craftingResult.messages || [];
    if (craftingMessages.length > 0) {
      craftingMessages.forEach((msg) => showMessage(msg));
    }

    const hatchResult = S.checkEggHatch(state);
    state = hatchResult.state;
    const hatchMessages = hatchResult.messages || [];
    if (hatchMessages.length > 0) {
      hatchMessages.forEach((msg) => showMessage(msg));
    }

    const expResult = S.checkExpeditionComplete(state);
    state = expResult.state;
    const expeditionMessages = expResult.messages || [];
    if (expeditionMessages.length > 0) {
      expeditionMessages.forEach((msg) => showMessage(msg));
      state = S.saveGame(state);
    }

    const milestoneResult = S.checkMilestones(state);
    state = milestoneResult.state;
    if (milestoneResult.newUnlocked.length > 0) {
      const names = milestoneResult.newUnlocked
        .map((id) => MILESTONES[id]?.name || id)
        .join('、');
      showMessage(`🏆 里程碑達成：${names}！`);
    }

    state.lastProcessedAt = TimeService.now();
    updateResourceDisplays();
    updateMapVisuals();
}

function processVisualTick() {
  try {
    processVisualTickUnsafe();
  } catch (err) {
    console.error('[processVisualTick] 發生錯誤，本次動畫更新已跳過：', err);
  }
}

function processVisualTickUnsafe() {
    if (!state.playerName || !state.started) {
      return;
    }

    if (activeView === 'camp') {
      tickMonsterPositions();
      prunePositions(state.monsters);
      updateMapVisuals();
    }
}

function autosaveGame() {
  try {
    if (state.playerName && !arenaBattle) {
      state = S.saveGame(state);
    }
  } catch (err) {
    console.error('[autosaveGame] 自動存檔失敗：', err);
  }
}

function initGame() {
  loaded = S.loadGame();
  offline = S.applyOfflineProduction(loaded, TimeService.now());
  state = refreshDailyState(offline.state);
  offlineEarnings = buildOfflineEarnings(loaded, offline);
  message = state.playerName ? formatOffline(offline.offlineMs) : '請輸入玩家名稱，開始建立營地。';
  if (state.playerName) {
    state = S.saveGame(state);
  }

  setInterval(processGameTick, CONFIG.tickMs);
  setInterval(processVisualTick, 260);
  setInterval(autosaveGame, CONFIG.autosaveMs);

  window.addEventListener('beforeunload', () => {
    if (state.playerName) {
      S.saveGame(state);
    }
  });

  render();
  if (state.playerName && message) {
    scheduleMessageClear();
  }
}

initGame();
