<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute, useRouter, withBase } from 'vitepress'

/**
 * 一级分类栏：导航栏的第二行。
 * 数据直接取自 themeConfig.nav，和左侧目录、移动端抽屉共用同一份配置。
 */

const { theme } = useData()
const route = useRoute()
const router = useRouter()

const items = computed(() => (theme.value.nav || []).filter((item: any) => item?.link))

function isActive(item: any) {
  const path = route.path
  if (item.activeMatch) return new RegExp(item.activeMatch).test(path)
  return path === item.link || path === item.link.replace(/\/$/, '')
}

function navigate(event: MouseEvent, item: any) {
  // 让新标签页打开等原生行为照常工作
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  router.go(withBase(item.link))
}
</script>

<template>
  <nav class="section-tabs" aria-label="一级分类">
    <div class="section-tabs__inner">
      <a
        v-for="item in items"
        :key="item.link"
        :href="withBase(item.link)"
        class="section-tabs__link"
        :class="{ active: isActive(item) }"
        @click="navigate($event, item)"
      >
        {{ item.text }}
      </a>
    </div>
  </nav>
</template>

<style scoped>
/* 只在桌面端显示；窄屏沿用折叠菜单 */
.section-tabs {
  display: none;
}

@media (min-width: 960px) {
  .section-tabs {
    display: block;
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    height: 44px;
    z-index: 8;
    pointer-events: auto;
  }

  .section-tabs__inner {
    display: flex;
    align-items: stretch;
    gap: 32px;
    height: 100%;
    padding: 0 var(--gutter, 72px);
    margin: 0;
  }

  .section-tabs__link {
    display: flex;
    align-items: center;
    border-bottom: 2px solid transparent;
    color: var(--vp-c-text-2);
    font-size: 15px;
    font-weight: 500;
    text-decoration: none;
    transition: color 0.2s, border-color 0.2s;
  }

  .section-tabs__link:hover {
    color: var(--vp-c-text-1);
    border-bottom-color: var(--vp-c-divider);
  }

  .section-tabs__link.active {
    color: var(--vp-c-brand-1);
    border-bottom-color: var(--vp-c-brand-1);
    font-weight: 600;
  }
}

@media (min-width: 960px) and (max-width: 1180px) {
  .section-tabs__inner {
    gap: 22px;
  }
}
</style>
