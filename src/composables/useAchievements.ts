import { ref, computed, watch, onMounted } from 'vue'
import type { Achievement } from '../types'
import { useGameStore } from '../stores/game'

const currentToast = ref<Achievement | null>(null)
const isToastVisible = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null

const TOAST_DURATION = 4500
const TOAST_INTERVAL = 600

export function useAchievements() {
  const gameStore = useGameStore()

  const pendingCount = computed(() => {
    const storeCount = gameStore.hasNewlyUnlockedAchievements() ? 1 : 0
    const currentCount = isToastVisible.value ? 1 : 0
    return storeCount + currentCount
  })

  function checkAndUnlockAchievements(): Achievement[] {
    return gameStore.checkAndUnlockAchievements()
  }

  function processQueue(): void {
    if (isToastVisible.value) return
    
    const next = gameStore.popNewlyUnlockedAchievement()
    if (!next) return

    currentToast.value = next
    isToastVisible.value = true

    if (toastTimer) {
      clearTimeout(toastTimer)
    }

    toastTimer = setTimeout(() => {
      closeToast()
    }, TOAST_DURATION)
  }

  function closeToast(): void {
    isToastVisible.value = false
    
    setTimeout(() => {
      currentToast.value = null
      
      if (gameStore.hasNewlyUnlockedAchievements()) {
        setTimeout(() => {
          processQueue()
        }, TOAST_INTERVAL)
      }
    }, 400)
  }

  function skipAllToasts(): void {
    gameStore.clearNewlyUnlockedAchievements()
    if (toastTimer) {
      clearTimeout(toastTimer)
      toastTimer = null
    }
    isToastVisible.value = false
    currentToast.value = null
  }

  function getAllAchievements(): Achievement[] {
    return gameStore.allAchievements
  }

  function getUnlockedCount(): number {
    return gameStore.state.unlockedAchievements.length
  }

  function getTotalCount(): number {
    return gameStore.allAchievements.length
  }

  function getProgressPercentage(): number {
    const total = getTotalCount()
    if (total === 0) return 0
    return Math.round((getUnlockedCount() / total) * 100)
  }

  function getAchievementsByCategory(category: string): Achievement[] {
    return gameStore.getAchievementsByCategory(category)
  }

  function getRarityStats(): Record<string, { total: number; unlocked: number }> {
    const all = gameStore.allAchievements
    const stats: Record<string, { total: number; unlocked: number }> = {}

    for (const ach of all) {
      if (!stats[ach.rarity]) {
        stats[ach.rarity] = { total: 0, unlocked: 0 }
      }
      stats[ach.rarity].total++
      if (ach.isUnlocked) {
        stats[ach.rarity].unlocked++
      }
    }

    return stats
  }

  function getCategoryStats(): Record<string, { total: number; unlocked: number }> {
    const all = gameStore.allAchievements
    const stats: Record<string, { total: number; unlocked: number }> = {}

    for (const ach of all) {
      if (!stats[ach.category]) {
        stats[ach.category] = { total: 0, unlocked: 0 }
      }
      stats[ach.category].total++
      if (ach.isUnlocked) {
        stats[ach.category].unlocked++
      }
    }

    return stats
  }

  function startListening() {
    watch(
      () => gameStore.hasNewlyUnlockedAchievements(),
      (hasNew) => {
        if (hasNew && !isToastVisible.value) {
          processQueue()
        }
      }
    )
  }

  return {
    currentToast,
    isToastVisible,
    pendingCount,
    checkAndUnlockAchievements,
    processQueue,
    closeToast,
    skipAllToasts,
    getAllAchievements,
    getUnlockedCount,
    getTotalCount,
    getProgressPercentage,
    getAchievementsByCategory,
    getRarityStats,
    getCategoryStats,
    startListening,
  }
}
