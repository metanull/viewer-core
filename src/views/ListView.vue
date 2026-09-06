<script setup>
import { computed, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useDataPackage } from '../composables/useDataPackage.js'
import { paginate } from '../catalogue/pagination.js'

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

// The same page arithmetic every website's lists use, so this generic list
// and a site's results page cannot disagree on where page 3 starts.
const paged = computed(() => paginate(records.value ?? [], route.query.page, props.pageSize))
const page = computed(() => paged.value.currentPage)
const totalPages = computed(() => paged.value.lastPage)
const pageRecords = computed(() => paged.value.rows)

function labelOf(record) {
  return record.title ?? record.name ?? record.label ?? record.id
}
</script>

<template>
  <section class="vc-list">
    <h1>{{ entity }}</h1>
    <p v-if="records === null">{{ $t('core.status.loading') }}</p>
    <p v-else-if="records.length === 0">{{ $t('core.list.empty') }}</p>
    <template v-else>
      <ul>
        <li v-for="record in pageRecords" :key="record.id">
          <router-link :to="`/${entity}/${record.id}`">{{ labelOf(record) }}</router-link>
        </li>
      </ul>
      <nav v-if="totalPages > 1" class="vc-pagination">
        <router-link v-if="page > 1" :to="{ query: { page: page - 1 } }">
          {{ $t('core.pagination.previous') }}
        </router-link>
        <!-- The position is rendered here, next to the texts, rather than
             inserted into one: a text that has to carry a number cannot be
             translated without carrying the number's place in the sentence
             too, and that is the one thing this system does not do. -->
        <span class="vc-pagination__position">{{ page }} / {{ totalPages }}</span>
        <router-link v-if="page < totalPages" :to="{ query: { page: page + 1 } }">
          {{ $t('core.pagination.next') }}
        </router-link>
      </nav>
    </template>
    <p>
      <router-link to="/">{{ $t('core.nav.home') }}</router-link>
    </p>
  </section>
</template>
