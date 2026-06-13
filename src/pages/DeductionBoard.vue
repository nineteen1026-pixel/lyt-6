<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Link, Lightbulb, ChevronRight, Sparkles, X, Lock } from 'lucide-vue-next'
import { useGameStore } from '../stores/game'
import type { Clue, ClueConnection } from '../types'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const selectedClue1 = ref<Clue | null>(null)
const selectedClue2 = ref<Clue | null>(null)
const showConclusion = ref<ClueConnection | null>(null)
const showNoConnection = ref(false)

const commissionId = computed(() => route.params.id as string)

const commission = computed(() => {
  return gameStore.getCommissionById(commissionId.value)
})

const collectedClues = computed(() => {
  return gameStore.collectedCluesForCurrent
})

const allConnections = computed(() => {
  return gameStore.getConnectionsForCommission(commissionId.value)
})

const discoveredConnections = computed(() => {
  return allConnections.value.filter(conn =>
    gameStore.state.discoveredConnections.includes(conn.id)
  )
})

const progress = computed(() => {
  const total = allConnections.value.length
  const discovered = discoveredConnections.value.length
  return { total, discovered, percentage: total > 0 ? Math.round((discovered / total) * 100) : 0 }
})

const repairUnlockProgress = computed(() => {
  if (!commissionId.value) return { current: 0, required: 1, description: '', unlocked: false }
  const progress = gameStore.getStepUnlockProgress(commissionId.value, 'repair')
  return { ...progress, unlocked: gameStore.canAccessStep(commissionId.value, 'repair') }
})

function selectClue(clue: Clue) {
  if (selectedClue1.value?.id === clue.id) {
    selectedClue1.value = null
    return
  }
  if (selectedClue2.value?.id === clue.id) {
    selectedClue2.value = null
    return
  }

  if (!selectedClue1.value) {
    selectedClue1.value = clue
  } else if (!selectedClue2.value) {
    selectedClue2.value = clue
    checkConnection()
  } else {
    selectedClue1.value = clue
    selectedClue2.value = null
  }
}

function checkConnection() {
  if (!selectedClue1.value || !selectedClue2.value) return

  const connection = allConnections.value.find(conn =>
    (conn.fromClueId === selectedClue1.value!.id && conn.toClueId === selectedClue2.value!.id) ||
    (conn.fromClueId === selectedClue2.value!.id && conn.toClueId === selectedClue1.value!.id)
  )

  if (connection) {
    if (!gameStore.state.discoveredConnections.includes(connection.id)) {
      gameStore.discoverConnection(connection.id)
    }
    showConclusion.value = connection
  } else {
    showNoConnection.value = true
    setTimeout(() => {
      showNoConnection.value = false
      selectedClue1.value = null
      selectedClue2.value = null
    }, 1500)
  }
}

function isClueSelected(clueId: string): boolean {
  return selectedClue1.value?.id === clueId || selectedClue2.value?.id === clueId
}

function closeConclusion() {
  showConclusion.value = null
  selectedClue1.value = null
  selectedClue2.value = null
}

function goBack() {
  router.push(`/commission/${commissionId.value}`)
}

function goToRepair() {
  gameStore.setCurrentStep('repair')
  router.push(`/repair/${commissionId.value}`)
}

const categoryColors: Record<string, string> = {
  object: 'bg-blue-50 border-blue-200 text-blue-700',
  memory: 'bg-purple-50 border-purple-200 text-purple-700',
  emotion: 'bg-rose-50 border-rose-200 text-rose-700',
  time: 'bg-amber-50 border-amber-200 text-amber-700'
}

const categoryLabels: Record<string, string> = {
  object: '物品',
  memory: '记忆',
  emotion: '情感',
  time: '时间'
}

onMounted(() => {
  gameStore.loadSavedGame()
  if (!commission.value) {
    router.push('/commissions')
  }
})
</script>

<template>
  <div class="min-h-screen py-8 px-4 paper-texture">
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <button
          class="flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors font-serif"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5" />
          <span>返回旧物检视</span>
        </button>
        <div class="text-sm text-stone-500 font-serif">
          已发现关联：{{ progress.discovered }}/{{ progress.total }}
        </div>
      </div>

      <div class="text-center mb-8">
        <h1 class="text-2xl font-display font-bold text-stone-800 mb-2 text-shadow-warm">
          线索推理板
        </h1>
        <p class="text-stone-500 text-sm font-serif">
          尝试将相关的线索连接起来，发现隐藏的真相
        </p>
        <div class="divider-ornament mt-3" />
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <div class="card-warm p-6 min-h-96">
            <div class="flex items-center gap-2 mb-6">
              <Lightbulb class="w-5 h-5 text-amber-500" />
              <h3 class="font-serif font-bold text-stone-800">收集到的线索</h3>
              <span class="text-xs text-stone-400">（点击两个线索尝试关联）</span>
            </div>

            <div class="grid sm:grid-cols-2 gap-4">
              <div
                v-for="clue in collectedClues"
                :key="clue.id"
                :class="[
                  'p-4 rounded-xl border-2 cursor-pointer transition-all duration-300',
                  isClueSelected(clue.id)
                    ? 'border-amber-500 bg-amber-50 shadow-lg scale-[1.03]'
                    : 'border-stone-200/60 bg-white/80 hover:border-amber-300/60 hover:shadow-md'
                ]"
                @click="selectClue(clue)"
              >
                <div class="flex items-start gap-3">
                  <span class="text-3xl flex-shrink-0">{{ clue.icon }}</span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <h4 class="font-medium text-stone-800 text-sm font-serif">{{ clue.title }}</h4>
                      <span
                        :class="[
                          'text-xs px-2 py-0.5 rounded-full border',
                          categoryColors[clue.category]
                        ]"
                      >
                        {{ categoryLabels[clue.category] }}
                      </span>
                    </div>
                    <p class="text-xs text-stone-500 line-clamp-2 font-serif">
                      {{ clue.content }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="collectedClues.length === 0"
              class="text-center py-16 text-stone-400"
            >
              <div class="text-5xl mb-4">🔍</div>
              <p class="font-serif">还没有收集到线索</p>
              <p class="text-sm mt-1">先去旧物那里探索吧</p>
            </div>

            <div v-if="showNoConnection" class="mt-4 text-center text-rose-500 text-sm font-serif animate-shake">
              这两条线索似乎没有关联...
            </div>
          </div>

          <div class="mt-6 flex justify-end">
            <div class="flex flex-col items-end gap-2">
              <div v-if="!repairUnlockProgress.unlocked" class="flex items-center gap-2 text-sm text-stone-500 bg-stone-100 px-4 py-2 rounded-lg">
                <Lock class="w-4 h-4" />
                <span>{{ repairUnlockProgress.description }}</span>
              </div>
              <button
                :class="[
                  'flex items-center gap-2 px-6 py-3 rounded-xl font-serif font-medium transition-all duration-300',
                  repairUnlockProgress.unlocked
                    ? 'btn-primary'
                    : 'bg-stone-200/60 text-stone-400 cursor-not-allowed rounded-xl'
                ]"
                :disabled="!repairUnlockProgress.unlocked"
                @click="goToRepair"
              >
                <span>开始修复</span>
                <ChevronRight class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div>
          <div class="card-warm p-5 sticky top-8">
            <div class="flex items-center gap-2 mb-4">
              <Link class="w-5 h-5 text-green-600" />
              <h3 class="font-serif font-bold text-stone-800">已发现的关联</h3>
            </div>

            <div class="space-y-4 max-h-[500px] overflow-y-auto">
              <div
                v-for="conn in discoveredConnections"
                :key="conn.id"
                class="p-4 bg-green-50/60 rounded-xl border border-green-200/50"
              >
                <div class="flex items-center gap-2 mb-2">
                  <Sparkles class="w-4 h-4 text-green-600" />
                  <span class="text-xs font-medium text-green-700 font-serif">关联发现</span>
                </div>
                <p class="text-sm text-stone-700 leading-relaxed mb-3 font-serif">
                  {{ conn.conclusion }}
                </p>
                <div class="pt-3 border-t border-green-200/40">
                  <div class="text-xs text-green-600 font-medium mb-1">💡 修复提示</div>
                  <p class="text-xs text-stone-600 font-serif">{{ conn.repairHint }}</p>
                </div>
              </div>

              <div
                v-if="discoveredConnections.length === 0"
                class="text-center py-8 text-stone-400"
              >
                <div class="text-3xl mb-2">🔗</div>
                <p class="text-sm font-serif">还没有发现关联</p>
                <p class="text-xs mt-1">试着把相关的线索连起来</p>
              </div>
            </div>

            <div class="mt-4 pt-4 border-t border-amber-200/20">
              <div class="h-2 bg-stone-200/60 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{
                    width: `${progress.percentage}%`,
                    background: 'linear-gradient(90deg, var(--color-green), #4ade80)'
                  }"
                />
              </div>
              <p v-if="!repairUnlockProgress.unlocked" class="text-xs text-stone-400 text-center mt-2 font-serif">
                {{ repairUnlockProgress.description }} 即可开始修复
              </p>
              <p v-else class="text-xs text-green-600 text-center mt-2 font-serif">
                修复已解锁，可以开始修复了！
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showConclusion"
          class="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          @click.self="closeConclusion"
        >
          <div class="card-warm p-6 max-w-md w-full shadow-2xl animate-scale-in">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-2">
                <Sparkles class="w-6 h-6 text-amber-500" />
                <h3 class="text-lg font-serif font-bold text-stone-800">
                  发现关联！
                </h3>
              </div>
              <button
                class="text-stone-400 hover:text-stone-600 p-1"
                @click="closeConclusion"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="flex items-center gap-2 mb-4 text-sm text-stone-500 font-serif">
              <span class="px-2 py-1 bg-amber-100/80 rounded text-amber-700">
                {{ gameStore.getClueById(showConclusion.fromClueId)?.title }}
              </span>
              <span class="text-amber-400">⟶</span>
              <span class="px-2 py-1 bg-amber-100/80 rounded text-amber-700">
                {{ gameStore.getClueById(showConclusion.toClueId)?.title }}
              </span>
            </div>

            <div class="note-paper p-4 rounded-r-lg mb-4">
              <p class="text-stone-700 leading-relaxed font-serif">
                {{ showConclusion.conclusion }}
              </p>
            </div>

            <div class="bg-green-50/60 rounded-xl p-4 border border-green-200/40">
              <div class="flex items-center gap-2 text-green-700 font-medium mb-2 font-serif">
                <Lightbulb class="w-4 h-4" />
                <span>修复提示</span>
              </div>
              <p class="text-sm text-stone-600 font-serif">{{ showConclusion.repairHint }}</p>
            </div>

            <button
              class="btn-primary w-full mt-6"
              @click="closeConclusion"
            >
              继续推理
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.animate-shake {
  animation: shake 0.3s ease-in-out;
}
</style>
