<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { usePreferencesStore } from '../stores/preferences'

const prefs = usePreferencesStore()

const mousePos = ref({ x: 0.5, y: 0.3 })
const initialized = ref(false)

interface Particle {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
  drift: number
  opacity: number
  hue: number
}

const particles = computed<Particle[]>(() => {
  const count = prefs.particleCount
  const isDark = prefs.isDarkTheme
  const baseHue = isDark ? 40 : 42
  const result: Particle[] = []

  for (let i = 0; i < count; i++) {
    const seed = i * 137.5
    result.push({
      id: i,
      x: (seed % 100),
      y: 20 + ((seed * 0.7) % 70),
      size: 1.5 + ((seed * 0.3) % 4),
      duration: 8 + ((seed * 0.5) % 10),
      delay: (seed * 0.13) % 8,
      drift: -15 + ((seed * 0.2) % 30),
      opacity: 0.25 + ((seed * 0.04) % 0.45),
      hue: baseHue + ((seed * 0.1) % 18) - 9,
    })
  }
  return result
})

const glowStyle = computed(() => {
  const config = prefs.themeConfig
  const accent = config.accent
  const isDark = prefs.isDarkTheme
  const intensity = {
    off: 0,
    subtle: 0.35,
    normal: 0.7,
    rich: 1.1,
  }[prefs.ambientLevel]

  return {
    '--glow-top': `radial-gradient(ellipse at ${mousePos.value.x * 100}% ${mousePos.value.y * 100}%, 
      color-mix(in srgb, ${accent} ${Math.round(18 * intensity)}%, transparent) 0%, 
      transparent 60%)`,
    '--glow-bottom': `radial-gradient(ellipse at ${100 - mousePos.value.x * 40}% ${100 - mousePos.value.y * 30}%, 
      color-mix(in srgb, ${isDark ? '#1e1b4b' : '#8B6914'} ${Math.round(12 * intensity)}%, transparent) 0%, 
      transparent 55%)`,
    '--mouse-glow': `radial-gradient(circle 300px at ${mousePos.value.x * 100}% ${mousePos.value.y * 100}%, 
      color-mix(in srgb, ${accent} ${Math.round(8 * intensity)}%, transparent) 0%, 
      transparent 70%)`,
  }
})

onMounted(() => {
  prefs.initialize()
  initialized.value = true

  let rafId: number | null = null
  let targetX = 0.5
  let targetY = 0.3

  function onMouseMove(e: MouseEvent) {
    targetX = e.clientX / window.innerWidth
    targetY = e.clientY / window.innerHeight
  }

  function animate() {
    mousePos.value.x += (targetX - mousePos.value.x) * 0.04
    mousePos.value.y += (targetY - mousePos.value.y) * 0.04
    rafId = requestAnimationFrame(animate)
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true })
  rafId = requestAnimationFrame(animate)

  const cleanup = () => {
    window.removeEventListener('mousemove', onMouseMove)
    if (rafId) cancelAnimationFrame(rafId)
  }
  ;(window as any).__ambientCleanup = cleanup
})

watch(
  () => prefs.reducedMotion,
  (reduced) => {
    if (reduced) {
      mousePos.value = { x: 0.5, y: 0.3 }
    }
  }
)
</script>

<template>
  <div v-if="initialized" class="ambient-effects" aria-hidden="true">
    <div class="ambient-glows" :style="glowStyle">
      <div class="glow-layer glow-top" />
      <div class="glow-layer glow-bottom" />
      <div v-if="!prefs.reducedMotion" class="glow-layer glow-mouse" />
    </div>

    <div class="particle-container">
      <div
        v-for="p in particles"
        :key="p.id"
        class="particle"
        :class="{ 'reduce-anim': prefs.reducedMotion }"
        :style="{
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: `${p.size}px`,
          height: `${p.size}px`,
          opacity: p.opacity,
          animationDuration: `${p.duration * prefs.animationDuration}s`,
          animationDelay: `${p.delay}s`,
          '--drift-x': `${p.drift}px`,
          '--particle-hue': `${p.hue}`,
        }"
      />
    </div>

    <div
      v-if="prefs.ambientLevel === 'rich' || prefs.ambientLevel === 'normal'"
      class="vignette"
      :class="{ subtle: prefs.ambientLevel === 'normal' }"
    />
  </div>
</template>

<style scoped>
.ambient-effects {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.ambient-glows {
  position: absolute;
  inset: 0;
  transition: opacity 0.6s ease;
}

.glow-layer {
  position: absolute;
  inset: -10%;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.glow-top {
  background: var(--glow-top);
  filter: blur(40px);
  animation: breathe 8s ease-in-out infinite;
}

.glow-bottom {
  background: var(--glow-bottom);
  filter: blur(60px);
  animation: breathe 10s ease-in-out infinite reverse;
}

.glow-mouse {
  background: var(--mouse-glow);
  filter: blur(30px);
  transition: background 0.15s ease-out;
}

:global(.reduce-motion) .glow-top,
:global(.reduce-motion) .glow-bottom {
  animation: none;
}

.particle-container {
  position: absolute;
  inset: 0;
}

.particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    hsla(var(--particle-hue, 42), 85%, 62%, 0.9) 0%,
    hsla(var(--particle-hue, 42), 80%, 50%, 0.2) 60%,
    transparent 100%
  );
  box-shadow: 0 0 6px hsla(var(--particle-hue, 42), 85%, 62%, 0.35);
  animation: drift linear infinite;
  will-change: transform, opacity;
}

.particle.reduce-anim {
  animation: none;
  opacity: 0.15 !important;
}

:global(.theme-twilight) .particle {
  --particle-hue: 220;
}

:global(.theme-ink) .particle {
  --particle-hue: 210;
}

:global(.theme-autumn) .particle {
  --particle-hue: 28;
}

.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 40%,
    rgba(0, 0, 0, 0.12) 100%
  );
  pointer-events: none;
}

.vignette.subtle {
  background: radial-gradient(
    ellipse at center,
    transparent 55%,
    rgba(0, 0, 0, 0.07) 100%
  );
}

:global(.dark) .vignette {
  background: radial-gradient(
    ellipse at center,
    transparent 35%,
    rgba(0, 0, 0, 0.5) 100%
  );
}

:global(.dark) .vignette.subtle {
  background: radial-gradient(
    ellipse at center,
    transparent 50%,
    rgba(0, 0, 0, 0.35) 100%
  );
}

@keyframes breathe {
  0%, 100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.03);
  }
}

@keyframes drift {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: var(--start-opacity, 0.5);
  }
  50% {
    transform: translate3d(var(--drift-x), -40vh, 0) scale(1.2);
  }
  90% {
    opacity: var(--end-opacity, 0.3);
  }
  100% {
    transform: translate3d(calc(var(--drift-x) * -0.5), -95vh, 0) scale(0.8);
    opacity: 0;
  }
}

:global(.ambient-off) .ambient-effects {
  display: none;
}

:global(.ambient-subtle) .particle {
  opacity: 0.25 !important;
}

:global(.ambient-subtle) .glow-top,
:global(.ambient-subtle) .glow-bottom {
  opacity: 0.5;
}

:global(.anim-minimal) .glow-top,
:global(.anim-minimal) .glow-bottom {
  animation-duration: 16s;
}

:global(.anim-playful) .glow-top,
:global(.anim-playful) .glow-bottom {
  animation-duration: 5s;
}
</style>
