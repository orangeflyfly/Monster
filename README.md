# Monster Workshop

《怪物工坊》是以純 HTML、CSS 與 JavaScript 製作的單機放置經營遊戲原型。玩家可以建立營地、捕捉怪物、派工生產、研究科技、培養怪物並逐步解鎖長期內容。

## 啟動方式

建議使用專案內附的本機伺服器，避免瀏覽器對 `file://` 的安全限制：

```powershell
powershell -ExecutionPolicy Bypass -File .\serve-local.ps1
```

啟動後開啟：

```text
http://localhost:8080
```

也可以直接開啟 `index.html`，但部分瀏覽器可能阻擋本機檔案載入。

## 目前功能

- 玩家名稱、營地名稱與營地評價
- 手動採集、五種生產地圖、怪物派工與離線收益
- 研究科技樹、委託、市場、一般商人與黑市商人
- 怪物捕捉、倉庫擴建、鎖定、最愛、野放、退役與黑市出售
- 怪物技能、天賦、詞條、個性與物種研究
- 訓練課程、加工佇列與基因液
- 繁殖、培養槽、配方線索、變異與詞條突破
- 圖鑑、里程碑、展覽館、訪客與證明兌換
- 自動遠征、隊伍選擇、倒數與獎勵
- 背包分類、資源容量、匯入／匯出與重置存檔
- 生產地圖美術、怪物圖像與移動動畫

## 主要介面

- **研究工坊**：研究台、加工坊、圖紙、研究圖鑑
- **怪物管理**：怪物倉庫、證明兌換
- **市場**：市場、商人、黑市商人、訪客
- **營地資訊**：展覽館、里程碑、管理報表
- **其他入口**：野外捕捉、委託板、存檔工具

所有 Modal 必須按畫面上的「關閉」按鈕關閉，點擊背景不會關閉。

## 專案結構

```text
index.html              腳本載入入口
style.css               全站樣式與響應式版面
main.js                 遊戲循環、自動保存與背景檢查

data/                   純資料與資料格式驗證
  config.js             全域設定與平衡數值
  monsters.js           怪物、技能上限與掉落
  maps.js               生產區域與擴建成本
  traits.js             詞條資料
  breeding.js           繁殖配方
  expeditions.js        遠征資料
  index.js              MW_DATA 匯出與 validateData

systems/                遊戲規則與狀態更新
  core.js               共用資源工具
  save.js               初始狀態、正規化與本機存檔
  work.js               派工、生產、展覽與怪物活動狀態
  breeding.js           繁殖、孵化與變異
  expedition.js         自動遠征
  index.js              MW_SYSTEMS 匯出

app/                    UI 狀態、事件與渲染
  state.js              畫面狀態與遊戲初始化
  events.js             data-action 事件路由
  render.js             共用渲染入口
  views/                營地、地圖、野外、倉庫、繁殖與遠征畫面

assets/                 生產地圖、怪物圖像與美術處理資料
backup/                 舊版備份，不參與正式載入
```

本專案使用傳統 `<script>` 載入順序共享全域資料，不是 ES Module。調整 `index.html` 的腳本順序時，需要確認資料、系統、畫面、事件與 `main.js` 的依賴順序。

## 存檔

- 儲存位置：瀏覽器 `localStorage`
- 儲存鍵：`monster-workshop-save-static-v1`
- 自動保存：每 30 秒
- 最大離線收益：8 小時
- 支援 JSON 匯出、匯入與遊戲重置

目前 `saveVersion` 為 `2`。載入 V1 存檔時，舊版放在 `resources` 的材料、證明、道具與課程會搬入 `inventory`，舊 `cert_sprite` 也會合併為 `cert_grassSpirit`。

## 尚未完成

- 工作工具已接入安裝、存檔與產量加成，但尚未建立玩家可操作的工具安裝面板
- 區域專精底層接口已建立，但地圖尚未定義 `specializationOptions`
- 後續版本的逐版遷移仍需持續擴充
- 完整資料驗證：加工、商人、訓練、繁殖、遠征、工具、訪客與圖紙
- 手動遠征、心情、個性效果、季節、班次、區域生態與分營地
- 登入、雲端存檔與排行榜

## 開發與驗收

- 正式遊玩應保持 `CONFIG.devMode: false`
- 每次修改後至少執行 [CHECKLIST.md](CHECKLIST.md) 的快速冒煙測試
- 更動存檔、活動互斥、經濟或繁殖系統時，必須執行完整回歸測試
- 瀏覽器 Console 應顯示「資料格式驗證通過」，且不能有未處理錯誤
