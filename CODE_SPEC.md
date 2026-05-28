# 代码规范文档

## 一、ESLint 自定义规则

### 1.1 JavaScript 基础规则

```javascript
{
  'no-var': 'error',                          // 禁止使用 var，必须用 let/const
  'prefer-const': 'error',                     // 优先使用 const
  'no-empty': ['error', { allowEmptyCatch: true }],  // 禁止空代码块（catch 除外）
  'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],  // 未使用变量警告
  'quotes': ['error', 'single', { avoidEscape: true }],  // 单引号
  'comma-dangle': ['error', 'never'],         // 禁止结尾逗号
  'semi': ['error', 'never'],                 // 禁止分号
  'space-before-function-paren': ['error', 'always'],  // 函数括号前加空格
  'func-call-spacing': ['error', 'never'],    // 函数调用不加空格
  'no-case-declarations': 'off'               // case 中允许声明
}
```

### 1.2 未使用导入规则

```javascript
{
  'unused-imports/no-unused-imports': 'error',  // 禁止未使用导入
  'unused-imports/no-unused-vars': 'off'
}
```

### 1.3 Vue 组件规则

```javascript
{
  'vue/multi-word-component-names': 'off',          // 允许多单词组件名（可选）
  'vue/no-v-html': 'off',                           // 允许 v-html
  'vue/no-reserved-component-names': 'error',       // 禁止使用保留字
  'vue/define-emits-declaration': ['error', 'type-literal'],  // emits 类型声明
  'vue/define-props-declaration': ['error', 'type-based'],    // props 类型声明
  'vue/component-name-in-template-casing': [        // 模板中组件名 kebab-case
    'error',
    'kebab-case',
    { registeredComponentsOnly: false }
  ],
  'vue/first-attribute-linebreak': [                // 第一个属性换行
    'error',
    { singleline: 'ignore', multiline: 'below' }
  ],
  'vue/max-attributes-per-line': [                  // 每行属性数量
    'error',
    { singleline: { max: 3 }, multiline: { max: 1 } }
  ],
  'vue/html-closing-bracket-newline': [             // 闭合括号换行
    'error',
    { singleline: 'never', multiline: 'always' }
  ],
  'vue/html-indent': [                               // HTML 缩进
    'error',
    2,
    {
      attribute: 1,
      baseIndent: 1,
      closeBracket: 0,
      alignAttributesVertically: false
    }
  ]
}
```

### 1.4 Prettier 格式化配置

```json
{
  "singleQuote": true,
  "semi": false,
  "trailingComma": "none",
  "singleAttributePerLine": false,
  "printWidth": 100
}
```

---

## 二、文件与目录命名

`.vue` / `.ts` / `.js` 文件名与目录名统一使用 kebab-case：

```
src/
├── lib/
│   ├── pdf-parser.js
│   ├── transform.js
│   ├── categories.js
│   └── excel-writer.js
├── App.vue
└── main.js
```

### 规则：

- **文件名**：`xxx-yyy.vue` / `xxx-yyy.ts` / `xxx-yyy.js`
- **目录名**：`xxx-yyy/`
- **含子组件 / types / hooks 等多文件结构** → `xxx-yyy/index.vue`
- **单文件组件** → `xxx-yyy.vue`
- **禁止与 HTML/SVG 原生标签同名的单词文件**（`header.vue` / `footer.vue` / `main.vue` / `nav.vue`），必须加业务前缀或后缀（`app-header.vue` / `page-footer.vue`）；`index.vue` 作为目录入口不受此限
- **缩写遵循 kebab 全小写不拆分**：`xxx-yyy`、`aaa-bbb`、`ccc`
- **类型声明双后缀保留**：`xxx.types.ts`

---

## 三、Vue 模板组件写法

模板中所有组件统一使用 kebab-case，覆盖三类来源：

```vue
<template>
  <!-- Element Plus -->
  <el-button type="primary">提交</el-button>
  <el-input v-model="value" />

  <!-- Vue Router -->
  <router-view />
  <router-link to="/home">首页</router-link>

  <!-- 自有组件 -->
  <xxx-dialog v-model="visible" />
</template>
```

由 `vue/component-name-in-template-casing` (kebab-case, registeredComponentsOnly: false) 强制约束，保存时自动转换。

---

## 四、项目当前文件结构

```
bill-transform/
├── public/
│   └── template.xls
├── src/
│   ├── lib/
│   │   ├── pdf-parser.js
│   │   ├── transform.js
│   │   ├── categories.js
│   │   └── excel-writer.js
│   ├── App.vue
│   └── main.js
├── eslint.config.mjs
├── .prettierrc.json
├── .prettierignore
├── package.json
└── vite.config.js
```

---

## 五、快速开始

### 安装依赖
```bash
pnpm install
```

### 开发模式
```bash
pnpm dev
```

### 代码检查
```bash
pnpm lint
```

### 自动修复
```bash
pnpm lint:fix
```

### 格式化代码
```bash
pnpm format
```

### 生产构建
```bash
pnpm build
```
