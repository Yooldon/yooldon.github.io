# Yooldon 的知识库

个人笔记站点，结构照着 DeepSeek API 文档那个路子来：左上分类、左侧分页、中间正文、右侧本页目录。
内容全是 Markdown，构建成静态站，`git push` 自动发布到 <https://yooldon.github.io/>。

## 本地跑起来

需要 Node 18+ 和 pnpm。

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # 产物在 docs/.vitepress/dist
pnpm preview    # 预览构建结果
```

只看构建产物、不想起 esbuild 时，可以用自带的零依赖静态服务器（支持无后缀路径）：

```bash
python scripts/serve.py 5173 docs/.vitepress/dist
```

> Windows 上如果 `pnpm install` 后报 `Cannot find package 'vite'`，多半是 pnpm 用了 junction 链接方式，
> 而 Node 的 ESM 解析跟不过去。仓库里的 `pnpm-workspace.yaml` 已经写了 `nodeLinker: hoisted`，
> 删掉 `node_modules` 重装即可。
>
> pnpm 11 起设置项从 `.npmrc` / `package.json` 搬到了 `pnpm-workspace.yaml`，本仓库已经按新写法配好
> （`allowBuilds` 允许 esbuild 跑安装脚本）。在受限沙箱里跑安装会因为禁止起子进程报 `spawn EPERM`，
> 这不影响构建——esbuild 的平台二进制包已经装上了。

### 本机环境说明（只对这台电脑有效）

- **Git 位置**：`D:\AppSetup\Git\cmd`。装完之后要**新开一个终端**才生效，旧会话的 PATH 里没有它。
- **TLS**：这台机器的 `hosts` 把 `github.com` 等域名指向了 `127.0.0.1`（Watt Toolkit / SteamTools
  一类加速工具做的），由它重新签发证书。git 不信任这类证书，所以本仓库单独配了
  `http.sslCAInfo = .git-ca/github-bundle.pem`（该目录已 gitignore，不会提交）。
  副作用：**加速工具没开时 git 连不上**，不是仓库坏了。
- 想撤销这套信任配置：

  ```bash
  git config --local --unset http.sslCAInfo
  git config --local --unset http.sslBackend
  ```

## 目录结构

```text
.
├─ docs/
│  ├─ .vitepress/
│  │  ├─ config.mts        # 全站唯一配置：导航 / 侧栏 / 目录 / 搜索
│  │  └─ theme/
│  │     ├─ index.ts       # 继承默认主题
│  │     ├─ Layout.vue     # 挂「复制 Markdown」组件
│  │     └─ custom.css     # 中文排版 + 一级分类 Tab 样式
│  ├─ index.md             # 首页
│  ├─ about.md
│  ├─ start/               # 一级分区：快速开始
│  │  ├─ index.md
│  │  └─ site.md
│  ├─ knowledge/           # 一级分区：信息&知识
│  │  ├─ index.md
│  │  └─ method/           # 二级分类（组名取这里 index.md 的 title）
│  ├─ work/                # 一级分区：学习&工作
│  │  ├─ index.md
│  │  └─ dev/
│  └─ life/                # 一级分区：生活&兴趣
│     └─ index.md
├─ templates/note.md       # 新笔记模板
├─ .github/workflows/deploy.yml
└─ pnpm-workspace.yaml
```

## 加一篇笔记

1. 复制 `templates/note.md` 到对应分区，比如 `docs/knowledge/method/`，文件名用英文 slug。
2. 改 frontmatter：`title` 必填；`date`、`order`、`type` 选填。
3. 写正文：一句话定义 → 对照表 → 坑 → 例子 → 我的判断。
4. 提交推送，Actions 一分钟后自动上线。

**不用改配置。** 左侧目录由 `config.mts` 里的 `buildSectionSidebar()` 扫描目录生成：
分区根目录的散页平铺在前面，子目录变成一个分组，组名取该目录 `index.md` 的 `title`，
排序看 `order`，其次按 `date` 倒序。

新增二级分类也一样：建目录 + 一个 `index.md`（写上 `title` 和 `order`）就自动出现在左侧。

想加第五个一级分区，改三处：建 `docs/<section>/`、在 `config.mts` 的 `SECTIONS` 里加名字、
在 `nav` 里加一项。

## 三栏是怎么来的

| 栏位 | 配置项 | 说明 |
| --- | --- | --- |
| 左上分类 | `themeConfig.nav` | 一级入口 |
| 左侧分页 | `themeConfig.sidebar` | 分组 + 页面，可折叠 |
| 中间正文 | Markdown 本身 | `cleanUrls: true` 让链接不带 `.html` |
| 右侧目录 | `themeConfig.outline` | `level: [2, 3]` 只收 H2/H3 |

`outline.level` 是重点：收到 H4，右栏会变成一锅粥。

## 发布

仓库设置里做一次：**Settings → Pages → Source** 选 **GitHub Actions**。
之后 push 到 `main` 就会自动构建并部署。

如果仓库名不是 `Yooldon/yooldon.github.io`（也就是换成带子路径的项目站），
必须给 `config.mts` 加 `base: '/仓库名/'`，否则 CSS 和图片全 404。

旧的 `index.html` / `styles-css/` / `scripts-java/` 是手写静态页，Actions 部署不会用到它们。
想留着当纪念就移到 `legacy/` 目录，想清理就直接删。

## 已知限制

- **中文搜索**：VitePress 本地搜索按空格分词，中文长句召回一般。标题写成完整词组即可缓解；
  内容多了再考虑 Algolia DocSearch。
- **最后更新时间**：靠 `git log`。机器上没装 git 时 `lastUpdated` 会自动关掉（否则构建报 `spawn git ENOENT`）。
- **沙箱里跑 `pnpm dev`**：esbuild 需要起子进程，受限沙箱下会报 `spawn EPERM`，在普通终端里跑没问题。
