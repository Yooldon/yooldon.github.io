/**
 * 用 GitHub REST API 把当前目录整个发布到仓库，不依赖 git。
 *
 *   node scripts/deploy-github.mjs [token 文件路径]
 *
 * 令牌来源优先级：命令行参数 -> 环境变量 GITHUB_TOKEN -> ../.gh-token.txt
 * 需要权限（fine-grained）：Contents: RW、Workflows: RW、Pages: RW
 *
 * 行为：
 *   1. 开启 Pages（源 = GitHub Actions）
 *   2. 把工作区文件全部作为新 tree 提交到 main（旧文件会被清掉）
 *   3. 轮询 Actions，打印部署结果
 */

import fs from 'node:fs'
import path from 'node:path'

const OWNER = 'Yooldon'
const REPO = 'yooldon.github.io'
const BRANCH = 'main'
const API = 'https://api.github.com'

const root = process.cwd()

/* ----------------------------- 令牌 ----------------------------- */

function resolveToken() {
  const fromArg = process.argv[2]
  const candidates = [fromArg, path.join(path.dirname(root), '.gh-token.txt')].filter(Boolean)

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const token = fs.readFileSync(p, 'utf8').trim()
      if (token) return token
    }
  }
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null
}

const token = resolveToken()
if (!token) {
  console.error(`
没有找到 GitHub 令牌。

方式一（推荐）：把令牌写进 ${path.join(path.dirname(root), '.gh-token.txt')}，只放一行。
方式二：设置环境变量 GITHUB_TOKEN。
方式三：node scripts/deploy-github.mjs <令牌文件路径>

令牌需要这些权限：Contents 读写、Workflows 读写、Pages 读写。
`)
  process.exit(2)
}

/* ----------------------------- 请求 ----------------------------- */

async function gh(method, url, body) {
  const res = await fetch(url.startsWith('http') ? url : API + url, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'yooldon-notes-deploy',
      'x-github-api-version': '2022-11-28',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { message: text }
  }

  if (!res.ok) {
    const err = new Error(`${method} ${url} -> ${res.status} ${data.message || text}`)
    err.status = res.status
    throw err
  }
  return data
}

/* --------------------------- 收集文件 --------------------------- */

const SKIP_DIRS = new Set(['node_modules', '.pnpm-store', '.git', 'dist', 'cache'])
const SKIP_FILES = new Set(['.gh-token.txt', '.DS_Store'])

function walk(dir, base = '') {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue
    if (entry.isFile() && SKIP_FILES.has(entry.name)) continue

    const rel = base ? `${base}/${entry.name}` : entry.name
    const abs = path.join(dir, entry.name)

    if (entry.isDirectory()) files.push(...walk(abs, rel))
    else if (entry.isFile()) files.push({ rel, abs })
  }
  return files
}

/* --------------------------- 主流程 --------------------------- */

async function main() {
  console.log(`仓库：${OWNER}/${REPO}（分支 ${BRANCH}）`)

  // 1. 开启 Pages
  try {
    await gh('PUT', `/repos/${OWNER}/${REPO}/pages`, { build_type: 'workflow' })
    console.log('✓ Pages 已开启，构建源 = GitHub Actions')
  } catch (error) {
    if (error.status === 409) {
      console.log('· Pages 已存在，跳过开启')
    } else {
      console.log(`! Pages 设置失败（${error.message}），稍后可在 Settings → Pages 手动选 GitHub Actions`)
    }
  }

  // 2. 当前分支头
  const ref = await gh('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`)
  const headSha = ref.object.sha
  console.log(`· 当前 HEAD ${headSha.slice(0, 7)}`)

  // 3. 上传文件
  const files = walk(root)
  console.log(`· 待上传 ${files.length} 个文件`)

  const tree = []
  let done = 0
  for (const file of files) {
    const content = fs.readFileSync(file.abs).toString('base64')
    const blob = await gh('POST', `/repos/${OWNER}/${REPO}/git/blobs`, {
      content,
      encoding: 'base64',
    })
    tree.push({ path: file.rel, mode: '100644', type: 'blob', sha: blob.sha })
    done += 1
    if (done % 10 === 0) process.stdout.write(`  ${done}/${files.length}\r`)
  }
  console.log(`  ${files.length}/${files.length} ✓`)

  // 4. 建 tree / commit / 移动分支
  const newTree = await gh('POST', `/repos/${OWNER}/${REPO}/git/trees`, { tree })
  const commit = await gh('POST', `/repos/${OWNER}/${REPO}/git/commits`, {
    message: 'chore: 换成 VitePress 笔记站骨架',
    tree: newTree.sha,
    parents: [headSha],
  })
  await gh('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
    sha: commit.sha,
    force: false,
  })
  console.log(`✓ 已提交 ${commit.sha.slice(0, 7)}`)

  // 5. 等 Actions
  console.log('· 等待 Actions 构建（最多 3 分钟）…')
  for (let i = 0; i < 36; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5000))
    const runs = await gh('GET', `/repos/${OWNER}/${REPO}/actions/runs?branch=${BRANCH}&per_page=3`)
    const run = (runs.workflow_runs || []).find((r) => r.head_sha === commit.sha)
    if (!run) continue

    if (run.status === 'completed') {
      console.log(`✓ Actions ${run.conclusion}`)
      console.log(`  ${run.html_url}`)
      break
    }
    if (i % 4 === 0) console.log(`  …${run.status}`)
  }

  console.log(`\n站点：https://${OWNER.toLowerCase()}.github.io/`)
}

main().catch((error) => {
  console.error('\n部署失败：' + error.message)
  if (error.status === 401) console.error('令牌无效或已过期。')
  if (error.status === 403) console.error('令牌权限不足，检查 Contents / Workflows / Pages 是否都是读写。')
  if (error.status === 404) console.error('仓库不存在，或令牌没有访问该仓库的权限。')
  process.exit(1)
})
