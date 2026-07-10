function applyPurifyLiquid(state, monsterId) {
  const monster = state.monsters.find((m) => m.id === monsterId);
  if (!monster) return { state, message: '找不到怪物。' };

  const inventory = state.inventory || {};
  if (!inventory.purify_gene_liquid || inventory.purify_gene_liquid <= 0) {
    return { state, message: '背包裡沒有純化基因液。' };
  }

  const negativeTrait = (monster.traits || []).find((t) => {
    const def = TRAITS[t.key || t];
    return def && def.effect && def.effect.bonus < 0;
  });

  if (!negativeTrait) {
    return { state, message: '這隻怪物沒有負面詞條。' };
  }

  const newTraits = monster.traits.filter((t) => t !== negativeTrait);
  const monsters = state.monsters.map((m) =>
    m.id === monsterId ? Object.assign({}, m, { traits: newTraits }) : m
  );
  const newInventory = Object.assign({}, inventory, {
    purify_gene_liquid: inventory.purify_gene_liquid - 1,
  });
  const traitDef = TRAITS[negativeTrait.key || negativeTrait];

  return {
    state: Object.assign({}, state, { monsters, inventory: newInventory }),
    message: `成功移除「${traitDef?.name || '負面詞條'}」！`,
  };
}

const geneliquid = { applyPurifyLiquid };
