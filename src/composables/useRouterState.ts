import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter, type RouteLocationNormalized } from 'vue-router'
import { useGameStore } from '../stores/game'
import type { TutorialStepKey, GameStep } from '../types'
import { TUTORIAL_STEPS } from '../types'

export interface RouterStateSnapshot {
  fullPath: string
  routeName: string | symbol | null | undefined
  params: Record<string, string>
  query: Record<string, string | string[]>
  timestamp: string
  gameStep: GameStep | null
  commissionId: string | null
  chapterId: string | null
}

export interface RouterHistoryEntry {
  from: RouterStateSnapshot
  to: RouterStateSnapshot
  timestamp: string
  reason: 'navigate' | 'tutorial_redirect' | 'resume' | 'interrupt'
}

const ROUTER_STATE_KEY = 'memory-repair-shop-router-state'

export function useRouterState() {
  const route = useRoute()
  const router = useRouter()
  const gameStore = useGameStore()

  const history = ref<RouterHistoryEntry[]>([])
  const isRestoring = ref(false)
  const interruptedRoute = ref<RouterStateSnapshot | null>(null)

  const currentSnapshot = computed<RouterStateSnapshot>(() => ({
    fullPath: route.fullPath,
    routeName: route.name,
    params: { ...route.params } as Record<string, string>,
    query: { ...route.query } as Record<string, string | string[]>,
    timestamp: new Date().toISOString(),
    gameStep: gameStore.state.currentStep,
    commissionId: gameStore.state.currentCommissionId,
    chapterId: gameStore.state.currentChapterId,
  }))

  const canResumeTutorial = computed(() => {
    const tutorial = gameStore.state.tutorialState
    if (tutorial.isCompleted) return false
    if (!tutorial.wasInterrupted) return false
    if (!tutorial.resumeContext) return false
    return true
  })

  const resumeTarget = computed(() => {
    const context = gameStore.state.tutorialState.resumeContext
    if (!context) return null
    return {
      routeName: context.routeName,
      routeParams: context.routeParams || {},
      targetStep: context.targetStep,
    }
  })

  function createSnapshot(route: RouteLocationNormalized): RouterStateSnapshot {
    return {
      fullPath: route.fullPath,
      routeName: route.name,
      params: { ...route.params } as Record<string, string>,
      query: { ...route.query } as Record<string, string | string[]>,
      timestamp: new Date().toISOString(),
      gameStep: gameStore.state.currentStep,
      commissionId: gameStore.state.currentCommissionId,
      chapterId: gameStore.state.currentChapterId,
    }
  }

  function saveRouterState() {
    try {
      const state = {
        currentRoute: currentSnapshot.value,
        interruptedRoute: interruptedRoute.value,
        timestamp: new Date().toISOString(),
      }
      sessionStorage.setItem(ROUTER_STATE_KEY, JSON.stringify(state))
    } catch (e) {
      console.warn('Failed to save router state:', e)
    }
  }

  function loadRouterState() {
    try {
      const raw = sessionStorage.getItem(ROUTER_STATE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as {
        currentRoute: RouterStateSnapshot
        interruptedRoute: RouterStateSnapshot | null
        timestamp: string
      }
    } catch (e) {
      console.warn('Failed to load router state:', e)
      return null
    }
  }

  function clearRouterState() {
    try {
      sessionStorage.removeItem(ROUTER_STATE_KEY)
    } catch (e) {
      console.warn('Failed to clear router state:', e)
    }
  }

  function recordNavigation(from: RouteLocationNormalized, to: RouteLocationNormalized, reason: RouterHistoryEntry['reason'] = 'navigate') {
    const entry: RouterHistoryEntry = {
      from: createSnapshot(from),
      to: createSnapshot(to),
      timestamp: new Date().toISOString(),
      reason,
    }
    history.value.push(entry)
    if (history.value.length > 50) {
      history.value = history.value.slice(-50)
    }
    saveRouterState()
  }

  function markInterruption(reason: 'route_change' | 'page_reload' | 'manual_pause') {
    const tutorial = gameStore.state.tutorialState
    if (tutorial.isActive && tutorial.currentStep) {
      const step = TUTORIAL_STEPS.find(s => s.key === tutorial.currentStep)
      interruptedRoute.value = currentSnapshot.value
      gameStore.markTutorialInterruption(reason, {
        routeName: step?.routeName || String(route.name || ''),
        routeParams: { ...route.params } as Record<string, string>,
        targetStep: tutorial.currentStep,
        timestamp: new Date().toISOString(),
      })
      saveRouterState()
    }
  }

  function clearInterruption() {
    interruptedRoute.value = null
    gameStore.clearTutorialInterruption()
    clearRouterState()
  }

  async function resumeFromInterruption(): Promise<boolean> {
    if (!canResumeTutorial.value || !resumeTarget.value) {
      return false
    }

    isRestoring.value = true
    try {
      const target = resumeTarget.value
      const routeName = target.routeName as string

      const routeParams: Record<string, string> = { ...target.routeParams }

      if (['commission', 'deduction', 'repair'].includes(routeName)) {
        if (!routeParams.id && gameStore.state.currentCommissionId) {
          routeParams.id = gameStore.state.currentCommissionId
        }
      } else if (routeName === 'ending') {
        if (!routeParams.id && gameStore.state.currentCommissionId) {
          routeParams.id = gameStore.state.currentCommissionId
        }
        if (!routeParams.type && gameStore.state.currentEndingType) {
          routeParams.type = gameStore.state.currentEndingType
        }
      }

      const step = TUTORIAL_STEPS.find(s => s.key === target.targetStep)
      if (step) {
        gameStore.setTutorialStep(target.targetStep)
      }

      try {
        await router.push({ name: routeName, params: routeParams })
        clearInterruption()
        return true
      } catch (e) {
        console.warn('Failed to resume route, falling back to home:', e)
        await router.push({ name: 'home' })
        return false
      }
    } finally {
      isRestoring.value = false
    }
  }

  function getExpectedRouteForStep(stepKey: TutorialStepKey): { name: string; params?: Record<string, string> } | null {
    const step = TUTORIAL_STEPS.find(s => s.key === stepKey)
    if (!step?.routeName) return null

    const result: { name: string; params?: Record<string, string> } = { name: step.routeName }

    if (['commission', 'deduction', 'repair'].includes(step.routeName)) {
      const commissionId = gameStore.state.currentCommissionId
      if (commissionId) {
        result.params = { id: commissionId }
      }
    } else if (step.routeName === 'ending') {
      const commissionId = gameStore.state.currentCommissionId
      const endingType = gameStore.state.currentEndingType
      if (commissionId && endingType) {
        result.params = { id: commissionId, type: endingType }
      }
    }

    return result
  }

  function isCurrentRouteCorrectForStep(stepKey: TutorialStepKey): boolean {
    const expected = getExpectedRouteForStep(stepKey)
    if (!expected) return true
    if (route.name !== expected.name) return false
    if (expected.params) {
      for (const [key, value] of Object.entries(expected.params)) {
        if (route.params[key] !== value) return false
      }
    }
    return true
  }

  function checkAndHandlePageReload() {
    const savedState = loadRouterState()
    if (!savedState) return

    const tutorial = gameStore.state.tutorialState
    const timeDiff = Date.now() - new Date(savedState.timestamp).getTime()

    if (tutorial.wasInterrupted && timeDiff < 3600000) {
      markInterruption('page_reload')
    }
  }

  function goBack() {
    if (history.value.length > 0) {
      const lastEntry = history.value[history.value.length - 1]
      router.push(lastEntry.from.fullPath)
    }
  }

  function getRouteByGameStep(step: GameStep, commissionId?: string): { name: string; params?: Record<string, string> } | null {
    switch (step) {
      case 'commission':
        return { name: 'commissions' }
      case 'roadmap':
        return { name: 'roadmap' }
      case 'item':
        return commissionId ? { name: 'commission', params: { id: commissionId } } : null
      case 'deduction':
        return commissionId ? { name: 'deduction', params: { id: commissionId } } : null
      case 'repair':
        return commissionId ? { name: 'repair', params: { id: commissionId } } : null
      case 'ending':
        return commissionId && gameStore.state.currentEndingType
          ? { name: 'ending', params: { id: commissionId, type: gameStore.state.currentEndingType } }
          : null
      default:
        return null
    }
  }

  async function navigateToGameStep(step: GameStep, commissionId?: string): Promise<boolean> {
    const target = getRouteByGameStep(step, commissionId || gameStore.state.currentCommissionId || undefined)
    if (!target) return false
    try {
      await router.push(target)
      return true
    } catch (e) {
      console.warn('Failed to navigate to game step:', e)
      return false
    }
  }

  onMounted(() => {
    checkAndHandlePageReload()

    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  function handleBeforeUnload() {
    const tutorial = gameStore.state.tutorialState
    if (tutorial.isActive && tutorial.currentStep) {
      markInterruption('page_reload')
    }
    saveRouterState()
  }

  watch(
    () => route.fullPath,
    () => {
      if (!isRestoring.value) {
        saveRouterState()
      }
    }
  )

  return {
    history,
    isRestoring,
    interruptedRoute,
    currentSnapshot,
    canResumeTutorial,
    resumeTarget,
    recordNavigation,
    markInterruption,
    clearInterruption,
    resumeFromInterruption,
    getExpectedRouteForStep,
    isCurrentRouteCorrectForStep,
    goBack,
    getRouteByGameStep,
    navigateToGameStep,
    saveRouterState,
    loadRouterState,
    clearRouterState,
  }
}
