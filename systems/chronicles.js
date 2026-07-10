function getChronicleMessages(state, context) {
  return Object.values(CHRONICLES || {})
    .filter((entry) => {
      try {
        return entry.condition && entry.condition(state, context);
      } catch (err) {
        console.error(`[chronicles] ${entry.id} 條件判斷失敗：`, err);
        return false;
      }
    })
    .map((entry) => entry.text(context))
    .filter(Boolean);
}

const chronicles = { getChronicleMessages };
