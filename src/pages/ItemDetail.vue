<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Lightbulb, Search, ChevronRight, X } from 'lucide-vue-next'
import { useGameStore } from '../stores/game'
import type { Hotspot } from '../types'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const selectedHotspot = ref<Hotspot | null>(null)
const showCluePanel = ref(false)
const foundClue = ref<{ id: string; title: string } | null>(null)

const commissionId = computed(() => route.params.id as string)

const commission = computed(() => {
  return gameStore.getCommissionById(commissionId.value)
})

const item = computed(() => commission.value?.item)

const discoveredHotspots = computed(() => {
  return gameStore.state.collectedClues.filter(clueId => {
    const clue = gameStore.getClueById(clueId)
    return clue?.commissionId === commissionId.value
  })
})

const progress = computed(() => {
  if (!item.value) return { current: 0, total: 0, percentage: 0 }
  const total = item.value.hotspots.length
  const current = discoveredHotspots.value.length
  return { current, total, percentage: total > 0 ? Math.round((current / total) * 100) : 0 }
})

function isHotspotDiscovered(hotspot: Hotspot): boolean {
  if (!hotspot.clueId) return false
  return gameStore.state.collectedClues.includes(hotspot.clueId)
}

function handleHotspotClick(hotspot: Hotspot) {
  selectedHotspot.value = hotspot

  if (hotspot.clueId && !gameStore.state.collectedClues.includes(hotspot.clueId)) {
    gameStore.collectClue(hotspot.clueId)
    const clue = gameStore.getClueById(hotspot.clueId)
    if (clue) {
      foundClue.value = { id: clue.id, title: clue.title }
      setTimeout(() => {
        foundClue.value = null
      }, 2500)
    }
  }
}

function closeModal() {
  selectedHotspot.value = null
}

function goBack() {
  router.push('/commissions')
}

function goToDeduction() {
  gameStore.setCurrentStep('deduction')
  router.push(`/deduction/${commissionId.value}`)
}

function getHotspotStyle(hotspot: Hotspot) {
  return {
    left: `${hotspot.x}%`,
    top: `${hotspot.y}%`,
    width: `${hotspot.width}%`,
    height: `${hotspot.height}%`
  }
}

onMounted(() => {
  gameStore.loadSavedGame()
  if (!commission.value) {
    router.push('/commissions')
  } else if (!gameStore.state.currentCommissionId) {
    gameStore.selectCommission(commissionId.value)
  }
})
</script>

<template>
  <div class="min-h-screen py-8 px-4 paper-texture">
    <div class="max-w-5xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <button
          class="flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors font-serif"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5" />
          <span>返回委托列表</span>
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2 bg-amber-100/80 text-amber-800 rounded-lg hover:bg-amber-200/80 transition-colors font-serif text-sm"
          @click="showCluePanel = !showCluePanel"
        >
          <Lightbulb class="w-4 h-4" />
          <span>线索 ({{ progress.current }}/{{ progress.total }})</span>
        </button>
      </div>

      <div class="text-center mb-6">
        <h1 class="text-2xl font-display font-bold text-stone-800 mb-1 text-shadow-warm">
          {{ commission?.title }}
        </h1>
        <p class="text-stone-500 text-sm font-serif">
          委托人：{{ commission?.clientAvatar }} {{ commission?.clientName }}
        </p>
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <div class="card-warm p-6 relative overflow-hidden spotlight">
            <div class="absolute top-4 left-4 flex items-center gap-2 text-xs text-stone-500 bg-white/80 px-3 py-1.5 rounded-full backdrop-blur-sm z-10">
              <Search class="w-3 h-3" />
              <span>点击发光处检查细节</span>
            </div>

            <div class="relative aspect-[4/3] bg-gradient-to-br from-amber-50/50 to-stone-100/50 rounded-xl flex items-center justify-center mt-8 overflow-hidden">
              <div class="absolute inset-0 spotlight-radial" />

              <div class="text-9xl relative z-10 animate-float-gentle filter drop-shadow-lg">
                {{ item?.image }}
              </div>

              <div
                v-for="hotspot in item?.hotspots"
                :key="hotspot.id"
                class="absolute cursor-pointer group"
                :style="getHotspotStyle(hotspot)"
                @click="handleHotspotClick(hotspot)"
              >
                <div
                  :class="[
                    'absolute inset-0 rounded-lg transition-all duration-300',
                    isHotspotDiscovered(hotspot)
                      ? 'bg-green-400/15 border-2 border-green-500/40'
                      : 'bg-amber-400/20 border-2 border-amber-400/60 animate-pulse-soft group-hover:bg-amber-400/40'
                  ]"
                />
                <div
                  v-if="!isHotspotDiscovered(hotspot)"
                  class="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse-soft"
                />
                <div
                  v-if="isHotspotDiscovered(hotspot)"
                  class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                >
                  <span class="text-white text-xs leading-none">✓</span>
                </div>
              </div>
            </div>

            <div class="mt-6">
              <h3 class="text-lg font-serif font-bold text-stone-800 mb-2">
                {{ item?.name }}
              </h3>
              <p class="text-stone-600 text-sm leading-relaxed font-serif">
                {{ item?.description }}
              </p>
            </div>

            <div class="mt-4 stitch-border">
              <div class="flex items-center justify-between text-xs text-stone-500 mb-2">
                <span class="font-serif">检视进度</span>
                <span>{{ progress.current }}/{{ progress.total }}</span>
              </div>
              <div class="h-2 bg-stone-200/60 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{
                    width: `${progress.percentage}%`,
                    background: 'linear-gradient(90deg, var(--color-gold-light), var(--color-primary))'
                  }"
                />
              </div>
            </div>
          </div>

          <div class="mt-6 flex justify-end">
            <button
              :class="[
                'flex items-center gap-2 px-6 py-3 rounded-xl font-serif font-medium transition-all duration-300',
                gameStore.canStartRepair()
                  ? 'btn-primary'
                  : 'bg-stone-200/60 text-stone-400 cursor-not-allowed rounded-xl'
              ]"
              :disabled="!gameStore.canStartRepair()"
              @click="goToDeduction"
            >
              <span>前往推理板</span>
              <ChevronRight class="w-5 h-5" />
            </button>
          </div>
        </div>

        <div
          :class="[
            'lg:block transition-all duration-300',
            showCluePanel ? 'block' : 'hidden'
          ]"
        >
          <div class="card-warm p-5 sticky top-8">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-serif font-bold text-stone-800 flex items-center gap-2">
                <Lightbulb class="w-5 h-5 text-amber-500" />
                线索笔记
              </h3>
              <button
                class="lg:hidden text-stone-400 hover:text-stone-600"
                @click="showCluePanel = false"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="space-y-3 max-h-96 overflow-y-auto">
              <div
                v-for="clueId in discoveredHotspots"
                :key="clueId"
                class="p-3 note-paper rounded-r-lg"
              >
                <div class="flex items-start gap-2">
                  <span class="text-lg">{{ gameStore.getClueById(clueId)?.icon }}</span>
                  <div class="flex-1 min-w-0">
                    <h4 class="font-medium text-stone-800 text-sm font-serif">
                      {{ gameStore.getClueById(clueId)?.title }}
                    </h4>
                    <p class="text-xs text-stone-500 mt-1 line-clamp-3 font-serif">
                      {{ gameStore.getClueById(clueId)?.content }}
                    </p>
                  </div>
                </div>
              </div>

              <div
                v-if="discoveredHotspots.length === 0"
                class="text-center py-8 text-stone-400"
              >
                <div class="text-3xl mb-2">🔍</div>
                <p class="text-sm font-serif">还没有发现线索</p>
                <p class="text-xs mt-1">点击物品上的发光区域探索</p>
              </div>
            </div>

            <div class="mt-4 pt-4 border-t border-amber-200/30">
              <p class="text-xs text-stone-400 text-center font-serif">
                收集至少一半线索才能开始推理
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="foundClue"
          class="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div class="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in-up">
            <span class="text-2xl">💡</span>
            <div>
              <div class="text-sm opacity-80">发现新线索！</div>
              <div class="font-medium font-serif">{{ foundClue.title }}</div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="selectedHotspot"
          class="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          @click.self="closeModal"
        >
          <div class="card-warm p-6 max-w-md w-full shadow-2xl animate-scale-in">
            <div class="flex items-start justify-between mb-4">
              <h3 class="text-lg font-serif font-bold text-stone-800">
                {{ selectedHotspot.name }}
              </h3>
              <button
                class="text-stone-400 hover:text-stone-600 p-1"
                @click="closeModal"
              >
                <X class="w-5 h-5" />
              </button>
            </div>
            <p class="text-stone-600 leading-relaxed font-serif">
              {{ selectedHotspot.description }}
            </p>
            <div v-if="selectedHotspot.clueId" class="mt-4 pt-4 border-t border-amber-200/30">
              <div class="flex items-center gap-2 text-green-600 font-serif">
                <span>✓</span>
                <span class="text-sm">已记录到线索笔记</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.spotlight-radial {
  background: radial-gradient(ellipse at center, rgba(212, 175, 55, 0.1) 0%, transparent 60%);
}
</style>
