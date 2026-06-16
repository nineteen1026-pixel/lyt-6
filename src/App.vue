<script setup lang="ts">
import { useRouter } from 'vue-router'
import { onMounted, computed } from 'vue'
import AchievementToast from './components/AchievementToast.vue'
import TutorialTooltip from './components/TutorialTooltip.vue'
import TutorialResumeModal from './components/TutorialResumeModal.vue'
import { useAchievements } from './composables/useAchievements'
import { useTutorial } from './composables/useTutorial'

const router = useRouter()
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

const showTooltip = computed(() => {
  return isActive.value && !isCompleted.value && currentStep.value && isCurrentStepOnThisRoute.value
})

const canSkipCurrentStep = computed(() => {
  return currentStep.value?.canSkip !== false
})

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
  startListening()
})
</script>

<template>
  <router-view v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" />
    </Transition>
  </router-view>
  
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
