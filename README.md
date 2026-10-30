# XuSearch 虚空搜索 — 官网

[虚空搜索（XuSearch）](https://xusearch.com/) 浏览器扩展的官方网站。纯静态站点，无构建步骤，整目录直接部署到 GitHub Pages。

## 目录结构

| 路径 | 内容 |
|---|---|
| `index.html` | 官网主页（单页：首屏视频背景 + 通栏演示 + 十大能力 + 常见问题） |
| `service.html` | 人工客服页（企业微信二维码） |
| `docs/` | 教程中心：总览 `index.html` + 3 篇教程，共用 `docs.css` / `toc.js`（折叠目录）/ `copy-code.js`（代码复制） |
| `assets/css/` | `base.css` 设计系统、`site.css` 版式、`theme.css` 黑白玻璃主题皮肤、`fonts.css` 字体声明 |
| `assets/js/` | `shared.js` 公共交互（淡入/视频管理）、`site.js` 页面交互（Dock/菜单）、`stars.js` 星空粒子背景 |
| `assets/video/` | 首屏背景视频 `hero-bg.mp4`（H.264，静音循环，离屏自动暂停） |
| `assets/fonts/` | 本地字体文件 |
| `虚空搜索_1.0.0.crx` | 扩展离线安装包 |

## 本地预览

在本目录下起静态服务器（**不要用 file:// 打开**，教程页相对路径会失效）：

```
python -m http.server 8642
```

浏览器打开 http://127.0.0.1:8642/index.html

## 部署（GitHub Pages）

1. 仓库：`axutongxue/XuSearch-site`，用 GitHub Desktop 把本目录全部内容推上去（Pages 来源：main / root）
2. 自定义域名 `xusearch.com`：确保仓库根有 `CNAME` 文件（内容一行 `xusearch.com`）；DNS 由 Cloudflare 代理解析到 GitHub Pages，SSL 模式建议 Full

## 维护约定

- 改任何 CSS/JS，引用处的 `?v=` 版本号必须同步升级（防浏览器/CDN 缓存旧资源）
- `theme.css` 只做"皮肤"（颜色/字体/描边/模糊），布局一律在 `site.css`，两者别混
- 首屏背景视频必须带 `muted` + `playsinline` + `loop`；滚动出视口自动暂停的逻辑在 `shared.js`
- `stars.js` 的星星只在页面初始化时生成一次（坐标归一化），resize 只重设画布尺寸——不要在 resize 回调里重建内容（Safari 滚动收放工具栏会连发 resize，会导致整片星空重置）
