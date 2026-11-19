/**
 * 一条命令发布：git add -A && git commit && git push
 *
 *   pnpm ship                  # 自动用时间当提交说明
 *   pnpm ship "note: 缓存"     # 自定义说明
 *
 * 构建交给 GitHub Actions，本地不跑 build，省时间。
 */

import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const message =
  args.join(' ').trim() ||
  `notes: ${new Date().toLocaleString('zh-CN', { hour12: false })}`

function run(command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, { encoding: 'utf8', ...options })
}

function step(label) {
  console.log(`\n▶ ${label}`)
}

try {
  run('git', ['rev-parse', '--is-inside-work-tree'])
} catch {
  console.error('当前目录不是 git 仓库。')
  process.exit(1)
}

const changed = run('git', ['status', '--porcelain']).trim()

if (!changed) {
  console.log('没有改动，跳过。')
  process.exit(0)
}

step('暂存改动')
run('git', ['add', '-A'], { stdio: 'inherit' })

step(`提交：${message}`)
run('git', ['commit', '-m', message], { stdio: 'inherit' })

step('推送')
try {
  // stdio: inherit 才能在需要时把登录窗口/提示交给终端
  run('git', ['push', 'origin', 'HEAD'], { stdio: 'inherit' })
} catch {
  console.error('\n推送失败。常见原因：')
  console.error('  1. 首次使用还没登录 —— 在终端里手动跑一次 git push，浏览器授权即可')
  console.error('  2. 加速工具没开 —— hosts 里 github.com 指向 127.0.0.1，连不上')
  console.error('  3. 远端有新提交 —— git pull --rebase 后再 ship')
  process.exit(1)
}

console.log('\n✓ 已推送，GitHub Actions 大约 1 分钟后部署完成')
console.log('  https://github.com/Yooldon/yooldon.github.io/actions')
