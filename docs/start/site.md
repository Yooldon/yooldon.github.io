---
title: 用 VitePress 搭知识站
order: 1
date: 2026-11-19
type: decision
status: settled
---

# 用 VitePress 搭知识站

目标：把 Markdown 笔记变成一个**和 DeepSeek 文档同构**的站点——左上分类、左侧分页、
中间正文、右侧本页目录，并且 `git push` 就自动发布到 `https://yooldon.github.io/`。

## 为什么是 VitePress

| 方案 | 三栏开箱 | 中文搜索 | 构建速度 | 上手成本 | 判断 |
| --- | --- | --- | --- | --- | --- |
| VitePress | ✅ | ✅ 本地索引 | 秒级 | 低 | **选它** |
| Docusaurus | ✅ | 需 Algolia | 慢 | 中 | 功能全但重，为多版本文档而生 |
| MkDocs Material | ✅ | ✅ | 中 | 低 | 要装 Python，改样式不如 Vue 顺手 |
| Hugo | ⚠️ 需主题 | 视主题 | 极快 | 高 | 主题挑花眼，改排版要读别人代码 |

决定性理由：**它把「左侧分页」和「右侧目录」做成了配置项，不用写前端。**

## 目录结构

```text
知识笔记/
├─ docs/
│  ├─ .vitepress/
│  │  ├─ config.mts          # 全站唯一的配置：导航、侧栏、目录、搜索
│  │  └─ theme/
│  │     ├─ index.ts         # 继承默认主题
│  │     └─ custom.css       # 只放中文排版
│  ├─ index.md               # 首页
│  ├─ about.md
│  └─ notes/
│     ├─ index.md            # 总览
│     ├─ method/             # 分类
│     │  ├─ index.md         # 分类首页（标题即左侧分组名）
│     │  └─ note-structure.md
│     ├─ tools/
│     └─ dev/
├─ .github/workflows/deploy.yml
└─ package.json
```

约定只有三条：

1. `docs/notes/<分类>/` 就是一个左侧分组，分组名取该目录 `index.md` 的 `title`。
2. 目录里的每个 `.md` 是一页，标题取 frontmatter 的 `title`，没有就用文件名。
3. 排序用 `order`，其次按 `date` 倒序。

## 三个配置决定三栏

`docs/.vitepress/config.mts` 里只有三块是必须懂的：

```ts
themeConfig: {
  // 左上：一级分类（四个分区）
  nav: [
    { text: '快速开始', link: '/start/', activeMatch: '^/start/' },
    { text: '信息&知识', link: '/knowledge/', activeMatch: '^/knowledge/' },
  ],

  // 左侧：每个分区各生成一套目录
  sidebar: {
    '/start/': buildSectionSidebar('start'),
    '/knowledge/': buildSectionSidebar('knowledge'),
  },

  // 右侧：本页目录，只收 H2/H3
  outline: { level: [2, 3], label: '本页目录' },
}
```

`outline.level` 是关键：**只放两层**。放到 H4，右栏会变成一锅粥，锚点也就没人点了。

## 加一篇笔记

四步，都不需要改配置：

1. 在对应分区下新建文件，例如 `docs/knowledge/method/my-note.md`。
2. 写 frontmatter：`title` 必填，`date`、`order`、`type` 选填。
3. 写正文：一句话定义 → 表格 → 坑 → 例子 → 我的判断。
4. `git add . && git commit -m "note: my-note" && git push`，等一分钟自动上线。

::: tip 排序
想把它固定在分类第一位，加 `order: 1`；不写就是按日期倒序排。
:::

## 部署到 GitHub Pages

如果仓库名是 `Yooldon/yooldon.github.io`（用户站，域名根），`base` 保持 `/` 不用改。
工作流已经写好，你只需要在 GitHub 上做一次设置：

1. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。
2. push 到 `main`，等 Actions 跑完。

::: warning 如果换成项目站
仓库名是 `notes` 这种项目站时，访问路径会带子路径，必须在 config 里加
`base: '/notes/'`，否则 CSS 和图片全 404。
:::

## 复制 Markdown 按钮

正文右上角那个「复制 Markdown / 打开 Markdown」，拆开只有三件事：

| 环节 | 做法 | 位置 |
| --- | --- | --- |
| 让页面有 `.md` 可取 | 构建结束时把源文件复制进产物，顺手去掉 frontmatter | `config.mts` 的 `buildEnd` |
| 知道当前页对应哪个文件 | `useData().page.relativePath` | 组件里 |
| 按钮长在哪 | 覆盖默认 Layout，插进 `#doc-before` 插槽 | `theme/Layout.vue` |

之所以在构建时复制、而不是让浏览器去 GitHub 取原文：一是快，二是这台机器的加速工具会改
GitHub 的域名解析，直接取大概率失败。

```ts
// config.mts
buildEnd: ({ outDir }) => {
  // docs/**/*.md -> dist/**/*.md（去掉 frontmatter）
}
```

::: tip 顺带的好处
整个站点现在每个页面都有对应的 `.md`，把 URL 后面加 `.md` 就能拿到干净正文，
直接粘给模型当上下文，比自己复制粘贴靠谱。
:::

## 常见坑

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 本地正常、线上白屏 | 缺 `base` | 项目站必须设 `base: '/仓库名/'` |
| 链接带 `.html` 打不开 | `cleanUrls: true` 下路径不带后缀 | 链接写 `/knowledge/method/x`，不要写 `x.md` |
| 中文搜不到 | 本地搜索按空格分词 | 标题里用完整词，或用 Algolia DocSearch |
| 侧栏分组顺序乱 | `order` 写成字符串 | `order` 必须是数字 |
