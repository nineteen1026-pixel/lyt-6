<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Wrench, ChevronRight, Sparkles, Check } from 'lucide-vue-next'
import { useGameStore } from '../stores/game'
import type { RepairStep, RepairChoice, DynamicDifficultyLevel } from '../types'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const currentStepIndex = ref(0)
const selectedChoices = ref<string[]>([])
const isAnimating = ref(false)

const commissionId = computed(() => route.params.id as string)

const commission = computed(() => {
  return gameStore.getCommissionById(commissionId.value)
})

const repairSteps = computed(() => {
  if (!commissionId.value) return []
  return gameStore.getRepairStepsForDifficulty(commissionId.value)
})

const difficultyContext = computed(() =>
  commissionId.value ? gameStore.computeDifficultyContext(commissionId.value) : null
)

const difficultyLabel = computed<{ text: string; color: string; icon: string }>(() => {
  if (!difficultyContext.value) return { text: '标准', color: 'text-amber-600', icon: '⚖️' }
  switch (difficultyContext.value.effectiveDifficulty) {
    case 'assisted': return { text: '辅助', color: 'text-blue-600', icon: '💡' }
    case 'challenging': return { text: '挑战', color: 'text-red-600', icon: '🔥' }
    default: return { text: '标准', color: 'text-amber-600', icon: '⚖️' }
  }
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

function selectChoice(choice: RepairChoice) {
  if (isAnimating.value) return

  isAnimating.value = true
  selectedChoices.value.push(choice.id)

  if (choice.endingType === 'bad' && currentStep.value && commissionId.value) {
    gameStore.incrementRepairRetryCount(commissionId.value, currentStep.value.id)
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
  const endingType = calculateEndingType()
  const ending = gameStore.getEndingByType(commissionId.value, endingType)

  if (ending) {
    gameStore.unlockEnding(ending.id)
  }

  gameStore.completeCommission(commissionId.value)

  setTimeout(() => {
    router.push(`/ending/${commissionId.value}/${endingType}`)
  }, 500)
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

const stepIcons = ['🧹', '🔧', '✨']

onMounted(() => {
  gameStore.loadSavedGame()
  if (!commission.value) {
    router.push('/commissions')
  }
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
          <span>步骤 {{ progress.current }} / {{ progress.total }}</span>
          <span v-if="difficultyContext" class="flex items-center gap-1 text-xs" :class="difficultyLabel.color">
            <span>{{ difficultyLabel.icon }}</span>
            <span>{{ difficultyLabel.text }}</span>
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
        <div v-if="difficultyContext" class="mt-3 pt-3 border-t border-amber-200/30 flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs font-serif" :class="difficultyLabel.color">
            <span>{{ difficultyLabel.icon }}</span>
            <span>当前难度：{{ difficultyLabel.text }}</span>
            <span class="text-stone-400">|</span>
            <span class="text-stone-500">线索率 {{ Math.round(difficultyContext.clueCollectionRate * 100) }}%</span>
            <span class="text-stone-400">|</span>
            <span class="text-stone-500">重试 {{ difficultyContext.retryCount }} 次</span>
          </div>
          <div class="text-[10px] text-stone-400 font-serif">
            {{ difficultyContext.effectiveDifficulty === 'assisted' ? '提供更多提示与选项' : difficultyContext.effectiveDifficulty === 'challenging' ? '提示精简，选项更多风险' : '标准提示与选项' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
