function renderArena() {
  const idleMonsters = state.monsters.filter((monster) =>
    S.getMonsterActivity(state, monster.id)?.type === 'idle'
  );
  const selectedMonster = state.monsters.find((monster) => monster.id === arenaSelectedMonsterId) || idleMonsters[0];
  const selectedStage = ARENA_STAGES[arenaSelectedStageId] || Object.values(ARENA_STAGES)[0];

  if (selectedMonster && !arenaSelectedMonsterId) {
    arenaSelectedMonsterId = selectedMonster.id;
  }

  return `
    <section class="panel wide arena-panel">
      <div class="modal-header" style="padding:0;margin-bottom:12px;">
        <h2>怪物試煉場</h2>
        <button class="modal-close" type="button" data-action="leave-arena">返回營地</button>
      </div>

      ${arenaBattle ? renderArenaBattle() : `
        <div class="arena-setup">
          <div>
            <p style="font-size:0.78rem;font-weight:600;color:#888;margin-bottom:8px;">選擇出戰怪物</p>
            <div class="arena-choice-grid">
              ${idleMonsters.length === 0
                ? '<p class="empty-state">目前沒有待命怪物可出戰。</p>'
                : idleMonsters.map((monster) => {
                    const def = MONSTERS[monster.type];
                    const stats = S.calcArenaMonsterStats(monster);
                    const selected = selectedMonster && selectedMonster.id === monster.id;
                    return `
                      <button type="button" data-action="select-arena-monster" data-id="${monster.id}"
                        class="arena-choice ${selected ? 'selected' : ''}">
                        <span class="arena-choice-icon">${renderMonsterArt(def, 'inline-monster-art')}</span>
                        <strong>${def.name}</strong>
                        <span>${CONFIG.skillNames[stats.skillKey]} ${stats.skillValue}｜攻擊 ${stats.attack}</span>
                      </button>
                    `;
                  }).join('')
              }
            </div>
          </div>

          <div>
            <p style="font-size:0.78rem;font-weight:600;color:#888;margin-bottom:8px;">選擇試煉關卡</p>
            <div class="stack">
              ${Object.values(ARENA_STAGES).map((stage) => `
                <button type="button" data-action="select-arena-stage" data-id="${stage.id}"
                  class="arena-stage-choice ${selectedStage.id === stage.id ? 'selected' : ''}">
                  <span>${stage.boss ? '👑' : stage.rare ? '🔮' : '⚔️'} ${stage.name}</span>
                  <small>${stage.enemyIcon} ${stage.enemyName}｜攻擊 ${stage.enemySkill}</small>
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <button type="button" data-action="start-arena-battle"
          data-monster-id="${selectedMonster ? selectedMonster.id : ''}"
          data-stage-id="${selectedStage ? selectedStage.id : ''}"
          ${buttonDisabled(!selectedMonster || !selectedStage)}
          style="width:100%;margin-top:12px;">
          開始試煉
        </button>

        <div class="arena-log">
          <p>選擇一隻待命怪物與關卡後開始自動戰鬥。</p>
        </div>
      `}
    </section>
  `;
}

function renderArenaBattle() {
  return `
    <div class="arena-stage">
      <div class="arena-fighter arena-player" id="arena-player">
        <div class="arena-fighter-icon">${arenaBattle.player.icon}</div>
        <strong>${arenaBattle.player.name}</strong>
        <div class="arena-hp"><div id="arena-player-hp" style="width:${(arenaBattle.player.hp / arenaBattle.player.maxHp) * 100}%"></div></div>
      </div>
      <div class="arena-fighter arena-enemy" id="arena-enemy">
        <div class="arena-fighter-icon">${arenaBattle.enemy.icon}</div>
        <strong>${arenaBattle.enemy.name}</strong>
        <div class="arena-hp enemy"><div id="arena-enemy-hp" style="width:${(arenaBattle.enemy.hp / arenaBattle.enemy.maxHp) * 100}%"></div></div>
      </div>
    </div>
    <div class="arena-log" id="arena-log">
      ${(arenaBattle.log || []).slice(-8).map((line) => `<p>${line}</p>`).join('')}
    </div>
  `;
}

function startArenaLoop() {
  stopArenaLoop();
  arenaLastFrameMs = performance.now();
  arenaFrameId = requestAnimationFrame(tickArenaLoop);
}

function stopArenaLoop() {
  if (arenaFrameId) {
    cancelAnimationFrame(arenaFrameId);
    arenaFrameId = null;
  }
}

function tickArenaLoop(now) {
  if (!arenaBattle || activeView !== 'arena' || arenaBattle.status !== 'running') {
    stopArenaLoop();
    return;
  }

  const delta = Math.min(32, now - arenaLastFrameMs);
  arenaLastFrameMs = now;
  moveArenaFighter(arenaBattle.player, delta);
  moveArenaFighter(arenaBattle.enemy, delta);

  if (TimeService.now() >= arenaBattle.nextHitAt) {
    arenaBattle.enemy.hp = Math.max(0, arenaBattle.enemy.hp - arenaBattle.player.attack);
    arenaBattle.log.push(`${arenaBattle.player.name} 使用${arenaBattle.player.skillName}攻擊，造成 ${arenaBattle.player.attack} 傷害。`);

    if (arenaBattle.enemy.hp <= 0) {
      finishArenaBattle('win');
      return;
    }

    arenaBattle.player.hp = Math.max(0, arenaBattle.player.hp - arenaBattle.enemy.attack);
    arenaBattle.log.push(`${arenaBattle.enemy.name} 反擊，造成 ${arenaBattle.enemy.attack} 傷害。`);

    if (arenaBattle.player.hp <= 0) {
      finishArenaBattle('lose');
      return;
    }

    arenaBattle.nextHitAt = TimeService.now() + 850;
  }

  updateArenaDom();
  arenaFrameId = requestAnimationFrame(tickArenaLoop);
}

function moveArenaFighter(fighter, delta) {
  fighter.x += fighter.vx * delta;
  fighter.y += fighter.vy * delta;
  if (fighter.x < 8 || fighter.x > 86) {
    fighter.vx *= -1;
    fighter.x = Math.max(8, Math.min(86, fighter.x));
  }
  if (fighter.y < 12 || fighter.y > 74) {
    fighter.vy *= -1;
    fighter.y = Math.max(12, Math.min(74, fighter.y));
  }
}

function updateArenaDom() {
  const playerEl = document.getElementById('arena-player');
  const enemyEl = document.getElementById('arena-enemy');
  if (playerEl) {
    playerEl.style.left = `${arenaBattle.player.x}%`;
    playerEl.style.top = `${arenaBattle.player.y}%`;
  }
  if (enemyEl) {
    enemyEl.style.left = `${arenaBattle.enemy.x}%`;
    enemyEl.style.top = `${arenaBattle.enemy.y}%`;
  }

  const playerHp = document.getElementById('arena-player-hp');
  const enemyHp = document.getElementById('arena-enemy-hp');
  if (playerHp) playerHp.style.width = `${Math.max(0, (arenaBattle.player.hp / arenaBattle.player.maxHp) * 100)}%`;
  if (enemyHp) enemyHp.style.width = `${Math.max(0, (arenaBattle.enemy.hp / arenaBattle.enemy.maxHp) * 100)}%`;

  const logEl = document.getElementById('arena-log');
  if (logEl) {
    logEl.innerHTML = (arenaBattle.log || []).slice(-8).map((line) => `<p>${line}</p>`).join('');
  }
}

function finishArenaBattle(outcome) {
  if (!arenaBattle) return;
  const battle = arenaBattle;
  stopArenaLoop();

  const result = S.resolveArenaBattle(state, battle.monsterId, {
    stageId: battle.stageId,
    outcome,
    reports: battle.log,
  });
  state = result.state;
  arenaBattle = null;
  showMessage(result.message);
  result.reports.forEach((line) => showMessage(line));
  state = S.saveGame(state);
  render();
}

function leaveArenaView() {
  if (arenaBattle) {
    finishArenaBattle('lose');
  }
  stopArenaLoop();
  arenaBattle = null;
  activeView = 'camp';
  render();
}
