/* ==========================================================================
   Starscope — 应用逻辑
   数据获取 → 星座分类 → Canvas 星图 → 技术名片 → 分享卡片
   无后端依赖；核心渲染不依赖网络与存储。
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- 常量与工具 ---------- */

  var API = "https://api.github.com";
  var STAR_PAGE_SIZE = 100;
  var MAX_STARS = 200;
  var MAX_FETCH_PAGES = 2;

  function byId(id) { return document.getElementById(id); }

  function esc(s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmt(n) {
    if (typeof n !== "number" || isNaN(n)) return "—";
    return n.toLocaleString("en-US");
  }

  /* 受保护的本地存储：不可用时静默降级 */
  var store = (function () {
    try {
      var k = "__starscope_probe__";
      window.localStorage.setItem(k, "1");
      window.localStorage.removeItem(k);
      return window.localStorage;
    } catch (e) { return null; }
  })();

  function storeGet(key) {
    try { return store ? store.getItem(key) : null; } catch (e) { return null; }
  }
  function storeSet(key, val) {
    try { if (store) store.setItem(key, val); } catch (e) { /* 忽略配额或隐私模式错误 */ }
  }

  /* 稳定伪随机：同一输入永远得到同一输出，保证星图可复现 */
  function seedRandom(seedStr) {
    var h = 2166136261;
    for (var i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    var s = h >>> 0;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  /* ---------- 星座分类体系 ---------- */

  var CATEGORIES = [
    {
      id: "ai", color: "#7cc4ff", name: "AI 星系", short: "AI",
      desc: "大模型、机器学习与智能应用",
      keys: ["ai", "llm", "gpt", "ml", "machine-learning", "deep-learning", "nlp",
        "transformer", "diffusion", "neural", "agent", "agents", "rag", "openai",
        "generative", "embedding", "pytorch", "tensorflow", "inference", "chatbot", "multiagent"]
    },
    {
      id: "web", color: "#b79cff", name: "前端星云", short: "Web",
      desc: "界面、框架与浏览器体验",
      keys: ["react", "vue", "svelte", "frontend", "css", "html", "javascript",
        "typescript", "nextjs", "tailwind", "ui", "three", "webgl", "web",
        "components", "design-system", "framework", "ssr", "bundler"]
    },
    {
      id: "systems", color: "#63e6be", name: "底层星域", short: "Systems",
      desc: "语言、内核与系统编程",
      keys: ["c", "c++", "rust", "go", "golang", "kernel", "linux", "compiler",
        "systems", "os", "language", "concurrency", "wasm", "embedded"]
    },
    {
      id: "devops", color: "#ffc46b", name: "云端星团", short: "DevOps",
      desc: "容器、基础设施与可观测性",
      keys: ["kubernetes", "docker", "devops", "terraform", "aws", "cloud", "ci",
        "cd", "monitoring", "observability", "ansible", "prometheus", "grafana",
        "containers", "infrastructure", "proxy", "gateway", "server", "https", "cloud-native"]
    },
    {
      id: "data", color: "#ff8fb1", name: "数据星簇", short: "Data",
      desc: "数据库、检索与数据管线",
      keys: ["database", "sql", "postgres", "postgresql", "redis", "data", "etl",
        "spark", "kafka", "cache", "analytics", "search", "storage", "mysql", "mongodb"]
    },
    {
      id: "tools", color: "#a8e06a", name: "工具星群", short: "Tools",
      desc: "命令行、编辑器与生产力",
      keys: ["cli", "terminal", "editor", "vim", "shell", "zsh", "productivity",
        "tools", "git", "ide", "fuzzy-finder", "multiplexer", "system-info", "animation", "fake"]
    }
  ];

  var OTHER_CAT = {
    id: "other", color: "#8b97b8", name: "远航星尘", short: "Other",
    desc: "尚未归类的探索足迹"
  };

  function classify(repo) {
    var lang = (repo.language || "").toLowerCase();
    var topics = (repo.topics || []).map(function (t) { return String(t).toLowerCase(); });
    var hay = topics.concat([lang, (repo.name || "").toLowerCase(),
      (repo.description || "").toLowerCase()]);
    var best = null, bestScore = 0;
    for (var i = 0; i < CATEGORIES.length; i++) {
      var cat = CATEGORIES[i], score = 0;
      for (var j = 0; j < cat.keys.length; j++) {
        var key = cat.keys[j];
        for (var k = 0; k < hay.length; k++) {
          if (!hay[k]) continue;
          if (hay[k] === key) { score += 3; break; }
          if (hay[k].indexOf(key) !== -1) { score += 1; break; }
        }
      }
      if (score > bestScore) { bestScore = score; best = cat; }
    }
    return best || OTHER_CAT;
  }

  /* ---------- 视图切换 ---------- */

  var VIEWS = ["view-intro", "view-loading", "view-error", "view-result"];

  function showView(id) {
    VIEWS.forEach(function (v) {
      var el = byId(v);
      if (el) el.hidden = (v !== id);
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* ---------- 数据获取 ---------- */

  function authHeaders() {
    var h = { "Accept": "application/vnd.github+json" };
    var token = storeGet("starscope_token");
    if (token) h["Authorization"] = "Bearer " + token;
    return h;
  }

  function normalize(item) {
    // item 可能是 API 原始对象，也可能是演示数组
    if (Array.isArray(item)) {
      return {
        owner: item[0], name: item[1], full_name: item[0] + "/" + item[1],
        html_url: "https://github.com/" + item[0] + "/" + item[1],
        language: item[2] || null, stars: item[3] || 0,
        topics: (item[4] ? item[4].split(",") : []),
        description: item[5] || ""
      };
    }
    return {
      owner: item.owner ? item.owner.login : "",
      name: item.name,
      full_name: item.full_name,
      html_url: item.html_url,
      language: item.language,
      stars: item.stargazers_count || 0,
      topics: item.topics || [],
      description: item.description || ""
    };
  }

  function buildDemoData() {
    return {
      profile: {
        login: DEMO_PROFILE.login,
        name: DEMO_PROFILE.name,
        bio: DEMO_PROFILE.bio,
        avatar_url: DEMO_PROFILE.avatar_url,
        html_url: DEMO_PROFILE.html_url,
        public_repos: DEMO_PROFILE.public_repos,
        followers: DEMO_PROFILE.followers,
        following: DEMO_PROFILE.following,
        company: DEMO_PROFILE.company,
        location: DEMO_PROFILE.location,
        created_at: DEMO_PROFILE.created_at
      },
      repos: DEMO_REPOS.map(normalize),
      demo: true,
      truncated: false
    };
  }

  function apiError(code, detail) {
    var e = new Error(detail || code);
    e.code = code;
    return e;
  }

  function fetchStarred(username, headers) {
    var collected = [];
    function step(page) {
      if (page > MAX_FETCH_PAGES || collected.length >= MAX_STARS) {
        return Promise.resolve();
      }
      var url = API + "/users/" + encodeURIComponent(username) +
        "/starred?per_page=" + STAR_PAGE_SIZE + "&page=" + page;
      return fetch(url, { headers: headers }).then(function (res) {
        if (res.status === 403 || res.status === 429) {
          throw apiError("ratelimit", "GitHub API 请求频率已达上限");
        }
        if (!res.ok) return; // 无星标或权限受限：保留已获取部分
        return res.json().then(function (batch) {
          if (!Array.isArray(batch) || batch.length === 0) return;
          collected = collected.concat(batch);
          if (batch.length === STAR_PAGE_SIZE) return step(page + 1);
        });
      });
    }
    return step(1).then(function () {
      return collected.map(normalize);
    });
  }

  function loadUser(username) {
    var headers = authHeaders();
    var profileUrl = API + "/users/" + encodeURIComponent(username);
    return fetch(profileUrl, { headers: headers }).then(function (res) {
      if (res.status === 404) throw apiError("notfound", "未找到该 GitHub 用户");
      if (res.status === 403 || res.status === 429) {
        throw apiError("ratelimit", "GitHub API 请求频率已达上限");
      }
      if (!res.ok) throw apiError("http", "请求失败，状态码 " + res.status);
      return res.json();
    }).then(function (profile) {
      return fetchStarred(username, headers).then(function (repos) {
        return {
          profile: profile,
          repos: repos,
          demo: false,
          truncated: repos.length >= MAX_STARS
        };
      });
    });
  }

  /* ---------- 统计计算 ---------- */

  function computeStats(data) {
    var repos = data.repos.slice();
    repos.forEach(function (r) { r.cat = classify(r); });

    var catMap = {};
    repos.forEach(function (r) {
      if (!catMap[r.cat.id]) {
        catMap[r.cat.id] = { cat: r.cat, repos: [], topStars: 0 };
      }
      catMap[r.cat.id].repos.push(r);
      catMap[r.cat.id].topStars += r.stars;
    });
    var catStats = Object.keys(catMap).map(function (k) { return catMap[k]; })
      .sort(function (a, b) { return b.repos.length - a.repos.length; });

    var langMap = {};
    repos.forEach(function (r) {
      var l = r.language || "Other";
      langMap[l] = (langMap[l] || 0) + 1;
    });
    var langStats = Object.keys(langMap).map(function (l) {
      return { lang: l, count: langMap[l] };
    }).sort(function (a, b) { return b.count - a.count; });

    var totalStars = repos.reduce(function (s, r) { return s + r.stars; }, 0);
    var sortedByStars = repos.slice().sort(function (a, b) { return b.stars - a.stars; });
    // 意外宝藏：星标数较少但确实被收录的仓库
    var gemPool = repos.slice().sort(function (a, b) { return a.stars - b.stars; });
    var gem = gemPool.length ? gemPool[Math.min(gemPool.length - 1, 0)] : null;

    var topCat = catStats[0] || { cat: OTHER_CAT, repos: [] };
    var topShare = repos.length ? topCat.repos.length / repos.length : 0;

    return {
      repos: repos,
      count: repos.length,
      catStats: catStats,
      langStats: langStats,
      totalStars: totalStars,
      mostStarred: sortedByStars[0] || null,
      gem: gem,
      topCat: topCat.cat,
      topShare: topShare,
      categoryCount: catStats.length,
      demo: !!data.demo,
      truncated: !!data.truncated,
      profile: data.profile
    };
  }

  /* ---------- 技术灵魂标签 ---------- */

  var SOULS = {
    ai: { title: "星际炼金术士", desc: "你的收藏夹里，模型与智能体在不停地自我演化。" },
    web: { title: "界面铸形者", desc: "你更在乎像素之下的体验与交互的呼吸感。" },
    systems: { title: "底层造物主", desc: "你愿意俯身到内存与调度器之间，直面无常。" },
    devops: { title: "云端领航员", desc: "你相信一切基础设施都应当被声明、被度量。" },
    data: { title: "数据溯流人", desc: "在你的世界里，每条数据都必须有来处与去向。" },
    tools: { title: "工具收藏家", desc: "你的终端里藏着一整个世界的效率器械。" },
    other: { title: "自由漫游者", desc: "你不属于任何星座，你四处采集光亮。" }
  };

  function soulFor(stats) {
    return SOULS[stats.topCat.id] || SOULS.other;
  }

  /* 基于自身星标结构估算的集中度指数（0-100），非与他人的真实比对 */
  function focusIndex(stats) {
    if (!stats.count) return 0;
    var top = Math.round(stats.topShare * 100);
    var diversityPenalty = Math.max(0, (stats.categoryCount - 1)) * 4;
    return Math.max(12, Math.min(99, top + 18 - diversityPenalty));
  }

  /* ---------- Canvas 星图 ---------- */

  var StarMap = (function () {
    var canvas, ctx, W = 1000, H = 620, DPR = 1;
    var stars = [], links = [], cats = [];
    var hovered = null, raf = null, t0 = 0, reduced = false, activeCat = null;
    var tipEl;

    function layout(stats) {
      cats = stats.catStats.slice(0, 7);
      var n = cats.length;
      var rng = seedRandom("starscope|" + (stats.profile.login || "") + "|" + stats.count);
      var cx = W / 2, cy = H / 2 + 6;
      var maxR = Math.min(W, H) * 0.36;

      stars = []; links = [];
      cats.forEach(function (cs, ci) {
        var angle = (ci / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2;
        var dist = n === 1 ? 0 : maxR * (0.62 + rng() * 0.5);
        var ax = cx + Math.cos(angle) * dist;
        var ay = cy + Math.sin(angle) * dist * 0.82;
        cs._ax = ax; cs._ay = ay;

        var spread = Math.max(38, 130 - cs.repos.length * 3);
        var local = [];
        cs.repos.forEach(function (repo) {
          var a = rng() * Math.PI * 2;
          var rr = Math.sqrt(rng()) * spread;
          var x = ax + Math.cos(a) * rr;
          var y = ay + Math.sin(a) * rr * 0.82;
          var mag = Math.max(0.6, Math.log10(repo.stars + 10) / 5);
          var st = {
            x: x, y: y, ax: ax, ay: ay,
            r: 1.6 + mag * 4.2,
            repo: repo, cat: cs.cat,
            phase: rng() * Math.PI * 2,
            speed: 0.6 + rng() * 1.2
          };
          local.push(st);
          stars.push(st);
        });
        // 星座连线：按角度排序后相邻连接
        local.sort(function (p, q) {
          return Math.atan2(p.y - ay, p.x - ax) - Math.atan2(q.y - ay, q.x - ax);
        });
        for (var i = 0; i < local.length - 1; i++) {
          links.push({ a: local[i], b: local[i + 1], color: cs.cat.color, w: 0.9 });
        }
      });
    }

    function setupTip() {
      tipEl = byId("starmap-tip");
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.aspectRatio = W + " / " + H;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function draw(now) {
      ctx.clearRect(0, 0, W, H);

      // 背景稀疏星尘
      var rng = seedRandom("dust");
      var count = 130;
      for (var i = 0; i < count; i++) {
        var x = rng() * W, y = rng() * H;
        var a = 0.12 + rng() * 0.35;
        ctx.globalAlpha = a;
        ctx.fillStyle = "#cfe0ff";
        ctx.beginPath();
        ctx.arc(x, y, rng() < 0.1 ? 1.4 : 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 星座连线
      links.forEach(function (l) {
        var ldim = (activeCat && l.a.cat.id !== activeCat) ? 0.15 : 1;
        ctx.strokeStyle = hexA(l.color, 0.22 * ldim);
        ctx.lineWidth = l.w;
        ctx.beginPath();
        ctx.moveTo(l.a.x, l.a.y);
        ctx.lineTo(l.b.x, l.b.y);
        ctx.stroke();
      });

      // 星点
      var time = (now - t0) / 1000;
      stars.forEach(function (s) {
        var tw = reduced ? 1 : (0.78 + 0.22 * Math.sin(time * s.speed + s.phase));
        var isHover = hovered === s;
        var rad = s.r * (isHover ? 1.7 : 1);
        var dim = (activeCat && s.cat.id !== activeCat) ? 0.16 : 1;

        // 光晕
        var glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rad * 5.5);
        glow.addColorStop(0, hexA(s.cat.color, 0.55 * tw * dim));
        glow.addColorStop(1, hexA(s.cat.color, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, s.y, rad * 5.5, 0, Math.PI * 2);
        ctx.fill();

        // 星核
        ctx.fillStyle = isHover ? "#ffffff" : hexA(s.cat.color, 0.95 * tw * dim);
        ctx.beginPath();
        ctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
        ctx.fill();
      });

      if (!reduced) raf = window.requestAnimationFrame(draw);
    }

    function hexA(hex, alpha) {
      var h = hex.replace("#", "");
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h, 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
    }

    function toLogical(evt) {
      var rect = canvas.getBoundingClientRect();
      var px = (evt.clientX - rect.left) / rect.width * W;
      var py = (evt.clientY - rect.top) / rect.height * H;
      return { x: px, y: py };
    }

    function nearest(p) {
      var best = null, bestD = 22 * 22;
      stars.forEach(function (s) {
        var dx = s.x - p.x, dy = s.y - p.y, d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = s; }
      });
      return best;
    }

    function showTip(s, evt) {
      if (!tipEl) return;
      var rect = canvas.getBoundingClientRect();
      var wrap = canvas.parentNode.getBoundingClientRect();
      tipEl.hidden = false;
      tipEl.style.left = ((s.x / W) * rect.width + (rect.left - wrap.left)) + "px";
      tipEl.style.top = ((s.y / H) * rect.height + (rect.top - wrap.top)) + "px";
      tipEl.innerHTML =
        '<div class="tip-name">' + esc(s.repo.full_name) + '</div>' +
        (s.repo.description ? '<div class="tip-desc">' + esc(s.repo.description) + '</div>' : "") +
        '<div class="tip-foot">' +
        '<span class="tip-cat"><i style="background:' + s.cat.color + '"></i>' + esc(s.cat.name) + "</span>" +
        '<span>★ ' + fmt(s.repo.stars) + "</span>" +
        (s.repo.language ? "<span>" + esc(s.repo.language) + "</span>" : "") +
        "</div>";
    }

    function onMove(evt) {
      if (!canvas) return;
      var p = toLogical(evt);
      var s = nearest(p);
      if (s !== hovered) {
        hovered = s;
        if (s) showTip(s, evt);
        else if (tipEl) tipEl.hidden = true;
      } else if (s) {
        showTip(s, evt);
      }
      canvas.style.cursor = s ? "pointer" : "default";
    }

    function onLeave() {
      hovered = null;
      if (tipEl) tipEl.hidden = true;
    }

    function onClick(evt) {
      var p = toLogical(evt);
      var s = nearest(p);
      if (s && s.repo.html_url) window.open(s.repo.html_url, "_blank", "noopener");
    }

    return {
      init: function (stats) {
        canvas = byId("starmap");
        if (!canvas) return;
        ctx = canvas.getContext("2d");
        reduced = window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        activeCat = null;
        setupTip();
        layout(stats);
        resize();
        if (raf) window.cancelAnimationFrame(raf);
        t0 = performance.now();
        draw(t0);
        if (reduced) draw(t0);
        if (!StarMap._listenersBound) {
          canvas.addEventListener("mousemove", onMove);
          canvas.addEventListener("mouseleave", onLeave);
          canvas.addEventListener("click", onClick);
          StarMap._listenersBound = true;
        }
        if (!StarMap._bound) {
          window.addEventListener("resize", function () {
            if (!canvas) return;
            resize();
            if (reduced) draw(performance.now());
          });
          StarMap._bound = true;
        }
      },
      setFilter: function (id) {
        activeCat = id || null;
        if (reduced) draw(performance.now());
      },
      stars: function () { return stars; },
      width: W,
      height: H
    };
  })();

  /* ---------- 背景星场 ---------- */

  function initBgStars() {
    var canvas = byId("bg-stars");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var stars = [];
    var reduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var raf2 = null;

    function build() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = window.innerWidth, h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var rng = seedRandom("bg");
      var n = Math.round(Math.min(240, (w * h) / 9000));
      stars = [];
      for (var i = 0; i < n; i++) {
        stars.push({
          x: rng() * w, y: rng() * h,
          r: rng() * 1.1 + 0.3,
          a: rng() * 0.5 + 0.15,
          ph: rng() * Math.PI * 2,
          sp: 0.4 + rng() * 0.8
        });
      }
    }

    function paint(now) {
      var w = window.innerWidth, h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      var t = now / 1000;
      stars.forEach(function (s) {
        var a = reduced ? s.a : s.a * (0.6 + 0.4 * Math.sin(t * s.sp + s.ph));
        ctx.globalAlpha = a;
        ctx.fillStyle = "#dbe7ff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (!reduced) raf2 = window.requestAnimationFrame(paint);
    }

    build();
    paint(performance.now());
    if (reduced) paint(performance.now());
    window.addEventListener("resize", function () {
      build();
      if (reduced) paint(performance.now());
    });
  }

  /* ---------- 结果页渲染 ---------- */

  var current = null;

  function initials(name) {
    var s = (name || "?").replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "");
    return s.slice(0, 1).toUpperCase() || "★";
  }

  function renderResult(stats) {
    current = stats;
    activeFilter = null;
    var p = stats.profile;

    // 头像与身份（使用容器，避免重复渲染时元素类型冲突）
    var avWrap = byId("result-avatar-wrap");
    if (p.avatar_url) {
      avWrap.innerHTML = '<img class="avatar" alt="' + esc(p.login) +
        ' 的头像" src="' + esc(p.avatar_url) + '">';
    } else {
      avWrap.innerHTML = '<span class="avatar avatar-fallback">' +
        esc(initials(p.name || p.login)) + "</span>";
    }
    byId("result-name").textContent = p.name || p.login;
    byId("result-login").textContent = "@" + p.login;
    byId("result-login").href = p.html_url || ("https://github.com/" + p.login);
    byId("result-bio").textContent = p.bio || "这位开发者还没有写下自我介绍。";

    var metaBits = [];
    if (p.company) metaBits.push("公司 · " + p.company);
    if (p.location) metaBits.push("位置 · " + p.location);
    if (p.public_repos !== undefined) metaBits.push("仓库 " + fmt(p.public_repos));
    if (p.followers !== undefined) metaBits.push("关注者 " + fmt(p.followers));
    byId("result-meta").innerHTML = metaBits.map(function (m) {
      return "<span>" + esc(m) + "</span>";
    }).join("");

    byId("badge-demo").hidden = !stats.demo;
    byId("result-link").href = p.html_url || ("https://github.com/" + p.login);

    byId("starmap-title-user").textContent = "· " + (p.login || "") +
      " · 共 " + stats.count + " 颗星标";

    // 图例（可点击筛选星座）
    var legend = byId("legend");
    legend.innerHTML = stats.catStats.map(function (cs) {
      return '<span class="legend-item" data-cat="' + cs.cat.id + '" role="button" tabindex="0" ' +
        'aria-label="只看' + esc(cs.cat.name) + '"><i style="background:' + cs.cat.color + '"></i>' +
        esc(cs.cat.name) + '<span class="legend-count">' + cs.repos.length + "</span></span>";
    }).join("");

    // 星图
    byId("starmap-foot-note").textContent = stats.truncated
      ? "仅展示最近 " + stats.count + " 颗星标（GitHub 接口分页上限）"
      : "展示全部 " + stats.count + " 颗星标";
    StarMap.init(stats);

    // 统计卡片
    var soul = soulFor(stats);
    byId("stat-count").textContent = fmt(stats.count);
    byId("stat-count-note").textContent = stats.categoryCount + " 个星座 · " +
      stats.langStats.length + " 种语言";
    byId("stat-stars").textContent = fmt(stats.totalStars);
    byId("stat-stars-note").textContent = stats.mostStarred
      ? "最亮的一颗：" + stats.mostStarred.full_name
      : "暂无数据";
    byId("stat-focus").textContent = focusIndex(stats);
    byId("stat-focus-note").textContent = "星标集中于「" + stats.topCat.name + "」";

    // 语言分布
    var totalLang = stats.langStats.reduce(function (s, l) { return s + l.count; }, 0) || 1;
    var topLangs = stats.langStats.slice(0, 7);
    var langHtml = topLangs.map(function (l) {
      var pct = Math.round(l.count / totalLang * 100);
      return '<div class="lang-row">' +
        '<span class="lang-name" title="' + esc(l.lang) + '">' + esc(l.lang) + "</span>" +
        '<span class="lang-track"><i class="lang-fill" style="width:' + pct +
        "%;background:" + langColor(l.lang) + '"></i></span>' +
        '<span class="lang-pct">' + pct + "%</span></div>";
    }).join("");
    if (stats.langStats.length > 7) {
      langHtml += '<div class="lang-more">另有 ' + (stats.langStats.length - 7) +
        " 种语言未展示</div>";
    }
    byId("lang-list").innerHTML = langHtml || '<p class="empty-note">暂无语言数据。</p>';

    // 星座统计
    byId("cat-list").innerHTML = (stats.catStats.map(function (cs) {
      return '<div class="cat-row"><i style="background:' + cs.cat.color + '"></i>' +
        '<span class="cat-name">' + esc(cs.cat.name) +
        "<small>" + esc(cs.cat.desc) + "</small></span>" +
        '<span class="cat-count">' + cs.repos.length + " 颗</span></div>";
    }).join("")) || '<p class="empty-note">这位开发者还没有公开星标。</p>';

    // 意外宝藏
    if (stats.gem) {
      var g = stats.gem;
      byId("gem-name").textContent = g.full_name;
      byId("gem-desc").textContent = g.description ||
        "一颗被低调收藏的星辰，等待被发现。";
      byId("gem-foot").innerHTML = "<span>★ " + fmt(g.stars) + "</span>" +
        "<span>" + esc(g.cat.name) + "</span>" +
        '<a href="' + esc(g.html_url) + '" target="_blank" rel="noopener">查看仓库 →</a>';
    }

    // 技术灵魂
    byId("soul-name").textContent = soul.title;
    byId("soul-desc").textContent = soul.desc + " 你的星标画像最偏向「" +
      stats.topCat.name + "」，占比约 " + Math.round(stats.topShare * 100) + "%。";
    var fi = focusIndex(stats);
    var fill = document.querySelector(".soul-fill");
    if (fill) fill.style.width = fi + "%";
    var soulTop = document.querySelector(".soul-meter-top span:last-child");
    if (soulTop) soulTop.textContent = fi + " / 100";

    showView("view-result");
  }

  function langColor(lang) {
    var map = {
      Python: "#7cc4ff", JavaScript: "#b79cff", TypeScript: "#8bb8ff",
      Go: "#63e6be", Rust: "#ff8fb1", C: "#a8e06a", "C++": "#ffc46b",
      Java: "#ff9d6b", Shell: "#c8d46a", HTML: "#ff7a90", CSS: "#7cd0ff",
      Ruby: "#ff8f8f", PHP: "#a78bfa", Swift: "#ffb38f", Kotlin: "#b0a0ff"
    };
    return map[lang] || "#8b97b8";
  }

  /* ---------- 图例筛选与分享链接 ---------- */

  var activeFilter = null;

  function applyLegendState() {
    var items = document.querySelectorAll("#legend .legend-item");
    for (var i = 0; i < items.length; i++) {
      var id = items[i].getAttribute("data-cat");
      items[i].classList.toggle("active", activeFilter === id);
      items[i].classList.toggle("dim", !!activeFilter && activeFilter !== id);
    }
  }

  function defaultFootNote() {
    if (!current) return "";
    return current.truncated
      ? "仅展示最近 " + current.count + " 颗星标（GitHub 接口分页上限）"
      : "展示全部 " + current.count + " 颗星标";
  }

  function toggleLegendFilter(id) {
    activeFilter = (activeFilter === id) ? null : id;
    StarMap.setFilter(activeFilter);
    applyLegendState();
    var note = byId("starmap-foot-note");
    if (activeFilter && current) {
      var hit = current.catStats.filter(function (x) {
        return x.cat.id === activeFilter;
      })[0];
      note.textContent = hit
        ? "正在查看「" + hit.cat.name + "」· " + hit.repos.length + " 颗 · 再次点击取消"
        : defaultFootNote();
    } else {
      note.textContent = defaultFootNote();
    }
  }

  function copyShareLink() {
    if (!current) return;
    var base = window.location.origin + window.location.pathname;
    var link = current.demo ? base : base + "?u=" + encodeURIComponent(current.profile.login);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(function () {
        toast("分享链接已复制：" + link);
      }, function () { fallbackCopy(link); });
    } else {
      fallbackCopy(link);
    }
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast("分享链接已复制");
    } catch (e) {
      toast("复制失败，请手动复制地址栏链接");
    }
  }

  /* ---------- 分享卡片 ---------- */

  function drawShareCard(stats, cb) {
    var W = 1200, H = 630;
    var c = document.createElement("canvas");
    c.width = W; c.height = H;
    var g = c.getContext("2d");

    // 背景
    var bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#070a1c");
    bg.addColorStop(0.5, "#0a0d22");
    bg.addColorStop(1, "#0d0a22");
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);

    // 星尘
    var rng = seedRandom("share|" + (stats.profile.login || ""));
    for (var i = 0; i < 220; i++) {
      g.globalAlpha = 0.1 + rng() * 0.5;
      g.fillStyle = "#dbe7ff";
      g.beginPath();
      g.arc(rng() * W, rng() * H, rng() < 0.12 ? 1.5 : 0.8, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;

    // 星座缩略图（右侧）
    var regionX = 720, regionY = 120, regionW = 420, regionH = 400;
    var stars = StarMap.stars();
    if (stars.length) {
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      stars.forEach(function (s) {
        minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x);
        minY = Math.min(minY, s.y); maxY = Math.max(maxY, s.y);
      });
      var pad = 30;
      var sc = Math.min((regionW - pad * 2) / (maxX - minX || 1),
        (regionH - pad * 2) / (maxY - minY || 1));
      function tx(x) { return regionX + pad + (x - minX) * sc; }
      function ty(y) { return regionY + pad + (y - minY) * sc; }

      var links = [];
      for (var a = 0; a < stars.length; a++) {
        for (var b = a + 1; b < stars.length; b++) {
          if (stars[a].cat === stars[b].cat &&
            Math.hypot(stars[a].x - stars[b].x, stars[a].y - stars[b].y) < 130) {
            links.push([stars[a], stars[b]]);
          }
        }
      }
      g.lineWidth = 1;
      links.forEach(function (l) {
        g.strokeStyle = hexA2(l[0].cat.color, 0.18);
        g.beginPath();
        g.moveTo(tx(l[0].x), ty(l[0].y));
        g.lineTo(tx(l[1].x), ty(l[1].y));
        g.stroke();
      });
      stars.forEach(function (s) {
        var rad = 1.4 + (s.r - 1.6) * 0.7;
        var glow = g.createRadialGradient(tx(s.x), ty(s.y), 0, tx(s.x), ty(s.y), rad * 5);
        glow.addColorStop(0, hexA2(s.cat.color, 0.5));
        glow.addColorStop(1, hexA2(s.cat.color, 0));
        g.fillStyle = glow;
        g.beginPath(); g.arc(tx(s.x), ty(s.y), rad * 5, 0, Math.PI * 2); g.fill();
        g.fillStyle = hexA2(s.cat.color, 0.95);
        g.beginPath(); g.arc(tx(s.x), ty(s.y), rad, 0, Math.PI * 2); g.fill();
      });
    }

    // 左侧文字
    g.fillStyle = "#7cc4ff";
    g.font = "600 20px 'Space Grotesk Variable', system-ui, sans-serif";
    g.fillText("STARSCOPE · 星象图", 70, 92);

    var name = stats.profile.name || stats.profile.login;
    g.fillStyle = "#ffffff";
    g.font = "700 62px 'Space Grotesk Variable', system-ui, sans-serif";
    var displayName = name.length > 14 ? name.slice(0, 14) + "…" : name;
    g.fillText(displayName, 70, 190);

    g.fillStyle = "#8b97b8";
    g.font = "400 26px 'JetBrains Mono Variable', monospace";
    g.fillText("@" + stats.profile.login, 70, 232);

    // 灵魂标签
    var soul = soulFor(stats);
    g.fillStyle = "#b79cff";
    g.font = "600 30px 'Space Grotesk Variable', system-ui, sans-serif";
    g.fillText(soul.title, 70, 320);
    g.fillStyle = "#8b97b8";
    g.font = "400 20px 'Space Grotesk Variable', system-ui, sans-serif";
    var dline = soul.desc.length > 22 ? soul.desc.slice(0, 22) + "…" : soul.desc;
    g.fillText(dline, 70, 356);

    // 数据行
    var metrics = [
      ["星标", fmt(stats.count)],
      ["总星数", fmt(stats.totalStars)],
      ["星座", String(stats.categoryCount)]
    ];
    metrics.forEach(function (m, i) {
      var x = 70 + i * 200;
      g.fillStyle = "#7cc4ff";
      g.font = "700 40px 'JetBrains Mono Variable', monospace";
      g.fillText(m[1], x, 460);
      g.fillStyle = "#5c6784";
      g.font = "400 18px 'Space Grotesk Variable', system-ui, sans-serif";
      g.fillText(m[0], x, 490);
    });

    // 顶分类色带
    var barX = 70, barY = 536, barW = 620, barH = 8;
    var acc = 0;
    stats.catStats.forEach(function (cs) {
      var w = (cs.repos.length / (stats.count || 1)) * barW;
      g.fillStyle = cs.cat.color;
      g.fillRect(barX + acc, barY, w, barH);
      acc += w;
    });

    // 页脚
    g.fillStyle = "#5c6784";
    g.font = "400 17px 'JetBrains Mono Variable', monospace";
    g.fillText("starscope · 你的 GitHub 星象图", 70, 588);

    cb(c);
  }

  function hexA2(hex, alpha) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
  }

  function openShare() {
    if (!current) return;
    drawShareCard(current, function (canvas) {
      var host = byId("share-preview");
      host.innerHTML = "";
      host.appendChild(canvas);
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      byId("share-modal").hidden = false;
      byId("share-filename").textContent =
        "starscope-" + current.profile.login + ".png";
    });
  }

  function downloadShare() {
    var canvas = byId("share-preview").querySelector("canvas");
    if (!canvas) return;
    try {
      var a = document.createElement("a");
      a.download = "starscope-" + current.profile.login + ".png";
      a.href = canvas.toDataURL("image/png");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast("分享卡片已开始下载");
    } catch (e) {
      toast("当前环境不支持直接下载，请右键图片另存");
    }
  }

  /* ---------- Toast ---------- */

  var toastTimer = null;
  function toast(msg) {
    var el = byId("toast");
    el.textContent = msg;
    el.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
  }

  /* ---------- 加载流程 ---------- */

  var LOADING_LINES = [
    "正在扫描你的技术行星带…",
    "正在为每一颗星标定位…",
    "正在连线，绘制星座…",
    "正在寻找那颗被低估的星…"
  ];

  var loadingTimer = null;
  function startLoading(username, demo) {
    showView("view-loading");
    byId("loading-user").textContent = demo
      ? "演示模式 · octo-explorer"
      : "github.com/" + username;
    var i = 0;
    var status = byId("loading-status");
    status.innerHTML = '<span class="loading-text"></span><span class="caret"></span>';
    var textEl = status.querySelector(".loading-text");
    textEl.textContent = LOADING_LINES[0];
    if (loadingTimer) clearInterval(loadingTimer);
    loadingTimer = setInterval(function () {
      i = (i + 1) % LOADING_LINES.length;
      textEl.textContent = LOADING_LINES[i];
    }, 1100);
  }

  function stopLoading() {
    if (loadingTimer) { clearInterval(loadingTimer); loadingTimer = null; }
  }

  function errorMessage(err) {
    switch (err && err.code) {
      case "notfound":
        return {
          title: "没有找到这位开发者",
          body: "请检查用户名是否拼写正确。GitHub 用户名区分大小写，但通常不敏感。",
          detail: "HTTP 404 · " + (err.message || "")
        };
      case "ratelimit":
        return {
          title: "GitHub 接口繁忙",
          body: "未登录状态下每小时仅能发起 60 次请求。你可以稍后重试，在顶部设置中填入自己的 GitHub Token 以提升额度，或先用演示模式看看效果。",
          detail: "HTTP 403/429 · rate limit exceeded"
        };
      case "network":
        return {
          title: "网络连接失败",
          body: "无法访问 GitHub 接口。请检查网络连接后重试，或先用演示模式浏览效果。",
          detail: String(err.message || err)
        };
      default:
        return {
          title: "出了一点小问题",
          body: "获取数据时发生意外错误。你可以重试，或先体验演示模式。",
          detail: err && err.message ? err.message : "unknown error"
        };
    }
  }

  function showError(err) {
    stopLoading();
    var info = errorMessage(err);
    byId("error-title").textContent = info.title;
    byId("error-body").textContent = info.body;
    byId("error-detail").textContent = info.detail;
    showView("view-error");
  }

  function run(username, opts) {
    opts = opts || {};
    username = (username || "").trim().replace(/^@/, "");
    if (!username) {
      toast("请输入一个 GitHub 用户名");
      return;
    }

    // 缓存：24 小时内不重复请求
    var cacheKey = "starscope_cache_" + username.toLowerCase();
    if (!opts.force) {
      var cached = storeGet(cacheKey);
      if (cached) {
        try {
          var parsed = JSON.parse(cached);
          if (parsed && parsed.t && (Date.now() - parsed.t) < 86400000 && parsed.data) {
            startLoading(username, parsed.data.demo);
            setTimeout(function () {
              stopLoading();
              renderResult(computeStats(parsed.data));
            }, 700);
            setUrlUser(username);
            return;
          }
        } catch (e) { /* 缓存损坏则忽略 */ }
      }
    }

    startLoading(username, false);
    var startedAt = Date.now();

    loadUser(username).then(function (data) {
      var wait = Math.max(0, 1400 - (Date.now() - startedAt));
      setTimeout(function () {
        stopLoading();
        storeSet(cacheKey, JSON.stringify({ t: Date.now(), data: data }));
        renderResult(computeStats(data));
        setUrlUser(username);
      }, wait);
    }).catch(function (err) {
      if (err && err.code === undefined && !navigator.onLine) {
        err = apiError("network", "offline");
      }
      if (err && err.code === "http") {
        // 兜底为网络类错误展示
        err = apiError("network", err.message);
      }
      showError(err);
    });
  }

  function runDemo() {
    startLoading("octo-explorer", true);
    setTimeout(function () {
      stopLoading();
      renderResult(computeStats(buildDemoData()));
      setUrlUser("");
    }, 1500);
  }

  /* ---------- URL 状态 ---------- */

  function setUrlUser(username) {
    try {
      var url = new URL(window.location.href);
      if (username) url.searchParams.set("u", username);
      else url.searchParams.delete("u");
      window.history.replaceState({}, "", url.toString());
    } catch (e) { /* URL API 不可用时忽略 */ }
  }

  function urlUser() {
    try {
      var url = new URL(window.location.href);
      return url.searchParams.get("u") || "";
    } catch (e) { return ""; }
  }

  /* ---------- Token 设置 ---------- */

  function openSettings() {
    var existing = storeGet("starscope_token") || "";
    byId("token-input").value = existing;
    byId("settings-modal").hidden = false;
  }

  function saveToken() {
    var val = byId("token-input").value.trim();
    if (val) storeSet("starscope_token", val);
    else { try { store.removeItem("starscope_token"); } catch (e) {} }
    byId("settings-modal").hidden = true;
    toast(val ? "已保存 Token，额度已提升" : "已清除 Token");
  }

  /* ---------- 事件绑定 ---------- */

  function bind() {
    byId("search-form").addEventListener("submit", function (e) {
      e.preventDefault();
      run(byId("search-input").value);
    });
    byId("demo-btn").addEventListener("click", runDemo);
    byId("error-demo-btn").addEventListener("click", runDemo);
    byId("error-retry-btn").addEventListener("click", function () {
      var u = urlUser() || byId("search-input").value;
      if (u) run(u, { force: true });
      else showView("view-intro");
    });
    byId("again-btn").addEventListener("click", function () {
      byId("search-input").value = "";
      setUrlUser("");
      showView("view-intro");
      byId("search-input").focus();
    });
    byId("share-btn").addEventListener("click", openShare);
    byId("copy-link-btn").addEventListener("click", copyShareLink);
    var legendEl = byId("legend");
    legendEl.addEventListener("click", function (e) {
      var item = e.target && e.target.closest ? e.target.closest(".legend-item") : null;
      if (item) toggleLegendFilter(item.getAttribute("data-cat"));
    });
    legendEl.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var item = e.target && e.target.closest ? e.target.closest(".legend-item") : null;
      if (item) { e.preventDefault(); toggleLegendFilter(item.getAttribute("data-cat")); }
    });
    byId("share-download").addEventListener("click", downloadShare);
    byId("share-close").addEventListener("click", function () {
      byId("share-modal").hidden = true;
    });
    byId("settings-btn").addEventListener("click", openSettings);
    byId("settings-close").addEventListener("click", function () {
      byId("settings-modal").hidden = true;
    });
    byId("settings-save").addEventListener("click", saveToken);

    // 弹窗遮罩点击关闭
    ["share-modal", "settings-modal"].forEach(function (id) {
      byId(id).addEventListener("click", function (e) {
        if (e.target === byId(id)) byId(id).hidden = true;
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        byId("share-modal").hidden = true;
        byId("settings-modal").hidden = true;
      }
      if (e.key === "/" && byId("view-intro").hidden === false &&
        document.activeElement !== byId("search-input")) {
        e.preventDefault();
        byId("search-input").focus();
      }
    });
  }

  /* ---------- 初始化 ---------- */

  function init() {
    bind();
    initBgStars();
    var u = urlUser();
    if (u) {
      byId("search-input").value = u;
      run(u);
    } else {
      showView("view-intro");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
