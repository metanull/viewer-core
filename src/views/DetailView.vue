<script setup>
import { marked } from 'marked'
import { computed, ref, watchEffect } from 'vue'
import { useDataPackage } from '../composables/useDataPackage.js'

const props = defineProps({
  entity: { type: String, required: true },
  id: { type: String, required: true },
})

const { loadEntity } = useDataPackage()

const record = ref(undefined)
watchEffect(async () => {
  // Read both props before the first await so the effect tracks them.
  const { entity, id } = props
  const all = await loadEntity(entity)
  record.value = all.find((r) => String(r.id) === String(id)) ?? null
})

const fields = computed(() =>
  record.value ? Object.entries(record.value).filter(([key]) => key !== 'id') : []
)

// Data packages are curated, trusted content; string fields may contain markdown.
function renderValue(value) {
  return typeof value === 'string' ? marked.parse(value) : JSON.stringify(value)
}
</script>

<template>
  <article class="vc-detail">
    <p v-if="record === undefined">{{ $t('core.status.loading') }}</p>
    <p v-else-if="record === null">{{ $t('core.detail.notFound') }}</p>
    <template v-else>
      <h1>{{ record.title ?? record.name ?? record.id }}</h1>
      <dl>
        <template v-for="[key, value] in fields" :key="key">
          <dt>{{ key }}</dt>
          <dd v-html="renderValue(value)"></dd>
        </template>
      </dl>
    </template>
    <p>
      <router-link :to="`/${entity}`">{{ $t('core.nav.backToList') }}</router-link>
    </p>
  </article>
</template>
