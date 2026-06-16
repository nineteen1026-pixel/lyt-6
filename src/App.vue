<script setup lang="ts">
import { useRouter } from 'vue-router'
import { onMounted, computed, provide, ref, watch } from 'vue'
import AchievementToast from './components/AchievementToast.vue'
import TutorialTooltip from './components/TutorialTooltip.vue'
import TutorialResumeModal from './components/TutorialResumeModal.vue'
import ThemeToggle from './components/ThemeToggle.vue'
import AmbientEffects from './components/AmbientEffects.vue'
import { useAchievements } from './composables/useAchievements'
import { useTutorial } from './composables/useTutorial'
import { usePreferencesStore } from './stores/preferences'

const router = useRouter()
const prefs = usePreferencesStore()
const { currentToast, isToastVisible, closeToast, startListening } = useAchievements()

const {
  isActive,
  isCompleted,
  currentStep,
  currentStepIndex,
  totalSteps,
  progress,
  isCurrentStepOnThisRoute,
  showResumePrompt,
  interruptionMessage,
  canResume,
  completeCurrentStep,
  skipCurrentStep,
  skipTutorial,
  resumeTutorial,
  dismissResumePrompt,
  skipResume,
} = useTutorial()

const appRef = ref<HTMLElement | null>(null)
const isTransitioning = ref(false)

const showTooltip = computed(() => {
  return isActive.value && !isCompleted.value && currentStep.value && isCurrentStepOnThisRoute.value
})

const canSkipCurrentStep = computed(() => {
  return currentStep.value?.canSkip !== false
})

watch(
  () => prefs.theme,
  () => {
    isTransitioning.value = true
    setTimeout(() => {
      isTransitioning.value = false
    }, 600)
  }
)

function handleTooltipNext() {
  completeCurrentStep()
}

function handleTooltipSkip() {
  skipCurrentStep()
}

function handleTooltipClose() {
  skipCurrentStep()
}

function handleResume() {
  resumeTutorial()
}

function handleSkipResume() {
  skipResume()
}

function handleDismissResume() {
  dismissResumePrompt()
}

onMounted(() => {
  prefs.initialize()
  startListening()
})

provide('preferences', prefs)
</script>

<template>
  <AmbientEffects />
  <ThemeToggle />

  <div
    ref="appRef"
    :class="['app-root', { 'animate-theme-change': isTransitioning }]"
  >
    <router-view v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </router-view>
  </div>

  <AchievementToast
    v-if="currentToast"
    :achievement="currentToast"
    :visible="isToastVisible"
    @close="closeToast"
  />

  <TutorialTooltip
    :step="currentStep"
    :is-visible="showTooltip"
    :current-step-index="currentStepIndex"
    :total-steps="totalSteps"
    :can-skip="canSkipCurrentStep"
    @next="handleTooltipNext"
    @skip="handleTooltipSkip"
    @close="handleTooltipClose"
  />

  <TutorialResumeModal
    :visible="showResumePrompt"
    :message="interruptionMessage"
    :current-step="currentStep"
    :progress="progress"
    @resume="handleResume"
    @skip="handleSkipResume"
    @dismiss="handleDismissResume"
  />
</template>

<style>
.app-root {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  transition: background-color 0.6s ease;
}

.page-enter-active,
.page-leave-active {
  transition: all 0.4s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(20px);
  filter: blur(4px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-20px);
  filter: blur(4px);
}
</style>
