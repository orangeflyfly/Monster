function gatherResource(state, resource) {
  const amount = CONFIG.gatherAmount;
  const resources = addResourceToResources(state.resources, resource, amount);
  return {
    state: Object.assign({}, state, { resources }),
    amount,
  };
}

const gather = {
  gatherResource,
};
