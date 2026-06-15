<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Trophy, Star, Sparkles } from 'lucide-vue-next'
import type { Achievement } from '../types'
import { useGameStore } from '../stores/game'

interface Props {
  achievement: Achievement
  visible: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()
const isShown = ref(false)
const isAnimating = ref(false)

const rarityColor = computed(() => gameStore.getRarityColor(props.achievement.rarity))
const rarityBgColor = computed(() => gameStore.getRarityBgColor(props.achievement.rarity))
const rarityLabel = computed(() => gameStore.getRarityLabel(props.achievement.rarity))

function handleClose() {
  isAnimating.value = false
  setTimeout(() => {
    emit('close')
  }, 300)
}

onMounted(() => {
  if (props.visible) {
    setTimeout(() => {
      isShown.value = true
      isAnimating.value = true
    }, 100)
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="visible"
        class="fixed top-8 left-1/2 -translate-x-1/2 z-50"
      >
        <div
          class="achievement-toast relative overflow-hidden rounded-2xl shadow-2xl border-2 min-w-[320px] max-w-[400px]"
          :class="[rarityBgColor, isShown ? 'toast-enter' : 'toast-leave']"
        >
          <div class="absolute inset-0 pointer-events-none overflow-hidden">
            <div class="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-300/20 blur-2xl" />
            <div class="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-amber-400/20 blur-xl" />
          </div>

          <div class="relative p-5">
            <div class="flex items-center gap-2 mb-3">
              <Sparkles class="w-4 h-4 text-amber-500 animate-pulse" />
              <span class="text-sm font-medium text-amber-600">成就解锁</span>
            </div>

            <div class="flex items-start gap-4">
              <div class="relative">
                <div class="w-16 h-16 rounded-xl flex items-center justify-center text-4xl bg-white/60 backdrop-blur-sm shadow-inner">
                  {{ achievement.icon }}
                </div>
                <div class="absolute -top-1 -right-1">
                  <div class="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
                    <Star class="w-3.5 h-3.5 text-white fill-white" />
                  </div>
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <h3 class="font-serif font-bold text-xl text-stone-800 mb-1">
                  {{ achievement.name }}
                </h3>
                <p class="text-sm text-stone-600 mb-2">
                  {{ achievement.description }}
                </p>
                <div class="flex items-center gap-2">
                  <span
                    class="text-xs px-2.5 py-1 rounded-full font-medium"
                    :class="rarityColor + ' bg-white/50'"
                  >
                    {{ rarityLabel }}
                  </span>
                  <span class="text-xs text-stone-400">
                    {{ achievement.category === 'score' ? '评分' : 
                       achievement.category === 'ending' ? '结局' :
                       achievement.category === 'collection' ? '收集' : '特殊' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="absolute bottom-0 left-0 right-0 h-1 bg-stone-200/50">
            <div 
              class="h-full bg-gradient-to-r from-amber-400 to-amber-500 progress-bar"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.achievement-toast {
  animation: toastBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes toastBounce {
  0% {
    opacity: 0;
    transform: translateY(-30px) scale(0.8);
  }
  50% {
    transform: translateY(5px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.progress-bar {
  animation: progressShrink 4s linear forwards;
}

@keyframes progressShrink {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-30px) scale(0.8);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}
</style>
