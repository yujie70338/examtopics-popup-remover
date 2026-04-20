# 專案規格書：examtopics-popup-remover

## 1. 專案基本資訊
* **專案名稱**：examtopics-popup-remover
* **目標網域**：`https://www.examtopics.com/*`
* **開發框架**：WXT Framework (Vite + TypeScript)
* **規範標準**：Chrome Extension Manifest V3 (MV3)
* **核心目標**：在不影響網頁正常功能的前提下，自動偵測並中和（移除或隱藏）延遲出現的 `#notRemoverPopup` 彈窗及其關聯遮罩。

---

## 2. 功能需求 (Functional Requirements)

### 2.1 延遲彈窗攔截 (Core Logic)
* **即時監控**：插件啟動後需立即啟動 DOM 監聽，捕捉 5 秒或更久後才產生的元素。
* **多重覆寫**：
    * **樣式層**：強制將目標元素設為 `display: none !important`。
    * **結構層**：偵測到元素後執行 `node.remove()` 以徹底釋放內存。
    * **行為層**：若網頁在彈窗出現時鎖定了滾動條（如 `overflow: hidden`），插件需自動恢復 `body` 的 `overflow: auto`。

### 2.2 權限與安全
* **最小權限**：僅申請 `host_permissions` 為 `*://www.examtopics.com/*`。
* **零追蹤**：本插件不收集任何用戶行為數據或瀏覽紀錄。

---

## 3. 技術設計 (Technical Design)

### 3.1 混合防禦機制 (Hybrid Defense Strategy)
考慮到 5 秒的延遲，我們採取以下兩階段策略：


1.  **階段一：靜態 CSS 預處理 (Pre-emptive CSS)**
    * 在 `document_start` 時注入 CSS，即便元素尚未被 JS 建立，只要它被建立並帶有該 ID，會立即受到 CSS 抑制，防止用戶看到閃爍。
2.  **階段二：動態 DOM 偵測 (Active Mutation Monitoring)**
    * 使用 `MutationObserver` 監控 `document.documentElement` 的變化。
    * 這對於處理「JS 動態生成的內嵌樣式」至關重要，因為 JS 可能會覆寫掉我們的 CSS。

### 3.2 性能與穩定性 (SRE Focus)
* **選擇性監聽**：僅監聽 `childList` 與 `subtree`，不監聽 `attributes` 或 `characterData`。
* **持續監控**：Observer 在找到並移除彈窗後**不會**停止，而是持續監控以應對彈窗重複出現的情況（可配置）。
* **異常處理**：
  - `safeRemove()` 使用 `try-catch` 封裝，避免競態條件導致擴展崩潰
  - `ctx.isInvalid` 檢查確保擴展卸載時正確清理資源
  - 無 `eval()` 或動態代碼執行（MV3 原生限制）
* **記憶體管理**：
  - CSS 由 WXT 在 manifest 層注入，不需手動操作 DOM
  - MutationObserver 的回呼函數保持輕量級（無重複查詢）

---

## 4. 實作規格與檔案結構

### 4.1 檔案結構規範
```text
examtopics-popup-remover/
├── .wxt/                    # 自動生成的類型定義和類型
├── .output/                 # 建構輸出（Chrome MV3 + Firefox MV2）
├── public/                  # 擴展資源（16x16、48x48、128x128 圖示）
├── entrypoints/
│   └── main.content/        # Content Script 進入點
│       ├── index.ts         # 核心 JS 邏輯（MutationObserver + safeRemove）
│       └── style.css        # 預防性 CSS（document_start 注入）
├── .gitignore
├── package.json             # 依賴和指令碼
├── tsconfig.json            # TypeScript 設定
├── wxt.config.ts            # 插件全局設定（Manifest V3）
└── README.md                # 使用和開發文檔
```

### 4.2 核心邏輯實作 (Implementation Details)

#### 樣式層（Phase 1：預防性 CSS）
`entrypoints/main.content/style.css` 在 `document_start` 時注入，在頁面 JS 執行前立即應用：
```css
#notRemoverPopup {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
```
此層確保彈窗即使被建立也無法被用戶看見或互動。

#### 結構層（Phase 2：DOM 監控）
`entrypoints/main.content/index.ts` 實現：

1. **`safeRemove(el)`**：
   - 使用 `try-catch` 包裝 `el.remove()`
   - 防止競態條件（其他指令碼已刪除元素）導致擴展崩潰

2. **`restoreBodyScroll()`**：
   - 檢查 `document.body.style.overflow === 'hidden'`
   - 重置為 `'auto'` 以恢復頁面捲動

3. **MutationObserver 監控**：
   - 配置：`{ childList: true, subtree: true }`（最小開銷）
   - 目標：整個 `document.documentElement`
   - 檢測到新增節點後：檢查其 ID 或遞迴搜尋 `querySelector('#notRemoverPopup')`
   - 找到彈窗後：`safeRemove()` → `restoreBodyScroll()` → 紀錄 `[EXO] Popup removed successfully.`
   - **持續監控**：Observer 不會斷開，可應對彈窗重複出現的情況
   - **初始檢查**：指令碼載入時，若彈窗已存在，立即移除

#### 行為層（Extension Lifecycle）
- 檢查 `ctx.isInvalid`（擴展重新載入、卸載時自動清理）
- 使用 WXT 的上下文 API（`ctx.addEventListener`、`ctx.setTimeout`）確保無洩漏

---

## 5. 測試計畫 (Test Plan)

| 測試案例 | 測試步驟 | 預期結果 |
| :--- | :--- | :--- |
| **首屏攔截** | 進入 ExamTopics 討論頁面 | 5-10 秒後，頁面維持正常，無彈窗出現。 |
| **功能相容性** | 彈窗被移除後，嘗試點擊「Next Question」 | 網頁原生功能（如分頁、展開評論）運作正常。 |
| **性能負載** | 開啟 DevTools 效能面板觀察 | `MutationObserver` 不應造成長任務 (Long Task) 或掉幀。 |
| **多分頁測試** | 同時開啟 5 個討論頁面 | 所有分頁均能正確執行攔截邏輯。 |

---

## 6. 發布與運維 (Release & Maintenance)

* **版本控制**：遵循 Semantic Versioning (例如 1.0.0)。
* **自動化建構**：
    * `pnpm dev`: 開發模式，支援熱更新（Chrome）。
    * `pnpm dev:firefox`: 開發模式（Firefox）。
    * `pnpm build`: 產出優化後的生產版本（Chrome）。
    * `pnpm build:firefox`: 產出優化後的生產版本（Firefox）。
    * `pnpm zip`: 打包為 `.zip` 以供 Chrome Web Store 上傳。
    * `pnpm zip:firefox`: 打包為 `.xpi` 以供 Firefox Add-ons 上傳。
* **異常監控**：在內容腳本中使用 `try-catch` 封裝，確保插件出錯時不會導致宿主網頁崩潰 (Crash)。
* **跨瀏覽器測試**：確保同時在 Chrome 和 Firefox 上通過測試計畫中的所有案例。

---