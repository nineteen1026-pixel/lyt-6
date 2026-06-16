<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Wrench, ChevronRight, Sparkles, Check, GitBranch, RotateCcw, Shield, TrendingUp } from 'lucide-vue-next'
import { useGameStore } from '../stores/game'
import { useDynamicDifficulty } from '../composables/useDynamicDifficulty'
import StoryDialogue from '../components/StoryDialogue.vue'
import DialogueHistoryPanel from '../components/DialogueHistoryPanel.vue'
import BranchTreeView from '../components/BranchTreeView.vue'
import type { RepairStep, RepairChoice, DynamicDifficultyLevel, ChoiceWeight } from '../types'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const currentStepIndex = ref(0)
const selectedChoices = ref<string[]>([])
const isAnimating = ref(false)
const showHistoryPanel = ref(false)
const showBranchTree = ref(false)
const pendingEndingType = ref<string | null>(null)
const awaitingPostDialogue = ref(false)
const showRemedyBanner = ref(false)

const commissionId = computed(() => route.params.id as string)

const commission = computed(() => {
  return gameStore.getCommissionById(commissionId.value)
})

const {
  difficultyContext,
  effectiveDifficulty,
  difficultyScore,
  visualParams,
  difficultyLabel,
  difficultyBreakdown,
  getRepairStepsForDifficulty,
  startPhaseTiming,
  endPhaseTiming,
  formatTime,
  startAutoRefresh
} = useDynamicDifficulty(() => commissionId.value || null)

const repairSteps = computed(() => {
  if (!commissionId.value) return []
  return getRepairStepsForDifficulty()
})

const currentStep = computed(() => {
  return repairSteps.value[currentStepIndex.value] || null
})

const totalSteps = computed(() => repairSteps.value.length)

const progress = computed(() => {
  return {
    current: currentStepIndex.value + 1,
    total: totalSteps.value,
    percentage: totalSteps.value > 0
      ? Math.round(((currentStepIndex.value) / totalSteps.value) * 100)
      : 0
  }
})

const canGoBack = computed(() => {
  return gameStore.canGoBack(commissionId.value) && !isAnimating.value
})

const currentStepWeights = computed<ChoiceWeight[]>(() => {
  if (!currentStep.value || !commissionId.value) return []
  return gameStore.getStepWeights(commissionId.value, currentStep.value.id, currentStepIndex.value)
})

const pendingRemedies = computed(() => gameStore.getPendingRemedies(commissionId.value))

function getChoiceWeight(choiceId: string): ChoiceWeight | undefined {
  return currentStepWeights.value.find(w => w.choiceId === choiceId)
}

function getWeightPercent(choiceId: string): number {
  const w = getChoiceWeight(choiceId)
  return w ? Math.round(w.normalizedWeight * 100) : 0
}

function selectChoice(choice: RepairChoice) {
  if (isAnimating.value) return
  if (!currentStep.value) return

  isAnimating.value = true
  selectedChoices.value.push(choice.id)

  gameStore.recordBranchChoice(
    commissionId.value,
    currentStep.value.id,
    currentStepIndex.value,
    choice.id,
    choice.label,
    choice.endingType
  )

  if (choice.endingType === 'bad' && currentStep.value && commissionId.value) {
    gameStore.incrementRepairRetryCount(commissionId.value, currentStep.value.id)
    showRemedyBanner.value = true
  } else {
    showRemedyBanner.value = false
  }

  setTimeout(() => {
    if (currentStepIndex.value < totalSteps.value - 1) {
      currentStepIndex.value++
      isAnimating.value = false
    } else {
      finishRepair()
    }
  }, 800)
}

function handleApplyRemedy(remedyId: string, stepIndex: number) {
  if (isAnimating.value) return

  const success = gameStore.applyRemedy(commissionId.value, remedyId, stepIndex)
  if (success) {
    showRemedyBanner.value = false
    const newChoices = gameStore.getSelectedChoiceIds(commissionId.value)
    selectedChoices.value = newChoices
    currentStepIndex.value = newChoices.length
  }
}

function handleGoBack() {
  if (isAnimating.value) return
  if (!gameStore.canGoBack(commissionId.value)) return

  const success = gameStore.goBackOneStep(commissionId.value)
  if (success) {
    selectedChoices.value.pop()
    if (currentStepIndex.value > 0) {
      currentStepIndex.value--
    }
  }
}

function handleJumpToNode(nodeId: string) {
  if (isAnimating.value) return
  
  const success = gameStore.jumpToBranchNode(commissionId.value, nodeId)
  if (success) {
    const newChoices = gameStore.getSelectedChoiceIds(commissionId.value)
    selectedChoices.value = newChoices
    currentStepIndex.value = newChoices.length
  }
}

function toggleBranchTree() {
  showBranchTree.value = !showBranchTree.value
}

function calculateEndingType(): string {
  const steps = repairSteps.value
  let goodCount = 0
  let neutralCount = 0

  selectedChoices.value.forEach((choiceId, index) => {
    const step = steps[index]
    const choice = step?.choices.find(c => c.id === choiceId)
    if (choice) {
      if (choice.endingType === 'good') goodCount++
      if (choice.endingType === 'neutral') neutralCount++
    }
  })

  const collectedRatio = gameStore.collectedCluesForCurrent.length / gameStore.allCluesForCurrent.length

  if (collectedRatio < 0.5) {
    return 'bad'
  }

  if (goodCount >= neutralCount) {
    return 'good'
  }
  return 'neutral'
}

function finishRepair() {
  const endingType = calculateEndingType() as 'good' | 'neutral' | 'bad'
  const ending = gameStore.getEndingByType(commissionId.value, endingType)

  if (ending) {
    gameStore.unlockEnding(ending.id)
    gameStore.completeCurrentBranchPath(commissionId.value, endingType, ending.id)
    
    const score = gameStore.calculateMultiDimensionalScore(
      commissionId.value,
      selectedChoices.value,
      ending.id,
      endingType
    )
    gameStore.saveScore(score)
    gameStore.checkAndUnlockAchievements()
  }

  gameStore.completeCommission(commissionId.value)

  pendingEndingType.value = endingType

  if (gameStore.hasDialogueForSession(commissionId.value, 'repair_post')
      && !gameStore.hasCompletedDialogueForType(commissionId.value, 'repair_post')) {
    awaitingPostDialogue.value = true
    gameStore.startDialogueSession(commissionId.value, 'repair_post')
  } else {
    navigateToEnding()
  }
}

function navigateToEnding() {
  if (!pendingEndingType.value) return
  const endingType = pendingEndingType.value
  pendingEndingType.value = null
  awaitingPostDialogue.value = false
  setTimeout(() => {
    router.push(`/ending/${commissionId.value}/${endingType}`)
  }, 400)
}

function handleDialogueEnd() {
  if (awaitingPostDialogue.value && pendingEndingType.value) {
    navigateToEnding()
  }
}

function toggleHistoryPanel() {
  showHistoryPanel.value = !showHistoryPanel.value
}

function goBack() {
  router.push(`/deduction/${commissionId.value}`)
}

const baseChoiceIds = computed(() => {
  if (!commissionId.value) return new Set<string>()
  const rawSteps = gameStore.getRepairSteps()
  const ids = new Set<string>()
  for (const step of rawSteps) {
    for (const ch of step.choices) {
      ids.add(ch.id)
    }
  }
  return ids
})

function isExtraChoice(choiceId: string): boolean {
  return !baseChoiceIds.value.has(choiceId)
}

function choiceStyleClass(choice: RepairChoice): string {
  const extra = isExtraChoice(choice.id)
  if (choice.endingType === 'bad') {
    return extra
      ? 'border-rose-200/60 bg-rose-50/30 hover:border-rose-400/60 hover:bg-rose-50'
      : 'border-rose-200/60 bg-rose-50/40 hover:border-rose-400/60 hover:bg-rose-50'
  }
  if (extra) {
    return choice.endingType === 'good'
      ? 'border-blue-200/60 bg-blue-50/40 hover:border-blue-400/60 hover:bg-blue-50'
      : 'border-blue-200/60 bg-blue-50/30 hover:border-blue-400/60 hover:bg-blue-50'
  }
  return choice.endingType === 'good'
    ? 'border-green-200/60 bg-green-50/40 hover:border-green-400/60 hover:bg-green-50'
    : 'border-amber-200/60 bg-amber-50/40 hover:border-amber-400/60 hover:bg-amber-50'
}

function choiceIconBg(choice: RepairChoice): string {
  if (choice.endingType === 'bad') return 'bg-rose-100'
  if (isExtraChoice(choice.id)) return 'bg-blue-100'
  return choice.endingType === 'good' ? 'bg-green-100' : 'bg-amber-100'
}

function choiceEmoji(choice: RepairChoice): string {
  if (choice.endingType === 'bad') return '⚠️'
  if (isExtraChoice(choice.id)) return choice.endingType === 'good' ? '💡' : '🌿'
  return choice.endingType === 'good' ? '✨' : '🌿'
}

function weightBarColor(choice: RepairChoice): string {
  if (choice.endingType === 'bad') return 'bg-rose-400'
  if (isExtraChoice(choice.id)) return choice.endingType === 'good' ? 'bg-blue-400' : 'bg-blue-300'
  return choice.endingType === 'good' ? 'bg-green-400' : 'bg-amber-400'
}

const stepIcons = ['🧹', '🔧', '✨']

onMounted(() => {
  gameStore.loadSavedGame()
  if (!commission.value) {
    router.push('/commissions')
    return
  }
  
  gameStore.initBranchTree(commissionId.value)
  
  if (gameStore.hasDialogueForSession(commissionId.value, 'repair_pre')
      && !gameStore.hasCompletedDialogueForType(commissionId.value, 'repair_pre')) {
    gameStore.startDialogueSession(commissionId.value, 'repair_pre')
  }
  
  startPhaseTiming('repair')
  startAutoRefresh(5000)
})
</script>

<template>
  <div class="min-h-screen py-8 px-4 paper-texture">
    <div class="max-w-3xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <button
          class="flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors font-serif"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5" />
          <span>返回推理板</span>
        </button>
        <div class="text-sm text-stone-500 font-serif flex items-center gap-3">
          <button
            class="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
            title="分支树"
            @click="toggleBranchTree"
          >
            <GitBranch class="w-4 h-4" />
          </button>
          <button
            class="p-1.5 text-stone-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
            title="对话记录"
            @click="toggleHistoryPanel"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </button>
          <button
            v-if="canGoBack"
            class="flex items-center gap-1 px-2.5 py-1 text-xs text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
            @click="handleGoBack"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span>回退</span>
          </button>
          <span>步骤 {{ progress.current }} / {{ progress.total }}</span>
          <span v-if="difficultyContext" class="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-white/80" :class="difficultyLabel.color">
            <span>{{ difficultyLabel.icon }}</span>
            <span class="font-medium">{{ difficultyLabel.text }}</span>
            <span class="text-stone-400">·</span>
            <span class="text-stone-500">{{ difficultyScore }}分</span>
          </span>
        </div>
      </div>

      <div class="text-center mb-8">
        <h1 class="text-2xl font-display font-bold text-stone-800 mb-2 text-shadow-warm">
          修复工坊
        </h1>
        <p class="text-stone-500 text-sm font-serif">
          正在修复：{{ commission?.title }}
        </p>
        <div class="divider-ornament mt-3" />
      </div>

      <div class="mb-8 stitch-border">
        <div class="h-3 bg-stone-200/60 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-700 ease-out"
            :style="{
              width: `${progress.percentage}%`,
              background: 'linear-gradient(90deg, var(--color-gold-light), var(--color-primary))'
            }"
          />
        </div>
        <div class="flex justify-between mt-3">
          <div
            v-for="(step, index) in repairSteps"
            :key="step.id"
            :class="[
              'flex flex-col items-center transition-all duration-300',
              index <= currentStepIndex ? 'text-amber-600' : 'text-stone-400'
            ]"
          >
            <div
              :class="[
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300',
                index < currentStepIndex
                  ? 'bg-green-500 text-white shadow-md'
                  : index === currentStepIndex
                    ? 'bg-amber-500 text-white ring-4 ring-amber-200/60 shadow-lg'
                    : 'bg-stone-200/60 text-stone-400'
              ]"
            >
              <Check v-if="index < currentStepIndex" class="w-5 h-5" />
              <span v-else>{{ stepIcons[index] || index + 1 }}</span>
            </div>
            <span class="text-xs mt-1.5 max-w-20 text-center hidden sm:block font-serif">
              {{ step.title }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="showRemedyBanner && pendingRemedies.length > 0" class="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-purple-50 border border-amber-200">
        <div class="flex items-center gap-2 mb-3">
          <Shield class="w-5 h-5 text-amber-600" />
          <span class="font-serif font-medium text-amber-700">补救机会</span>
          <span class="text-xs text-amber-500 font-serif">上次选择可能不够理想，试试替代方案</span>
        </div>
        <div class="space-y-2">
          <button
            v-for="remedy in pendingRemedies"
            :key="remedy.id"
            class="w-full text-left p-3 rounded-lg bg-white/80 hover:bg-white border border-amber-200/60 transition-all"
            @click="handleApplyRemedy(remedy.id, currentStepIndex)"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Sparkles class="w-4 h-4 text-amber-500" />
                <span class="text-sm font-serif text-stone-700">{{ remedy.description }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs px-2 py-0.5 rounded-full"
                  :class="remedy.remedyType === 'alternative' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'"
                >
                  {{ remedy.remedyType === 'alternative' ? '替代方案' : '提示引导' }}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <Transition name="slide-fade" mode="out-in">
        <div v-if="currentStep" :key="currentStep.id" class="card-warm p-8">
          <div class="text-center mb-6">
            <div class="text-5xl mb-4 animate-float-gentle">
              {{ stepIcons[currentStepIndex] || '🔧' }}
            </div>
            <h2 class="text-xl font-serif font-bold text-stone-800 mb-2">
              {{ currentStep.title }}
            </h2>
            <p class="text-stone-500 font-serif">
              {{ currentStep.description }}
            </p>
          </div>

          <div class="space-y-4">
            <button
              v-for="choice in currentStep.choices"
              :key="choice.id"
              :class="[
                'w-full p-5 rounded-xl border-2 text-left transition-all duration-300',
                'hover:shadow-md hover:-translate-y-0.5',
                isAnimating
                  ? 'pointer-events-none opacity-70'
                  : 'cursor-pointer',
                choiceStyleClass(choice)
              ]"
              data-tutorial="repair-choice"
              @click="selectChoice(choice)"
            >
              <div class="flex items-start gap-4">
                <div
                  :class="[
                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                    choiceIconBg(choice)
                  ]"
                >
                  <span class="text-lg">
                    {{ choiceEmoji(choice) }}
                  </span>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-medium text-stone-800 font-serif">
                      {{ choice.label }}
                    </h3>
                    <span v-if="isExtraChoice(choice.id)" class="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-serif">
                      {{ difficultyContext?.effectiveDifficulty === 'assisted' ? '推荐' : '额外' }}
                    </span>
                  </div>
                  <p class="text-sm text-stone-500 font-serif">
                    {{ choice.description }}
                  </p>
                  <div v-if="getChoiceWeight(choice.id)" class="mt-2 flex items-center gap-3">
                    <div class="flex-1 h-1.5 rounded-full bg-stone-200/60 overflow-hidden max-w-32">
                      <div
                        class="h-full rounded-full transition-all duration-300"
                        :class="weightBarColor(choice)"
                        :style="{ width: getWeightPercent(choice.id) + '%' }"
                      />
                    </div>
                    <span class="text-[10px] text-stone-400 font-serif flex items-center gap-1">
                      <TrendingUp class="w-3 h-3" />
                      {{ getWeightPercent(choice.id) }}%
                    </span>
                  </div>
                </div>
                <ChevronRight class="w-5 h-5 text-stone-400 flex-shrink-0 mt-1" />
              </div>
            </button>
          </div>
        </div>
      </Transition>

      <div class="mt-8 text-center">
        <p class="text-xs text-stone-400 font-serif">
          ✦ 你的选择将影响最终的结局
        </p>
      </div>

      <div class="mt-6 card-warm p-4">
        <div class="flex items-center gap-3">
          <Wrench class="w-5 h-5 text-stone-400" />
          <div class="flex-1">
            <div class="text-sm text-stone-600 font-serif">
              已收集线索：{{ gameStore.collectedCluesForCurrent.length }} / {{ gameStore.allCluesForCurrent.length }}
            </div>
            <div class="text-xs text-stone-400 font-serif">
              收集更多线索有助于达成更好的结局
            </div>
          </div>
          <div
            :class="[
              'px-3 py-1 rounded-full text-xs font-medium font-serif',
              gameStore.collectedCluesForCurrent.length >= Math.ceil(gameStore.allCluesForCurrent.length * 0.5)
                ? 'bg-green-100/80 text-green-700'
                : 'bg-rose-100/80 text-rose-700'
            ]"
          >
            {{ gameStore.collectedCluesForCurrent.length >= Math.ceil(gameStore.allCluesForCurrent.length * 0.5)
              ? '线索充足'
              : '线索不足'
            }}
          </div>
        </div>
        <div v-if="difficultyContext" class="mt-3 pt-3 border-t border-amber-200/30">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2 text-xs font-serif" :class="difficultyLabel.color">
              <span class="text-base">{{ difficultyLabel.icon }}</span>
              <span class="font-medium">当前难度：{{ difficultyLabel.text }}</span>
              <span class="text-stone-400">|</span>
              <span class="text-stone-500">综合评分 {{ difficultyScore }} 分</span>
            </div>
            <div class="text-[10px] text-stone-400 font-serif">
              {{ effectiveDifficulty === 'assisted' ? '提供更多提示与选项' : effectiveDifficulty === 'challenging' ? '提示精简，选项更多风险' : '标准提示与选项' }}
            </div>
          </div>
          <div class="flex items-center gap-4 text-[10px] text-stone-500 font-serif">
            <div class="flex items-center gap-1">
              <span>🔍 线索收集</span>
              <span class="text-stone-700 font-medium">{{ difficultyBreakdown.collectionScore }}分</span>
            </div>
            <div class="flex items-center gap-1">
              <span>⏱️ 时间效率</span>
              <span class="text-stone-700 font-medium">{{ difficultyBreakdown.timeScore }}分</span>
            </div>
            <div class="flex items-center gap-1">
              <span>🔄 重试惩罚</span>
              <span class="text-stone-700 font-medium">{{ difficultyBreakdown.retryScore }}分</span>
            </div>
          </div>
          <div class="mt-2 h-1.5 bg-stone-200/60 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="{
                width: `${difficultyScore}%`,
                backgroundColor: difficultyScore >= 70 ? '#ef4444' : difficultyScore >= 35 ? '#f59e0b' : '#3b82f6'
              }"
            />
          </div>
        </div>
      </div>

      <StoryDialogue
        :showHistoryToggle="true"
        @dialogueEnd="handleDialogueEnd"
        @toggleHistory="toggleHistoryPanel"
      />

      <DialogueHistoryPanel
        v-model="showHistoryPanel"
        :commissionId="commissionId"
      />

      <Transition name="slide-right">
        <div
          v-if="showBranchTree"
          class="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 border-l border-stone-200"
        >
          <BranchTreeView
            :commission-id="commissionId"
            @close="showBranchTree = false"
            @jump-to-node="handleJumpToNode"
            @go-back="handleGoBack"
            @apply-remedy="handleApplyRemedy"
          />
        </div>
      </Transition>

      <Transition name="fade">
        <div
          v-if="showBranchTree"
          class="fixed inset-0 bg-black/30 z-40"
          @click="showBranchTree = false"
        />
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
