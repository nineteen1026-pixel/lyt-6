import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import type { TutorialStepKey, TutorialStepConfig, TutorialNavigationResult, TutorialResumeContext } from '../types'
import { TUTORIAL_STEPS } from '../types'
import { useRouterState } from './useRouterState'

export function useTutorial() {
  const gameStore = useGameStore()
  const route = useRoute()
  const router = useRouter()
  const routerState = useRouterState()

  const isResuming = ref(false)
  const showResumePrompt = ref(false)

  const tutorialState = computed(() => gameStore.state.tutorialState)
  const isActive = computed(() => tutorialState.value.isActive)
  const isCompleted = computed(() => tutorialState.value.isCompleted)
  const currentStepKey = computed(() => tutorialState.value.currentStep)

  const wasInterrupted = computed(() => tutorialState.value.wasInterrupted)
  const interruptionReason = computed(() => tutorialState.value.interruptionReason)
  const canResume = computed(() => gameStore.canResumeTutorial())
  const resumeInfo = computed(() => gameStore.getTutorialResumeInfo())
  const tutorialProgress = computed(() => gameStore.getTutorialProgress())

  const currentStep = computed<TutorialStepConfig | null>(() => {
    if (!currentStepKey.value) return null
    return TUTORIAL_STEPS.find(s => s.key === currentStepKey.value) || null
  })

  const totalSteps = computed(() => TUTORIAL_STEPS.length)

  const currentStepIndex = computed(() => {
    if (!currentStepKey.value) return -1
    return TUTORIAL_STEPS.findIndex(s => s.key === currentStepKey.value)
  })

  const progress = computed(() => {
    const completed = tutorialState.value.completedSteps.length
    const skipped = tutorialState.value.skippedSteps.length
    const total = totalSteps.value
    return {
      completed,
      skipped,
      total,
      percentage: total > 0 ? Math.round(((completed + skipped) / total) * 100) : 0,
    }
  })

  const isCurrentStepOnThisRoute = computed(() => {
    if (!currentStep.value?.routeName) return false
    return currentStep.value.routeName === route.name
  })

  const interruptionMessage = computed(() => {
    if (!wasInterrupted.value) return null
    const reason = interruptionReason.value
    const step = currentStep.value
    const stepTitle = step?.title || '引导步骤'

    switch (reason) {
      case 'page_reload':
        return `检测到页面刷新，是否继续「${stepTitle}」？`
      case 'route_change':
        return `你之前离开了引导，是否继续「${stepTitle}」？`
      case 'manual_pause':
        return `引导已暂停，是否继续「${stepTitle}」？`
      default:
        return `是否继续新手引导？`
    }
  })

  function getStepByKey(key: TutorialStepKey): TutorialStepConfig | undefined {
    return TUTORIAL_STEPS.find(s => s.key === key)
  }

  function arePrerequisitesMet(step: TutorialStepConfig): boolean {
    if (!step.prerequisiteSteps || step.prerequisiteSteps.length === 0) {
      return true
    }
    return step.prerequisiteSteps.every(prereq =>
      tutorialState.value.completedSteps.includes(prereq) ||
      tutorialState.value.skippedSteps.includes(prereq)
    )
  }

  function findNextAutoTriggerStep(routeName: string | symbol | null | undefined): TutorialStepConfig | null {
    if (tutorialState.value.isCompleted) return null

    for (const step of TUTORIAL_STEPS) {
      if (!step.autoTrigger) continue
      if (step.routeName !== routeName) continue
      if (tutorialState.value.completedSteps.includes(step.key)) continue
      if (tutorialState.value.skippedSteps.includes(step.key)) continue
      if (!arePrerequisitesMet(step)) continue
      return step
    }
    return null
  }

  function startTutorial() {
    gameStore.startTutorial()
  }

  function skipTutorial() {
    gameStore.skipTutorial()
    routerState.clearInterruption()
  }

  function resetTutorial() {
    gameStore.resetTutorial()
    routerState.clearInterruption()
  }

  function goToStep(stepKey: TutorialStepKey): boolean {
    const step = getStepByKey(stepKey)
    if (!step) return false
    gameStore.setTutorialStep(stepKey)
    return true
  }

  function completeCurrentStep(): boolean {
    if (!currentStepKey.value) return false
    gameStore.completeTutorialStep(currentStepKey.value)
    advanceToNextStep()
    return true
  }

  function skipCurrentStep(): boolean {
    if (!currentStepKey.value) return false
    const step = currentStep.value
    if (!step?.canSkip) return false
    gameStore.skipTutorialStep(currentStepKey.value)
    advanceToNextStep()
    return true
  }

  function advanceToNextStep() {
    const nextStep = findNextAvailableStep()
    if (nextStep) {
      gameStore.setTutorialStep(nextStep.key)
    } else {
      const allDone = TUTORIAL_STEPS.every(s =>
        tutorialState.value.completedSteps.includes(s.key) ||
        tutorialState.value.skippedSteps.includes(s.key)
      )
      if (allDone) {
        gameStore.completeTutorial()
        routerState.clearInterruption()
      } else {
        gameStore.pauseTutorial()
      }
    }
  }

  function findNextAvailableStep(): TutorialStepConfig | null {
    for (const step of TUTORIAL_STEPS) {
      if (tutorialState.value.completedSteps.includes(step.key)) continue
      if (tutorialState.value.skippedSteps.includes(step.key)) continue
      if (!arePrerequisitesMet(step)) continue
      return step
    }
    return null
  }

  function resolveNavigationForCurrentStep(): TutorialNavigationResult {
    if (!currentStep.value || !currentStep.value.routeName) {
      return { shouldRedirect: false }
    }

    const stepRouteName = currentStep.value.routeName
    if (route.name === stepRouteName) {
      return { shouldRedirect: false }
    }

    const result: TutorialNavigationResult = {
      shouldRedirect: true,
      targetRoute: stepRouteName,
    }

    if (stepRouteName === 'commission' || stepRouteName === 'deduction' || stepRouteName === 'repair') {
      const commissionId = gameStore.state.currentCommissionId
      if (commissionId) {
        result.targetParams = { id: commissionId }
      }
    } else if (stepRouteName === 'ending') {
      const commissionId = gameStore.state.currentCommissionId
      const endingType = gameStore.state.currentEndingType
      if (commissionId && endingType) {
        result.targetParams = { id: commissionId, type: endingType }
      }
    }

    return result
  }

  function tryAutoTriggerOnRoute(routeName: string | symbol | null | undefined) {
    if (tutorialState.value.isCompleted) return
    if (!tutorialState.value.isActive && tutorialState.value.completedSteps.length === 0 && !tutorialState.value.wasInterrupted) return

    if (tutorialState.value.currentStep) {
      const step = getStepByKey(tutorialState.value.currentStep)
      if (step?.routeName === routeName) {
        gameStore.setTutorialActive(true)
        return
      }
    }

    const nextStep = findNextAutoTriggerStep(routeName)
    if (nextStep) {
      gameStore.setTutorialStep(nextStep.key)
    }
  }

  function markStepCompletedByAction(stepKey: TutorialStepKey) {
    if (tutorialState.value.completedSteps.includes(stepKey)) return
    if (tutorialState.value.currentStep !== stepKey) return
    completeCurrentStep()
  }

  async function resumeTutorial(): Promise<boolean> {
    if (!canResume.value) return false

    isResuming.value = true
    showResumePrompt.value = false

    try {
      const success = await routerState.resumeFromInterruption()
      if (success) {
        gameStore.resumeTutorial()
        return true
      }
      return false
    } finally {
      isResuming.value = false
    }
  }

  function dismissResumePrompt() {
    showResumePrompt.value = false
  }

  function skipResume() {
    showResumePrompt.value = false
    gameStore.clearTutorialInterruption()
    routerState.clearInterruption()
  }

  function pauseTutorial() {
    if (currentStep.value?.routeName) {
      const resumeContext: TutorialResumeContext = {
        routeName: currentStep.value.routeName,
        targetStep: currentStepKey.value!,
        timestamp: new Date().toISOString(),
      }
      if (route.params) {
        resumeContext.routeParams = { ...route.params } as Record<string, string>
      }
      gameStore.markTutorialInterruption('manual_pause', resumeContext)
    } else {
      gameStore.pauseTutorial()
    }
  }

  async function navigateToStepRoute(stepKey: TutorialStepKey): Promise<boolean> {
    const step = getStepByKey(stepKey)
    if (!step?.routeName) return false

    const target = routerState.getExpectedRouteForStep(stepKey)
    if (!target) return false

    try {
      await router.push(target)
      gameStore.setTutorialStep(stepKey)
      return true
    } catch (e) {
      console.warn('Failed to navigate to step route:', e)
      return false
    }
  }

  function getRouteParamsForStep(stepKey: TutorialStepKey): Record<string, string> | undefined {
    const step = getStepByKey(stepKey)
    if (!step?.routeName) return undefined

    const params: Record<string, string> = {}
    if (['commission', 'deduction', 'repair'].includes(step.routeName)) {
      const commissionId = gameStore.state.currentCommissionId
      if (commissionId) {
        params.id = commissionId
      }
    } else if (step.routeName === 'ending') {
      const commissionId = gameStore.state.currentCommissionId
      const endingType = gameStore.state.currentEndingType
      if (commissionId && endingType) {
        params.id = commissionId
        params.type = endingType
      }
    }

    return Object.keys(params).length > 0 ? params : undefined
  }

  function checkAndHandleInterruption() {
    if (wasInterrupted.value && canResume.value && route.name === 'home') {
      showResumePrompt.value = true
    }
  }

  function handleBeforeUnload() {
    if (isActive.value && currentStepKey.value) {
      routerState.markInterruption('page_reload')
    }
  }

  watch(
    () => route.name,
    (newRouteName) => {
      tryAutoTriggerOnRoute(newRouteName)
    },
    { immediate: true }
  )

  watch(
    () => tutorialState.value.wasInterrupted,
    (interrupted) => {
      if (interrupted && route.name === 'home') {
        checkAndHandleInterruption()
      }
    }
  )

  onMounted(() => {
    checkAndHandleInterruption()
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  return {
    tutorialState,
    isActive,
    isCompleted,
    currentStepKey,
    currentStep,
    totalSteps,
    currentStepIndex,
    progress,
    isCurrentStepOnThisRoute,
    wasInterrupted,
    interruptionReason,
    canResume,
    resumeInfo,
    tutorialProgress,
    isResuming,
    showResumePrompt,
    interruptionMessage,
    getStepByKey,
    arePrerequisitesMet,
    findNextAutoTriggerStep,
    startTutorial,
    skipTutorial,
    resetTutorial,
    goToStep,
    completeCurrentStep,
    skipCurrentStep,
    advanceToNextStep,
    resolveNavigationForCurrentStep,
    tryAutoTriggerOnRoute,
    markStepCompletedByAction,
    resumeTutorial,
    dismissResumePrompt,
    skipResume,
    pauseTutorial,
    navigateToStepRoute,
    getRouteParamsForStep,
    checkAndHandleInterruption,
  }
}
