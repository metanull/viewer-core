<script setup>
import { computed } from 'vue'
import { useI18n } from './index.js'
import { renderInline } from './markdown.js'

const props = defineProps({
  keypath: { type: String, required: true },
  tag: { type: String, default: 'span' },
})

const { t } = useI18n()
const html = computed(() => renderInline(t(props.keypath)))
</script>

<template>
  <component :is="tag" class="vc-text-inline" v-html="html" />
</template>
