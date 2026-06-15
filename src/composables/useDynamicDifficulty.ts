import { computed, ref, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import type {
  DynamicDifficultyLevel,
  DifficultyContext,
  Hotspot,
  RepairStepConfig,
  RepairStep,
  GamePhase,
} from '../types'

export interface DifficultyVisualParams {
  hotspotPulseSpeed: number
  hotspotGlowIntensity: number
  hotspotGlowColor: string
  hintOpacity: number
  hintTextSize: number
  repairStepComplexity: number
  hintRevealDelay: number
  autoHintEnabled: boolean
}

export interface HotspotStyle {
  animationDuration: string
  boxShadow: string
  opacity: number
  fontSize: string
}

export interface DifficultyBreakdown {
  collectionRate: number
  totalRetries: number
  deductionTime: string
  deductionTimeMs: number
  score: number
  collectionScore: number
  timeScore: number
  retryScore: number
}

const COLLECTION_RATE_WEIGHT = 0.45
const TIME_EFFICIENCY_WEIGHT = 0.25
const RETRY_PENALTY_WEIGHT = 0.30

const BASELINE_TIMES: Record<string, { deduction: number; item: number; repair: number }> = {
  simple: { deduction: 120, item: 90, repair: 60 },
  medium: { deduction: 180, item: 120, repair: 90 },
  complex: { deduction: 240, item: 180, repair: 120 },
}

const GLOW_COLORS: Record<DynamicDifficultyLevel, string> = {
  assisted: 'rgba(59, 130, 246, {intensity})',
  standard: 'rgba(217, 119, 6, {intensity})',
  challenging: 'rgba(239, 68, 68, {intensity})',
}

export function useDynamicDifficulty(commissionId: string | (() => string | null)) {
  const gameStore = useGameStore()

  const _timeTick = ref(0)
  let _refreshTimer: ReturnType<typeof setInterval> | null = null

  function startAutoRefresh(intervalMs: number = 5000): void {
    stopAutoRefresh()
    _refreshTimer = setInterval(() => {
      _timeTick.value = Date.now()
    }, intervalMs)
  }

  function stopAutoRefresh(): void {
    if (_refreshTimer) {
      clearInterval(_refreshTimer)
      _refreshTimer = null
    }
  }

  onUnmounted(() => {
    stopAutoRefresh()
  })

  const getCommissionId = (): string | null => {
    if (typeof commissionId === 'function') {
      return commissionId()
    }
    return commissionId
  }

  const difficultyContext = computed<DifficultyContext | null>(() => {
    void _timeTick.value
    const id = getCommissionId()
    if (!id) return null
    return gameStore.computeDifficultyContext(id)
  })

  const effectiveDifficulty = computed<DynamicDifficultyLevel>(() => {
    return difficultyContext.value?.effectiveDifficulty || 'standard'
  })

  const difficultyScore = computed<number>(() => {
    return difficultyContext.value?.difficultyScore ?? 50
  })

  const visualParams = computed<DifficultyVisualParams>(() => {
    const score = difficultyScore.value
    const normalized = score / 100
    const level = effectiveDifficulty.value

    const pulseSpeed = lerp(2.5, 0.8, normalized)
    const glowIntensity = lerp(0.9, 0.3, normalized)
    const hintOpacity = lerp(1, 0.5, normalized)
    const hintTextSize = lerp(1.05, 0.9, normalized)
    const repairStepComplexity = lerp(0.6, 1.2, normalized)
    const hintRevealDelay = lerp(0, 1500, normalized)
    const autoHintEnabled = score < 40

    const glowColorTemplate = GLOW_COLORS[level]
    const glowColor = glowColorTemplate.replace('{intensity}', glowIntensity.toFixed(2))

    return {
      hotspotPulseSpeed: pulseSpeed,
      hotspotGlowIntensity: glowIntensity,
      hotspotGlowColor: glowColor,
      hintOpacity,
      hintTextSize,
      repairStepComplexity,
      hintRevealDelay,
      autoHintEnabled,
    }
  })

  const hotspotStyle = computed<HotspotStyle>(() => {
    const params = visualParams.value
    return {
      animationDuration: `${params.hotspotPulseSpeed}s`,
      boxShadow: `0 0 ${20 * params.hotspotGlowIntensity}px ${params.hotspotGlowColor}`,
      opacity: 0.7 + params.hintOpacity * 0.3,
      fontSize: `${params.hintTextSize}rem`,
    }
  })

  function lerp(min: number, max: number, t: number): number {
    return min + (max - min) * Math.max(0, Math.min(1, t))
  }

  function getHotspotHint(hotspot: Hotspot): string {
    const id = getCommissionId()
    if (!id) return hotspot.description
    return gameStore.getHotspotHintForDifficulty(hotspot, id)
  }

  function getRepairStepsForDifficulty(): RepairStep[] {
    const id = getCommissionId()
    if (!id) return []
    return gameStore.getRepairStepsForDifficulty(id)
  }

  function getStepDescription(step: RepairStepConfig): string {
    const level = effectiveDifficulty.value
    const variant = step.difficultyVariants?.[level]
    return variant?.description || step.description
  }

  function getStepChoices(step: RepairStepConfig): RepairStepConfig['choices'] {
    const level = effectiveDifficulty.value
    const variant = step.difficultyVariants?.[level]
    if (variant?.extraChoices && variant.extraChoices.length > 0) {
      return [...step.choices, ...variant.extraChoices]
    }
    return step.choices
  }

  function startPhaseTiming(phase: GamePhase): void {
    const id = getCommissionId()
    if (!id) return
    gameStore.startPhaseTiming(id, phase)
  }

  function endPhaseTiming(phase: GamePhase): number {
    const id = getCommissionId()
    if (!id) return 0
    return gameStore.endPhaseTiming(id, phase)
  }

  function getPhaseTime(phase: GamePhase): number {
    const id = getCommissionId()
    if (!id) return 0
    return gameStore.getPhaseTime(id, phase)
  }

  function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`
    }
    return `${remainingSeconds}秒`
  }

  const difficultyLabel = computed<{
    text: string
    color: string
    icon: string
    description: string
    bgColor: string
  }>(() => {
    switch (effectiveDifficulty.value) {
      case 'assisted':
        return {
          text: '辅助模式',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200',
          icon: '💡',
          description: '提示更详细，选项更清晰，助你轻松探索',
        }
      case 'challenging':
        return {
          text: '挑战模式',
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
          icon: '🔥',
          description: '提示更隐晦，选项更丰富，考验你的观察力',
        }
      default:
        return {
          text: '标准模式',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50 border-amber-200',
          icon: '⚖️',
          description: '平衡的体验，恰到好处的挑战',
        }
    }
  })

  const difficultyBreakdown = computed<DifficultyBreakdown | null>(() => {
    void _timeTick.value
    const id = getCommissionId()
    if (!id) return null

    const collected = gameStore.getCollectedClueCount(id)
    const total = gameStore.getTotalClueCount(id)
    const collectionRate = total > 0 ? Math.round((collected / total) * 100) : 0

    const repairRetries = Object.entries(gameStore.state.repairRetryCounts)
      .filter(([key]) => key.startsWith(id))
      .reduce((sum, [, count]) => sum + count, 0)
    const connectionRetries = gameStore.state.connectionRetryCounts[id] || 0
    const totalRetries = repairRetries + connectionRetries

    const deductionTimeMs = getPhaseTime('deduction')
    const commission = gameStore.getCommissionById(id)
    const baseline = commission ? BASELINE_TIMES[commission.difficulty] : BASELINE_TIMES.medium
    const deductionSeconds = deductionTimeMs / 1000
    const timeEfficiency = baseline.deduction > 0
      ? Math.min(1, baseline.deduction / Math.max(deductionSeconds, 1))
      : 0.5
    const retryPenalty = Math.min(1, totalRetries / 5)

    const collectionScore = Math.round(collectionRate * COLLECTION_RATE_WEIGHT)
    const timeScore = Math.round(timeEfficiency * 100 * TIME_EFFICIENCY_WEIGHT)
    const retryScore = Math.round((1 - retryPenalty) * 100 * RETRY_PENALTY_WEIGHT)

    return {
      collectionRate,
      totalRetries,
      deductionTime: formatTime(deductionTimeMs),
      deductionTimeMs,
      score: difficultyScore.value,
      collectionScore,
      timeScore,
      retryScore,
    }
  })

  function getProgressRingStyle(score: number): {
    strokeDasharray: string
    stroke: string
    strokeWidth: number
  } {
    const radius = 40
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (score / 100) * circumference

    let stroke = '#d97706'
    if (score <= 35) stroke = '#3b82f6'
    else if (score >= 70) stroke = '#ef4444'

    return {
      strokeDasharray: `${circumference - offset} ${circumference}`,
      stroke,
      strokeWidth: 6,
    }
  }

  return {
    difficultyContext,
    effectiveDifficulty,
    difficultyScore,
    visualParams,
    hotspotStyle,
    difficultyLabel,
    difficultyBreakdown,
    getHotspotHint,
    getRepairStepsForDifficulty,
    getStepDescription,
    getStepChoices,
    startPhaseTiming,
    endPhaseTiming,
    getPhaseTime,
    formatTime,
    getProgressRingStyle,
    startAutoRefresh,
    stopAutoRefresh,
  }
}
