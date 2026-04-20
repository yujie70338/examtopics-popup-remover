# 從零開始製作 ExamTopics 彈窗移除器 — 完整學習指南

![Learning Badge](https://img.shields.io/badge/Type-Tutorial-orange)
![Level](https://img.shields.io/badge/Level-Intermediate-yellow)

本指南帶你**一步步**從零開始製作這個瀏覽器擴展，並解釋每個技術選擇的理由。

---

## 📚 目錄

1. [前置知識](#前置知識)
2. [環境準備](#環境準備)
3. [核心技術選擇](#核心技術選擇)
4. [第一步：初始化項目](#第一步初始化項目)
5. [第二步：理解 MV3 Manifest](#第二步理解-mv3-manifest)
6. [第三步：雙層防禦架構](#第三步雙層防禦架構)
7. [第四步：實現 Content Script](#第四步實現-content-script)
8. [第五步：構建和測試](#第五步構建和測試)
9. [進階技巧](#進階技巧)
10. [常見陷阱](#常見陷阱)
11. [參考資料](#參考資料)

---

## 前置知識

### 必須掌握

- **JavaScript ES6+**（箭頭函數、async/await、try-catch）
- **DOM API**（`querySelector`, `getElementById`, `addEventListener`）
- **CSS**（選擇器、`!important` 優先級）
- **命令行基礎**（cd、npm/pnpm 命令）

### 建議了解

- TypeScript 基礎（類型註解）
- Node.js 包管理
- 瀏覽器開發者工具（DevTools）

### 學習資源

- 🎥 MDN Web Docs: [Web Extensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- 🎥 Chrome 官方: [Extension Development](https://developer.chrome.com/docs/extensions/)

---

## 環境準備

### 1. 安裝必要工具

```bash
# 確保已安裝 Node.js 20+
node --version  # 應顯示 v20.x.x 或更新

# 安裝 pnpm（如未安裝）
npm install -g pnpm
pnpm --version  # 應顯示 10.x.x 或更新

# 可選：安裝 Git
git --version
```

### 2. 準備開發環境

```bash
# 創建項目目錄
mkdir examtopics-popup-remover
cd examtopics-popup-remover

# 初始化 Git（建議）
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 3. 瀏覽器設置

**Chrome/Chromium**
- 安裝最新版本（已預裝）
- 記住 `chrome://extensions` 路徑

**Firefox**
- 安裝最新版本（已預裝）
- 記住 `about:debugging` 路徑

---

## 核心技術選擇

### 🎯 為什麼選擇 WXT 框架？

| 對比維度 | WXT | 原生 Manifest API | Plasmo |
|---------|-----|------------------|--------|
| **跨瀏覽器支持** | ✅ Chrome MV3 + Firefox MV2 | ⚠️ API 差異大 | ✅ Chrome + Edge |
| **開發體驗** | ✅ HMR 熱更新 | ❌ 需手動重載 | ✅ 類似 WXT |
| **學習曲線** | ✅ 中等（抽象化好） | ❌ 高（細節多） | ✅ 中等 |
| **文件結構** | ✅ 自動約定優於配置 | ❌ 手動配置 | ✅ 自動化 |
| **生態系統** | ✅ Vite 生態 | ❌ 需自配置 | ⚠️ React 為主 |

**選擇 WXT 的原因：**
1. **自動 Manifest 生成** — 不需手動編寫 JSON，聲明式配置（一次學習，終身受用）
2. **真正的跨瀏覽器** — 同一份代碼構建 Chrome MV3 + Firefox MV2（對比 Plasmo 只支持 Chromium）
3. **Vite 驅動** — 極快的熱更新，開發體驗優秀
4. **類型安全** — 內置 TypeScript 支持，自動生成 `.wxt/` 類型定義

### 🎯 為什麼使用 TypeScript？

```typescript
// ❌ JavaScript — 容易出錯
const el = document.getElementById('popup');
el.remove();  // 如果 el 是 null？運行時才會崩潰

// ✅ TypeScript — 編譯時檢查
const el: HTMLElement | null = document.getElementById('popup');
if (el) {  // 編譯器強制你檢查
  el.remove();
}
```

**優勢：**
- 早期發現 Bug（編譯時而非運行時）
- 自動補全 — IDE 可預測 API
- 文檔即代碼 — 類型簽名本身就是文檔

### 🎯 為什麼採用「雙層防禦」？

#### 層級 1：CSS 預防（`document_start`）
```css
#notRemoverPopup {
  display: none !important;
}
```

**為什麼？**
- ⚡ 最快 — 在頁面 JS 執行前就注入，無延遲
- 🛡️ 高效 — CSS 規則本身無法被繞過（page JS 只能移除 DOM，不能移除 `<style>` 標籤）
- 🔒 優先級 — `!important` 和 ID 選擇器優先級足夠高

#### 層級 2：MutationObserver 動態偵測
```typescript
const observer = new MutationObserver((mutations) => {
  // 即時捕捉 DOM 變化
});
observer.observe(document.documentElement, { childList: true, subtree: true });
```

**為什麼？**
- 🎯 精準 — 不依賴輪詢，監聽真實的 DOM 事件
- 💪 強制 — 即使頁面 JS 動態添加元素或內嵌樣式，也能立即移除
- 🚀 高效 — 無需定期 `setInterval` 檢查，CPU 占用最小

**為什麼不用其他方法？**

| 方法 | 優點 | 缺點 | 適用場景 |
|------|------|------|---------|
| **CSS 預防（單獨）** | 快速、輕量 | 無法移除已創建的 DOM，不能恢復滾動鎖定 | 簡單樣式覆蓋 |
| **setInterval 輪詢** | 直觀 | 浪費 CPU，可能 30ms 延遲 | ❌ 不推薦 |
| **MutationObserver（單獨）** | 精準、即時 | 依賴 DOM 已存在，無法阻止視覺閃爍 | 動態監控 |
| **雙層防禦** ✅ | 結合所有優點 | 稍複雜 | ✅ 當前項目 |

### 🎯 為什麼使用 pnpm？

```bash
# npm: 所有依賴都會重複安裝在每個項目的 node_modules
# 磁盤占用：1000+ MB

# pnpm: 使用符號鏈接共享包，基於內容尋址
# 磁盤占用：100 MB（節省 90%）

# 命令完全相同
pnpm install
pnpm add -D wxt
pnpm build
```

**優勢：**
- 💾 磁盤占用少 10 倍
- 🔒 依賴隔離 — 防止幽靈依賴（phantom dependencies）
- ⚡ 安裝速度快
- 🔄 單一 lock 文件，團隊協作更清爽

---

## 第一步：初始化項目

### 1.1 創建 package.json

```bash
pnpm init
```

編輯 `package.json`：

```json
{
  "name": "examtopics-popup-remover",
  "version": "1.0.0",
  "description": "自動移除 ExamTopics 討論頁面的彈窗",
  "private": true,
  "scripts": {
    "dev": "wxt",
    "dev:firefox": "wxt -b firefox",
    "build": "wxt build",
    "build:firefox": "wxt build -b firefox",
    "zip": "wxt zip",
    "zip:firefox": "wxt zip -b firefox",
    "postinstall": "wxt prepare"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "wxt": "^0.20.0"
  }
}
```

**各腳本說明：**

| 命令 | 用途 | 說明 |
|------|------|------|
| `pnpm dev` | 開發模式（Chrome） | 監聽文件變化，自動重新載入擴展 |
| `pnpm dev:firefox` | 開發模式（Firefox） | 同上，但目標瀏覽器為 Firefox |
| `pnpm build` | 生產構建（Chrome） | 優化後輸出到 `.output/chrome-mv3/` |
| `pnpm build:firefox` | 生產構建（Firefox） | 優化後輸出到 `.output/firefox-mv2/` |
| `pnpm zip` | 打包（Chrome） | 生成 `.zip` 供上傳 Chrome Web Store |
| `pnpm postinstall` | 自動執行 | 每次 `pnpm install` 後自動運行 `wxt prepare` |

### 1.2 安裝依賴

```bash
pnpm install
```

**發生了什麼？**
1. `pnpm` 下載 `wxt` 和 `typescript`
2. **自動執行** `postinstall` 腳本：`wxt prepare`
3. 生成 `.wxt/` 目錄（自動類型定義）

```
examtopics-popup-remover/
├── .wxt/          ← 自動生成，勿編輯
├── node_modules/
├── package.json
├── package-lock.yaml  ← 由 pnpm 管理
└── pnpm-lock.yaml
```

### 1.3 創建 TypeScript 配置

**tsconfig.json**
```json
{
  "extends": "./.wxt/tsconfig.json"
}
```

為什麼 `extends`？因為 WXT 已經在 `.wxt/tsconfig.json` 中配置了所有必要的設置。我們只需繼承它。

---

## 第二步：理解 MV3 Manifest

### 2.1 什麼是 Manifest？

Manifest（`manifest.json`）是擴展的「身份證」，聲明：
- 擴展的元數據（名稱、版本、圖示）
- 申請的權限（能訪問什麼）
- 要運行的腳本（何時、在哪裡、對誰）

### 2.2 原生 vs WXT 方式

**❌ 原生方式（手動編寫）**
```json
{
  "manifest_version": 3,
  "name": "ExamTopics Popup Remover",
  "permissions": [...],  // 手動配置
  "host_permissions": [...],  // 手動配置
  "content_scripts": [{
    "matches": ["*://www.examtopics.com/*"],
    "run_at": "document_start",
    "js": ["content.js"],
    "css": ["content.css"]
  }]
  // 需要手動管理 JS/CSS 的對應關係
}
```

**✅ WXT 方式（聲明式）**

在 `wxt.config.ts` 中：
```typescript
export default defineConfig({
  manifest: {
    name: 'ExamTopics Popup Remover',
    host_permissions: ['*://www.examtopics.com/*'],
  }
});
```

在 `entrypoints/main.content/index.ts` 中：
```typescript
import './style.css';  // ← 自動添加到 manifest.css

export default defineContentScript({
  matches: ['*://www.examtopics.com/*'],
  runAt: 'document_start',
  main(ctx) {
    // 邏輯在這裡
  }
});
```

**WXT 自動生成**的 manifest.json：
```json
{
  "manifest_version": 3,
  "name": "ExamTopics Popup Remover",
  "host_permissions": ["*://www.examtopics.com/*"],
  "content_scripts": [{
    "matches": ["*://www.examtopics.com/*"],
    "run_at": "document_start",
    "js": ["content-scripts/main.js"],
    "css": ["content-scripts/main.css"]
  }]
}
```

**優勢：**
- 單一資料來源（DRY 原則）
- 類型安全 — IDE 會驗證 manifest 選項
- 自動管理依賴

### 2.3 MV3 vs MV2 對比

| 特性 | MV3（新） | MV2（舊） |
|------|----------|---------|
| **背景腳本** | Service Worker | Persistent Script |
| **內容安全策略** | 嚴格（無 `eval`） | 寬鬆 |
| **權限模型** | 更細粒度 | 粗粒度 |
| **Performance** | 更好（按需啟動） | 更差（持續運行） |
| **瀏覽器支持** | Chrome 88+, Edge, Firefox 109+ | 舊版 Firefox, Safari |

**我們使用 MV3 的原因：**
1. Chrome 已廢棄 MV2（2024 年強制遷移）
2. MV3 安全性更高（防止 XSS）
3. 性能更好（按需喚醒）

---

## 第三步：雙層防禦架構

### 3.1 創建 CSS 層（Phase 1）

**entrypoints/main.content/style.css**
```css
/* Phase 1: Pre-emptive CSS - 在 document_start 注入 */
#notRemoverPopup {
  display: none !important;           /* 隱藏 */
  visibility: hidden !important;      /* 即使隱藏也佔空間 */
  pointer-events: none !important;    /* 禁止交互 */
}
```

**為什麼三個屬性都設置？**

```css
/* 只有 display: none */
#notRemoverPopup {
  display: none;  /* ❌ 頁面 JS 可能用內嵌樣式覆蓋：style="display: block" */
}

/* 加 !important */
#notRemoverPopup {
  display: none !important;  /* ✅ 優先級最高 */
}

/* 補充 visibility 和 pointer-events */
#notRemoverPopup {
  display: none !important;
  visibility: hidden !important;  /* 防止 display 被某些屬性覆蓋後仍可見 */
  pointer-events: none !important;  /* 即使意外顯示，也無法點擊 */
}
```

### 3.2 理解 DOM 監控（Phase 2）

**為什麼 CSS 層不夠？**

```html
<!-- 情境 1：頁面動態創建元素 -->
<script>
  setTimeout(() => {
    const popup = document.createElement('div');
    popup.id = 'notRemoverPopup';
    popup.style.cssText = 'display: block !important; visibility: visible !important;';
    // ⚠️ 內嵌樣式的 !important 優先級與外部 CSS 相同，可能互相覆蓋
    document.body.appendChild(popup);
  }, 5000);
</script>
```

**CSS 層會失效的場景：**
- 頁面 JS 用 `style.cssText` 強制設置內嵌樣式
- 頁面 JS 使用 JavaScript 檢測彈窗是否在 DOM 中，並記錄用戶試圖移除它

**因此需要 Phase 2：**
1. 監控 DOM 變化（新增節點）
2. 立即移除彈窗元素（不只是隱藏）
3. 恢復滾動狀態

---

## 第四步：實現 Content Script

### 4.1 建立文件結構

```bash
mkdir -p entrypoints/main.content
touch entrypoints/main.content/index.ts
touch entrypoints/main.content/style.css
```

### 4.2 編寫 style.css

`entrypoints/main.content/style.css`
```css
#notRemoverPopup {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
```

### 4.3 編寫核心邏輯（TypeScript）

`entrypoints/main.content/index.ts`
```typescript
import './style.css';  // ✅ 自動添加到 manifest CSS 數組

export default defineContentScript({
  // 1. 配置：告訴 WXT 何時、在哪裡運行此腳本
  matches: ['*://www.examtopics.com/*'],
  runAt: 'document_start',

  // 2. 主函數：ctx 提供擴展生命週期管理
  main(ctx) {
    const TARGET_ID = 'notRemoverPopup';

    /**
     * Phase 2 的核心函數 1：安全移除元素
     * 
     * 為什麼需要 try-catch？
     * - 其他腳本可能已經移除元素
     * - 或者元素在檢查和移除之間被銷毀
     * 
     * 不使用 try-catch：
     * ❌ element.remove() 拋出異常
     * ❌ 異常傳播到頁面邏輯，頁面崩潰
     * 
     * 使用 try-catch：
     * ✅ 異常被捕捉，不影響頁面
     * ✅ 頁面繼續正常運行
     */
    function safeRemove(el: Element): void {
      try {
        el.remove();
      } catch {
        // 忽略已被移除或不存在的元素
      }
    }

    /**
     * Phase 2 的核心函數 2：恢復頁面捲動
     * 
     * 很多網站顯示彈窗時會鎖定頁面：
     * document.body.style.overflow = 'hidden';
     * 
     * 我們移除彈窗後，也要解除這個鎖定
     */
    function restoreBodyScroll(): void {
      if (document.body?.style.overflow === 'hidden') {
        document.body.style.overflow = 'auto';
      }
    }

    /**
     * Phase 2 的核心函數 3：檢查新增節點
     * 
     * MutationObserver 回呼時，不要每次都 querySelector 整個文檔
     * 這樣太浪費 CPU。應該只檢查剛添加的節點。
     */
    function handleAddedNode(node: Node): boolean {
      // Step 1: 檢查節點本身是否就是彈窗
      if (!(node instanceof Element)) return false;
      if (node.id === TARGET_ID) {
        safeRemove(node);
        restoreBodyScroll();
        console.log('[EXO] Popup removed successfully.');
        return true;
      }

      // Step 2: 檢查節點內部是否包含彈窗
      //（e.g. <div class="wrapper"><div id="notRemoverPopup">...)
      const nested = node.querySelector(`#${TARGET_ID}`);
      if (nested) {
        safeRemove(nested);
        restoreBodyScroll();
        console.log('[EXO] Popup removed successfully.');
        return true;
      }

      return false;
    }

    /**
     * Phase 2 的核心：MutationObserver
     * 
     * 配置解釋：
     * - childList: true    監聽直接子節點的添加/移除
     * - subtree: true      同時監聽所有後代節點
     * - 不監聽 attributes  (我們不關心屬性變化，只關心 DOM 結構)
     * 
     * 為什麼不監聽 characterData？
     * - characterData 是文本節點變化
     * - 與彈窗元素無關
     * - 監聽會浪費 CPU
     * 
     * 性能考量：
     * - 每個 DOM 變化都會觸發此回呼
     * - 必須保持回呼函數輕量級
     */
    const observer = new MutationObserver((mutations) => {
      // 如果擴展上下文無效（擴展被卸載、更新等），停止監控
      if (ctx.isInvalid) {
        observer.disconnect();
        return;
      }

      // 遍歷所有變化，查找新增節點
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          // 一旦找到彈窗，立即返回（無需繼續遍歷）
          if (handleAddedNode(node)) return;
        }
      }
    });

    // 開始監控 DOM
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    /**
     * 初始檢查：腳本可能在彈窗已存在時才被加載
     * （雖然 document_start 應該優先於所有頁面 JS，
     *  但為了保險，還是檢查一下）
     */
    const existing = document.getElementById(TARGET_ID);
    if (existing) {
      safeRemove(existing);
      restoreBodyScroll();
      console.log('[EXO] Popup removed successfully (initial check).');
    }
  },
});
```

### 4.4 關鍵概念解釋

#### 為什麼 `ctx` 很重要？

```typescript
main(ctx) {  // ← ctx 是 ContentScriptContext
  // 錯誤方式：如果擴展卸載，setTimeout 仍會執行
  setTimeout(() => {
    observer.observe(...);  // ❌ 擴展已卸載，但代碼仍在運行
  }, 1000);

  // 正確方式：使用 ctx 包裝的 setTimeout
  ctx.setTimeout(() => {
    observer.observe(...);  // ✅ 擴展卸載時自動清理
  }, 1000);

  // 檢查擴展是否仍有效
  if (ctx.isInvalid) {
    console.log('擴展已被卸載');
    return;
  }
}
```

#### 為什麼 `runAt: 'document_start'` ？

| runAt 值 | 執行時機 | 優點 | 缺點 |
|----------|---------|------|------|
| `document_start` | 在任何 DOM、腳本前 | ✅ 最早攔截 CSS 生效 | ⚠️ 無法訪問 DOM |
| `document_end` | HTML 解析完，DOM 可用 | ✅ 可訪問 DOM | ⚠️ 可能有視覺閃爍 |
| `document_idle` | 頁面完全加載（默認） | ✅ 頁面準備完畢 | ❌ 來不及阻止彈窗 |

**我們的選擇：**
```typescript
runAt: 'document_start'  // CSS 注入
main(ctx) {
  // MutationObserver 啟動（此時 DOM 還在構建，但觀察器已就位）
}
```

這樣確保：
1. 即使彈窗 5 秒後才出現，CSS 已經在等待
2. MutationObserver 從最早時刻開始監聽

---

## 第五步：構建和測試

### 5.1 創建 WXT 配置

`wxt.config.ts`
```typescript
import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'ExamTopics Popup Remover',
    description: 'Automatically removes the delayed popup on ExamTopics discussion pages.',
    version: '1.0.0',
    icons: {
      16: '/icon-16.png',
      48: '/icon-48.png',
      128: '/icon-128.png',
    },
    host_permissions: ['*://www.examtopics.com/*'],
  },
});
```

**為什麼不需要 `permissions` 數組？**
- `host_permissions`：允許訪問特定網站的 DOM
- `permissions`：申請特殊能力（如 `storage`、`notifications`）
- 我們只需要前者，零額外權限

### 5.2 構建項目

```bash
# Chrome 構建
pnpm build
# 輸出：.output/chrome-mv3/

# Firefox 構建
pnpm build:firefox
# 輸出：.output/firefox-mv2/
```

### 5.3 檢查構建結果

```bash
# 查看 Chrome 輸出
ls -la .output/chrome-mv3/
# manifest.json
# content-scripts/main.js
# content-scripts/main.css
# icon-*.png
```

### 5.4 在 Chrome 中測試

1. **打開擴展頁面**
   ```
   chrome://extensions/
   ```

2. **啟用開發人員模式**
   - 右上角找到「開發人員模式」開關

3. **載入未打包的擴展**
   - 點擊「載入未打包的擴展」
   - 選擇 `.output/chrome-mv3/` 目錄

4. **驗證擴展**
   - 擴展應列在列表中
   - 狀態應為「已啟用」

5. **測試功能**
   ```bash
   # 打開一個 ExamTopics 討論頁面
   https://www.examtopics.com/discussions/...
   
   # 打開 DevTools（F12）
   # 進入「控制台」標籤
   # 等待 5-10 秒
   # 應看到：[EXO] Popup removed successfully.
   ```

### 5.5 在 Firefox 中測試

1. **打開 about:debugging**
   ```
   about:debugging#/runtime/this-firefox
   ```

2. **點擊「載入臨時加載項」**

3. **選擇 manifest.json**
   - 從 `.output/firefox-mv2/` 目錄

4. **測試同上**

---

## 進階技巧

### 6.1 開發模式（HMR）

```bash
# 開發 Chrome 版本
pnpm dev
# - 自動在 Chrome 中載入擴展
# - 監聽文件變化
# - 自動重新載入擴展
# - 修改代碼即時看效果

# 開發 Firefox 版本
pnpm dev:firefox
```

**優勢：**
- ⚡ 不需手動刷新擴展
- 🔄 保留擴展狀態（某些情況下）
- 🎯 快速迭代

### 6.2 在 DevTools 中調試

```bash
# 1. 在代碼中設置斷點
function handleAddedNode(node: Element): boolean {
  debugger;  // 會在此處暫停
  // ...
}

# 2. 或者用 console 輸出日誌
console.log('[EXO] Node found:', node.id);
console.log('[EXO] Mutation details:', mutations);

# 3. 在 DevTools 中查看日誌
# Chrome: chrome://extensions → 詳情 → 檢查視圖 → Service Worker Console
# Firefox: about:debugging → 檢查 → Console
```

### 6.3 性能監測

```typescript
// 在 MutationObserver 回呼中添加性能檢查
const observer = new MutationObserver((mutations) => {
  const start = performance.now();
  
  // 實際邏輯
  for (const mutation of mutations) {
    handleAddedNode(node);
  }
  
  const duration = performance.now() - start;
  if (duration > 10) {  // 如果超過 10ms 就警告
    console.warn(`[EXO] MutationObserver took ${duration.toFixed(2)}ms`);
  }
});
```

### 6.4 添加日誌配置

```typescript
// 創建日誌輔助函數
const logger = {
  log: (...args: any[]) => {
    console.log('[EXO]', ...args);
  },
  warn: (...args: any[]) => {
    console.warn('[EXO] WARNING', ...args);
  },
  error: (...args: any[]) => {
    console.error('[EXO] ERROR', ...args);
  },
};

// 使用
logger.log('Popup removed successfully.');
// 輸出：[EXO] Popup removed successfully.
```

---

## 常見陷阱

### ❌ 陷阱 1：忘記 try-catch

```typescript
// ❌ 危險：如果元素已被移除，會拋出異常
function removePopup(el: Element) {
  el.remove();  // 可能失敗
}

// ✅ 正確：捕捉異常，保護頁面
function safeRemove(el: Element) {
  try {
    el.remove();
  } catch {
    // 元素已被移除，這沒關係
  }
}
```

### ❌ 陷阱 2：過度監聽

```typescript
// ❌ 不適用：監聽太多屬性，浪費 CPU
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,         // ❌ 我們不關心屬性變化
  attributeFilter: ['id', 'class', 'style'],  // ❌ 更差
  characterData: true,       // ❌ 我們不關心文本變化
});

// ✅ 最小化配置
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});
```

### ❌ 陷阱 3：忽略 ctx.isInvalid

```typescript
// ❌ 危險：擴展卸載後，代碼仍在運行
const observer = new MutationObserver((mutations) => {
  // 可能訪問已不存在的 API
  chrome.runtime.sendMessage({ ... });  // ❌ 擴展已卸載
});

// ✅ 正確：檢查上下文
const observer = new MutationObserver((mutations) => {
  if (ctx.isInvalid) {
    observer.disconnect();
    return;
  }
  // ...
});
```

### ❌ 陷阱 4：CSS 優先級不足

```css
/* ❌ 優先級不夠 */
.popup {
  display: none;  /* 可被 #notRemoverPopup { display: block; } 覆蓋 */
}

/* ✅ 優先級足夠 */
#notRemoverPopup {
  display: none !important;  /* 最高優先級 */
}
```

### ❌ 陷阱 5：忘記導入 CSS

```typescript
// ❌ CSS 不會被注入
export default defineContentScript({
  matches: ['*://www.examtopics.com/*'],
  main(ctx) {
    // ...
  }
});

// ✅ CSS 自動添加到 manifest
import './style.css';

export default defineContentScript({
  matches: ['*://www.examtopics.com/*'],
  main(ctx) {
    // ...
  }
});
```

---

## 參考資料

### 📖 官方文檔

#### WXT Framework
- [WXT 官方網站](https://wxt.dev/)
- [WXT 安裝指南](https://wxt.dev/guide/installation.html)
- [WXT Content Scripts 文檔](https://wxt.dev/guide/essentials/content-scripts.html)
- [WXT Entrypoints 文檔](https://wxt.dev/guide/essentials/entrypoints.html)

#### Chrome Extensions
- [Chrome Extension 開發文檔](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 指南](https://developer.chrome.com/docs/extensions/mv3/)
- [Content Scripts 指南](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [host_permissions 說明](https://developer.chrome.com/docs/extensions/reference/manifest/host-permissions/)

#### Firefox WebExtensions
- [Firefox WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/)
- [Manifest 文檔](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json)
- [Content Scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts)

### 🛠️ 相關技術

#### Web APIs
- [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [DOM API](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)
- [CSS Selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- [Element.remove()](https://developer.mozilla.org/en-US/docs/Web/API/Element/remove)

#### 構建工具
- [Vite 官方](https://vitejs.dev/)
- [TypeScript 官方](https://www.typescriptlang.org/)
- [pnpm 官方](https://pnpm.io/)
- [Node.js 文檔](https://nodejs.org/docs/)

### 📚 深度學習

#### Security（安全性）
- [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [MV3 Security Model](https://developer.chrome.com/docs/extensions/mv3/intro/mv3-overview/#security)
- [Isolated World](https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated-world)

#### Performance（性能）
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [requestIdleCallback](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback)
- [Debouncing and Throttling](https://www.freecodecamp.org/news/javascript-debounce-examples/)

#### Best Practices（最佳實踐）
- [Google: Extension Best Practices](https://developer.chrome.com/docs/extensions/mv3/best-practices/)
- [MDN: Extension Development](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/#getting_started)

### 🎓 線上課程和教程

- YouTube：[Chrome Extensions Tutorial](https://www.youtube.com/results?search_query=chrome+extension+tutorial+manifest+v3)
- Udemy：Extension Development Courses
- FreeCodeCamp：Web Extension Development

### 🐛 問題排除

#### 常見問題
- [Chrome Extension FAQ](https://developer.chrome.com/docs/extensions/mv3/faq/)
- [Firefox WebExtensions FAQ](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Tips)
- Stack Overflow：標籤 `google-chrome-extension`, `firefox-webextensions`

#### 調試工具
- Chrome DevTools（`F12`）
- Firefox Developer Edition（內置完整開發工具）
- `chrome://extensions` 和 `about:debugging`

### 📝 相關項目示例

- [WXT Examples](https://github.com/wxt-dev/wxt/tree/main/examples)
- [Chrome Extension Samples](https://github.com/GoogleChrome/chrome-extensions-samples)
- [MDN WebExtensions Examples](https://github.com/mdn/webextensions-examples)

### 💬 社群支持

- [WXT GitHub Discussions](https://github.com/wxt-dev/wxt/discussions)
- [Chrome Extension Google Group](https://groups.google.com/a/chromium.org/forum/#!forum/chromium-extensions)
- [Firefox WebExtensions Forum](https://discourse.mozilla.org/c/add-ons/)
- Stack Overflow：`google-chrome-extension`, `firefox-webextensions` 標籤

---

## 總結

你現在已掌握：

✅ **項目初始化** — 從零開始設置 WXT 項目  
✅ **Manifest V3** — 理解新一代擴展規範  
✅ **雙層防禦架構** — CSS 預防 + MutationObserver 監控  
✅ **TypeScript** — 類型安全的JavaScript 開發  
✅ **跨瀏覽器支援** — 同時支援 Chrome 和 Firefox  
✅ **性能優化** — 輕量級監控，零 CPU 浪費  
✅ **調試技巧** — 使用 DevTools 診斷問題  

### 下一步？

1. **修改項目** — 改進彈窗檢測邏輯，支持其他網站
2. **添加功能** — 實現 popup UI、options 頁面
3. **上傳應用商店** — 發佈到 Chrome Web Store / Firefox Add-ons
4. **深度學習** — 研究其他進階 Extension API

---

**準備好開始了嗎？** 🚀

回到 [README.md](README.md) 查看快速開始指南，或按照上述步驟親手構建你的第一個擴展！

