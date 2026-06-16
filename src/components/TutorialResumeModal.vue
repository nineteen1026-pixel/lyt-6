<script setup lang="ts">
import { computed } from 'vue'
import { Play, X, RotateCcw, BookOpen } from 'lucide-vue-next'
import type { TutorialStepConfig } from '../types'

const props = defineProps<{
  visible: boolean
  message: string | null
  currentStep: TutorialStepConfig | null
  progress: {
    completed: number
    skipped: number
    total: number
    percentage: number
  }
}>()

const emit = defineEmits<{
  resume: []
  skip: []
  dismiss: []
}>()

const progressPercent = computed(() => props.progress.percentage)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="resume-modal-overlay" @click.self="emit('dismiss')">
        <div class="resume-modal">
          <div class="resume-icon">
            <RotateCcw class="w-10 h-10" />
          </div>

          <button
            class="resume-close"
            @click="emit('dismiss')"
            title="关闭"
          >
            <X class="w-5 h-5" />
          </button>

          <h2 class="resume-title">继续新手引导</h2>

          <p v-if="message" class="resume-message">{{ message }}</p>

          <div v-if="currentStep" class="resume-step-info">
            <div class="step-label">当前步骤</div>
            <div class="step-title">{{ currentStep.title }}</div>
          </div>

          <div class="resume-progress">
            <div class="progress-header">
              <span class="progress-label">引导进度</span>
              <span class="progress-value">{{ progress.completed }}/{{ progress.total }}</span>
            </div>
            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{ width: `${progressPercent}%` }"
              />
            </div>
          </div>

          <div class="resume-actions">
            <button class="btn-skip" @click="emit('skip')">
              <BookOpen class="w-4 h-4" />
              <span>跳过引导</span>
            </button>
            <button class="btn-resume" @click="emit('resume')">
              <Play class="w-4 h-4" />
              <span>继续引导</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.resume-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(6px);
  padding: 20px;
}

.resume-modal {
  position: relative;
  background: linear-gradient(135deg, #fefcf7 0%, #faf5eb 100%);
  border-radius: 20px;
  box-shadow:
    0 25px 80px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(212, 175, 55, 0.25);
  padding: 32px 28px 24px;
  width: 100%;
  max-width: 400px;
  text-align: center;
  animation: modal-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.resume-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: linear-gradient(135deg, var(--color-gold) 0%, var(--color-primary) 100%);
  color: white;
  margin-bottom: 16px;
  box-shadow:
    0 8px 24px rgba(212, 175, 55, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.resume-icon svg {
  animation: icon-bounce 2s ease-in-out infinite;
}

@keyframes icon-bounce {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

.resume-close {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  color: #a8a29e;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.resume-close:hover {
  color: #57534e;
  background: rgba(0, 0, 0, 0.05);
}

.resume-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 12px;
  font-family: 'ZCOOL XiaoWei', 'Noto Serif SC', serif;
}

.resume-message {
  font-size: 0.9rem;
  color: var(--color-text-light);
  line-height: 1.6;
  margin: 0 0 20px;
}

.resume-step-info {
  background: rgba(212, 175, 55, 0.08);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 20px;
  text-align: left;
}

.step-label {
  font-size: 0.75rem;
  color: #92400e;
  font-weight: 500;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.step-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.resume-progress {
  text-align: left;
  margin-bottom: 24px;
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 0.8rem;
  color: #78716c;
}

.progress-value {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-primary);
}

.progress-track {
  height: 8px;
  background: rgba(212, 175, 55, 0.15);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-gold), var(--color-primary));
  border-radius: 4px;
  transition: width 0.5s ease;
}

.resume-actions {
  display: flex;
  gap: 12px;
}

.btn-skip {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #78716c;
  background: white;
  border: 2px solid rgba(168, 162, 158, 0.25);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-skip:hover {
  border-color: rgba(168, 162, 158, 0.45);
  background: #fafaf9;
  transform: translateY(-1px);
}

.btn-resume {
  flex: 1.3;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 6px 16px rgba(139, 105, 20, 0.3);
}

.btn-resume:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(139, 105, 20, 0.4);
  filter: brightness(1.1);
}

.btn-resume:active {
  transform: translateY(0);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-leave-active .resume-modal {
  animation: modal-out 0.25s ease-in forwards;
}

@keyframes modal-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
}
</style>
