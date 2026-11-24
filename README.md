# MissionHub Open Source Community Website

MissionHub 开源社区官方门户网站源码仓库，聚焦 Linux、Yocto Project 与 Zephyr 开源实践。

## 本地预览

仓库为纯静态站点，无需额外构建步骤，直接在项目根目录启动静态 HTTP 服务即可预览：

```bash
python3 -m http.server 8080
```

随后访问 `http://localhost:8080/`。

## 目录结构

- `index.html`：社区官网首页（支持简体中文 / English 实时切换）
- `mascot/index.html`：官方吉祥物独立页面（角色设定、1:1 动态与静态表情包筛选与大图预览）
- `styles/tokens.css`：色彩、字体、间距与动效设计令牌
- `styles/main.css`：响应式布局、互动组件与无障碍样式
- `scripts/i18n.mjs`：中英文双语文案字典
- `scripts/hero-field.mjs`：首屏交互式三维波浪点阵画布
- `scripts/mascot-buddy.mjs`：首页右下角 20 帧全身 Q 版 MissionHub 娘互动桌面宠物
- `scripts/main.mjs`：语言切换、导航吸顶、3D 轨道倾角交互、表情包筛选与大图预览
- `assets/`：MissionHub Logo、20 家合作伙伴徽标、飞书社群二维码、官方吉祥物表情包与 20 帧宠物图集
- `CONTRIBUTE.md`：原子化提交与 DCO 贡献规范
- `.github/workflows/pages.yml`：GitHub Pages 自动部署工作流

## 许可说明

网站代码采用 [MIT License](LICENSE)；`assets/mascot/` 中的 MissionHub 娘官方形象资源源自 [missionhub-oss/mascot](https://github.com/missionhub-oss/mascot)，遵循 Apache License 2.0，详见 [NOTICE](NOTICE)。
