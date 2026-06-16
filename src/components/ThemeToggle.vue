<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Palette, Sparkles, X, ChevronRight, Volume2, VolumeX, Wind, Gauge, Type, Zap } from 'lucide-vue-next'
import {
  usePreferencesStore,
  THEME_CONFIGS,
  type ThemeMode,
  type AmbientLevel,
  type AnimationLevel,
} from '../stores/preferences'
import { useSound } from '../composables/useSound'

const prefs = usePreferencesStore()
const { playClick, playTransition, resumeContext } = useSound()

const showPanel = ref(false)
const activeTab = ref<'theme' | 'effects'>('theme')

const currentThemeConfig = computed(() => prefs.themeConfig)

const ambientOptions: { value: AmbientLevel; label: string; icon: string; desc: string }[] = [
  { value: 'off', label: '关闭', icon: '⭕', desc: '纯净无装饰' },
  { value: 'subtle', label: '淡雅', icon: '🌸', desc: '若隐若现的点缀' },
  { value: 'normal', label: '适中', icon: '✨', desc: '恰到好处的氛围' },
  { value: 'rich', label: '浓郁', icon: '🌟', desc: '沉浸感十足' },
]

const animationOptions: { value: AnimationLevel; label: string; icon: string; desc: string }[] = [
  { value: 'minimal', label: '精简', icon: '🐢', desc: '仅必要过渡' },
  { value: 'normal', label: '标准', icon: '🐇', desc: '平衡的动效节奏' },
  { value: 'playful', label: '灵动', icon: '🦋', desc: '活泼的动画效果' },
]

const fontSizeOptions: { value: 'small' | 'normal' | 'large'; label: string; size: string }[] = [
  { value: 'small', label: '小', size: '0.9rem' },
  { value: 'normal', label: '中', size: '1rem' },
  { value: 'large', label: '大', size: '1.125rem' },
]

onMounted(() => {
  prefs.initialize()
})

function togglePanel() {
  resumeContext()
  playClick()
  showPanel.value = !showPanel.value
}

function selectTheme(id: ThemeMode) {
  playTransition()
  prefs.setTheme(id)
}

function setAmbient(level: AmbientLevel) {
  playClick()
  prefs.setAmbientLevel(level)
}

function setAnimation(level: AnimationLevel) {
  playClick()
  prefs.setAnimationLevel(level)
}

function setFontSize(size: 'small' | 'normal' | 'large') {
  playClick()
  prefs.setFontSize(size)
}

function toggleSound() {
  prefs.setSoundEnabled(!prefs.soundEnabled)
}

function toggleReducedMotion() {
  prefs.setReducedMotion(!prefs.reducedMotion)
}
</script>

<template>
  <div class="theme-toggle-wrapper">
    <button
      class="theme-toggle-btn"
      @click="togglePanel"
      :title="`主题：${currentThemeConfig.name}`"
    >
      <span class="theme-icon-main">{{ currentThemeConfig.icon }}</span>
      <Palette class="w-4 h-4 palette-icon" />
    </button>

    <Teleport to="body">
      <Transition name="panel-fade">
        <div v-if="showPanel" class="panel-overlay" @click.self="togglePanel">
          <div class="theme-panel animate-scale-in">
            <div class="panel-header">
              <div class="flex items-center gap-2">
                <Sparkles class="w-5 h-5 text-amber-500" />
                <h3 class="font-display text-lg font-bold text-stone-800 dark:text-stone-200">偏好设置</h3>
              </div>
              <button class="panel-close" @click="togglePanel">
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="panel-tabs">
              <button
                :class="['panel-tab', { active: activeTab === 'theme' }]"
                @click="activeTab = 'theme'"
              >
                <Palette class="w-4 h-4" />
                <span>主题</span>
              </button>
              <button
                :class="['panel-tab', { active: activeTab === 'effects' }]"
                @click="activeTab = 'effects'"
              >
                <Zap class="w-4 h-4" />
                <span>效果</span>
              </button>
            </div>

            <Transition name="fade" mode="out-in">
              <div v-if="activeTab === 'theme'" key="theme" class="panel-content">
                <div class="section-label">
                  <span class="section-dot" />
                  视觉主题
                </div>
                <div class="theme-grid">
                  <button
                    v-for="t in THEME_CONFIGS"
                    :key="t.id"
                    :class="['theme-card', { selected: prefs.theme === t.id }]"
                    @click="selectTheme(t.id)"
                  >
                    <div
                      class="theme-preview"
                      :style="{ '--theme-accent': t.accent }"
                    >
                      <span class="theme-preview-icon">{{ t.icon }}</span>
                      <div class="theme-preview-colors">
                        <span class="preview-color c1" />
                        <span class="preview-color c2" />
                        <span class="preview-color c3" />
                      </div>
                    </div>
                    <div class="theme-info">
                      <div class="theme-name">{{ t.name }}</div>
                      <div class="theme-desc">{{ t.description }}</div>
                    </div>
                    <ChevronRight
                      v-if="prefs.theme === t.id"
                      class="w-4 h-4 theme-check"
                    />
                  </button>
                </div>

                <div class="section-label mt-5">
                  <span class="section-dot" />
                  字体大小
                </div>
                <div class="option-row">
                  <Type class="w-4 h-4 text-stone-500" />
                  <div class="seg-control">
                    <button
                      v-for="opt in fontSizeOptions"
                      :key="opt.value"
                      :class="['seg-btn', { active: prefs.fontSize === opt.value }]"
                      :style="{ fontSize: opt.size }"
                      @click="setFontSize(opt.value)"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                </div>
              </div>

              <div v-else key="effects" class="panel-content">
                <div class="section-label">
                  <span class="section-dot" />
                  氛围特效
                </div>
                <div class="option-list">
                  <button
                    v-for="opt in ambientOptions"
                    :key="opt.value"
                    :class="['option-card', { selected: prefs.ambientLevel === opt.value }]"
                    @click="setAmbient(opt.value)"
                  >
                    <span class="option-icon">{{ opt.icon }}</span>
                    <div class="option-text">
                      <div class="option-title flex items-center gap-2">
                        <Wind class="w-3.5 h-3.5 text-amber-500" />
                        {{ opt.label }}
                      </div>
                      <div class="option-desc">{{ opt.desc }}</div>
                    </div>
                  </button>
                </div>

                <div class="section-label mt-5">
                  <span class="section-dot" />
                  动画节奏
                </div>
                <div class="option-list">
                  <button
                    v-for="opt in animationOptions"
                    :key="opt.value"
                    :class="['option-card', { selected: prefs.animationLevel === opt.value }]"
                    @click="setAnimation(opt.value)"
                  >
                    <span class="option-icon">{{ opt.icon }}</span>
                    <div class="option-text">
                      <div class="option-title flex items-center gap-2">
                        <Gauge class="w-3.5 h-3.5 text-amber-500" />
                        {{ opt.label }}
                      </div>
                      <div class="option-desc">{{ opt.desc }}</div>
                    </div>
                  </button>
                </div>

                <div class="section-label mt-5">
                  <span class="section-dot" />
                  其他选项
                </div>
                <div class="toggle-list">
                  <div class="toggle-item">
                    <div class="toggle-left">
                      <Volume2 class="w-4 h-4 text-stone-500" />
                      <div>
                        <div class="toggle-title">音效提示</div>
                        <div class="toggle-desc">交互时的轻量音效</div>
                      </div>
                    </div>
                    <button
                      :class="['switch', { on: prefs.soundEnabled }]"
                      @click="toggleSound"
                    >
                      <span class="switch-thumb">
                        <Volume2 v-if="prefs.soundEnabled" class="w-3 h-3" />
                        <VolumeX v-else class="w-3 h-3" />
                      </span>
                    </button>
                  </div>

                  <div class="toggle-item">
                    <div class="toggle-left">
                      <Zap class="w-4 h-4 text-stone-500" />
                      <div>
                        <div class="toggle-title">减少动画</div>
                        <div class="toggle-desc">适合慢速网络或晕动症</div>
                      </div>
                    </div>
                    <button
                      :class="['switch', { on: prefs.reducedMotion }]"
                      @click="toggleReducedMotion"
                    >
                      <span class="switch-thumb" :class="{ translate: prefs.reducedMotion }" />
                    </button>
                  </div>
                </div>
              </div>
            </Transition>

            <div class="panel-footer">
              <span class="hint-text">
                ✦ 所有设置自动保存到本地
              </span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.theme-toggle-wrapper {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 90;
}

.theme-toggle-btn {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(250, 245, 232, 0.9));
  border: 1.5px solid rgba(212, 175, 55, 0.35);
  box-shadow:
    0 4px 16px rgba(61, 41, 20, 0.12),
    0 0 0 1px rgba(255, 255, 255, 0.6) inset;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
}

.theme-toggle-btn:hover {
  transform: translateY(-2px) scale(1.05);
  border-color: rgba(212, 175, 55, 0.6);
  box-shadow:
    0 6px 24px rgba(212, 175, 55, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.8) inset;
}

.theme-toggle-btn:active {
  transform: translateY(0) scale(0.98);
}

.theme-icon-main {
  font-size: 20px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.palette-icon {
  position: absolute;
  bottom: 2px;
  right: 2px;
  color: #b45309;
  background: white;
  border-radius: 6px;
  padding: 1px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(6px);
}

.theme-panel {
  width: min(520px, 92vw);
  max-height: 85vh;
  background: linear-gradient(145deg, #fefcf7 0%, #faf5eb 100%);
  border-radius: 20px;
  border: 1px solid rgba(212, 175, 55, 0.25);
  box-shadow:
    0 25px 60px -10px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.6) inset;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

:global(.dark) .theme-panel {
  background: linear-gradient(145deg, #1f2937 0%, #111827 100%);
  border-color: rgba(156, 163, 175, 0.2);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.18);
  background: linear-gradient(to right, rgba(212, 175, 55, 0.06), transparent);
}

:global(.dark) .panel-header {
  border-bottom-color: rgba(156, 163, 175, 0.15);
}

.panel-close {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #78716c;
  transition: all 0.2s;
  cursor: pointer;
  background: transparent;
  border: none;
}

.panel-close:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #44403c;
}

:global(.dark) .panel-close {
  color: #9ca3af;
}

:global(.dark) .panel-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e5e7eb;
}

.panel-tabs {
  display: flex;
  gap: 6px;
  padding: 12px 22px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.12);
}

.panel-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #78716c;
  background: transparent;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: all 0.25s;
}

.panel-tab:hover {
  background: rgba(212, 175, 55, 0.08);
  color: #92400e;
}

.panel-tab.active {
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.14), rgba(212, 175, 55, 0.06));
  border-color: rgba(212, 175, 55, 0.4);
  color: #92400e;
  box-shadow: 0 2px 8px rgba(212, 175, 55, 0.12);
}

:global(.dark) .panel-tab {
  color: #9ca3af;
}

:global(.dark) .panel-tab.active {
  background: linear-gradient(135deg, rgba(156, 163, 175, 0.18), rgba(156, 163, 175, 0.06));
  border-color: rgba(156, 163, 175, 0.35);
  color: #f3f4f6;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 22px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #a8a29e;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.section-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4af37, #b45309);
  box-shadow: 0 0 8px rgba(212, 175, 55, 0.5);
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.theme-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  border: 1.5px solid rgba(212, 175, 55, 0.15);
  background: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
}

.theme-card:hover {
  border-color: rgba(212, 175, 55, 0.45);
  background: rgba(255, 255, 255, 0.88);
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(212, 175, 55, 0.15);
}

.theme-card.selected {
  border-color: var(--theme-accent, #d4af37);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--theme-accent, #d4af37) 10%, transparent),
    rgba(255, 255, 255, 0.8)
  );
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--theme-accent, #d4af37) 18%, transparent),
    0 4px 14px rgba(0, 0, 0, 0.08);
}

.theme-preview {
  width: 50px;
  height: 50px;
  flex-shrink: 0;
  border-radius: 12px;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--theme-accent, #d4af37) 16%, #faf5eb),
    color-mix(in srgb, var(--theme-accent, #d4af37) 8%, white)
  );
  border: 1px solid color-mix(in srgb, var(--theme-accent, #d4af37) 28%, transparent);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.theme-preview-icon {
  font-size: 18px;
}

.theme-preview-colors {
  display: flex;
  gap: 3px;
}

.preview-color {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.preview-color.c1 {
  background: var(--theme-accent, #d4af37);
}
.preview-color.c2 {
  background: color-mix(in srgb, var(--theme-accent, #d4af37) 55%, white);
}
.preview-color.c3 {
  background: color-mix(in srgb, var(--theme-accent, #d4af37) 22%, white);
}

.theme-info {
  flex: 1;
  min-width: 0;
}

.theme-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #44403c;
  margin-bottom: 2px;
}

:global(.dark) .theme-name {
  color: #e5e7eb;
}

.theme-desc {
  font-size: 0.72rem;
  color: #a8a29e;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.theme-check {
  color: var(--theme-accent, #d4af37);
  flex-shrink: 0;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(212, 175, 55, 0.12);
}

:global(.dark) .option-row {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(156, 163, 175, 0.12);
}

.seg-control {
  display: flex;
  padding: 3px;
  background: rgba(212, 175, 55, 0.08);
  border-radius: 10px;
  border: 1px solid rgba(212, 175, 55, 0.18);
}

:global(.dark) .seg-control {
  background: rgba(156, 163, 175, 0.08);
  border-color: rgba(156, 163, 175, 0.18);
}

.seg-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #78716c;
  font-weight: 500;
  transition: all 0.2s;
}

.seg-btn:hover {
  color: #44403c;
}

.seg-btn.active {
  background: white;
  color: #92400e;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(212, 175, 55, 0.2);
}

:global(.dark) .seg-btn {
  color: #9ca3af;
}

:global(.dark) .seg-btn.active {
  background: linear-gradient(135deg, #374151, #1f2937);
  color: #f3f4f6;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(156, 163, 175, 0.25);
}

.option-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1.5px solid rgba(212, 175, 55, 0.12);
  background: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: all 0.25s;
  text-align: left;
}

.option-card:hover {
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(212, 175, 55, 0.3);
  transform: translateX(4px);
}

.option-card.selected {
  border-color: rgba(212, 175, 55, 0.55);
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(255, 255, 255, 0.8));
  box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.12);
}

:global(.dark) .option-card {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(156, 163, 175, 0.14);
}

:global(.dark) .option-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(156, 163, 175, 0.3);
}

:global(.dark) .option-card.selected {
  border-color: rgba(156, 163, 175, 0.45);
  background: linear-gradient(135deg, rgba(156, 163, 175, 0.14), rgba(255, 255, 255, 0.04));
}

.option-icon {
  font-size: 24px;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.12), rgba(212, 175, 55, 0.04));
  border-radius: 12px;
  flex-shrink: 0;
}

.option-text {
  flex: 1;
  min-width: 0;
}

.option-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #44403c;
  margin-bottom: 2px;
}

:global(.dark) .option-title {
  color: #e5e7eb;
}

.option-desc {
  font-size: 0.72rem;
  color: #a8a29e;
}

.toggle-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(212, 175, 55, 0.14);
  background: rgba(255, 255, 255, 0.4);
}

:global(.dark) .toggle-list {
  border-color: rgba(156, 163, 175, 0.14);
  background: rgba(255, 255, 255, 0.03);
}

.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.08);
}

:global(.dark) .toggle-item {
  border-bottom-color: rgba(156, 163, 175, 0.08);
}

.toggle-item:last-child {
  border-bottom: none;
}

.toggle-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #44403c;
}

:global(.dark) .toggle-title {
  color: #e5e7eb;
}

.toggle-desc {
  font-size: 0.7rem;
  color: #a8a29e;
  margin-top: 1px;
}

.switch {
  position: relative;
  width: 52px;
  height: 30px;
  border-radius: 15px;
  background: #d6d3d1;
  border: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
}

.switch.on {
  background: linear-gradient(135deg, #d4af37, #b45309);
  box-shadow: 0 2px 10px rgba(212, 175, 55, 0.4);
}

.switch-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #78716c;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.switch.on .switch-thumb,
.switch-thumb.translate {
  left: 25px;
  color: #92400e;
}

.panel-footer {
  padding: 14px 22px;
  border-top: 1px solid rgba(212, 175, 55, 0.12);
  background: rgba(250, 245, 235, 0.5);
}

:global(.dark) .panel-footer {
  border-top-color: rgba(156, 163, 175, 0.12);
  background: rgba(0, 0, 0, 0.1);
}

.hint-text {
  font-size: 0.72rem;
  color: #a8a29e;
  font-style: italic;
}

.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.25s ease;
}

.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}

.panel-fade-enter-from .theme-panel,
.panel-fade-leave-to .theme-panel {
  transform: scale(0.94) translateY(12px);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(8px);
}
</style>
