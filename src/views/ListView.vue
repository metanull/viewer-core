<script setup>
import { computed, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useDataPackage } from '../composables/useDataPackage.js'

const props = defineProps({
  entity: { type: String, required: true },
  pageSize: { type: Number, default: 20 },
})

const route = useRoute()
const { loadEntity } = useDataPackage()

const records = ref(null)
watchEffect(async () => {
  records.value = await loadEntity(props.entity)
})

const page = computed(() => Math.max(1, Number.parseInt(route.query.page, 10) || 1))
const totalPages = computed(() =>
  records.value ? Math.max(1, Math.ceil(records.value.length / props.pageSize)) : 1
)
const pageRecords = computed(() =>
  records.value
    ? records.value.slice((page.value - 1) * props.pageSize, page.value * props.pageSize)
    : []
)

function labelOf(record) {
  return record.title ?? record.name ?? record.label ?? record.id
}
</script>

<template>
  <section class="vc-list">
    <h1>{{ entity }}</h1>
    <p v-if="records === null">{{ $t('chrome.loading') }}</p>
    <p v-else-if="records.length === 0">{{ $t('chrome.empty') }}</p>
    <template v-else>
      <ul>
        <li v-for="record in pageRecords" :key="record.id">
          <router-link :to="`/${entity}/${record.id}`">{{ labelOf(record) }}</router-link>
        </li>
      </ul>
      <nav v-if="totalPages > 1" class="vc-pagination">
        <router-link v-if="page > 1" :to="{ query: { page: page - 1 } }">
          {{ $t('chrome.previous') }}
        </router-link>
        <span>{{ $t('chrome.page', { page, total: totalPages }) }}</span>
        <router-link v-if="page < totalPages" :to="{ query: { page: page + 1 } }">
          {{ $t('chrome.next') }}
        </router-link>
      </nav>
    </template>
    <p>
      <router-link to="/">{{ $t('chrome.home') }}</router-link>
    </p>
  </section>
</template>
