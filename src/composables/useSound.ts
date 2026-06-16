import { ref, shallowRef } from 'vue'
import { usePreferencesStore } from '../stores/preferences'

type SoundName = 'click' | 'success' | 'error' | 'transition' | 'discover' | 'type' | 'complete' | 'undo'

interface SoundDefinition {
  frequency: number
  duration: number
  type: OscillatorType
  volume: number
}

const SOUND_DEFS: Record<SoundName, SoundDefinition> = {
  click: { frequency: 800, duration: 0.06, type: 'sine', volume: 0.12 },
  success: { frequency: 523, duration: 0.15, type: 'sine', volume: 0.15 },
  error: { frequency: 200, duration: 0.12, type: 'square', volume: 0.08 },
  transition: { frequency: 440, duration: 0.2, type: 'sine', volume: 0.1 },
  discover: { frequency: 660, duration: 0.25, type: 'triangle', volume: 0.12 },
  type: { frequency: 1200, duration: 0.03, type: 'sine', volume: 0.05 },
  complete: { frequency: 880, duration: 0.3, type: 'sine', volume: 0.15 },
  undo: { frequency: 350, duration: 0.1, type: 'sine', volume: 0.08 },
}

const audioCtx = shallowRef<AudioContext | null>(null)

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx.value) {
      audioCtx.value = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioCtx.value.state === 'suspended') {
      audioCtx.value.resume()
    }
    return audioCtx.value
  } catch {
    return null
  }
}

function playTone(def: SoundDefinition) {
  const ctx = getAudioContext()
  if (!ctx) return

  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.type = def.type
  oscillator.frequency.setValueAtTime(def.frequency, ctx.currentTime)

  gainNode.gain.setValueAtTime(def.volume, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + def.duration)

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + def.duration + 0.01)
}

function playChime(notes: number[], noteDuration: number, type: OscillatorType = 'sine', volume: number = 0.12) {
  const ctx = getAudioContext()
  if (!ctx) return

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * noteDuration)

    gain.gain.setValueAtTime(volume, ctx.currentTime + i * noteDuration)
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + i * noteDuration + noteDuration
    )

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(ctx.currentTime + i * noteDuration)
    osc.stop(ctx.currentTime + i * noteDuration + noteDuration + 0.01)
  })
}

const lastPlayed = ref<Record<string, number>>({})
const THROTTLE_MS = 80

export function useSound() {
  const prefs = usePreferencesStore()

  function play(name: SoundName) {
    if (!prefs.soundEnabled) return

    const now = Date.now()
    if (lastPlayed.value[name] && now - lastPlayed.value[name] < THROTTLE_MS) return
    lastPlayed.value[name] = now

    const def = SOUND_DEFS[name]
    if (def) playTone(def)
  }

  function playClick() { play('click') }
  function playSuccess() {
    if (!prefs.soundEnabled) return
    playChime([523, 659, 784], 0.12, 'sine', 0.12)
  }
  function playError() { play('error') }
  function playTransition() { play('transition') }
  function playDiscover() {
    if (!prefs.soundEnabled) return
    playChime([660, 880], 0.15, 'triangle', 0.12)
  }
  function playType() { play('type') }
  function playComplete() {
    if (!prefs.soundEnabled) return
    playChime([523, 659, 784, 1047], 0.12, 'sine', 0.13)
  }
  function playUndo() { play('undo') }

  function resumeContext() {
    getAudioContext()
  }

  return {
    play,
    playClick,
    playSuccess,
    playError,
    playTransition,
    playDiscover,
    playType,
    playComplete,
    playUndo,
    resumeContext,
  }
}
