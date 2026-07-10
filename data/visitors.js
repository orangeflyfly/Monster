const VISITOR_EVENTS = {
  researcher: {
    id: 'researcher',
    name: '研究員',
    icon: '👨‍🔬',
    desc: '提供研究點數作為報酬。',
    actions: [
      {
        id: 'donate_monster',
        label: '捐贈一隻怪物',
        desc: '捐贈任意怪物，獲得研究點數。',
        reward: { researchPoints: 10 },
      },
      {
        id: 'share_data',
        label: '分享物種資料',
        desc: '消耗20研究點，獲得稀有圖紙線索。',
        cost: { researchPoints: 20 },
        reward: { blueprint_hint: 1 },
      },
    ],
  },
  merchant: {
    id: 'merchant',
    name: '旅行商人',
    icon: '🧳',
    desc: '販售限時特殊商品。',
    actions: [
      {
        id: 'buy_rare_trap',
        label: '購買強化陷阱',
        desc: '比基礎陷阱捕捉率高15%。',
        cost: { Coins: 40 },
        reward: { enhanced_trap: 1 },
      },
      {
        id: 'buy_mystery_item',
        label: '購買神秘道具',
        desc: '隨機獲得一種基因液。',
        cost: { Coins: 60 },
        reward: { random_gene_liquid: 1 },
      },
    ],
  },
  breeder: {
    id: 'breeder',
    name: '育種師',
    icon: '🧬',
    desc: '提供繁殖相關的建議與道具。',
    actions: [
      {
        id: 'get_breeding_hint',
        label: '詢問繁殖線索',
        desc: '消耗營地幣，獲得一個配種配方線索。',
        cost: { Coins: 50 },
        reward: { breeding_hint: 1 },
      },
      {
        id: 'buy_gene_liquid',
        label: '購買基因液',
        desc: '以優惠價購買初級基因液。',
        cost: { Coins: 30 },
        reward: { basic_gene_liquid: 2 },
      },
    ],
  },
  explorer: {
    id: 'explorer',
    name: '探險家',
    icon: '🗺️',
    desc: '帶來野外探索的情報與道具。',
    actions: [
      {
        id: 'buy_map_fragment',
        label: '購買地圖碎片',
        desc: '解鎖一個野外特殊地點的線索。',
        cost: { Coins: 45 },
        reward: { map_fragment: 1 },
      },
      {
        id: 'trade_materials',
        label: '交換稀有材料',
        desc: '用10食物換取特殊掉落物。',
        cost: { Food: 10 },
        reward: { random_material: 1 },
      },
    ],
  },
};
