import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { defineConfig, type DefaultTheme } from 'vitepress'

/**
 * 站点根目录（docs/）。配置在 docs/.vitepress/ 里，所以要往上一级。
 */
const docsDir = fileURLToPath(new URL('..', import.meta.url))

/**
 * 「最后更新」靠 git log 取时间。机器上没装 git 时（比如纯手写环境）
 * 直接关掉，否则构建会因为 spawn git ENOENT 失败。
 */
function hasGit(): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ *
 * 从 Markdown 的 frontmatter 里读几个字段。
 * 只做简单的 key: value 解析，够用就行，不引第三方依赖。
 * ------------------------------------------------------------------ */
function readFrontmatter(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {}
  const raw = fs.readFileSync(file, 'utf8')
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}

  const data: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/)
    if (!kv) continue
    data[kv[1]] = kv[2].trim().replace(/^['"]|['"]$/g, '')
  }
  return data
}

/**
 * 四个一级分区。导航栏那排 Tab、左侧目录、侧栏分区都从这里来。
 * 顺序按文件夹里的 index.md 的 order 排。
 */
const SECTIONS = ['start', 'knowledge', 'work', 'life']

/** 读一个目录里的页面（不含 index.md），按 order → 日期 → 标题排序 */
function pagesIn(dir: string, urlBase: string) {
  if (!fs.existsSync(dir)) return []

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md')
    .map((entry) => {
      const slug = entry.name.replace(/\.md$/, '')
      const fm = readFrontmatter(path.join(dir, entry.name))
      return {
        text: fm.title || slug,
        link: `${urlBase}/${slug}`,
        order: Number(fm.order ?? 99),
        date: fm.date || '',
      }
    })
    .sort(
      (a, b) =>
        a.order - b.order || b.date.localeCompare(a.date) || a.text.localeCompare(b.text, 'zh')
    )
    .map(({ text, link }) => ({ text, link }))
}

/**
 * 生成某个分区的左侧目录：
 *   分区根目录的散页  -> 平铺在前面
 *   分区下的子目录    -> 一个可折叠分组（组名取子目录 index.md 的 title）
 * 新增笔记不用改配置，把 md 丢进对应目录就行。
 */
function buildSectionSidebar(section: string): DefaultTheme.SidebarItem[] {
  const abs = path.join(docsDir, section)
  if (!fs.existsSync(abs)) return []

  // 每一类都给一个回到总览的入口，免得空分区没有侧栏
  const items: DefaultTheme.SidebarItem[] = [{ text: '总览', link: `/${section}/` }]
  const groups: (DefaultTheme.SidebarItem & { order: number })[] = []
  const loose: { text: string; link: string; order: number; date: string }[] = []

  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue

    if (entry.isDirectory()) {
      const dirAbs = path.join(abs, entry.name)
      const meta = readFrontmatter(path.join(dirAbs, 'index.md'))
      groups.push({
        text: meta.title || entry.name,
        link: `/${section}/${entry.name}/`,
        collapsed: false,
        items: pagesIn(dirAbs, `/${section}/${entry.name}`),
        order: Number(meta.order ?? 99),
      })
    } else if (entry.name.endsWith('.md') && entry.name !== 'index.md') {
      const fm = readFrontmatter(path.join(abs, entry.name))
      loose.push({
        text: fm.title || entry.name,
        link: `/${section}/${entry.name.replace(/\.md$/, '')}`,
        order: Number(fm.order ?? 99),
        date: fm.date || '',
      })
    }
  }

  // 分区根目录的散页也按 order 排，和分组里的页面保持一致
  items.push(
    ...loose
      .sort(
        (a, b) =>
          a.order - b.order || b.date.localeCompare(a.date) || a.text.localeCompare(b.text, 'zh')
      )
      .map(({ text, link }) => ({ text, link }))
  )

  return [...items, ...groups.sort((a, b) => a.order - b.order).map(({ order: _o, ...g }) => g)]
}


/**
 * 把每个页面的 Markdown 源文件复制进构建产物，
 * 这样「复制 Markdown / 打开 Markdown」可以直接取同目录的 .md，
 * 不用连 GitHub，也不怕加速工具改路由。
 */
function collectMarkdown(dir: string, base = ''): { rel: string; abs: string }[] {
  const files: { rel: string; abs: string }[] = []

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    // 以点开头的目录/文件（.vitepress 等）不进产物
    if (entry.name.startsWith('.')) continue

    const rel = base ? `${base}/${entry.name}` : entry.name
    const abs = path.join(dir, entry.name)

    if (entry.isDirectory()) files.push(...collectMarkdown(abs, rel))
    else if (entry.name.endsWith('.md')) files.push({ rel, abs })
  }

  return files
}

function copyMarkdownSources({ outDir }: { outDir: string }) {
  for (const file of collectMarkdown(docsDir)) {
    const raw = fs.readFileSync(file.abs, 'utf8')
    // 去掉 frontmatter，复制出去的就是干净的正文
    const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')

    const dest = path.join(outDir, file.rel)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, body)
  }
}

export default defineConfig({
  lang: 'zh-CN',
  title: 'Yooldon 的知识库',
  description: '记录判断，而不是搬运知识。',
  cleanUrls: true,
  lastUpdated: hasGit(),

  buildEnd: copyMarkdownSources,

  head: [
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
    ['meta', { name: 'author', content: 'Yooldon' }],
  ],

  sitemap: {
    hostname: 'https://yooldon.github.io',
  },

  markdown: {
    lineNumbers: true,
    image: { lazyLoading: true },
  },

  themeConfig: {
    logo: undefined,

    /* 左上：一级分类（对应文档站那排 Tab） */
    nav: [
      { text: '快速开始', link: '/start/', activeMatch: '^/start/' },
      { text: '信息&知识', link: '/knowledge/', activeMatch: '^/knowledge/' },
      { text: '学习&工作', link: '/work/', activeMatch: '^/work/' },
      { text: '生活&兴趣', link: '/life/', activeMatch: '^/life/' },
    ],

    /* 左侧：每个分区各生成一套目录 */
    sidebar: {
      '/start/': buildSectionSidebar('start'),
      '/knowledge/': buildSectionSidebar('knowledge'),
      '/work/': buildSectionSidebar('work'),
      '/life/': buildSectionSidebar('life'),
    },

    /* 右侧：本页目录 */
    outline: {
      level: [2, 3],
      label: '本页目录',
    },

    /* 本地搜索 */
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
          modal: {
            noResultsText: '没有找到结果',
            resetButtonTitle: '清除查询',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭',
            },
          },
        },
      },
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/Yooldon' }],

    editLink: {
      pattern: 'https://github.com/Yooldon/yooldon.github.io/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    lastUpdated: {
      text: '最后更新',
      formatOptions: { dateStyle: 'short', timeStyle: 'short' },
    },

    docFooter: { prev: '上一篇', next: '下一篇' },
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    sidebarMenuLabel: '目录',
    returnToTopLabel: '回到顶部',
    externalLinkIcon: true,

    footer: {
      message: '内容以 CC BY-NC 4.0 授权',
      copyright: 'Copyright © 2026 Yooldon',
    },
  },
})
