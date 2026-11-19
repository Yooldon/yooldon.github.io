import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { defineConfig, type DefaultTheme } from 'vitepress'

/**
 * 站点根目录（docs/）。配置在 docs/.vitepress/ 里，所以要往上一级。
 */
const docsDir = fileURLToPath(new URL('..', import.meta.url))
const notesDir = path.join(docsDir, 'notes')

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
 * 自动生成左侧目录：
 *   docs/notes/<分类>/*.md  ->  一个分类（可折叠分组）
 * 分类名取该目录 index.md 的 title，排序取 order，日期取 date。
 * 新增笔记不需要改配置，只要把 md 丢进目录就行。
 */
function buildNotesSidebar(): DefaultTheme.SidebarItem[] {
  if (!fs.existsSync(notesDir)) return []

  const categories = fs
    .readdirSync(notesDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.')
    )

  const groups = categories.map((entry) => {
    const dir = entry.name
    const abs = path.join(notesDir, dir)
    const meta = readFrontmatter(path.join(abs, 'index.md'))

    const pages = fs
      .readdirSync(abs, { withFileTypes: true })
      .filter((f) => f.isFile() && f.name.endsWith('.md') && f.name !== 'index.md')
      .map((f) => {
        const slug = f.name.replace(/\.md$/, '')
        const fm = readFrontmatter(path.join(abs, f.name))
        return {
          text: fm.title || slug,
          link: `/notes/${dir}/${slug}`,
          order: Number(fm.order ?? 99),
          date: fm.date || '',
        }
      })
      .sort(
        (a, b) =>
          a.order - b.order || b.date.localeCompare(a.date) || a.text.localeCompare(b.text, 'zh')
      )
      .map(({ text, link }) => ({ text, link }))

    return {
      text: meta.title || dir,
      link: `/notes/${dir}/`,
      collapsed: false,
      order: Number(meta.order ?? 99),
      items: pages,
    }
  })

  return groups.sort((a, b) => a.order - b.order).map(({ order: _order, ...rest }) => rest)
}

export default defineConfig({
  lang: 'zh-CN',
  title: 'Yooldon 的知识库',
  description: '记录判断，而不是搬运知识。',
  cleanUrls: true,
  lastUpdated: hasGit(),

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
      { text: '笔记', link: '/notes/', activeMatch: '^/notes/' },
      { text: '方法论', link: '/notes/method/', activeMatch: '^/notes/method/' },
      { text: '工具', link: '/notes/tools/', activeMatch: '^/notes/tools/' },
      { text: '关于', link: '/about' },
    ],

    /* 左侧：分类 + 分页（自动生成） */
    sidebar: buildNotesSidebar(),

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
