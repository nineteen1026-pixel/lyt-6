<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Home, ArrowRight, ScrollText, Award, TrendingUp, Star, CheckCircle, XCircle, MinusCircle } from 'lucide-vue-next'
import { useGameStore } from '../stores/game'
import type { MultiDimensionalScore, Achievement } from '../types'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const showStory = ref(false)
const showScore = ref(false)
const showAchievements = ref(false)
const newlyUnlockedAchievements = ref<Achievement[]>([])

const commissionId = computed(() => route.params.id as string)
const endingType = computed(() => route.params.type as string)

const commission = computed(() => gameStore.getCommissionById(commissionId.value))
const ending = computed(() => gameStore.getEndingByType(commissionId.value, endingType.value))

const currentScore = computed<MultiDimensionalScore | null>(() => {
  return gameStore.getScoreForCommissionAndEnding(commissionId.value, endingType.value)
})

const gradeConfig = computed(() => {
  if (!currentScore.value) return null
  return gameStore.getGradeConfig(currentScore.value.grade)
})

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

function getChoiceIcon(type: string) {
  switch (type) {
    case 'good': return CheckCircle
    case 'neutral': return MinusCircle
    case 'bad': return XCircle
    default: return MinusCircle
  }
}

function getChoiceColor(type: string) {
  switch (type) {
    case 'good': return 'text-green-500'
    case 'neutral': return 'text-amber-500'
    case 'bad': return 'text-rose-500'
    default: return 'text-stone-500'
  }
}

onMounted(() => {
  gameStore.loadSavedGame()
  
  newlyUnlockedAchievements.value = gameStore.checkAndUnlockAchievements()
  if (newlyUnlockedAchievements.value.length > 0) {
    setTimeout(() => {
      showAchievements.value = true
    }, 2000)
  }
  
  setTimeout(() => {
    showStory.value = true
  }, 600)
  
  setTimeout(() => {
    showScore.value = true
  }, 1500)
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

          <div class="bg-amber-50/80 backdrop-blur-sm rounded-xl p-4 border border-amber-200 mb-6">
            <p class="text-stone-600 text-sm">
              <span class="font-medium">委托人：</span>
              {{ commission?.clientAvatar }} {{ commission?.clientName }}
            </p>
            <p class="text-stone-500 text-sm mt-1">
              <span class="font-medium">修复物品：</span>
              {{ commission?.item.image }} {{ commission?.item.name }}
            </p>
          </div>

          <Transition name="fade-up">
            <div v-if="showScore && currentScore" class="mb-8">
              <div class="text-center mb-6">
                <div class="inline-flex items-center gap-3 px-6 py-3 rounded-2xl shadow-lg" :class="gradeConfig?.bgColor || 'bg-stone-50'">
                  <Award class="w-8 h-8" :class="gradeConfig?.color || 'text-stone-600'" />
                  <div class="text-left">
                    <div class="text-xs text-stone-500">综合评价</div>
                    <div class="flex items-center gap-3">
                      <span class="text-4xl font-bold" :class="gradeConfig?.color || 'text-stone-600'">
                        {{ currentScore.grade }}
                      </span>
                      <div>
                        <div class="text-2xl font-bold text-stone-800">
                          {{ currentScore.overallPercentage }}<span class="text-lg text-stone-500">分</span>
                        </div>
                        <div class="text-xs text-stone-500">{{ gradeConfig?.label }}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <p class="text-sm text-stone-500 mt-2">{{ gradeConfig?.description }}</p>
              </div>

              <div class="grid grid-cols-5 gap-2 mb-6">
                <div
                  v-for="dim in currentScore.dimensions"
                  :key="dim.dimension"
                  class="text-center"
                >
                  <div class="text-2xl mb-1">{{ dim.icon }}</div>
                  <div class="text-xs text-stone-600 mb-1 font-medium">{{ dim.name }}</div>
                  <div class="h-2 bg-stone-200 rounded-full overflow-hidden mb-1">
                    <div
                      class="h-full rounded-full transition-all duration-1000 ease-out"
                      :style="{ width: `${dim.percentage}%` }"
                      :class="[
                        dim.percentage >= 80 ? 'bg-green-500' :
                        dim.percentage >= 60 ? 'bg-amber-500' :
                        dim.percentage >= 40 ? 'bg-orange-500' : 'bg-rose-500'
                      ]"
                    />
                  </div>
                  <div class="text-xs font-bold" :class="dim.color">
                    {{ dim.score }}
                  </div>
                </div>
              </div>

              <div class="bg-stone-50/80 backdrop-blur-sm rounded-xl p-4 border border-stone-200">
                <div class="flex items-center gap-2 mb-3">
                  <TrendingUp class="w-4 h-4 text-stone-500" />
                  <span class="text-sm font-medium text-stone-700">修复统计</span>
                </div>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div class="flex items-center gap-2">
                    <Star class="w-4 h-4 text-amber-500" />
                    <span class="text-stone-500">选择统计：</span>
                    <span class="text-green-600 font-medium">
                      {{ currentScore.choiceScoreBreakdown.goodChoices }}优
                    </span>
                    <span class="text-amber-600 font-medium">
                      {{ currentScore.choiceScoreBreakdown.neutralChoices }}中
                    </span>
                    <span class="text-rose-600 font-medium">
                      {{ currentScore.choiceScoreBreakdown.badChoices }}差
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <Star class="w-4 h-4 text-blue-500" />
                    <span class="text-stone-500">线索收集：</span>
                    <span class="font-medium">{{ currentScore.metadata.clueCollected }}/{{ currentScore.metadata.clueTotal }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <Star class="w-4 h-4 text-purple-500" />
                    <span class="text-stone-500">关联发现：</span>
                    <span class="font-medium">{{ currentScore.metadata.connectionsDiscovered }}/{{ currentScore.metadata.connectionsTotal }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <Star class="w-4 h-4 text-green-500" />
                    <span class="text-stone-500">难度模式：</span>
                    <span class="font-medium">{{ 
                      currentScore.metadata.difficultyLevel === 'assisted' ? '辅助' :
                      currentScore.metadata.difficultyLevel === 'challenging' ? '挑战' : '标准'
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </Transition>

          <Transition name="slide-up">
            <div v-if="showAchievements && newlyUnlockedAchievements.length > 0" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div class="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <div class="text-center mb-6">
                  <div class="text-5xl mb-3 animate-bounce">🏆</div>
                  <h3 class="text-xl font-bold text-stone-800 mb-1">成就解锁！</h3>
                  <p class="text-stone-500 text-sm">恭喜你获得了新的成就</p>
                </div>
                <div class="space-y-3 mb-6">
                  <div
                    v-for="ach in newlyUnlockedAchievements"
                    :key="ach.id"
                    class="flex items-center gap-4 p-3 rounded-xl border-2 animate-fade-in"
                    :class="gameStore.getRarityBgColor(ach.rarity)"
                  >
                    <div class="text-3xl">{{ ach.icon }}</div>
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-stone-800">{{ ach.name }}</span>
                        <span class="text-xs px-2 py-0.5 rounded-full" :class="[
                          gameStore.getRarityColor(ach.rarity),
                          ach.rarity === 'legendary' ? 'bg-amber-100' :
                          ach.rarity === 'epic' ? 'bg-purple-100' :
                          ach.rarity === 'rare' ? 'bg-blue-100' : 'bg-stone-100'
                        ]">
                          {{ gameStore.getRarityLabel(ach.rarity) }}
                        </span>
                      </div>
                      <p class="text-sm text-stone-500">{{ ach.description }}</p>
                    </div>
                  </div>
                </div>
                <button
                  class="w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
                  @click="showAchievements = false"
                >
                  太棒了！
                </button>
              </div>
            </div>
          </Transition>

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

.slide-up-enter-active {
  transition: all 0.4s ease-out;
}

.slide-up-leave-active {
  transition: all 0.3s ease-in;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(50px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
