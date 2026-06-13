<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Trophy, Lock, Star, BookOpen } from 'lucide-vue-next'
import { useGameStore } from '../stores/game'
import type { Ending, Commission } from '../types'

const router = useRouter()
const gameStore = useGameStore()

const allCommissions = computed(() => gameStore.getAllCommissions())
const allEndings = computed(() => gameStore.getAllEndings())
const progress = computed(() => gameStore.completionProgress)

const unlockedEndingIds = computed(() => gameStore.state.unlockedEndings)

function isEndingUnlocked(endingId: string): boolean {
  return unlockedEndingIds.value.includes(endingId)
}

function isCommissionCompleted(commissionId: string): boolean {
  return gameStore.state.completedCommissions.includes(commissionId)
}

function getEndingsForCommission(commissionId: string): Ending[] {
  return allEndings.value.filter(e => e.commissionId === commissionId)
}

function getUnlockedEndingForCommission(commissionId: string): Ending | undefined {
  return allEndings.value.find(e =>
    e.commissionId === commissionId && isEndingUnlocked(e.id)
  )
}

const endingTypeConfig: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  good: { label: '完美', icon: '✨', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
  neutral: { label: '温暖', icon: '🌿', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
  bad: { label: '遗憾', icon: '🌧️', color: 'text-stone-500', bgColor: 'bg-stone-50 border-stone-200' }
}

function goBack() {
  router.push('/')
}

function viewEnding(ending: Ending) {
  if (!isEndingUnlocked(ending.id)) return
  router.push(`/ending/${ending.commissionId}/${ending.type}`)
}

onMounted(() => {
  gameStore.loadSavedGame()
})
</script>

<template>
  <div class="min-h-screen gallery-page py-8 px-4">
    <div class="max-w-5xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <button
          class="flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5" />
          <span>返回店铺</span>
        </button>
        <div class="flex items-center gap-2 text-amber-600">
          <Trophy class="w-5 h-5" />
          <span class="font-medium">
            {{ progress.completed }} / {{ progress.total }} 已修复
          </span>
        </div>
      </div>

      <div class="text-center mb-10">
        <div class="text-5xl mb-3">🏛️</div>
        <h1 class="text-3xl font-serif font-bold text-stone-800 mb-2">历史陈列室</h1>
        <p class="text-stone-500">在这里回顾你修复过的每一件旧物和解锁的结局</p>
      </div>

      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="commission in allCommissions"
          :key="commission.id"
          class="rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:shadow-lg"
          :class="isCommissionCompleted(commission.id) ? 'bg-amber-50 border-amber-200' : 'bg-stone-50 border-stone-200 opacity-70'"
        >
          <div
            class="p-5"
            :class="!isCommissionCompleted(commission.id) ? 'blur-[1px]' : ''"
          >
            <div class="flex items-start gap-4 mb-4">
              <div class="text-4xl">{{ commission.item.image }}</div>
              <div class="flex-1 min-w-0">
                <h3 class="font-serif font-bold text-stone-800 text-lg truncate">
                  {{ commission.title }}
                </h3>
                <p class="text-sm text-stone-500">
                  {{ commission.clientAvatar }} {{ commission.clientName }}
                </p>
              </div>
              <div v-if="isCommissionCompleted(commission.id)" class="flex items-center gap-1 text-amber-500">
                <Star class="w-4 h-4 fill-amber-500" />
              </div>
            </div>

            <div class="space-y-2">
              <div class="text-xs text-stone-400 flex items-center gap-1 mb-2">
                <BookOpen class="w-3 h-3" />
                <span>结局一览</span>
              </div>
              <div
                v-for="ending in getEndingsForCommission(commission.id)"
                :key="ending.id"
                class="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-200"
                :class="[
                  isEndingUnlocked(ending.id)
                    ? `${endingTypeConfig[ending.type].bgColor} border hover:shadow-md hover:-translate-y-0.5`
                    : 'bg-stone-100 border border-stone-200 cursor-default'
                ]"
                @click="viewEnding(ending)"
              >
                <span class="text-lg">
                  {{ isEndingUnlocked(ending.id) ? endingTypeConfig[ending.type].icon : '🔒' }}
                </span>
                <div class="flex-1 min-w-0">
                  <div
                    :class="['text-sm font-medium truncate', isEndingUnlocked(ending.id) ? endingTypeConfig[ending.type].color : 'text-stone-400']"
                  >
                    {{ isEndingUnlocked(ending.id) ? ending.title : '未解锁' }}
                  </div>
                  <div class="text-xs text-stone-400">
                    {{ endingTypeConfig[ending.type].label }}结局
                  </div>
                </div>
                <Lock v-if="!isEndingUnlocked(ending.id)" class="w-3 h-3 text-stone-300" />
              </div>
            </div>
          </div>

          <div
            v-if="!isCommissionCompleted(commission.id)"
            class="px-5 py-3 bg-stone-100/80 border-t border-stone-200 text-center"
          >
            <span class="text-sm text-stone-400">尚未完成修复</span>
          </div>
        </div>
      </div>

      <div class="mt-12 text-center">
        <div class="inline-flex items-center gap-6 px-8 py-4 bg-stone-50/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm">
          <div class="text-center">
            <div class="text-2xl font-bold text-stone-800">{{ progress.completed }}</div>
            <div class="text-xs text-stone-400">已修复</div>
          </div>
          <div class="w-px h-10 bg-stone-200" />
          <div class="text-center">
            <div class="text-2xl font-bold text-stone-800">{{ unlockedEndingIds.length }}</div>
            <div class="text-xs text-stone-400">结局解锁</div>
          </div>
          <div class="w-px h-10 bg-stone-200" />
          <div class="text-center">
            <div class="text-2xl font-bold text-stone-800">{{ allEndings.length }}</div>
            <div class="text-xs text-stone-400">结局总数</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gallery-page {
  background-color: #f5efe0;
  background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
}
</style>
