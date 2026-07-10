# Monster Workshop Art Pipeline

本資料夾只定義可重複使用的 2D 美術產線規格，不會被遊戲邏輯直接載入。

目前範圍限定兩條流程：

- Monster Sprite Pipeline：怪物 spritesheet 與其品管 metadata。
- Map Generation Pipeline：生產區地圖，也就是 `farm`、`forest`、`mine`、`hunting`、`lake` 的地圖與物件 metadata。

## 共用原則

- 遊戲資料 id 以 `data/monsters.js` 與 `data/maps.js` 為準；manifest 只引用這些 id，不新增規則。
- 原始生成圖、處理後圖、frame、預覽圖、prompt 與 QC 結果都要能追溯到同一個 `assetId`。
- 所有可控制、可碰撞、可互動、可排序的地圖物件，都不要烘進地圖 base 圖。
- manifest 先作為離線製作契約；未來若要接入 runtime，應另開資料轉換步驟。

## 建議資料夾

```text
assets/
  art-pipeline/
    manifests/
      monster-spritesheets.manifest.json
      production-maps.manifest.json
    schemas/
      monster-spritesheet.schema.json
      production-map.schema.json
    templates/
      monster-spritesheet.template.json
      production-map.template.json
    README.md
  sprites/
    monsters/
      <monsterId>/
        <monsterId>-idle-raw.png
        <monsterId>-idle-transparent.png
        frames/
        qc/
  maps/
    production/
      <mapId>/
        <mapId>-base.png
        <mapId>-dressed-reference.png
        <mapId>-layered-preview.png
        props/
        qc/
```

## Monster Sprite Pipeline

1. 選定 `monsterId`，需對應 `data/monsters.js`。
2. 為每隻基礎怪物產生一張完整 workshop spritesheet：`7 rows x 6 cols`、每格 `32x32`。
3. 動作列固定為：`walk_down`、`walk_left`、`walk_up`、`walk_right`、`work`、`rest`、`exhausted`。
4. 使用 solid `#FF00FF` 背景產生 raw spritesheet。
5. 後處理輸出透明 sheet、單格 frames、prompt、metadata 與 QC metadata。
6. 驗收重點：沒有 frame touch edge、比例一致、腳底或主 anchor 穩定、同一 sheet 中身份特徵一致、工作動作符合工具。
7. 通過後更新 manifest 或 per-asset metadata 的狀態與輸出路徑。

## Map Generation Pipeline

1. 選定 `mapId`，需對應 `data/maps.js`，範圍只限生產區地圖。
2. 先產生 foundation-only base：地面、道路、水面、低矮地形，不包含可互動或可碰撞物件。
3. 以 base 作為可見參考，產生 dressed reference，只放自然融入場景的物件候選，不加箭頭、文字、框線或 UI。
4. 從 reference 建立物件清單：位置、尺寸、render layer、collision role、asset strategy。
5. 重要或碰撞敏感物件一件一件做；小型裝飾可用 prop pack。
6. 輸出 placement、collision、zones、hooks metadata 與 layered preview。
7. 通過後更新 `manifests/production-maps.manifest.json` 的狀態與輸出路徑。

## Current Batch

目前已建立第一批素材：

- 5 張怪物完整 spritesheet：草精靈、哥布林、石頭怪、狼犬、河童。
- 5 張 1280x720 生產區 composite map：farm、forest、mine、hunting、lake。

本批地圖先交付完整合成 PNG；layered base/decor/preview 的分層合約已定義，但還需要下一輪把 base-only terrain、decor props 與 placement metadata 分開重產。
