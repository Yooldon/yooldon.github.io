<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import MarkdownActions from './components/MarkdownActions.vue'
import SectionTabs from './components/SectionTabs.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #nav-bar-content-after>
      <SectionTabs />
    </template>
    <template #doc-before>
      <MarkdownActions />
    </template>
  </Layout>
</template>
