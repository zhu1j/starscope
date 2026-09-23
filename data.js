/* ==========================================================================
   Starscope — bundled sample dataset (demo mode)
   --------------------------------------------------------------------------
   这些条目是公开知名仓库的近似快照，仅用于「演示模式」：
   让任何人都能在不消耗 GitHub API 配额的情况下体验星空图效果。
   星标为近似值，不代表实时数据。DEMO_PROFILE 为虚构示例用户。
   ========================================================================== */

var DEMO_PROFILE = {
  login: "octo-explorer",
  name: "Octo Explorer",
  bio: "演示档案 · 用于预览星象图效果，非真实用户数据",
  avatar_url: "",
  html_url: "https://github.com/",
  public_repos: 128,
  followers: 642,
  following: 180,
  created_at: "2015-03-11T00:00:00Z",
  location: "The Cosmos",
  company: "Interstellar Dev Co."
};

/* [owner, name, language, stars, topics, description] */
var DEMO_REPOS = [
  ["langchain-ai","langchain","Python",112000,"llm,ai,agents,rag,nlp","Build context-aware reasoning applications with LLMs"],
  ["run-llama","llama_index","Python",38500,"llm,rag,ai,data","A data framework for LLM applications"],
  ["huggingface","transformers","Python",142000,"nlp,deep-learning,ai,pytorch","State-of-the-art machine learning for PyTorch and TensorFlow"],
  ["ollama","ollama","Go",108000,"llm,ai,local","Get up and running with large language models locally"],
  ["comfyanonymous","ComfyUI","Python",82000,"diffusion,ai,generative,image","The most powerful node-based Stable Diffusion GUI"],
  ["ggerganov","llama.cpp","C++",78000,"llm,ai,inference","LLM inference in C/C++ with minimal dependencies"],
  ["openai","openai-python","Python",24000,"openai,ai,sdk","The official Python library for the OpenAI API"],
  ["microsoft","autogen","Python",46000,"agent,ai,llm,multiagent","A programming framework for agentic AI"],
  ["facebook","react","JavaScript",232000,"react,frontend,ui,javascript","The library for web and native user interfaces"],
  ["vercel","next.js","JavaScript",131000,"react,nextjs,frontend,ssr","The React framework for the web"],
  ["vuejs","core","TypeScript",49000,"vue,frontend,framework","Vue.js is a progressive JavaScript framework"],
  ["tailwindlabs","tailwindcss","TypeScript",84000,"css,frontend,ui,tailwind","A utility-first CSS framework"],
  ["sveltejs","svelte","JavaScript",81000,"svelte,frontend,compiler","Cybernetically enhanced web apps"],
  ["vitejs","vite","TypeScript",71000,"vite,build,frontend,bundler","Next generation frontend tooling"],
  ["mrdoob","three.js","JavaScript",103000,"3d,webgl,graphics,frontend","JavaScript 3D library for the web"],
  ["shadcn-ui","ui","TypeScript",76000,"ui,react,components,design-system","Beautifully designed components you can copy into your apps"],
  ["torvalds","linux","C",185000,"linux,kernel,systems,os","Linux kernel source tree"],
  ["golang","go","Go",122000,"go,language,backend,concurrency","The Go programming language"],
  ["rust-lang","rust","Rust",100000,"rust,language,systems,compiler","Empowering everyone to build reliable and efficient software"],
  ["nodejs","node","JavaScript",110000,"nodejs,runtime,backend,javascript","Node.js JavaScript runtime"],
  ["spring-projects","spring-boot","Java",77000,"java,spring,backend,framework","Spring Boot helps you build production-ready applications"],
  ["django","django","Python",84000,"python,django,backend,web","The web framework for perfectionists with deadlines"],
  ["fastapi","fastapi","Python",81000,"python,fastapi,api,backend","FastAPI framework, high performance, easy to learn"],
  ["redis","redis","C",68000,"redis,database,cache,backend","Redis is an in-memory data store used as a database and cache"],
  ["postgres","postgres","C",17500,"database,sql,backend,postgresql","Mirror of the PostgreSQL source code repository"],
  ["kubernetes","kubernetes","Go",112000,"kubernetes,devops,cloud,containers","Production-grade container scheduling and management"],
  ["hashicorp","terraform","Go",44000,"terraform,devops,infrastructure,cloud","Terraform enables you to safely build infrastructure as code"],
  ["docker","compose","Go",35000,"docker,devops,containers,cli","Define and run multi-container applications with Docker"],
  ["grafana","grafana","TypeScript",67000,"monitoring,observability,devops,dashboards","The open and composable observability platform"],
  ["prometheus","prometheus","Go",60000,"monitoring,metrics,observability,devops","The Prometheus monitoring system and time series database"],
  ["ansible","ansible","Python",64000,"automation,devops,configuration","Ansible is a radically simple IT automation platform"],
  ["traefik","traefik","Go",53000,"proxy,devops,cloud-native,gateway","The Cloud Native Application Proxy"],
  ["caddyserver","caddy","Go",63000,"server,web,https,devops","Fast, multi-platform web server with automatic HTTPS"],
  ["microsoft","vscode","TypeScript",168000,"editor,typescript,ide,tools","Visual Studio Code, the open source code editor"],
  ["neovim","neovim","Vim Script",88000,"vim,editor,terminal,tools","Vim-fork focused on extensibility and usability"],
  ["ohmyzsh","ohmyzsh","Shell",176000,"shell,zsh,terminal,productivity","A delightful community-driven framework for Zsh"],
  ["junegunn","fzf","Go",66000,"cli,terminal,fuzzy-finder,tools","A command-line fuzzy finder written in Go"],
  ["sharkdp","bat","Rust",52000,"cli,terminal,rust,tools","A cat clone with syntax highlighting and Git integration"],
  ["BurntSushi","ripgrep","Rust",51000,"cli,search,rust,tools","ripgrep recursively searches directories for a regex pattern"],
  ["tmux","tmux","C",37000,"terminal,cli,tools,multiplexer","tmux is a terminal multiplexer"],
  ["cli","cli","Go",39000,"cli,github,tools","GitHub's official command line tool"],
  ["dylanaraps","neofetch","Shell",21500,"cli,terminal,system-info,tools","A fast, highly customizable system info script"],
  ["svenstaro","genact","Rust",12500,"cli,terminal,fake,productivity","A nonsense activity generator for your terminal"],
  ["pipeseroni","pipes.sh","Shell",5600,"cli,terminal,animation,tools","Animated pipes terminal screensaver"]
];
