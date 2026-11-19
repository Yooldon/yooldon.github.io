/**
 * 保存即发布：盯着 docs/ 目录，停手一段时间后自动提交并推送。
 *
 *   pnpm watch:push
 *
 * 默认停手 2 分钟后发布，避免把写了一半的段落推上去。
 * 想立刻发一次就按 Ctrl+C 前先手动跑 pnpm ship，或者临时改 IDLE_MS。
 */

import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

const WATCH_DIR = 'docs'
const IDLE_MS = 2 * 60 * 1000

let timer = null
let publishing = false
let pending = false

function log(text) {
  console.log(`[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] ${text}`)
}

function publish() {
  if (publishing) {
    pending = true
    return
  }

  publishing = true

  try {
    const status = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()
    if (!status) {
      log('没有改动，跳过')
      return
    }

    execFileSync('node', ['scripts/ship.mjs', 'auto: 自动发布'], { stdio: 'inherit' })
    log('已发布')
  } catch (error) {
    log('发布失败，稍后重试（或手动 pnpm ship）')
  } finally {
    publishing = false
    if (pending) {
      pending = false
      schedule()
    }
  }
}

function schedule() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(publish, IDLE_MS)
}

fs.watch(WATCH_DIR, { recursive: true }, (_event, filename) => {
  if (!filename) return
  const name = String(filename)
  if (name.includes('dist') || name.includes('cache') || name.includes('.vitepress/cache')) return

  schedule()
  log(`检测到改动：${name}（停手 ${IDLE_MS / 60000} 分钟后发布）`)
})

log(`开始监视 ${WATCH_DIR}/，停手 ${IDLE_MS / 60000} 分钟后自动提交并推送`)
log('按 Ctrl+C 停止')
