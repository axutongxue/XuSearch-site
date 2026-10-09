# 官网部署（GitHub Pages）

本目录就是**要推上去的全部内容**，放在 Git 仓库根目录即可上线。

结构：
```
deploy/
├── index.html        ← 官网首页（v4 地平线版内容，作为落地页 /）
├── assets/           ← 样式 / 脚本 / 字体 / 视频（35MB）
└── docs/
    ├── index.html             ← 教程总览页
    ├── script-tutorial.html   ← 脚本使用教程
    ├── free-api.html          ← 免费 AI 大模型 API 推荐
    ├── docs.css               ← 文档样式
    ├── toc.js                 ← 左侧目录
    └── copy-code.js           ← 代码一键复制
```

> 只含对外内容：草稿（v1–v3 选择页）、旧教程子集、MD 源文件等都在 `xusearch-site/` 里，未放入。

## 部署步骤

1. 在 GitHub 新建一个**公开仓库**（比如 `xusearch`），不要勾选 README。
2. 进入本目录，初始化并推送：
   ```bash
   cd deploy
   git init
   git add .
   git commit -m "init site"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/xusearch.git
   git push -u origin main
   ```
3. 仓库页面 → **Settings → Pages** → Source 选 `Deploy from a branch` → 分支选 `main` + 目录选 `/(root)` → Save。
4. 等一两分钟，访问：
   ```
   https://<你的用户名>.github.io/<仓库名>/
   ```
   例如 `https://axutongxue.github.io/xusearch/`。

## 说明

- 落地页就是 `index.html`（v4 首页内容），无需重定向。
- 首页与文档互相引用处用的是相对路径，部署在子路径 `github.io/<仓库>/` 下也能正常工作。
- 大文件只有 `assets/video/*.mp4`（约 35MB），符合 Pages 限制；若想再瘦身，可用 ffmpeg 压一版再替换。
- 之后每次更新：改完源文件后把这几个文件重新复制进 `deploy/` 再 `git add . && git commit && git push` 即可。
