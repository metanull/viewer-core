<script setup>
import { computed } from 'vue'
import { useI18n } from './index.js'
import { renderBlock } from './markdown.js'

const props = defineProps({
  keypath: { type: String, required: true },
  tag: { type: String, default: 'div' },
})

const { t } = useI18n()
const html = computed(() => renderBlock(t(props.keypath)))
</script>

<template>
  <component :is="tag" class="vc-text" v-html="html" />
</template>
