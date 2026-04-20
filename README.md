# ExamTopics Popup Remover

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

一個 Chrome/Firefox 瀏覽器擴展，自動移除 ExamTopics 討論頁面上延遲出現的彈窗，提供更清潔的閱讀體驗。

## 功能特性

✨ **自動攔截延遲彈窗** — 在頁面加載後 5-10 秒內自動檢測並移除彈窗  
🛡️ **雙層防禦機制** — 結合 CSS 預防 + MutationObserver 動態偵測  
🔒 **最小權限原則** — 僅申請 `examtopics.com` 的必要權限，零數據收集  
⚡ **零性能影響** — 輕量級 MutationObserver 監控，不阻礙頁面功能  
🔄 **跨瀏覽器支援** — 同時支援 Chrome 和 Firefox

## 📚 學習指南

> 想學習如何從零開始製作這個擴展？  
> 📖 **[完整教學指南（TUTORIAL_ZH.md）](TUTORIAL_ZH.md)** — 涵蓋技術選擇、架構設計、逐步實現，附參考資料

適合對以下內容感興趣的開發者：
- 🧑‍💻 Web Extension 開發基礎
- 🏗️ MutationObserver 和 DOM 監控
- 🛠️ WXT 框架的實戰應用
- 🔒 Content Script 安全考慮

## 安裝方式

### Chrome

1. **從源代碼構建**（開發人員）
   ```bash
   git clone https://github.com/yujie70338/examtopics-popup-remover.git
   cd examtopics-popup-remover
   pnpm install
   pnpm build
   ```

2. **載入未打包的擴展**
   - 打開 `chrome://extensions/`
   - 啟用「開發人員模式」（右上角）
   - 點擊「載入未打包的擴展」
   - 選擇 `.output/chrome-mv3` 目錄

### Firefox

1. **從源代碼構建**
   ```bash
   git clone https://github.com/yujie70338/examtopics-popup-remover.git
   cd examtopics-popup-remover
   pnpm install
   pnpm build:firefox
   ```

2. **載入臨時加載項**
   - 打開 `about:debugging#/runtime/this-firefox`
   - 點擊「載入臨時加載項」
   - 選擇 `.output/firefox-mv2/manifest.json` 文件

## 使用方式

安裝擴展後，無需任何配置：

1. 前往任何 ExamTopics 討論頁面（例如 `https://www.examtopics.com/discussions/...`）
2. 等待頁面加載完成
3. 擴展會自動在 5-10 秒內檢測並移除彈窗
4. 打開**瀏覽器開發工具**（F12 → 控制台）可見日誌消息：
   ```
   [EXO] Popup removed successfully.
   ```

### 工作原理

擴展採用**兩階段防禦策略**：

```
┌─────────────────────────────────────────┐
│ 階段一：CSS 預防層（document_start）    │
│ ────────────────────────────────────     │
│ 在頁面 JS 執行前注入 CSS 規則：          │
│ #notRemoverPopup { display: none; }      │
│ → 彈窗即使被建立也無法顯示              │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 階段二：MutationObserver 動態偵測      │
│ ────────────────────────────────────     │
│ 監控 DOM 變化，若彈窗出現：              │
│ 1. 立即呼叫 element.remove()             │
│ 2. 恢復頁面捲動（若被鎖定）             │
│ 3. 記錄操作日誌                          │
└─────────────────────────────────────────┘
```

## 開發指南

### 需求
- Node.js 20+
- pnpm 10+

### 安裝依賴
```bash
pnpm install
```

### 開發模式

**Chrome（含 HMR 熱更新）**
```bash
pnpm dev
```
將自動啟動 Chrome 並載入擴展，修改代碼時自動重新載入。

**Firefox（含 HMR 熱更新）**
```bash
pnpm dev:firefox
```

### 生產構建

**Chrome（MV3）**
```bash
pnpm build
# 輸出：.output/chrome-mv3/
```

**Firefox（MV2）**
```bash
pnpm build:firefox
# 輸出：.output/firefox-mv2/
```

### 打包分發

**Chrome（.zip 格式，用於上傳到 Chrome Web Store）**
```bash
pnpm zip
# 輸出：examtopics-popup-remover-1.0.0.zip
```

**Firefox（.xpi 格式，用於上傳到 Firefox Add-ons）**
```bash
pnpm zip:firefox
# 輸出：examtopics-popup-remover-1.0.0.xpi
```

## 專案結構

```
examtopics-popup-remover/
├── .github/
│   └── copilot-instructions.md     # 專案規格書和技術文檔
├── public/
│   ├── icon-16.png                 # 16x16 圖示
│   ├── icon-48.png                 # 48x48 圖示
│   └── icon-128.png                # 128x128 圖示
├── entrypoints/
│   └── main.content/
│       ├── index.ts                # 核心邏輯（MutationObserver）
│       └── style.css               # 預防性 CSS 規則
├── .wxt/                           # WXT 自動生成的類型定義
├── .output/                        # 構建輸出
├── package.json                    # 項目元數據和依賴
├── tsconfig.json                   # TypeScript 配置
├── wxt.config.ts                   # WXT 配置（Manifest 生成）
└── README.md                       # 本文件
```

## 權限說明

此擴展申請以下權限：

| 權限 | 目的 | 隱私影響 |
|------|------|---------|
| `host_permissions: ["*://www.examtopics.com/*"]` | 僅允許在 examtopics.com 上運行內容腳本 | 零跨域追蹤 |

**零額外權限** — 不需要存儲、標簽、網絡請求或其他敏感 API。

## 安全考慮

- ✅ **隔離運行環境** — 在 MV3 隔離世界中運行，頁面腳本無法訪問擴展代碼
- ✅ **無遠程代碼** — 所有邏輯本地編譯，無動態 `eval()` 或遠程腳本載入
- ✅ **零數據收集** — 不記錄用戶行為、瀏覽歷史或個人信息
- ✅ **異常隔離** — 使用 `try-catch` 封裝 DOM 操作，防止頁面崩潰
- ✅ **CSP 合規** — 遵循 MV3 內容安全策略

## 性能指標

| 指標 | 數值 |
|------|------|
| 包體積 | ~5 KB（未壓縮） |
| 初始化時間 | <5 ms |
| 內存占用 | <2 MB |
| MutationObserver 開銷 | 可忽略（僅監聽 `childList` + `subtree`） |

## 測試

遵循 [.github/copilot-instructions.md](.github/copilot-instructions.md) 中的測試計畫。

### 手動測試清單

- [ ] **首屏攔截** — 進入 ExamTopics 討論頁，5-10 秒內無彈窗出現
- [ ] **功能相容** — 彈窗移除後，「下一題」和評論功能正常運作
- [ ] **頁面捲動** — 頁面捲動未被鎖定
- [ ] **多分頁** — 同時開啟 5 個討論頁，所有頁面彈窗都被移除
- [ ] **DevTools** — 控制台顯示 `[EXO] Popup removed successfully.` 日誌
- [ ] **性能** — DevTools Performance 面板無長任務 (Long Task)

## 故障排除

### 擴展未生效

1. **確認擴展已啟用**
   - Chrome: `chrome://extensions/` → 確保開關為藍色
   - Firefox: `about:addons` → 確保擴展為「已啟用」

2. **硬刷新頁面**
   - Mac: `Cmd + Shift + R`
   - Windows/Linux: `Ctrl + Shift + R`

3. **檢查控制台日誌**
   - 打開 DevTools（F12）
   - 進入「控制台」標籤
   - 查看是否有 `[EXO]` 開頭的日誌消息

### 彈窗仍然出現

1. 確保訪問的是 `examtopics.com`（未來可能支持其他域名）
2. 清空瀏覽器緩存並重新加載頁面
3. 卸載後重新安裝擴展

## 貢獻指南

歡迎提交 Issue 和 Pull Request！

### 開發工作流

1. Fork 本倉庫
2. 建立特性分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -am 'Add your feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 開啟 Pull Request

### 代碼規範

- 使用 TypeScript 進行類型安全
- 遵循 WXT 官方文檔的最佳實踐
- 添加註釋說明複雜邏輯
- 確保 `pnpm build` 和 `pnpm build:firefox` 都能成功通過

## 許可證

MIT License — 詳見 [LICENSE](LICENSE) 文件

## 致謝

- [WXT Framework](https://wxt.dev/) — 現代化的跨瀏覽器擴展開發框架
- [Vite](https://vitejs.dev/) — 超快速的前端構建工具
- [TypeScript](https://www.typescriptlang.org/) — JavaScript 超集，提供類型安全

## 免責聲明

本擴展僅供學習和個人使用。使用者應遵守 ExamTopics 的服務條款。開發者對任何不當使用不承擔責任。

---

**需要幫助？** 
- � **學習開發** — [完整教學指南 TUTORIAL_ZH.md](TUTORIAL_ZH.md)（從零開始製作擴展，包含技術選擇說明和參考資料）
- 📖 **技術規格** — [.github/copilot-instructions.md](.github/copilot-instructions.md) 了解架構和實現細節
- 🐛 **報告 Bug**：[GitHub Issues](https://github.com/yujie70338/examtopics-popup-remover/issues)
- 💬 **討論特性**：[GitHub Discussions](https://github.com/yujie70338/examtopics-popup-remover/discussions)
