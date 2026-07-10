const CHRONICLES = {
  unlikely_training_success: {
    id: 'unlikely_training_success',
    condition: (state, context) =>
      context.event === 'training_complete' &&
      context.success &&
      !context.bigSuccess &&
      context.successRate <= 0.45 &&
      Math.random() < 0.18,
    text: (context) =>
      `📖 營地事蹟：${context.monsterName} 在不被看好的訓練中完成突破，訓練場今天多了一個小傳說。`,
  },
  brilliant_training: {
    id: 'brilliant_training',
    condition: (state, context) =>
      context.event === 'training_complete' &&
      context.bigSuccess &&
      Math.random() < 0.25,
    text: (context) =>
      `📖 營地事蹟：${context.monsterName} 完成了一次漂亮的大成功訓練，其他怪物都圍過來看熱鬧。`,
  },
  stubborn_failure: {
    id: 'stubborn_failure',
    condition: (state, context) =>
      context.event === 'training_complete' &&
      !context.success &&
      context.monsterTalent >= 8 &&
      Math.random() < 0.12,
    text: (context) =>
      `📖 營地事蹟：天賦出眾的${context.monsterName} 這次訓練失手了，但牠看起來完全不服輸。`,
  },
  rich_expedition_return: {
    id: 'rich_expedition_return',
    condition: (state, context) =>
      context.event === 'expedition_reward' &&
      context.earnedCount >= 3 &&
      Math.random() < 0.2,
    text: (context) =>
      `📖 營地事蹟：${context.expeditionName} 的遠征隊滿載而歸，倉庫前排起了臨時搬運隊。`,
  },
  quiet_expedition_return: {
    id: 'quiet_expedition_return',
    condition: (state, context) =>
      context.event === 'expedition_reward' &&
      context.earnedCount === 0 &&
      Math.random() < 0.18,
    text: (context) =>
      `📖 營地事蹟：${context.expeditionName} 的遠征隊空手回來，但帶回了一堆誇張的冒險故事。`,
  },
  rare_find_expedition: {
    id: 'rare_find_expedition',
    condition: (state, context) =>
      context.event === 'expedition_reward' &&
      context.earnedKeys.some((key) =>
        ['blueprint_hint', 'breeding_hint', 'gene_preserver', 'mutation_gene_liquid', 'talent_gene_liquid'].includes(key)
      ) &&
      Math.random() < 0.3,
    text: (context) =>
      `📖 營地事蹟：${context.expeditionName} 發現了少見的戰利品，研究台附近立刻熱鬧了起來。`,
  },
};
