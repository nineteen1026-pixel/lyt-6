<script setup lang="ts">
import { computed } from 'vue'
import { X, Star, Trophy, Target } from 'lucide-vue-next'
import type { Achievement } from '../types'
import { useGameStore } from '../stores/game'

interface Props {
  achievement: Achievement | null
  visible: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()

const rarityColor = computed(() => 
  props.achievement ? gameStore.getRarityColor(props.achievement.rarity) : 'text-stone-600'
)
const rarityBgColor = computed(() => 
  props.achievement ? gameStore.getRarityBgColor(props.achievement.rarity) : 'bg-stone-50 border-stone-200'
)
const rarityLabel = computed(() => 
  props.achievement ? gameStore.getRarityLabel(props.achievement.rarity) : '普通'
)

const categoryLabel = computed(() => {
  if (!props.achievement) return ''
  const labels: Record<string, string> = {
    score: '评分成就',
    ending: '结局成就',
    collection: '收集成就',
    special: '特殊成就'
  }
  return labels[props.achievement.category] || '其他'
})

const progressPercentage = computed(() => {
  if (!props.achievement || props.achievement.isUnlocked) return 100
  const target = props.achievement.target || 1
  const progress = props.achievement.progress || 0
  return Math.min(Math.round((progress / target) * 100), 100)
})

function handleClose() {
  emit('close')
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    handleClose()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible && achievement"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        @click="handleBackdropClick"
      >
        <div
          class="relative w-full max-w-md overflow-hidden rounded-3xl shadow-2xl"
          :class="rarityBgColor"
        >
          <div class="absolute inset-0 pointer-events-none overflow-hidden">
            <div class="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-amber-300/20 blur-3xl" />
            <div class="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-amber-400/20 blur-2xl" />
          </div>

          <button
            class="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/50 hover:bg-white/80 text-stone-500 hover:text-stone-700 transition-colors"
            @click="handleClose"
          >
            <X class="w-5 h-5" />
          </button>

          <div class="relative p-8">
            <div class="text-center mb-6">
              <div class="relative inline-block mb-4">
                <div 
                  class="w-24 h-24 rounded-2xl flex items-center justify-center text-6xl bg-white/70 backdrop-blur-sm shadow-inner"
                  :class="{ 'grayscale opacity-60': !achievement.isUnlocked }"
                >
                  {{ achievement.icon }}
                </div>
                <div 
                  v-if="achievement.isUnlocked"
                  class="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow-lg"
                >
                  <Star class="w-4 h-4 text-white fill-white" />
                </div>
                <div 
                  v-else
                  class="absolute inset-0 flex items-center justify-center"
                >
                  <div class="w-12 h-12 rounded-full bg-stone-200/80 flex items-center justify-center backdrop-blur-sm">
                    <Target class="w-6 h-6 text-stone-500" />
                  </div>
                </div>
              </div>

              <h2 class="text-2xl font-serif font-bold text-stone-800 mb-2">
                {{ achievement.isUnlocked ? achievement.name : '???' }}
              </h2>

              <div class="flex items-center justify-center gap-2 mb-4">
                <span
                  class="text-sm px-3 py-1 rounded-full font-medium"
                  :class="rarityColor + ' bg-white/60'"
                >
                  {{ rarityLabel }}
                </span>
                <span class="text-sm text-stone-500">
                  {{ categoryLabel }}
                </span>
              </div>

              <p class="text-stone-600">
                {{ achievement.isUnlocked ? achievement.description : '完成特定条件后解锁此成就' }}
              </p>
            </div>

            <div v-if="!achievement.isUnlocked" class="mb-6">
              <div class="flex items-center justify-between text-sm text-stone-500 mb-2">
                <span>解锁进度</span>
                <span class="font-medium text-stone-700">
                  {{ achievement.progress || 0 }} / {{ achievement.target || 1 }}
                </span>
              </div>
              <div class="h-3 bg-stone-200/60 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-amber-400 to-amber-500"
                  :style="{ width: progressPercentage + '%' }"
                />
              </div>
            </div>

            <div v-if="achievement.isUnlocked && achievement.unlockedAt" class="text-center">
              <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-600">
                <Trophy class="w-4 h-4" />
                <span class="text-sm font-medium">
                  已解锁 · {{ new Date(achievement.unlockedAt).toLocaleDateString('zh-CN') }}
                </span>
              </div>
            </div>

            <div v-else class="text-center">
              <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stone-100 text-stone-500">
                <Target class="w-4 h-4" />
                <span class="text-sm font-medium">尚未解锁</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.9) translateY(20px);
}
</style>
