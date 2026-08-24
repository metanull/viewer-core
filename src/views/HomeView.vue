<script setup>
import { inject } from 'vue'
import { VIEWER_CONFIG } from '../injectionKeys.js'

const config = inject(VIEWER_CONFIG, {})
const entities = config.features?.entities ?? []
</script>

<template>
  <section class="vc-home">
    <h1>{{ config.siteName }}</h1>
    <nav v-if="entities.length">
      <ul>
        <li v-for="entity in entities" :key="entity">
          <router-link :to="`/${entity}`">{{ entity }}</router-link>
        </li>
      </ul>
    </nav>
  </section>
</template>
