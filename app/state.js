const S = window.MW_SYSTEMS;
const app = document.getElementById('app');

let loaded = null;
let offline = { state: null, offlineMs: 0 };
let state = S.createInitialState();
let offlineEarnings = null;
// 格式：{ ms: 0, resources: {} }
let activeView = 'camp';
let wildTab = 'capture';
// 選項：'capture'、'expedition'
let activeMap = 'forest';
let selectedMonsterId = '';
let encounter = null;
let message = '';
let messageTimer = null;
let notifications = [];
// 格式：[{ id, message, time }]
let floatingTexts = [];
// 格式：[{ id, text, resource }]
let vaultOpen = false;
let vaultSelectedId = '';
let vaultFilter = 'all';
let vaultTab = 'vault';
// 選項：'vault'、'exchange'
// 選項：'all'、'working'、'idle'、'locked'、'favorite'
let backpackOpen = false;
let backpackTab = 'material';
// 選項：'material'、'cert'、'processed'、'item'、'collections'
let featureModal = '';
let marketTab = 'market';
// 選項：'market'、'merchant'、'black'、'visitors'
let workshopTab = 'research';
// 選項：'research'、'crafting'、'blueprints'、'compendium'
let campInfoTab = 'exhibition';
// 選項：'exhibition'、'layout'、'milestones'、'report'
let decorationSlotIndex = 0;
let expeditionSelectId = '';
let selectedExpeditionMonsters = [];
let arenaBattle = null;
let arenaFrameId = null;
let arenaLastFrameMs = 0;
let arenaSelectedMonsterId = '';
let arenaSelectedStageId = 'trial_1';
