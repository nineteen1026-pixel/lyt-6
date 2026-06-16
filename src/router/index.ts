import { createRouter, createWebHistory, type RouteLocationNormalized, type NavigationGuardNext } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import CommissionList from '@/pages/CommissionList.vue'
import ItemDetail from '@/pages/ItemDetail.vue'
import DeductionBoard from '@/pages/DeductionBoard.vue'
import RepairProcess from '@/pages/RepairProcess.vue'
import EndingPage from '@/pages/EndingPage.vue'
import GalleryPage from '@/pages/GalleryPage.vue'
import RoadmapPage from '@/pages/RoadmapPage.vue'
import TimelinePage from '@/pages/TimelinePage.vue'
import { useGameStore } from '@/stores/game'
import { TUTORIAL_STEPS } from '@/types'
import type { TutorialStepKey, TutorialRouteGuardAction } from '@/types'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: { tutorialKey: 'home_welcome' as TutorialStepKey },
  },
  {
    path: '/roadmap',
    name: 'roadmap',
    component: RoadmapPage,
    meta: { tutorialKey: 'roadmap_intro' as TutorialStepKey },
  },
  {
    path: '/commissions',
    name: 'commissions',
    component: CommissionList,
    meta: { tutorialKey: 'commissions_list' as TutorialStepKey },
  },
  {
    path: '/commission/:id',
    name: 'commission',
    component: ItemDetail,
    meta: { tutorialKey: 'item_intro' as TutorialStepKey },
  },
  {
    path: '/deduction/:id',
    name: 'deduction',
    component: DeductionBoard,
    meta: { tutorialKey: 'deduction_intro' as TutorialStepKey },
  },
  {
    path: '/repair/:id',
    name: 'repair',
    component: RepairProcess,
    meta: { tutorialKey: 'repair_intro' as TutorialStepKey },
  },
  {
    path: '/ending/:id/:type',
    name: 'ending',
    component: EndingPage,
    meta: { tutorialKey: 'ending_intro' as TutorialStepKey },
  },
  {
    path: '/gallery',
    name: 'gallery',
    component: GalleryPage,
    meta: { tutorialKey: 'gallery_intro' as TutorialStepKey },
  },
  {
    path: '/timeline',
    name: 'timeline',
    component: TimelinePage,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

let gameStore: ReturnType<typeof useGameStore> | null = null

function getGameStore() {
  if (!gameStore) {
    gameStore = useGameStore()
  }
  return gameStore
}

function getTutorialContext(route: RouteLocationNormalized) {
  const store = getGameStore()
  const tutorial = store.state.tutorialState
  const currentStep = tutorial.currentStep
    ? TUTORIAL_STEPS.find(s => s.key === tutorial.currentStep)
    : null
  return {
    tutorial,
    currentStep,
    isTutorialActive: tutorial.isActive && !tutorial.isCompleted,
    wasInterrupted: tutorial.wasInterrupted,
    canResume: store.canResumeTutorial(),
  }
}

function evaluateTutorialRouteGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
): TutorialRouteGuardAction {
  const { tutorial, currentStep, isTutorialActive, wasInterrupted, canResume } = getTutorialContext(to)

  if (tutorial.isCompleted) {
    return { type: 'proceed' }
  }

  if (wasInterrupted && canResume && to.name === 'home') {
    const resumeContext = tutorial.resumeContext
    if (resumeContext) {
      return {
        type: 'redirect',
        routeName: resumeContext.routeName,
        params: resumeContext.routeParams,
        reason: 'tutorial_interruption_resume',
      }
    }
  }

  if (isTutorialActive && currentStep?.routeName) {
    const expectedRouteName = currentStep.routeName
    const currentRouteName = String(to.name || '')

    if (currentRouteName !== expectedRouteName) {
      if (!currentStep.persistOnNavigate) {
        const store = getGameStore()
        store.markTutorialInterruption('route_change', {
          routeName: expectedRouteName,
          targetStep: currentStep.key,
          timestamp: new Date().toISOString(),
        })
        return { type: 'proceed' }
      }

      const params: Record<string, string> = {}
      if (['commission', 'deduction', 'repair'].includes(expectedRouteName)) {
        const commissionId = getGameStore().state.currentCommissionId
        if (commissionId) {
          params.id = commissionId
        }
      } else if (expectedRouteName === 'ending') {
        const store = getGameStore()
        const commissionId = store.state.currentCommissionId
        const endingType = store.state.currentEndingType
        if (commissionId && endingType) {
          params.id = commissionId
          params.type = endingType
        }
      }

      return {
        type: 'redirect',
        routeName: expectedRouteName,
        params: Object.keys(params).length > 0 ? params : undefined,
        reason: 'tutorial_step_route_mismatch',
      }
    }
  }

  const toStepKey = to.meta?.tutorialKey as TutorialStepKey | undefined
  if (toStepKey && isTutorialActive) {
    const store = getGameStore()
    if (store.isTutorialStepEligible(toStepKey)) {
      const step = TUTORIAL_STEPS.find(s => s.key === toStepKey)
      if (step?.autoTrigger) {
        store.setTutorialStep(toStepKey)
      }
    }
  }

  if (from.name && isTutorialActive) {
    const store = getGameStore()
    store.updateTutorialRoute(
      String(to.name || ''),
      { ...to.params } as Record<string, string>
    )
  }

  return { type: 'proceed' }
}

router.beforeEach((to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
  try {
    const action = evaluateTutorialRouteGuard(to, from)

    switch (action.type) {
      case 'proceed':
        next()
        break
      case 'redirect':
        next({
          name: action.routeName,
          params: action.params,
          replace: true,
        })
        break
      case 'pause_and_save':
        next()
        break
      default:
        next()
    }
  } catch (e) {
    console.warn('Tutorial route guard error:', e)
    next()
  }
})

router.afterEach((to: RouteLocationNormalized, from: RouteLocationNormalized) => {
  try {
    const store = getGameStore()
    const tutorial = store.state.tutorialState

    if (!tutorial.isCompleted) {
      store.updateTutorialRoute(
        String(to.name || ''),
        { ...to.params } as Record<string, string>
      )
    }

    if (to.name === 'home' && !tutorial.isCompleted) {
      if (tutorial.wasInterrupted && store.canResumeTutorial()) {
        store.resumeTutorial()
      } else if (tutorial.completedSteps.length === 0 && !tutorial.isActive) {
        store.startTutorial()
      }
    }
  } catch (e) {
    console.warn('Tutorial afterEach error:', e)
  }
})

export default router
