<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Lock, CheckCircle, Clock, ChevronRight } from 'lucide-vue-next'
import CommissionCard from '../components/CommissionCard.vue'
import { useGameStore } from '../stores/game'
import { cn } from '../lib/utils'
import type { Commission } from '../types'

const router = useRouter()
const gameStore = useGameStore()

const selectedChapterId = ref<string | null>(null)

const chapters = computed(() => gameStore.getAllChapters())

const selectedChapter = computed(() => {
  if (!selectedChapterId.value) return null
  return gameStore.getChapterById(selectedChapterId.value)
})

const commissionsForSelectedChapter = computed(() => {
  if (!selectedChapterId.value) return []
  return gameStore.getCommissionsByChapter(selectedChapterId.value)
})

const chapterProgress = computed(() => {
  return chapters.value.map(chapter => {
    const chapterCommissions = gameStore.getCommissionsByChapter(chapter.id)
    const completed = chapterCommissions.filter(c => 
      gameStore.getCommissionStatus(c.id) === 'completed'
    ).length
    const total = chapterCommissions.length
    return {
      chapterId: chapter.id,
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  })
})

function getChapterProgress(chapterId: string) {
  return chapterProgress.value.find(p => p.chapterId === chapterId) || { completed: 0, total: 0, percentage: 0 }
}

function handleChapterClick(chapterId: string) {
  const chapter = gameStore.getChapterById(chapterId)
  if (!chapter) return
  
  if (!chapter.isUnlocked) {
    return
  }
  
  selectedChapterId.value = selectedChapterId.value === chapterId ? null : chapterId
}

function handleLockedCommissionClick(commission: Commission) {
  const prereqNames = commission.prerequisiteCommissionIds
    .map(id => gameStore.getCommissionById(id)?.title)
    .filter(Boolean)
    .join('、')
  alert(`此委托需要先完成：${prereqNames}`)
}

function goBack() {
  router.push('/')
}

function goToCommissions() {
  router.push('/commissions')
}

onMounted(() => {
  gameStore.loadSavedGame()
  if (chapters.value.length > 0) {
    const firstUnlocked = chapters.value.find(c => c.isUnlocked)
    if (firstUnlocked) {
      selectedChapterId.value = firstUnlocked.id
    }
  }
})

const themeColors: Record<string, string> = {
  warmth: 'from-amber-400 to-orange-500',
  nostalgia: 'from-rose-400 to-pink-500',
  time: 'from-blue-400 to-indigo-500'
}
</script>

<template>
  <div class="min-h-screen bg-stone-100 py-8 px-4 roadmap-bg">
    <div class="max-w-6xl mx-auto">
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
          @click="goToCommissions"
        >
          <span>委托列表</span>
          <ChevronRight class="w-5 h-5" />
        </button>
      </div>

      <div class="text-center mb-12">
        <h1 class="text-4xl font-serif font-bold text-stone-800 mb-3">修复之路</h1>
        <p class="text-stone-500 max-w-md mx-auto">
          每完成一个委托，都会解锁新的故事。循着记忆的路线，一步步前行吧。
        </p>
      </div>

      <div class="mb-12">
        <div class="relative">
          <div class="absolute left-1/2 top-0 bottom-0 w-1 bg-stone-200 -translate-x-1/2" />
          
          <div class="relative space-y-8">
            <div
              v-for="(chapter, index) in chapters"
              :key="chapter.id"
              class="relative"
            >
              <div class="absolute left-1/2 top-8 -translate-x-1/2 z-10">
                <div
                  class="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg border-4 transition-all duration-300"
                  :class="[
                    chapter.isUnlocked 
                      ? `bg-gradient-to-br ${themeColors[chapter.theme] || 'from-amber-400 to-orange-500'} border-white cursor-pointer hover:scale-110` 
                      : 'bg-stone-300 border-stone-200 cursor-not-allowed',
                    selectedChapterId === chapter.id ? 'ring-4 ring-amber-300 ring-offset-2' : ''
                  ]"
                  @click="handleChapterClick(chapter.id)"
                >
                  <span v-if="chapter.isUnlocked">{{ chapter.icon }}</span>
                  <Lock v-else class="w-6 h-6 text-stone-500" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-8 items-start">
                <div
                  :class="[
                    'transition-all duration-300',
                    index % 2 === 0 ? 'text-right pr-16' : 'col-start-2 text-left pl-16'
                  ]"
                >
                  <div
                    class="bg-white rounded-xl p-6 shadow-md border-2 transition-all duration-300 cursor-pointer"
                    :class="[
                      chapter.isUnlocked 
                        ? 'border-amber-200 hover:border-amber-400 hover:shadow-lg' 
                        : 'border-stone-200 opacity-60',
                      selectedChapterId === chapter.id ? 'border-amber-400 shadow-lg' : ''
                    ]"
                    @click="handleChapterClick(chapter.id)"
                  >
                    <div class="flex items-center justify-between mb-3" :class="{ 'flex-row-reverse': index % 2 !== 0 }">
                      <span class="text-sm font-medium text-amber-600">{{ chapter.subtitle }}</span>
                      <div class="flex items-center gap-2">
                        <CheckCircle 
                          v-if="getChapterProgress(chapter.id).percentage === 100" 
                          class="w-5 h-5 text-green-500" 
                        />
                        <Clock 
                          v-else-if="chapter.isUnlocked && getChapterProgress(chapter.id).percentage > 0" 
                          class="w-5 h-5 text-amber-500" 
                        />
                        <Lock 
                          v-else-if="!chapter.isUnlocked" 
                          class="w-5 h-5 text-stone-400" 
                        />
                      </div>
                    </div>
                    
                    <h3 class="text-xl font-serif font-bold text-stone-800 mb-2">
                      {{ chapter.title }}
                    </h3>
                    <p class="text-sm text-stone-500 mb-4">
                      {{ chapter.description }}
                    </p>

                    <div class="space-y-2">
                      <div class="flex items-center justify-between text-xs">
                        <span class="text-stone-500">进度</span>
                        <span class="font-medium text-stone-700">
                          {{ getChapterProgress(chapter.id).completed }} / {{ getChapterProgress(chapter.id).total }}
                        </span>
                      </div>
                      <div class="h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          class="h-full rounded-full transition-all duration-500"
                          :class="[
                            chapter.isUnlocked
                              ? `bg-gradient-to-r ${themeColors[chapter.theme] || 'from-amber-400 to-orange-500'}`
                              : 'bg-stone-300'
                          ]"
                          :style="{ width: `${getChapterProgress(chapter.id).percentage}%` }"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedChapter" class="mt-16">
        <div class="flex items-center gap-4 mb-6">
          <div
            class="w-12 h-12 rounded-full flex items-center justify-center text-2xl text-white"
            :class="`bg-gradient-to-br ${themeColors[selectedChapter.theme] || 'from-amber-400 to-orange-500'}`"
          >
            {{ selectedChapter.icon }}
          </div>
          <div>
            <h2 class="text-2xl font-serif font-bold text-stone-800">
              {{ selectedChapter.title }}
            </h2>
            <p class="text-stone-500 text-sm">{{ selectedChapter.subtitle }} · 本章委托</p>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <CommissionCard
            v-for="commission in commissionsForSelectedChapter"
            :key="commission.id"
            :commission="commission"
            @locked-click="handleLockedCommissionClick"
          />
        </div>

        <div v-if="commissionsForSelectedChapter.length === 0" class="text-center py-16">
          <div class="text-6xl mb-4">📋</div>
          <p class="text-stone-500">本章暂无委托</p>
        </div>
      </div>

      <div class="mt-12 text-center">
        <div class="inline-flex items-center gap-4 px-6 py-3 bg-amber-50 rounded-xl border border-amber-200">
          <div class="text-2xl">📊</div>
          <div class="text-left">
            <div class="text-sm text-stone-500">总体修复进度</div>
            <div class="text-lg font-bold text-stone-800">
              {{ gameStore.completionProgress.completed }} / {{ gameStore.completionProgress.total }}
              <span class="text-sm font-normal text-stone-500 ml-2">
                ({{ gameStore.completionProgress.percentage }}%)
              </span>
            </div>
          </div>
          <div class="w-32 h-2 bg-stone-200 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
              :style="{ width: `${gameStore.completionProgress.percentage}%` }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.roadmap-bg {
  background-color: #f5efe0;
  background-image: 
    url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E"),
    radial-gradient(ellipse at 20% 0%, rgba(217, 119, 6, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(161, 98, 7, 0.06) 0%, transparent 50%);
}
</style>
