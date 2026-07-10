function relationshipPairMatches(pair, typeA, typeB) {
  if (typeA === typeB) return false; // 同物種不構成「兩種怪物」的配對關係
  return pair.includes(typeA) && pair.includes(typeB);
}

function getSameMapWorkers(state, monster) {
  if (!monster.assignedMap) return [];
  return (state.monsters || []).filter((m) =>
    m.assignedMap === monster.assignedMap && m.id !== monster.id
  );
}

function getRelationshipSummary(state, monster) {
  const coworkers = getSameMapWorkers(state, monster);
  let synergyCount = 0;
  let conflictCount = 0;

  coworkers.forEach((other) => {
    if ((CONFIG.synergyPairs || []).some((pair) => relationshipPairMatches(pair, monster.type, other.type))) {
      synergyCount += 1;
    }
    if ((CONFIG.conflictPairs || []).some((pair) => relationshipPairMatches(pair, monster.type, other.type))) {
      conflictCount += 1;
    }
  });

  const socialBonus = monster.personality === 'social' && coworkers.length >= 1;
  const multiplier = Math.max(
    0.25,
    1 +
      (socialBonus ? 0.08 : 0) +
      synergyCount * 0.15 -
      conflictCount * 0.15
  );

  return {
    coworkers,
    socialBonus,
    synergyCount,
    conflictCount,
    multiplier,
  };
}

function getRelationshipMultiplier(state, monster) {
  return getRelationshipSummary(state, monster).multiplier;
}

const relationshipSystem = {
  getRelationshipMultiplier,
  getRelationshipSummary,
};
