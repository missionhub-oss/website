# Contributing to MissionHub Website

欢迎参与 MissionHub 开源社区官网的开发与维护。为保证提交历史清晰、可审查且易于追溯，所有提交均需遵守以下规范。

## 原子化补丁原则

- 每个提交只做一件独立且完整的改动（例如：样式调整、文案更新、资源新增、脚本逻辑或工作流配置分别提交）。
- 避免将无关重构、格式化与功能修改混入同一提交。
- 每个提交都应保持站点可正常访问，不引入损坏的相对路径或脚本语法错误。

## 提交信息格式

提交信息由标题行、空行、正文与 DCO 签名行组成：

```text
<module>: <subject>

<commit body wrapped at 72 characters per line>

Signed-off-by: Your Name <your.email@example.com>
```

### 标题行规则

- 格式固定为 `<module>: <subject>`，冒号后保留一个半角空格。
- 常用模块名：
  - `pages`：`index.html`、`mascot/index.html` 等页面结构变更
  - `styles`：`styles/tokens.css`、`styles/main.css` 等样式与布局变更
  - `scripts`：`scripts/` 下的交互逻辑与多语言词典变更
  - `assets`：`assets/` 下的图标、伙伴徽标与吉祥物资源变更
  - `docs`：`README.md`、`CONTRIBUTE.md`、`NOTICE` 等文档变更
  - `ci`：`.github/workflows/` 下的自动化与部署配置变更
- `<subject>` 使用简洁祈使句概括改动内容，首字母小写，末尾不加句号，整行不超过 72 个字符。

### 正文规则

- 标题行后空一行再写正文（Commit Body），说明改动背景、核心内容及影响范围。
- 正文每一行长度严格不超过 **72 个字符**（包含英文字符与空格，中文按字符宽度适度提前折行）。

### DCO 签名

本仓库启用 Developer Certificate of Origin（DCO），每个提交末尾必须包含提交者本人的签名行：

```bash
git commit -s
```

提交信息末尾格式示例：

```text
Signed-off-by: Your Name <your.email@example.com>
```

请勿在提交信息中添加 `Co-Authored-By` 或自动生成工具标识。

### 完整示例

```text
pages: add Sipeed to ecosystem partner wall

Sync the latest partner list from MFCP by adding Sipeed with its
official SVG logo and bilingual labels, balancing the desktop grid
into four full rows of five partners.

Signed-off-by: Chao Liu <chao.liu@processmission.com>
```

## 提交前检查

1. 校验 ES 模块语法无错误：
   ```bash
   node --check scripts/i18n.mjs scripts/hero-field.mjs scripts/mascot-buddy.mjs scripts/main.mjs
   ```
2. 在项目根目录启动静态服务并检查 `/` 与 `/mascot/` 页面加载、中英文切换及移动端响应式排版：
   ```bash
   python3 -m http.server 8080
   ```
3. 确认所有相对路径资源在子路径部署（如 GitHub Pages）下均可正常加载。
