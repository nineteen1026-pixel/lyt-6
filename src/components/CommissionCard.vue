<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Lock } from 'lucide-vue-next'
import type { Commission } from '../types'
import { useGameStore } from '../stores/game'
import { cn } from '../lib/utils'

const props = defineProps<{
  commission: Commission
}>()

const emit = defineEmits<{
  (e: 'locked-click', commission: Commission): void
  (e: 'commission-select', commission: Commission): void
}>()

const router = useRouter()
const gameStore = useGameStore()

const status = computed(() => gameStore.getCommissionStatus(props.commission.id))

const isLocked = computed(() => status.value === 'locked')
const isCompleted = computed(() => status.value === 'completed')
const isInProgress = computed(() => status.value === 'in_progress')
const isFailed = computed(() => status.value === 'failed')

const lockedReason = computed(() => {
  if (!isLocked.value) return ''
  const prereqs = props.commission.prerequisiteCommissionIds
  if (prereqs.length > 0) {
    const incomplete = prereqs.filter(id => 
      !gameStore.state.completedCommissions.includes(id)
    )
    if (incomplete.length > 0) {
      return `需要先完成 ${incomplete.length} 个前置委托`
    }
  }
  return '需要解锁对应章节'
})

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    locked: '未解锁',
    pending: '待接取',
    in_progress: '进行中',
    completed: '已完成',
    failed: '失败'
  }
  return map[status.value] || '未知'
})

const difficultyLabel = computed(() => {
  const map: Record<string, string> = {
    simple: '简单',
    medium: '中等',
    complex: '困难'
  }
  return map[props.commission.difficulty] || '未知'
})

const difficultyColor = computed(() => {
  const map: Record<string, string> = {
    simple: 'bg-green-100 text-green-800 border-green-300',
    medium: 'bg-amber-100 text-amber-800 border-amber-300',
    complex: 'bg-rose-100 text-rose-800 border-rose-300'
  }
  return map[props.commission.difficulty] || 'bg-gray-100 text-gray-800 border-gray-300'
})

function handleClick() {
  if (isLocked.value) {
    emit('locked-click', props.commission)
    return
  }
  if (status.value === 'pending'
      && gameStore.hasDialogueForSession(props.commission.id, 'commission_accept')
      && !gameStore.hasCompletedDialogueForType(props.commission.id, 'commission_accept')) {
    emit('commission-select', props.commission)
    return
  }
  gameStore.selectCommission(props.commission.id)
  router.push(`/commission/${props.commission.id}`)
}
</script>

<template>
  <div
    class="commission-card relative transition-all duration-300"
    :class="[
      isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02] hover:shadow-lg',
      isCompleted ? 'bg-amber-50' : isLocked ? 'bg-stone-100' : 'bg-stone-50',
      'rounded-lg border-2 p-5',
      isCompleted ? 'border-amber-300' : isLocked ? 'border-stone-300' : 'border-stone-200',
      isInProgress ? 'ring-2 ring-amber-400 ring-offset-2' : ''
    ]"
    @click="handleClick"
  >
    <div v-if="isLocked" class="absolute inset-0 flex items-center justify-center bg-stone-900/10 backdrop-blur-[1px] rounded-lg z-10">
      <div class="text-center">
        <Lock class="w-8 h-8 text-stone-500 mx-auto mb-2" />
        <span class="text-xs text-stone-500 font-medium">{{ lockedReason }}</span>
      </div>
    </div>

    <div v-if="isCompleted" class="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm shadow-md z-20">
      ✓
    </div>
    <div v-if="isInProgress" class="absolute -top-2 -right-2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs shadow-md animate-pulse z-20">
      进行中
    </div>
    <div v-if="isFailed" class="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-white text-xs shadow-md z-20">
      ✕
    </div>

    <div class="flex items-start gap-4" :class="{ 'blur-[2px]': isLocked }">
      <div class="text-4xl flex-shrink-0">
        {{ commission.item.image }}
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-lg font-serif font-bold text-stone-800 mb-1 truncate">
          {{ commission.title }}
        </h3>
        <div class="flex items-center gap-2 mb-2">
          <span class="text-2xl">{{ commission.clientAvatar }}</span>
          <span class="text-sm text-stone-600">{{ commission.clientName }}</span>
        </div>
        <p class="text-sm text-stone-500 line-clamp-2 mb-3">
          {{ commission.description }}
        </p>
        <div class="flex items-center justify-between">
          <span
            :class="[
              'px-2 py-0.5 text-xs rounded-full border',
              difficultyColor
            ]"
          >
            {{ difficultyLabel }}
          </span>
          <span v-if="isCompleted" class="text-xs text-green-600 font-medium">
            已完成
          </span>
          <span v-else-if="isInProgress" class="text-xs text-amber-600 font-medium">
            继续修复
          </span>
          <span v-else-if="isFailed" class="text-xs text-rose-600 font-medium">
            重新挑战
          </span>
          <span v-else-if="isLocked" class="text-xs text-stone-400">
            {{ statusLabel }}
          </span>
          <span v-else class="text-xs text-stone-400">
            点击接取
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.commission-card {
  box-shadow: 0 2px 8px rgba(61, 41, 20, 0.08);
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4b896' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
