# Starscope · 星象图

> Turn your GitHub stars into a personal **technical constellation map**.

**English** · [中文](./README.zh-CN.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages-2ea44f.svg)](./.github/workflows/deploy.yml)
[![No Backend](https://img.shields.io/badge/Backend-none-7cc4ff.svg)](#)

---

## ✨ What is Starscope?

Starscope reads a GitHub user's **public starred repositories**, groups them into
constellations by technology area, and renders them as an animated star map — then
tells you what your technical taste actually looks like.

No sign-up. No backend. Everything is computed locally in your browser.

![Starscope preview](https://img.shields.io/badge/demo-live-7cc4ff.svg)

---

## 🚀 Quick Start

### Use it online

Open the deployed page: `https://YOUR_USERNAME.github.io/starscope/`

### Run locally

```bash
git clone https://github.com/YOUR_USERNAME/starscope.git
cd starscope

# Any static server works:
python3 -m http.server 8080
# or
npx serve .
```

Then open `http://localhost:8080`.

> A single-file build is also included: `starscope.html` — styles and scripts are
> inlined, so you can open it directly without a server.

---

## 📖 How to Use

1. Enter a **GitHub username** (e.g. `torvalds`) in the search box.
2. Press `Enter` or click **Explore star map**.
3. Starscope fetches that user's public stars and draws the map.
4. Read the **technical profile**, language breakdown, and constellation composition.
5. Click **Generate share card** to export a 1200×630 image.

### Demo mode

Don't want to look up a real person? Click **Try demo mode** to see the map with
a bundled sample dataset — no token required.

### Optional GitHub Token

Unauthenticated GitHub API access is limited to **60 requests/hour**. Click
**Token settings** in the top bar to raise it to **5,000 requests/hour**.

1. Visit https://github.com/settings/tokens
2. Generate a classic token with `public_repo` scope (or use a read-only token).
3. Paste it into the settings dialog.

The token is stored only in your browser's `localStorage` and is never uploaded
to any server.

---

## 🛠️ Tech Stack

| Layer | Choice |
|------|--------|
| Framework | Vanilla HTML + CSS + JavaScript (no build step) |
| Fonts | Space Grotesk Variable, JetBrains Mono Variable, Noto Sans SC Variable |
| Visualization | Canvas API (particle system + constellation links) |
| Data source | GitHub REST API v3 |
| Deployment | GitHub Pages (static hosting) |

---

## 📂 Project Structure

```
starscope/
├── index.html               # Main page
├── style.css                # Stylesheet
├── app.js                   # App logic (API / classification / map / share card)
├── data.js                  # Bundled demo dataset
├── starscope.html           # Single-file build (inlined)
├── README.md                # This file (English)
├── README.zh-CN.md          # Chinese README
├── LICENSE                  # MIT
└── .github/
    └── workflows/
        └── deploy.yml       # GitHub Pages deploy workflow
```

---

## 🎨 Design Notes

### Visual language

- **Deep-space base** `#05060f` for the cosmic backdrop
- **Single accent** cyan `#7cc4ff` for primary interaction
- **Spectral palette** — six constellation categories, one color each
- **Animated star field** — randomized twinkling particles for depth

### Constellation categories

| Category | Color | Example keywords |
|----------|-------|------------------|
| AI 星系 | `#7cc4ff` | llm, ai, machine-learning, nlp, agent, rag |
| 前端星云 | `#b79cff` | react, vue, frontend, css, typescript, ui |
| 底层星域 | `#63e6be` | rust, c++, kernel, linux, compiler, wasm |
| 云端星团 | `#ffc46b` | kubernetes, docker, devops, terraform, aws |
| 数据星簇 | `#ff8fb1` | database, postgres, redis, sql, cache |
| 工具星群 | `#a8e06a` | cli, terminal, editor, vim, productivity |

Repositories that match no category fall into **远航星尘** (Other).

---

## 🔐 Privacy & Security

- Starscope collects **no** user data.
- The GitHub token is stored only in your browser's `localStorage`.
- All statistics are computed client-side, with no server logs.
- Share cards are generated entirely in the browser, with no third-party service.

---

## 🤝 Contributing

Issues and pull requests are welcome. Some directions worth exploring:

- [ ] More classification dimensions for constellations
- [ ] Export the technical profile as JSON / CSV
- [ ] Light / dark theme switch
- [ ] Better mobile gesture interaction
- [ ] A preset library of "celebrity star maps"

---

## 📄 License

MIT License — see [LICENSE](./LICENSE).

---

## 🙏 Credits

Inspired by:

- [keyboard-signature](https://github.com/cnrad/keyboard-signature) — draw your name on the keyboard
- [github-readme-stats](https://github.com/anuraghazra/github-readme-stats) — GitHub data cards
- Fun open-source projects discovered via the HelloGitHub community

Made with ❤️
