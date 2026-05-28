# Bill Transformer

一款快捷工具，主要用于将信用卡电子账单 PDF 文件自动转换成第三方记账工具所需的批量导入 Excel 文件。

## 功能特点

- 📄 **PDF 解析**：支持招商银行、广发银行、建设银行等多家银行信用卡 PDF 对账单解析
- 🔍 **智能分类**：根据商家名称自动分类到一级/二级分类
- 👥 **成员管理**：支持批量设置和单条修改交易成员
- 📊 **多 Sheet 导出**：按照记账工具要求生成支出、收入、转账三个 Sheet
- 🎨 **样式美观**：导出的 Excel 带有漂亮的表头样式

## 技术栈

- **框架**：Vue 3
- **构建工具**：Vite
- **UI 组件**：Element Plus
- **PDF 解析**：pdfjs-dist
- **Excel 处理**：exceljs
- **包管理器**：推荐使用 pnpm

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

启动后访问 http://localhost:5173

### 生产构建

```bash
pnpm build
```

构建产物将输出到 `dist` 目录

### 预览构建

```bash
pnpm preview
```

预览生产构建结果

## 使用说明

1. 上传银行信用卡 PDF 对账单（支持招商、广发、建行等）
2. 预览解析结果，查看和调整分类、成员等信息
3. 点击「导出 Excel」下载转换后的文件
4. 将 Excel 文件导入到你的记账工具中

## 项目结构

```
bill-transform/
├── public/
│   └── template.xls       # 记账模板文件
├── src/
│   ├── lib/
│   │   ├── pdfParser.js    # PDF 解析器
│   │   ├── transform.js     # 数据转换器
│   │   ├── categories.js    # 分类规则
│   │   └── excelWriter.js   # Excel 导出器
│   ├── App.vue             # 主应用组件
│   └── main.js             # 入口文件
├── index.html
├── package.json
└── vite.config.js
```

## License

MIT
