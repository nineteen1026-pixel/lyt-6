<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Play, RotateCcw, DoorOpen, ScrollText } from 'lucide-vue-next'
import { useGameStore } from '../stores/game'

const router = useRouter()
const gameStore = useGameStore()

const hasSave = computed(() => gameStore.hasSave)
const progress = computed(() => gameStore.completionProgress)

const dustParticles = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  style: {
    '--dust-x': `${Math.random() * 100}%`,
    '--dust-delay': `${Math.random() * 8}s`,
    '--dust-duration': `${6 + Math.random() * 8}s`,
    '--dust-size': `${2 + Math.random() * 3}px`
  }
}))

onMounted(() => {
  gameStore.loadSavedGame()
})

function startNewGame() {
  gameStore.startNewGame()
  router.push('/commissions')
}

function continueGame() {
  const step = gameStore.continueGame()
  if (!step) {
    router.push('/commissions')
    return
  }

  const commissionId = gameStore.state.currentCommissionId
  switch (step) {
    case 'item':
      router.push(commissionId ? `/commission/${commissionId}` : '/commissions')
      break
    case 'deduction':
      router.push(commissionId ? `/deduction/${commissionId}` : '/commissions')
      break
    case 'repair':
      router.push(commissionId ? `/repair/${commissionId}` : '/commissions')
      break
    case 'ending':
      router.push(commissionId ? `/commission/${commissionId}` : '/commissions')
      break
    default:
      router.push('/commissions')
  }
}

function goToGallery() {
  router.push('/gallery')
}

function resetGame() {
  if (confirm('确定要清除所有存档数据吗？此操作不可恢复。')) {
    gameStore.clearAllData()
  }
}
</script>

<template>
  <div class="home-page min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden paper-texture">
    <div class="absolute inset-0 pointer-events-none">
      <div class="ambient-glow glow-top" />
      <div class="ambient-glow glow-bottom" />
    </div>

    <div
      v-for="dust in dustParticles"
      :key="dust.id"
      class="dust-mote"
      :style="dust.style"
    />

    <div class="relative z-10 text-center max-w-lg w-full">
      <div class="shop-icon mb-4">
        <span class="text-8xl block animate-float-gentle glow-warm rounded-full">🏪</span>
      </div>

      <h1 class="text-5xl md:text-6xl font-display font-bold text-stone-800 mb-3 tracking-widest text-shadow-warm">
        记忆修复店
      </h1>
      <p class="text-stone-500 text-lg mb-3 font-serif italic tracking-wide">
        "每一件旧物，都藏着一段被遗忘的故事"
      </p>
      <div class="divider-ornament mb-10" />

      <div class="space-y-4 mb-8">
        <button
          v-if="hasSave"
          class="btn-primary w-full text-lg py-4"
          @click="continueGame"
        >
          <Play class="w-5 h-5" />
          <span>继续修复</span>
          <span class="opacity-70 text-sm ml-1">
            ({{ progress.completed }}/{{ progress.total }} 已完成)
          </span>
        </button>

        <button
          :class="hasSave ? 'btn-secondary w-full text-lg py-4' : 'btn-primary w-full text-lg py-4'"
          @click="startNewGame"
        >
          <DoorOpen class="w-5 h-5" />
          <span>{{ hasSave ? '重新开始' : '踏入店铺' }}</span>
        </button>

        <button
          class="btn-secondary w-full text-lg py-4"
          @click="goToGallery"
        >
          <ScrollText class="w-5 h-5" />
          <span>历史陈列室</span>
        </button>
      </div>

      <div v-if="hasSave" class="text-center mb-6">
        <button
          class="text-stone-400 text-sm hover:text-rose-500 transition-colors inline-flex items-center gap-1"
          @click="resetGame"
        >
          <RotateCcw class="w-3 h-3" />
          <span>清除存档</span>
        </button>
      </div>

      <div class="mt-8 text-stone-400 text-xs space-y-2">
        <p class="tip" style="--tip-delay: 0.2s">✦ 点击旧物上的发光区域寻找线索</p>
        <p class="tip" style="--tip-delay: 0.5s">✦ 将线索关联起来发现真相</p>
        <p class="tip" style="--tip-delay: 0.8s">✦ 你的选择将决定记忆的结局</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ambient-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}

.glow-top {
  top: -10%;
  left: 30%;
  width: 40%;
  height: 35%;
  background: radial-gradient(ellipse, rgba(212, 175, 55, 0.12) 0%, transparent 70%);
}

.glow-bottom {
  bottom: -5%;
  right: 20%;
  width: 35%;
  height: 25%;
  background: radial-gradient(ellipse, rgba(139, 105, 20, 0.08) 0%, transparent 70%);
}

.dust-mote {
  position: absolute;
  bottom: -5%;
  left: var(--dust-x);
  width: var(--dust-size);
  height: var(--dust-size);
  background: radial-gradient(circle, rgba(212, 175, 55, 0.6), rgba(212, 175, 55, 0.1));
  border-radius: 50%;
  animation: dust-float var(--dust-duration) var(--dust-delay) linear infinite;
  pointer-events: none;
}

.shop-icon {
  filter: drop-shadow(0 4px 12px rgba(212, 175, 55, 0.25));
}

.tip {
  animation: fade-in-up 0.6s ease-out both;
  animation-delay: var(--tip-delay);
}
</style>
