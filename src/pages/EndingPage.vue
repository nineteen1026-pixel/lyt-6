<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Home, ArrowRight, ScrollText } from 'lucide-vue-next'
import { useGameStore } from '../stores/game'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const showStory = ref(false)

const commissionId = computed(() => route.params.id as string)
const endingType = computed(() => route.params.type as string)

const commission = computed(() => gameStore.getCommissionById(commissionId.value))
const ending = computed(() => gameStore.getEndingByType(commissionId.value, endingType.value))

const endingTypeLabel = computed(() => {
  const map: Record<string, { label: string; color: string }> = {
    good: { label: '完美结局', color: 'text-amber-600' },
    neutral: { label: '温暖结局', color: 'text-blue-600' },
    bad: { label: '遗憾结局', color: 'text-stone-500' }
  }
  return map[endingType.value] || { label: '结局', color: 'text-stone-500' }
})

function goHome() {
  router.push('/')
}

function goToGallery() {
  router.push('/gallery')
}

function goToCommissions() {
  router.push('/commissions')
}

onMounted(() => {
  gameStore.loadSavedGame()
  setTimeout(() => {
    showStory.value = true
  }, 600)
})
</script>

<template>
  <div class="min-h-screen ending-page flex items-center justify-center px-4 py-8">
    <div class="max-w-2xl w-full">
      <Transition name="fade-up">
        <div v-if="showStory && ending" class="text-center">
          <div class="text-8xl mb-6 animate-float-slow">{{ ending.image }}</div>

          <div class="mb-4">
            <span :class="['text-sm font-medium tracking-wider uppercase', endingTypeLabel.color]">
              {{ endingTypeLabel.label }}
            </span>
          </div>

          <h1 class="text-4xl font-serif font-bold text-stone-800 mb-2">
            {{ ending.title }}
          </h1>

          <div class="w-16 h-0.5 bg-amber-400 mx-auto mb-8 rounded-full" />

          <div class="bg-stone-50/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-stone-200 mb-8 text-left">
            <div class="prose prose-stone max-w-none">
              <p
                v-for="(paragraph, index) in ending.story.split('\n\n')"
                :key="index"
                class="text-stone-700 leading-loose mb-4 last:mb-0 font-serif text-base"
                :style="{ animationDelay: `${index * 0.3}s` }"
              >
                {{ paragraph }}
              </p>
            </div>
          </div>

          <div class="bg-amber-50/80 backdrop-blur-sm rounded-xl p-4 border border-amber-200 mb-8">
            <p class="text-stone-600 text-sm">
              <span class="font-medium">委托人：</span>
              {{ commission?.clientAvatar }} {{ commission?.clientName }}
            </p>
            <p class="text-stone-500 text-sm mt-1">
              <span class="font-medium">修复物品：</span>
              {{ commission?.item.image }} {{ commission?.item.name }}
            </p>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              class="flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-medium shadow-lg hover:bg-amber-600 hover:shadow-xl transition-all duration-300"
              @click="goToCommissions"
            >
              <span>继续修复</span>
              <ArrowRight class="w-4 h-4" />
            </button>
            <button
              class="flex items-center justify-center gap-2 px-6 py-3 bg-white text-stone-600 border-2 border-stone-200 rounded-xl font-medium shadow-md hover:border-amber-300 hover:shadow-lg transition-all duration-300"
              @click="goToGallery"
            >
              <ScrollText class="w-4 h-4" />
              <span>陈列室</span>
            </button>
            <button
              class="flex items-center justify-center gap-2 px-6 py-3 bg-white text-stone-600 border-2 border-stone-200 rounded-xl font-medium shadow-md hover:border-amber-300 hover:shadow-lg transition-all duration-300"
              @click="goHome"
            >
              <Home class="w-4 h-4" />
              <span>回到店铺</span>
            </button>
          </div>
        </div>
      </Transition>

      <Transition name="fade-up">
        <div v-if="showStory && !ending" class="text-center">
          <div class="text-6xl mb-6">❓</div>
          <h1 class="text-2xl font-serif font-bold text-stone-800 mb-4">结局未解锁</h1>
          <p class="text-stone-500 mb-8">这个结局尚未被发现，请继续探索</p>
          <button
            class="flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-medium shadow-lg hover:bg-amber-600 transition-colors mx-auto"
            @click="goHome"
          >
            <Home class="w-4 h-4" />
            <span>回到店铺</span>
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.ending-page {
  background-color: #f5efe0;
  background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
}

@keyframes float-slow {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

.animate-float-slow {
  animation: float-slow 3s ease-in-out infinite;
}

.fade-up-enter-active {
  transition: all 0.8s ease-out;
}

.fade-up-leave-active {
  transition: all 0.4s ease-in;
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.fade-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
