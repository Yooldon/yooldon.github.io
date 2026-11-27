---
title: 写作与维护手册
order: 2
date: 2026-11-27
type: guide
status: settled
---

# 写作与维护手册

这一页回答三个问题：**怎么加笔记、要学多少 Markdown、想改样式改哪里**。看完不用再问我。

## 目录是怎么长出来的

左侧的层级不是手写的，是**文件夹结构**：

```text
docs/
├─ knowledge/               ← 一级分区（导航栏那排 Tab）
│  ├─ index.md              ← 分区首页（点「总览」看到的那页）
│  └─ method/               ← 分组（可折叠的父页）
│     ├─ index.md           ← 分组的名字和排序，写在它的 title / order 里
│     ├─ note-structure.md  ← 子页
│     └─ ai-era-notes.md    ← 子页
```

对应到页面上：

| 位置 | 来源 |
| --- | --- |
| 顶部 Tab「信息&知识」 | `docs/knowledge/` 这个文件夹 + `config.mts` 的 `nav` |
| 左侧「总览」 | 分区里的 `index.md` |
| 左侧可折叠的「方法论」 | `docs/knowledge/method/` 这个子文件夹 + 它的 `index.md` |
| 「像文档一样写笔记」 | `docs/knowledge/method/note-structure.md` |

**一句话**：文件夹 = 分组，文件 = 页面，`index.md` = 这个文件夹在左侧显示的名字。

## 加笔记的四种情况

### 加到已有分组

在 `docs/knowledge/method/` 下新建 `why-note.md`：

```markdown
---
title: 为什么要写笔记
order: 3
date: 2026-11-27
---

# 为什么要写笔记

正文从这里开始。
```

左侧「方法论」下面立刻多一项。**不用改任何配置**。

### 加到分区首页

直接放在 `docs/knowledge/` 根目录，和它的 `index.md` 并列。左侧会出现在「总览」之后。

### 新建父页

建文件夹 `docs/knowledge/reading/`，里面放一个 `index.md`：

```markdown
---
title: 阅读笔记
order: 3
---

# 阅读笔记

这个分组收读书笔记。
```

左侧就多一个可折叠的「阅读笔记」。之后往里丢的 md 都归它。

### 新建一级分区

三处都要动：

1. 建目录 `docs/reading/`，写 `index.md`（`title: 阅读`、`order: 4`）
2. `config.mts` 的 `SECTIONS` 数组加 `'reading'`
3. `config.mts` 的 `nav` 加一行 `{ text: '阅读', link: '/reading/', activeMatch: '^/reading/' }`

## frontmatter 字段

每个 md 文件开头两条 `---` 之间的部分：

| 字段 | 必填 | 作用 |
| --- | --- | --- |
| `title` | 是 | 左侧菜单和页面标题；不写就用文件名 |
| `order` | 否 | 排序，数字越小越靠前；不写按日期倒序 |
| `date` | 否 | `2026-11-27`，只影响排序 |
| `type` | 否 | `decision` / `failure` / `question` / `reference`，给自己看 |
| `status` | 否 | `open` / `settled` / `stale` |
| `source` | 否 | 事实类笔记的出处链接 |
| `verified` | 否 | AI 参与过就写 `no` |

## Markdown 要学多少

**只需要认这 7 个符号**，其余都可以不学：

| 写法 | 效果 |
| --- | --- |
| `# 标题` / `##` / `###` | 一级/二级/三级标题（二级三级会进右侧目录） |
| `**加粗**` | **加粗** |
| `- 一项` | 无序列表 |
| `1. 一项` | 有序列表 |
| `\| 列 \| 列 \|` | 表格 |
| `` `代码` `` | 行内代码 |
| `[文字](地址)` | 链接 |

**不用学 Markdown 也能写**：直接敲中文段落，一行一段，空行分段，就能发布。符号只是让内容更好读。

表格至少要会，因为这是这个站的核心写法：

```markdown
| 方案 | 优点 | 缺点 |
| --- | --- | --- |
| A | 快 | 贵 |
```

### 本站额外支持两样

提示块（比加粗更显眼，用来放默认值、坑、警告）：

```markdown
::: tip 小提示
内容
:::

::: warning 注意
内容
:::
```

代码块（三个反引号 + 语言名，自带高亮和复制按钮）：

````markdown
```python
print("hello")
```
````

## 右侧目录是自动的

是的，完全自动：

- 它抓的是正文里的 `##` 和 `###` 标题，按出现顺序排
- **标题改了，目录跟着改**，不用维护第二份
- `####` 及更深的标题不进目录（故意这样，免得目录变成一锅粥）
- 标题就是目录文字，所以标题要写成能一眼看懂的短句，别写「一、」「补充」这种

想控制目录，就控制标题层级：**正文只分两层**，更细的结构用加粗或列表。

## 改宽度和间距

样式集中在两个文件：

| 文件 | 管什么 |
| --- | --- |
| `docs/.vitepress/theme/custom.css` | 布局、留白、配色、字体 |
| `docs/.vitepress/theme/components/SectionTabs.vue` | 第二行分类栏的字号、间距、下划线 |

常用的几个值（都在 `custom.css` 的 `@media (min-width: 960px)` 里）：

| 想改 | 改这个 | 当前值 |
| --- | --- | --- |
| 整体左边距（logo / 分类 / 目录共用） | `--gutter` | `72px` |
| 左侧目录栏宽度 | `--vp-sidebar-width` | `320px` |
| 头部总高度 | `--vp-nav-height` | `108px`（64 第一行 + 44 分类行） |
| 正文离左侧目录的距离 | `.VPDoc .container` 的 `padding-left` | `16px`（加上容器自身 32，实际 48） |
| 右侧目录栏宽度 | `.aside` | `190px` |

::: warning 有两组值必须成组改
- 右侧目录是**四个选择器**一起控制宽度：`.aside`（190）、`.aside-content` / `.VPDocAside` / `.VPDocAsideOutline`（158）。只改一个会溢出。
- `--gutter` 改了，导航、分类栏、侧栏三处会一起动，这是设计好的；侧栏里 `.group` 的负外边距也跟着它算，别单独写死数字。
:::

改配色最简单，改 `:root` 里的品牌色：

```css
:root {
  --vp-c-brand-1: #2563eb;  /* 链接、下划线、当前项 */
}
```

改完保存，`pnpm dev` 会热更新，立刻能看到效果。

## 改完怎么发布

三种方式，挑一种顺手就行。

### 方式一：网页改

1. 打开 <https://github.com/Yooldon/yooldon.github.io>
2. 进到 `docs/` 下对应目录，**Add file → Create new file**（改已有文件就点铅笔图标）
3. 写完点 **Commit changes**
4. 等 1 分钟，Actions 自动构建部署

适合：在别人电脑上、手机上、只想改两句话的时候。

### 方式二：本地命令

```bash
cd D:\Documents\Project\知识笔记
pnpm dev                    # 浏览器打开 http://localhost:5173 边写边看
# 写完，另开一个终端：
pnpm ship "note: 今天写的这篇"
```

`pnpm ship` 会自动 `git add` + `commit` + `push`，引号里是提交说明，不写就用时间。

### 方式三：挂机发布

```bash
pnpm watch:push
```

盯着 `docs/`，你停手 2 分钟就自动提交并推送。窗口关掉就停。

## 出问题先看这几条

| 现象 | 多半是 | 怎么办 |
| --- | --- | --- |
| 左侧没出现新页面 | 没写 `title`，或放错目录 | 检查 frontmatter 和文件位置 |
| 分组没出现 | 文件夹里缺 `index.md` | 补一个，写上 `title` |
| Actions 红叉 | Markdown 里有死链或语法错 | 点进 Actions 看报错行号，或本地 `pnpm build` 复现 |
| 页面 404 | 链接写成了带 `.html` | 链接写 `/knowledge/method/xxx`，不带后缀 |
| 右侧目录是空的 | 正文只有 `#` 一级标题 | 用 `##` 分段 |
| 中文搜不到 | 搜索按词匹配 | 标题里用完整词，别用缩写 |

::: danger 三件不要动
- `docs/.vitepress/dist/`：构建产物，每次构建会被覆盖
- `.git-ca/`、`.gh-token.txt`：本机的证书和令牌，已 gitignore
- 在 md 里写 Windows 绝对路径（`D:\...`）：网页上打不开，用 `/knowledge/...` 这种站内路径
:::

## 记住三句话

1. **建文件 = 加页面，建文件夹 = 加分组**
2. **标题决定右侧目录**，所以标题要写得像问题
3. **写完 `pnpm ship`**，一分钟上线
