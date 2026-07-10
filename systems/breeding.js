function getBreedingKey(typeA, typeB) {
  return [typeA, typeB].sort().join('_');
}

function isIncompatible(typeA, typeB) {
  return CONFIG.incompatiblePairs.some((pair) =>
    (pair[0] === typeA && pair[1] === typeB) ||
    (pair[0] === typeB && pair[1] === typeA)
  );
}

function canBreed(state, monsterIdA, monsterIdB) {
  if (!monsterIdA || !monsterIdB) return { can: false, reason: '請選擇兩隻怪物。' };
  if (monsterIdA === monsterIdB) return { can: false, reason: '不能自己配種。' };

  const checkA = S.canEnterActivity(state, monsterIdA, 'breeding');
  if (!checkA.can) return checkA;
  const checkB = S.canEnterActivity(state, monsterIdB, 'breeding');
  if (!checkB.can) return checkB;

  const now = TimeService.now();
  const monA = state.monsters.find((m) => m.id === monsterIdA);
  const monB = state.monsters.find((m) => m.id === monsterIdB);
  if (!monA || !monB) return { can: false, reason: '找不到怪物。' };

  if (monA.breedCooldown && monA.breedCooldown > now) {
    return { can: false, reason: `${MONSTERS[monA.type]?.name} 還在冷卻中。` };
  }
  if (monB.breedCooldown && monB.breedCooldown > now) {
    return { can: false, reason: `${MONSTERS[monB.type]?.name} 還在冷卻中。` };
  }
  if (isIncompatible(monA.type, monB.type)) {
    return { can: false, reason: '這兩種怪物相性不合，無法配種。' };
  }

  const totalSlots = S.getAvailableBreedingSlots(state);
  const usedSlots = (state.eggs || []).length;
  if (usedSlots >= totalSlots) {
    return { can: false, reason: '培養槽已滿。' };
  }
  if (usedSlots >= CONFIG.breedingConfig.maxEggSlots) {
    return { can: false, reason: `最多同時孵化 ${CONFIG.breedingConfig.maxEggSlots} 顆蛋。` };
  }

  return { can: true };
}

function startBreeding(state, monsterIdA, monsterIdB, geneLiquids) {
  const check = canBreed(state, monsterIdA, monsterIdB);
  if (!check.can) return { state, message: check.reason };

  const monA = state.monsters.find((m) => m.id === monsterIdA);
  const monB = state.monsters.find((m) => m.id === monsterIdB);
  const now = TimeService.now();

  const tankReduction = S.getBestTankReduction(state);
  let deadEggChance = CONFIG.breedingConfig.baseDeadEggChance - tankReduction;

  let inventory = Object.assign({}, state.inventory || {});
  const hatchTime = CONFIG.breedingConfig.eggHatchTime;
  let talentBonus = 0;
  let mutationBonus = false;
  let traitBonus = false;

  if (geneLiquids && geneLiquids.includes('basic_gene_liquid')) {
    if ((inventory.basic_gene_liquid || 0) > 0) {
      deadEggChance = Math.max(0, deadEggChance - 0.1);
      inventory.basic_gene_liquid -= 1;
    }
  }
  if (geneLiquids && geneLiquids.includes('talent_gene_liquid')) {
    if ((inventory.talent_gene_liquid || 0) > 0) {
      talentBonus = Math.floor(Math.random() * 2) + 1;
      inventory.talent_gene_liquid -= 1;
    }
  }
  if (geneLiquids && geneLiquids.includes('mutation_gene_liquid')) {
    if ((inventory.mutation_gene_liquid || 0) > 0) {
      mutationBonus = true;
      inventory.mutation_gene_liquid -= 1;
    }
  }
  if (geneLiquids && geneLiquids.includes('trait_gene_liquid')) {
    if ((inventory.trait_gene_liquid || 0) > 0) {
      traitBonus = true;
      inventory.trait_gene_liquid -= 1;
    }
  }

  const breedKey = getBreedingKey(monA.type, monB.type);
  const recipe = BREEDING_RECIPES[breedKey];
  const egg = {
    id: 'egg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
    parentAId: monsterIdA,
    parentBId: monsterIdB,
    parentAType: monA.type,
    parentBType: monB.type,
    hatchMs: now + hatchTime,
    deadEggChance,
    talentBonus,
    mutationBonus,
    traitBonus,
    recipeId: breedKey,
    revealed: false,
  };

  const cooldown = now + CONFIG.breedingConfig.parentCooldown;
  const monsters = state.monsters.map((m) => {
    if (m.id === monsterIdA || m.id === monsterIdB) {
      return Object.assign({}, m, { breedCooldown: cooldown });
    }
    return m;
  });
  const eggs = [...(state.eggs || []), egg];
  const breedingRecordIds = [...(state.breedingRecordIds || [])];
  if (!breedingRecordIds.includes(breedKey)) {
    breedingRecordIds.push(breedKey);
  }
  if (recipe && !recipe.discovered) {
    recipe.discovered = true;
  }

  return {
    state: Object.assign({}, state, { monsters, eggs, inventory, breedingRecordIds }),
    message: `配種開始！蛋將在 ${Math.ceil(hatchTime / 3600000)} 小時後孵化。`,
  };
}

function checkEggHatch(state) {
  const now = TimeService.now();
  if (!state.eggs || state.eggs.length === 0) {
    return { state, changed: false, messages: [] };
  }

  let changed = false;
  const messages = [];
  const monsters = [...state.monsters];
  const inventory = Object.assign({}, state.inventory || {});
  const eggs = state.eggs.filter((egg) => {
    if (now < egg.hatchMs) return true;

    if (Math.random() < egg.deadEggChance) {
      messages.push(`💀 死蛋！${MONSTERS[egg.parentAType]?.name} × ${MONSTERS[egg.parentBType]?.name} 的蛋孵化失敗。`);
      changed = true;
      return false;
    }

    const recipe = BREEDING_RECIPES[egg.recipeId];
    let resultType = egg.parentAType;
    let isMutation = false;
    if (recipe) {
      const baseMutationChance = recipe.mutationChance || CONFIG.breedingConfig.baseMutationChance || 0.03;
      const finalMutationChance = egg.mutationBonus ? Math.min(0.5, baseMutationChance * 3) : baseMutationChance;
      if (recipe.mutationResult && Math.random() < finalMutationChance) {
        resultType = recipe.mutationResult;
        isMutation = true;
      } else {
        resultType = recipe.normalResult || egg.parentAType;
      }
    }

    const newMonster = S.createMonster(resultType);
    const parentA = monsters.find((m) => m.id === egg.parentAId);
    const parentB = monsters.find((m) => m.id === egg.parentBId);
    const avgTalent = Math.floor(((parentA?.talent || 5) + (parentB?.talent || 5)) / 2);
    newMonster.talent = Math.min(10, avgTalent + (egg.talentBonus || 0));

    const parentTraits = [
      ...(parentA?.traits || []),
      ...(parentB?.traits || []),
    ];
    if (parentTraits.length > 0) {
      const inheritChance = egg.traitBonus ? 0.6 : 0.3;
      const inherited = parentTraits.filter(() => Math.random() < inheritChance);
      if (inherited.length > 0) {
        const baseTrait = inherited[Math.floor(Math.random() * inherited.length)];
        const traitKey = baseTrait.key || baseTrait;
        const traitDef = TRAITS[traitKey];

        // 雙親持有同一滿級詞條時，後代有機率突破上限。
        const parentATraits = parentA?.traits || [];
        const parentBTraits = parentB?.traits || [];
        const parentAHasTrait = parentATraits.find((trait) => (trait.key || trait) === traitKey);
        const parentBHasTrait = parentBTraits.find((trait) => (trait.key || trait) === traitKey);

        let finalLevel = baseTrait.level || 1;

        if (parentAHasTrait && parentBHasTrait && traitDef) {
          const maxLevel = traitDef.maxLevel || 3;
          const parentALevel = parentAHasTrait.level || 1;
          const parentBLevel = parentBHasTrait.level || 1;

          if (parentALevel >= maxLevel && parentBLevel >= maxLevel) {
            const breakthroughChance = 0.15;
            if (Math.random() < breakthroughChance) {
              finalLevel = maxLevel + 1;
              messages.push(`✨ 突破！後代的「${traitDef.name}」突破至 Lv${finalLevel}！`);
            } else {
              finalLevel = maxLevel;
            }
          }
        }

        newMonster.traits = [{ key: traitKey, level: finalLevel }];
      }
    }

    if (monsters.length < S.getVaultLimit(state)) {
      monsters.push(newMonster);
      const compendium = Object.assign({}, state.compendium || {});
      compendium.breeding = Object.assign({}, compendium.breeding, {
        [egg.recipeId]: {
          discovered: true,
          firstHatchedAt: TimeService.now(),
          isMutation,
          resultType,
        },
      });
      state = Object.assign({}, state, { compendium });
      messages.push(`${isMutation ? '✨ 變異！' : '🥚'} 孵化成功！獲得 ${MONSTERS[resultType]?.name}！天賦 ${newMonster.talent}/10`);
    } else {
      messages.push(`🥚 孵化完成但倉庫已滿，${MONSTERS[resultType]?.name} 無法加入！`);
    }

    changed = true;
    return false;
  });

  return {
    state: changed ? Object.assign({}, state, { eggs, monsters, inventory }) : state,
    messages,
    changed,
  };
}

function useBreedingHint(state) {
  const inventory = state.inventory || {};
  if (!inventory.breeding_hint || inventory.breeding_hint <= 0) {
    return { state, message: '沒有繁殖線索可使用。' };
  }

  const undiscovered = Object.keys(BREEDING_RECIPES)
    .filter((key) => !(state.hintRevealed || []).includes(key) && !(state.breedingRecordIds || []).includes(key));
  if (undiscovered.length === 0) {
    return { state, message: '所有配方都已發現！' };
  }

  const revealed = undiscovered[Math.floor(Math.random() * undiscovered.length)];
  const recipe = BREEDING_RECIPES[revealed];
  const [typeA, typeB] = recipe.parents;
  const newInventory = Object.assign({}, inventory, {
    breeding_hint: inventory.breeding_hint - 1,
  });

  const hintRevealed = [...(state.hintRevealed || [])];
  if (!hintRevealed.includes(revealed)) {
    hintRevealed.push(revealed);
  }

  return {
    state: Object.assign({}, state, {
      inventory: newInventory,
      hintRevealed,
    }),
    message: `線索揭示：${MONSTERS[typeA]?.name} × ${MONSTERS[typeB]?.name} 是一個有效配方！`,
  };
}

function checkMonsterMutation(state, monsterId) {
  const monster = state.monsters.find((item) => item.id === monsterId);
  if (!monster) return { state, mutated: false };

  const def = MONSTERS[monster.type];
  if (!def || !def.mutations) return { state, mutated: false };

  for (const [mutationKey, mutation] of Object.entries(def.mutations)) {
    if (Math.random() < mutation.chance) {
      const mutatedMonster = Object.assign({}, monster, {
        type: mutationKey,
        originalType: monster.type,
      });

      if (!MONSTERS[mutationKey]) {
        MONSTERS[mutationKey] = {
          name: mutation.name,
          icon: mutation.icon,
          specialty: mutation.specialty,
          skillCaps: Object.assign({}, def.skillCaps),
          captureRate: 0,
          retireDrops: def.retireDrops || {},
          workDrops: def.workDrops || null,
          mutations: {},
        };
      }

      const monsters = state.monsters.map((item) =>
        item.id === monsterId ? mutatedMonster : item
      );
      const discoveredMutations = [...(state.discoveredMutations || [])];
      if (!discoveredMutations.includes(mutationKey)) {
        discoveredMutations.push(mutationKey);
      }
      const compendium = Object.assign({}, state.compendium || {});
      compendium.mutations = Object.assign({}, compendium.mutations, {
        [mutationKey]: {
          discovered: true,
          firstMutatedAt: TimeService.now(),
          fromType: monster.type,
        },
      });
      state = Object.assign({}, state, { compendium });

      return {
        state: Object.assign({}, state, { monsters, discoveredMutations }),
        mutated: true,
        mutationName: mutation.name,
        mutationIcon: mutation.icon,
      };
    }
  }

  return { state, mutated: false };
}

const breeding = {
  canBreed,
  startBreeding,
  checkEggHatch,
  getBreedingKey,
  isIncompatible,
  useBreedingHint,
  checkMonsterMutation,
};
