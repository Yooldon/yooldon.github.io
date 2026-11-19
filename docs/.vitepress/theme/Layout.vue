<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import MarkdownActions from './components/MarkdownActions.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #doc-before>
      <MarkdownActions />
    </template>
  </Layout>
</template>
