<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Filter, ScrollText } from 'lucide-vue-next'
import CommissionCard from '../components/CommissionCard.vue'
import { useGameStore } from '../stores/game'
import { cn } from '../lib/utils'

const router = useRouter()
const gameStore = useGameStore()

type FilterType = 'all' | 'pending' | 'in_progress' | 'completed'
const currentFilter = ref<FilterType>('all')

const commissions = computed(() => gameStore.getAllCommissions())

const filteredCommissions = computed(() => {
  const all = commissions.value
  
  switch (currentFilter.value) {
    case 'pending':
      return all.filter(c => {
        const isCompleted = gameStore.state.completedCommissions.includes(c.id)
        const isCurrent = gameStore.state.currentCommissionId === c.id
        return !isCompleted && !isCurrent
      })
    case 'in_progress':
      return all.filter(c => {
        const isCompleted = gameStore.state.completedCommissions.includes(c.id)
        const isCurrent = gameStore.state.currentCommissionId === c.id
        return isCurrent && !isCompleted
      })
    case 'completed':
      return all.filter(c => gameStore.state.completedCommissions.includes(c.id))
    default:
      return all
  }
})

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待接取' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' }
]

onMounted(() => {
  gameStore.loadSavedGame()
})

function goBack() {
  router.push('/')
}

function goToGallery() {
  router.push('/gallery')
}
</script>

<template>
  <div class="min-h-screen bg-stone-100 py-8 px-4">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <button
          class="flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5" />
          <span>返回店铺</span>
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors"
          @click="goToGallery"
        >
          <ScrollText class="w-5 h-5" />
          <span>陈列室</span>
        </button>
      </div>

      <div class="text-center mb-8">
        <h1 class="text-3xl font-serif font-bold text-stone-800 mb-2">委托列表</h1>
        <p class="text-stone-500">选择一个委托，开始修复记忆</p>
      </div>

      <div class="flex items-center justify-center gap-2 mb-8">
        <Filter class="w-4 h-4 text-stone-400" />
        <div class="flex gap-1 bg-stone-200 rounded-lg p-1">
          <button
            v-for="option in filterOptions"
            :key="option.value"
            :class="[
              'px-3 py-1.5 text-sm rounded-md transition-all',
              currentFilter === option.value
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            ]"
            @click="currentFilter = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <CommissionCard
          v-for="commission in filteredCommissions"
          :key="commission.id"
          :commission="commission"
        />
      </div>

      <div v-if="filteredCommissions.length === 0" class="text-center py-16">
        <div class="text-6xl mb-4">📋</div>
        <p class="text-stone-500">暂无相关委托</p>
      </div>

      <div class="mt-12 text-center">
        <div class="inline-flex items-center gap-4 px-6 py-3 bg-amber-50 rounded-xl border border-amber-200">
          <div class="text-2xl">📊</div>
          <div class="text-left">
            <div class="text-sm text-stone-500">修复进度</div>
            <div class="text-lg font-bold text-stone-800">
              {{ gameStore.completionProgress.completed }} / {{ gameStore.completionProgress.total }}
              <span class="text-sm font-normal text-stone-500 ml-2">
                ({{ gameStore.completionProgress.percentage }}%)
              </span>
            </div>
          </div>
          <div class="w-32 h-2 bg-stone-200 rounded-full overflow-hidden">
            <div
              class="h-full bg-amber-500 transition-all duration-500"
              :style="{ width: `${gameStore.completionProgress.percentage}%` }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-stone-100 {
  background-color: #f5efe0;
  background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
}
</style>
