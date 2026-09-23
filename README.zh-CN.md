# Starscope · 星象图

> 把你的 GitHub 星标，绘制成一张专属的**技术星象图**。

[English](./README.md) · **中文**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages-2ea44f.svg)](./.github/workflows/deploy.yml)
[![No Backend](https://img.shields.io/badge/Backend-none-7cc4ff.svg)](#)

---

## ✨ Starscope 是什么？

Starscope 会读取一个 GitHub 用户的**公开星标仓库**，按技术方向把它们聚成
星座，绘制成一张会呼吸的星图——顺便告诉你，你的技术品味究竟长什么样。

无需注册，无需后端，所有计算都在你的浏览器本地完成。

---

## 🚀 快速开始

### 在线体验

访问部署后的页面：`https://YOUR_USERNAME.github.io/starscope/`

### 本地运行

```bash
git clone https://github.com/YOUR_USERNAME/starscope.git
cd starscope

# 任意静态服务器都可以：
python3 -m http.server 8080
# 或
npx serve .
```

然后在浏览器打开 `http://localhost:8080`。

> 仓库内还附带了一个单文件版本 `starscope.html`，样式与脚本已全部内联，
> 无需服务器即可直接双击打开。

---

## 📖 使用说明

1. 在输入框中输入一个 **GitHub 用户名**（例如 `torvalds`）。
2. 按回车或点击「探索星图」。
3. Starscope 会拉取该用户的公开星标，并绘制星图。
4. 查看**技术名片**、语言分布与星座构成。
5. 点击「生成分享卡片」，导出 1200×630 的图片。

### 演示模式

不想查真人？点击「进入演示模式」，即可用内置示例数据预览星图效果，无需 Token。

### GitHub Token（可选）

未登录状态下，GitHub API 每小时仅允许 **60 次**请求。点击右上角
「Token 设置」，可提升到每小时 **5000 次**。

1. 访问 https://github.com/settings/tokens
2. 生成一个带 `public_repo` 权限的 classic token（或使用只读令牌）。
3. 粘贴到设置弹窗中即可。

Token 仅保存在你浏览器的 `localStorage` 中，不会上传到任何服务器。

---

## 🛠️ 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | 原生 HTML + CSS + JavaScript（无构建步骤） |
| 字体 | Space Grotesk Variable、JetBrains Mono Variable、Noto Sans SC Variable |
| 可视化 | Canvas API（粒子系统 + 星座连线） |
| 数据源 | GitHub REST API v3 |
| 部署 | GitHub Pages（静态托管） |

---

## 📂 项目结构

```
starscope/
├── index.html               # 主页面
├── style.css                # 样式表
├── app.js                   # 应用逻辑（API / 分类 / 星图 / 分享卡片）
├── data.js                  # 内置演示数据集
├── starscope.html           # 单文件构建版（已内联）
├── README.md                # 英文说明
├── README.zh-CN.md          # 本文件（中文说明）
├── LICENSE                  # MIT 许可证
└── .github/
    └── workflows/
        └── deploy.yml       # GitHub Pages 自动部署工作流
```

---

## 🎨 设计说明

### 视觉语言

- **深空底色** `#05060f` 作为宇宙背景
- **单一强调色** 青色 `#7cc4ff` 作为主交互色
- **光谱调色** 六类星座各对应一种颜色
- **动态星场** 随机闪烁的粒子营造纵深

### 星座分类体系

| 类别 | 颜色 | 关键词示例 |
|------|------|-----------|
| AI 星系 | `#7cc4ff` | llm, ai, machine-learning, nlp, agent, rag |
| 前端星云 | `#b79cff` | react, vue, frontend, css, typescript, ui |
| 底层星域 | `#63e6be` | rust, c++, kernel, linux, compiler, wasm |
| 云端星团 | `#ffc46b` | kubernetes, docker, devops, terraform, aws |
| 数据星簇 | `#ff8fb1` | database, postgres, redis, sql, cache |
| 工具星群 | `#a8e06a` | cli, terminal, editor, vim, productivity |

未被归类的仓库将落入「远航星尘」（Other）。

---

## 🔐 隐私与安全

- Starscope **不收集**任何用户数据。
- GitHub Token 仅存储在浏览器的 `localStorage` 中。
- 所有统计均在客户端完成，无服务端日志。
- 分享卡片完全在浏览器内生成，不经过任何第三方服务。

---

## 🤝 贡献

欢迎提交 Issue 或 Pull Request。以下是一些可以探索的方向：

- [ ] 增加更多星座分类维度
- [ ] 支持导出 JSON / CSV 技术画像
- [ ] 浅色 / 深色主题切换
- [ ] 优化移动端手势交互
- [ ] 增加「名人星图」预设库

---

## 📄 许可证

MIT License · 详见 [LICENSE](./LICENSE)。

---

## 🙏 致谢

灵感来源于：

- [keyboard-signature](https://github.com/cnrad/keyboard-signature) —— 用键盘画出你的名字
- [github-readme-stats](https://github.com/anuraghazra/github-readme-stats) —— GitHub 数据卡片
- 通过 HelloGitHub 社区发现的各类趣味开源项目

Made with ❤️
