<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { X, SkipForward, ChevronRight, HelpCircle } from 'lucide-vue-next'
import type { TutorialStepConfig } from '../types'

const props = defineProps<{
  step: TutorialStepConfig | null
  isVisible: boolean
  currentStepIndex: number
  totalSteps: number
  canSkip: boolean
}>()

const emit = defineEmits<{
  complete: []
  skip: []
  next: []
  close: []
}>()

const tooltipRef = ref<HTMLElement | null>(null)
const targetEl = ref<HTMLElement | null>(null)
const tooltipPosition = ref({ top: 0, left: 0 })
const highlightRect = ref({ top: 0, left: 0, width: 0, height: 0 })
const isCenterMode = computed(() => props.step?.placement === 'center')

const progressPercent = computed(() => {
  if (props.totalSteps <= 0) return 0
  return Math.round(((props.currentStepIndex + 1) / props.totalSteps) * 100)
})

function findTargetElement(): HTMLElement | null {
  if (!props.step?.targetSelector) return null
  return document.querySelector(props.step.targetSelector) as HTMLElement | null
}

function calculatePosition() {
  if (!props.step) return
  if (isCenterMode.value) return

  const target = findTargetElement()
  targetEl.value = target

  if (!target || !tooltipRef.value) {
    if (tooltipRef.value) {
      tooltipRef.value.style.opacity = '0'
    }
    return
  }

  const targetRect = target.getBoundingClientRect()
  const padding = props.step.highlightPadding || 8

  highlightRect.value = {
    top: targetRect.top - padding + window.scrollY,
    left: targetRect.left - padding + window.scrollY,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
  }

  const tooltipRect = tooltipRef.value.getBoundingClientRect()
  const placement = props.step.placement || 'bottom'
  const gap = 12

  let top = 0
  let left = 0

  switch (placement) {
    case 'top':
      top = targetRect.top - tooltipRect.height - gap + window.scrollY
      left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2 + window.scrollX
      break
    case 'bottom':
      top = targetRect.bottom + gap + window.scrollY
      left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2 + window.scrollX
      break
    case 'left':
      top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2 + window.scrollY
      left = targetRect.left - tooltipRect.width - gap + window.scrollX
      break
    case 'right':
      top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2 + window.scrollY
      left = targetRect.right + gap + window.scrollX
      break
  }

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  if (left < 16) left = 16
  if (left + tooltipRect.width > viewportWidth - 16) {
    left = viewportWidth - tooltipRect.width - 16
  }
  if (top < 16) top = 16
  if (top + tooltipRect.height > viewportHeight + window.scrollY - 16) {
    top = viewportHeight + window.scrollY - tooltipRect.height - 16
  }

  tooltipPosition.value = { top, left }

  nextTick(() => {
    if (tooltipRef.value) {
      tooltipRef.value.style.opacity = '1'
    }
  })
}

function scrollTargetIntoView() {
  if (!props.step?.targetSelector) return
  const target = findTargetElement()
  if (!target) return

  target.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'center',
  })
}

function handleNext() {
  emit('next')
}

function handleSkip() {
  emit('skip')
}

function handleClose() {
  emit('close')
}

watch(
  () => [props.step, props.isVisible],
  async () => {
    if (props.isVisible && props.step) {
      await nextTick()
      if (!isCenterMode.value) {
        scrollTargetIntoView()
        setTimeout(calculatePosition, 300)
      }
    }
  },
  { immediate: true }
)

watch(
  () => props.step?.targetSelector,
  () => {
    if (props.isVisible && props.step?.targetSelector) {
      nextTick(() => {
        calculatePosition()
      })
    }
  }
)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (props.isVisible && props.step && !isCenterMode.value) {
    setTimeout(calculatePosition, 500)
  }

  window.addEventListener('resize', calculatePosition)
  window.addEventListener('scroll', calculatePosition, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', calculatePosition)
  window.removeEventListener('scroll', calculatePosition, true)
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="tutorial-fade">
      <div v-if="isVisible && step" class="tutorial-overlay">
        <div
          v-if="!isCenterMode && targetEl"
          class="tutorial-highlight"
          :style="{
            top: `${highlightRect.top}px`,
            left: `${highlightRect.left}px`,
            width: `${highlightRect.width}px`,
            height: `${highlightRect.height}px`,
          }"
        />

        <div
          v-if="!isCenterMode"
          class="tutorial-mask"
          @click="handleClose"
        />

        <div
          ref="tooltipRef"
          :class="[
            'tutorial-tooltip',
            { 'center-mode': isCenterMode },
            `placement-${step.placement || 'bottom'}`
          ]"
          :style="!isCenterMode ? {
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          } : {}"
        >
          <div class="tooltip-header">
            <div class="tooltip-icon">
              <HelpCircle class="w-5 h-5" />
            </div>
            <h3 class="tooltip-title">{{ step.title }}</h3>
            <button
              v-if="canSkip"
              class="tooltip-close"
              @click="handleSkip"
              title="跳过引导"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="tooltip-content">
            <p>{{ step.content }}</p>
          </div>

          <div class="tooltip-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${progressPercent}%` }"
              />
            </div>
            <span class="progress-text">
              {{ currentStepIndex + 1 }} / {{ totalSteps }}
            </span>
          </div>

          <div class="tooltip-actions">
            <button
              v-if="canSkip && step.canSkip !== false"
              class="btn-skip"
              @click="handleSkip"
            >
              <SkipForward class="w-4 h-4" />
              <span>跳过</span>
            </button>
            <button
              class="btn-next"
              @click="handleNext"
            >
              <span>{{ currentStepIndex + 1 >= totalSteps ? '完成引导' : '下一步' }}</span>
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>

          <div v-if="!isCenterMode" class="tooltip-arrow" :class="`arrow-${step.placement || 'bottom'}`" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.tutorial-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

.tutorial-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  z-index: 0;
}

.tutorial-highlight {
  position: absolute;
  border: 2px solid var(--color-gold);
  border-radius: 12px;
  box-shadow:
    0 0 0 9999px rgba(0, 0, 0, 0.4),
    0 0 20px rgba(212, 175, 55, 0.5),
    inset 0 0 20px rgba(212, 175, 55, 0.1);
  z-index: 1;
  pointer-events: none;
  animation: highlight-pulse 2s ease-in-out infinite;
}

@keyframes highlight-pulse {
  0%, 100% {
    box-shadow:
      0 0 0 9999px rgba(0, 0, 0, 0.4),
      0 0 20px rgba(212, 175, 55, 0.5),
      inset 0 0 20px rgba(212, 175, 55, 0.1);
  }
  50% {
    box-shadow:
      0 0 0 9999px rgba(0, 0, 0, 0.4),
      0 0 30px rgba(212, 175, 55, 0.7),
      inset 0 0 30px rgba(212, 175, 55, 0.15);
  }
}

.tutorial-tooltip {
  position: absolute;
  background: linear-gradient(135deg, #fefcf7 0%, #faf5eb 100%);
  border-radius: 16px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(212, 175, 55, 0.3);
  padding: 20px;
  min-width: 280px;
  max-width: 360px;
  z-index: 9999;
  opacity: 0;
  transform-origin: center;
  animation: tooltip-in 0.3s ease-out forwards;
}

.tutorial-tooltip.center-mode {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 320px;
  max-width: 440px;
  opacity: 1;
  animation: center-tooltip-in 0.4s ease-out forwards;
}

@keyframes tooltip-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes center-tooltip-in {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.tooltip-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.tooltip-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-gold) 0%, var(--color-primary-light) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
}

.tooltip-title {
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  font-family: 'ZCOOL XiaoWei', 'Noto Serif SC', serif;
}

.tooltip-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: #a8a29e;
  transition: all 0.2s;
  background: transparent;
  border: none;
  cursor: pointer;
}

.tooltip-close:hover {
  color: #57534e;
  background: rgba(0, 0, 0, 0.05);
}

.tooltip-content {
  margin-bottom: 16px;
}

.tooltip-content p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-text-light);
}

.tooltip-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(212, 175, 55, 0.15);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-gold), var(--color-primary));
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.75rem;
  color: #a8a29e;
  font-weight: 500;
  white-space: nowrap;
}

.tooltip-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.btn-skip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 0.85rem;
  color: #a8a29e;
  background: transparent;
  border: 1px solid rgba(168, 162, 158, 0.3);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-skip:hover {
  color: #78716c;
  border-color: rgba(168, 162, 158, 0.5);
  background: rgba(0, 0, 0, 0.03);
}

.btn-next {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 500;
  color: white;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(139, 105, 20, 0.25);
}

.btn-next:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(139, 105, 20, 0.35);
  filter: brightness(1.1);
}

.btn-next:active {
  transform: translateY(0);
}

.tooltip-arrow {
  position: absolute;
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #fefcf7 0%, #faf5eb 100%);
  transform: rotate(45deg);
  box-shadow: 1px 1px 0 rgba(212, 175, 55, 0.2);
}

.arrow-top {
  bottom: -8px;
  left: 50%;
  margin-left: -8px;
}

.arrow-bottom {
  top: -8px;
  left: 50%;
  margin-left: -8px;
}

.arrow-left {
  right: -8px;
  top: 50%;
  margin-top: -8px;
}

.arrow-right {
  left: -8px;
  top: 50%;
  margin-top: -8px;
}

.tutorial-fade-enter-active,
.tutorial-fade-leave-active {
  transition: opacity 0.25s ease;
}

.tutorial-fade-enter-from,
.tutorial-fade-leave-to {
  opacity: 0;
}

.tutorial-fade-leave-active .tutorial-tooltip {
  animation: tooltip-out 0.2s ease-in forwards;
}

.tutorial-fade-leave-active .tutorial-tooltip.center-mode {
  animation: center-tooltip-out 0.2s ease-in forwards;
}

@keyframes tooltip-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}

@keyframes center-tooltip-out {
  from {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.95);
  }
}
</style>
