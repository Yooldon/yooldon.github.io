<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useData, withBase } from 'vitepress'

/**
 * 正文右上角的「复制 Markdown / 打开 Markdown」按钮。
 * 源文件在构建时被复制进 dist（见 config.mts 的 copyMarkdownSources），
 * 所以这里直接 fetch 同目录下的 .md，不依赖 GitHub 网络。
 */

const { page } = useData()

const root = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const state = ref<'idle' | 'copied' | 'failed'>('idle')

const markdownUrl = computed(() =>
  page.value.relativePath ? withBase('/' + page.value.relativePath) : ''
)

const githubUrl = computed(() =>
  page.value.relativePath
    ? `https://github.com/Yooldon/yooldon.github.io/blob/main/docs/${page.value.relativePath}`
    : ''
)

let timer: ReturnType<typeof setTimeout> | undefined

async function copyMarkdown() {
  try {
    const response = await fetch(markdownUrl.value)
    if (!response.ok) throw new Error(String(response.status))
    const text = await response.text()

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      document.body.removeChild(area)
    }

    state.value = 'copied'
  } catch {
    state.value = 'failed'
  }

  clearTimeout(timer)
  timer = setTimeout(() => (state.value = 'idle'), 2000)
}

function onDocumentClick(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) menuOpen.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') menuOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
  clearTimeout(timer)
})
</script>

<template>
  <div v-if="page.relativePath" ref="root" class="md-actions">
    <div class="md-actions__group">
      <button type="button" class="md-actions__main" @click="copyMarkdown">
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
          <path
            fill="currentColor"
            d="M19 21H8V7h11m0-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-3-4H4a2 2 0 0 0-2 2v14h2V3h12V1Z"
          />
        </svg>
        <span>
          {{ state === 'copied' ? '已复制' : state === 'failed' ? '复制失败' : '复制 Markdown' }}
        </span>
      </button>
      <button
        type="button"
        class="md-actions__toggle"
        aria-haspopup="menu"
        :aria-expanded="menuOpen"
        aria-label="更多 Markdown 操作"
        @click.stop="menuOpen = !menuOpen"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            d="m4 6 4 4 4-4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <div v-if="menuOpen" class="md-actions__menu" role="menu">
      <a :href="markdownUrl" target="_blank" rel="noopener" role="menuitem" @click="menuOpen = false">
        打开 Markdown
      </a>
      <a :href="githubUrl" target="_blank" rel="noopener" role="menuitem" @click="menuOpen = false">
        在 GitHub 查看原文
      </a>
    </div>
  </div>
</template>

<style scoped>
.md-actions {
  position: relative;
  display: flex;
  justify-content: flex-end;
  margin: 4px 0 12px;
}

.md-actions__group {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg);
  overflow: hidden;
}

.md-actions__main,
.md-actions__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s, background-color 0.2s;
}

.md-actions__main {
  padding: 7px 10px 7px 12px;
}

.md-actions__toggle {
  padding: 0 6px;
  border-left: 1px solid var(--vp-c-divider);
}

.md-actions__main:hover,
.md-actions__toggle:hover {
  color: var(--vp-c-brand-1);
  background-color: var(--vp-c-bg-soft);
}

.md-actions__menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 30;
  min-width: 176px;
  padding: 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background-color: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-2);
}

.md-actions__menu a {
  display: block;
  padding: 7px 10px;
  border-radius: 6px;
  color: var(--vp-c-text-1);
  font-size: 13px;
  text-decoration: none;
  white-space: nowrap;
}

.md-actions__menu a:hover {
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-1);
}

@media (max-width: 640px) {
  .md-actions {
    margin-bottom: 8px;
  }

  .md-actions__main {
    padding: 6px 8px 6px 10px;
  }
}
</style>
