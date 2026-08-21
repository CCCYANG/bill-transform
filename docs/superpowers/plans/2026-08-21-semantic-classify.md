# Semantic Classify (Hybrid + DeepSeek) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional DeepSeek semantic classification for expenses that still fall to default `购物/日用品`, with local scene-keyword layer first; feature default OFF.

**Architecture:** Keep `classify()` as the rule engine; enrich unmatched expenses after `transform()` via `ai-classify.js` when settings enable it. Settings (toggle + API key) live in `localStorage`.

**Tech Stack:** Vue 3, Element Plus, Vite, DeepSeek OpenAI-compatible Chat Completions API, `localStorage`.

## Global Constraints

- Smart classify **default OFF**
- API Key only in `localStorage`, never committed
- AI only for expenses still `['购物','日用品']` after rules
- Allowed categories must come from existing `CATEGORY_MAP`
- Failure must not block transform/export
- No backend proxy in v1 (Vite dev proxy optional for local CORS)

## File map

| File | Role |
|------|------|
| `src/lib/categories.js` | Scene keywords + `isDefaultExpenseCategory` + `getAllowedExpenseCategories` |
| `src/lib/settings.js` | Read/write smart-classify toggle + API key |
| `src/lib/ai-classify.js` | Batch DeepSeek classify + validate |
| `src/lib/transform.js` | Unchanged classify entry (already uses full remark) |
| `src/App.vue` | Settings UI + async transform with AI pass |
| `vite.config.js` | Dev proxy `/deepseek` → `api.deepseek.com` (local only) |

---

### Task 1: Scene keywords + helpers in categories.js

**Files:**
- Modify: `src/lib/categories.js`

**Produces:**
- `isDefaultExpenseCategory(cat: string[]): boolean`
- `getAllowedExpenseCategories(): { c1: string, c2: string }[]`
- Expanded 餐饮-三餐 / meal-time keywords

- [ ] **Step 1:** Add keywords to the 三餐 rule and meal-time rules (keep order: more specific rules before generic where needed):

```js
{ kw: ['早餐', '午餐', '午饭', '晚饭', '晚餐', '夜宵'], cat: ['餐饮', '三餐'] },
{ kw: ['三餐', '餐厅', '饭店', '食堂', '美食广场', '拌饭', '炒鸡', '小吃', '火锅', '烧烤', '面馆', '粉店', '粥', '骨头汤', '盖浇饭', '麻辣烫', '黄焖鸡', '沙县', '老乡鸡', '茶', '咖啡', '奶茶', '烘焙', '蛋糕'], cat: ['餐饮', '三餐'] },
```

Keep existing separate 买菜/零食 rules; do not remove supermarket brands from 买菜.

- [ ] **Step 2:** Export helpers:

```js
export const DEFAULT_EXPENSE_CATEGORY = ['购物', '日用品']

export function isDefaultExpenseCategory (cat) {
  return Array.isArray(cat) && cat[0] === '购物' && cat[1] === '日用品'
}

export function getAllowedExpenseCategories () {
  const pairs = []
  for (const [c1, seconds] of Object.entries(CATEGORY_MAP)) {
    for (const c2 of seconds) pairs.push({ c1, c2 })
  }
  return pairs
}
```

- [ ] **Step 3:** Verify with node:

```bash
node -e "import { classify } from './src/lib/categories.js';
console.log(classify('老乡鸡 - 江苏老乡鸡'));
console.log(classify('早餐 - 收款方备注'));
console.log(classify('颜小婉菜饭骨头汤店'));"
```

Expected: all `['餐饮','三餐']`.

---

### Task 2: settings.js

**Files:**
- Create: `src/lib/settings.js`

**Produces:**
- `getSmartClassifyEnabled(): boolean` (default `false`)
- `setSmartClassifyEnabled(on: boolean): void`
- `getDeepseekApiKey(): string`
- `setDeepseekApiKey(key: string): void`
- `getDeepseekBaseUrl(): string` — default `'/deepseek'` in browser (Vite proxy) with fallback note; constant `DEEPSEEK_API_URL = 'https://api.deepseek.com'`

```js
const KEY_ENABLED = 'bill-transform:smart-classify'
const KEY_API = 'bill-transform:deepseek-api-key'

export function getSmartClassifyEnabled () {
  return localStorage.getItem(KEY_ENABLED) === '1'
}

export function setSmartClassifyEnabled (on) {
  localStorage.setItem(KEY_ENABLED, on ? '1' : '0')
}

export function getDeepseekApiKey () {
  return localStorage.getItem(KEY_API) || ''
}

export function setDeepseekApiKey (key) {
  if (!key) localStorage.removeItem(KEY_API)
  else localStorage.setItem(KEY_API, key.trim())
}

/** Browser uses Vite proxy path to avoid CORS in local/dev and preview-with-proxy. */
export function getDeepseekChatUrl () {
  return '/deepseek/chat/completions'
}
```

For GitHub Pages: add Vite `base`-aware note — production needs proxy or same-origin worker; v1 documents that AI classify is supported when site is served with proxy, and also try direct URL if `VITE_DEEPSEEK_DIRECT=1`. Simpler v1: use direct `https://api.deepseek.com/chat/completions` and if CORS fails show clear message; add vite proxy so `pnpm dev` works.

**Decision for implementer:** Prefer direct official URL first; configure `vite.config.js` proxy so requests to `/deepseek` work in `pnpm dev`. In App settings, base path fixed: use `/deepseek/chat/completions` when `import.meta.env.DEV`, else `https://api.deepseek.com/chat/completions` (may CORS-fail on GH Pages — surface error).

---

### Task 3: ai-classify.js

**Files:**
- Create: `src/lib/ai-classify.js`

**Produces:**
- `classifyExpensesWithAI(items, { apiKey, onProgress }): Promise<{ id, c1, c2 }[]>`
  - `items: { id: string, desc: string }[]`
  - batches of 40
  - validates against `getAllowedExpenseCategories()`

Core prompt must embed allowed pairs as compact `一级/二级` lines. Response parse: extract JSON array (strip markdown fences if present). Skip invalid pairs.

```js
export async function classifyExpensesWithAI (items, { apiKey, chatUrl, onProgress }) {
  // batch, fetch, parse, validate, return map-friendly list
}
```

On HTTP/parse errors: throw or return partial — App catches and keeps defaults.

---

### Task 4: Vite proxy

**Files:**
- Modify: `vite.config.js`

```js
server: {
  proxy: {
    '/deepseek': {
      target: 'https://api.deepseek.com',
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/deepseek/, '')
    }
  }
}
```

---

### Task 5: App.vue settings + async transform

**Files:**
- Modify: `src/App.vue`

- [ ] Header: settings button → `el-dialog` with switch + API key input + save
- [ ] Load settings on mount into refs
- [ ] `handleTransform` → `async`: `applyTransform()` then if enabled and key present, collect expenses where `isDefaultExpenseCategory([一级,二级])`, call AI, write back categories + `_aiClassified: true`
- [ ] Loading message during AI
- [ ] If enabled but no key: `ElMessage.warning('请先在设置中配置 DeepSeek API Key')` and skip AI (keep rule results)

---

### Task 6: Manual verification

- [ ] Scene words without AI: 老乡鸡 / 早餐 / 骨头汤 → 餐饮-三餐
- [ ] 中石油 still 交通-私家车
- [ ] Smart off: no network to DeepSeek
- [ ] Smart on + key (local `pnpm dev`): default leftovers get AI categories
- [ ] Confirm no API key in git tracked files

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Scene keywords | 1 |
| DeepSeek batch + allowlist | 3 |
| Default OFF + localStorage key | 2, 5 |
| Transform integration | 5 |
| Failure non-blocking | 5 |
| CORS risk mitigation (dev proxy) | 4 |
| No key in repo | 2, 6 |
