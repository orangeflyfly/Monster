function calcTrainingSuccess(monster, course) {
  const talent = monster.talent || 1;
  const base = course.successBase || 0.5;
  // 天賦越高成功率越高，天賦10最高+30%
  const talentBonus = ((talent - 1) / 9) * 0.3;
  return Math.min(0.95, base + talentBonus);
}

function startTraining(state, monsterId, courseId) {
  const monster = state.monsters.find((m) => m.id === monsterId);
  if (!monster) return { state, message: '找不到怪物。' };
  const activityCheck = S.canEnterActivity(state, monsterId, 'training');
  if (!activityCheck.can) return { state, message: activityCheck.reason };
  if (monster.trainingCooldown && monster.trainingCooldown > TimeService.now()) {
    return { state, message: '怪物還在冷卻中，請稍後再試。' };
  }

  const course = TRAINING_COURSES[courseId];
  if (!course) return { state, message: '課程不存在。' };

  // 檢查背包是否有這個課程
  const inventory = state.inventory || {};
  if (!inventory[courseId] || inventory[courseId] <= 0) {
    return { state, message: `背包裡沒有「${course.name}」。` };
  }

  // 消耗課程
  const newInventory = Object.assign({}, inventory, {
    [courseId]: inventory[courseId] - 1,
  });

  const monsters = state.monsters.map((m) => {
    if (m.id !== monsterId) return m;
    return Object.assign({}, m, {
      trainingCourse: courseId,
      trainingStartMs: TimeService.now(),
      trainingEndMs: TimeService.now() + course.duration,
    });
  });

  return {
    state: Object.assign({}, state, { monsters, inventory: newInventory }),
    message: `${MONSTERS[monster.type].name} 開始訓練「${course.name}」！`,
  };
}

function checkTrainingComplete(state) {
  const now = TimeService.now();
  let changed = false;
  let messages = [];

  const monsters = state.monsters.map((m) => {
    if (!m.trainingCourse || !m.trainingEndMs || now < m.trainingEndMs) return m;

    const course = TRAINING_COURSES[m.trainingCourse];
    if (!course) return Object.assign({}, m, { trainingCourse: null, trainingEndMs: null });

    const successRate = calcTrainingSuccess(m, course);
    const success = Math.random() < successRate;
    const bigSuccess = success && course.bigSuccessChance && Math.random() < course.bigSuccessChance;

    let newSkills = Object.assign({}, m.skills || {});
    let resultMsg = '';

    if (bigSuccess) {
      const currentLevel = newSkills[course.targetSkill] || 1;
      const cap = (MONSTERS[m.type]?.skillCaps || {})[course.targetSkill] || 10;
      newSkills[course.targetSkill] = Math.min(currentLevel + 2, cap);
      resultMsg = `🎉 大成功！${MONSTERS[m.type]?.name} 的${CONFIG.skillNames[course.targetSkill]}提升了2級！`;
    } else if (success) {
      const currentLevel = newSkills[course.targetSkill] || 1;
      const cap = (MONSTERS[m.type]?.skillCaps || {})[course.targetSkill] || 10;
      newSkills[course.targetSkill] = Math.min(currentLevel + 1, cap);
      resultMsg = `✅ ${MONSTERS[m.type]?.name} 的${CONFIG.skillNames[course.targetSkill]}提升了1級！`;
    } else {
      resultMsg = `❌ ${MONSTERS[m.type]?.name} 訓練失敗，繼續努力！`;
    }

    messages.push(resultMsg);
    const chronicleMessages = S.getChronicleMessages(state, {
      event: 'training_complete',
      monsterId: m.id,
      monsterName: MONSTERS[m.type]?.name || m.type,
      monsterTalent: m.talent || 1,
      courseId: course.id,
      courseName: course.name,
      targetSkill: course.targetSkill,
      successRate,
      success,
      bigSuccess,
    });
    messages.push(...chronicleMessages);
    changed = true;

    return Object.assign({}, m, {
      skills: newSkills,
      trainingCourse: null,
      trainingStartMs: null,
      trainingEndMs: null,
      trainingCooldown: now + course.cooldown,
    });
  });

  return {
    state: changed ? Object.assign({}, state, { monsters }) : state,
    messages,
    changed,
  };
}

const training = { startTraining, checkTrainingComplete, calcTrainingSuccess };
