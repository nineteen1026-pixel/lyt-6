import { defineStore } from 'pinia'

export type ThemeMode = 'classic' | 'parchment' | 'twilight' | 'ink' | 'autumn'
export type AmbientLevel = 'off' | 'subtle' | 'normal' | 'rich'
export type AnimationLevel = 'minimal' | 'normal' | 'playful'

export interface UserPreferences {
  theme: ThemeMode
  ambientLevel: AmbientLevel
  animationLevel: AnimationLevel
  reducedMotion: boolean
  fontSize: 'small' | 'normal' | 'large'
  soundEnabled: boolean
}

const STORAGE_KEY = 'memory-repair-shop-preferences'
const THEME_STORAGE_KEY = 'memory-repair-shop-theme'

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'classic',
  ambientLevel: 'normal',
  animationLevel: 'normal',
  reducedMotion: false,
  fontSize: 'normal',
  soundEnabled: true,
}

export interface ThemeConfig {
  id: ThemeMode
  name: string
  description: string
  icon: string
  accent: string
}

export const THEME_CONFIGS: ThemeConfig[] = [
  {
    id: 'classic',
    name: '暖阳旧纸',
    description: '温暖的米黄色纸张，记忆中的午后时光',
    icon: '☀️',
    accent: '#D4AF37',
  },
  {
    id: 'parchment',
    name: '古卷沉香',
    description: '泛黄的古卷色调，历史的厚重感',
    icon: '📜',
    accent: '#B8860B',
  },
  {
    id: 'autumn',
    name: '秋叶余晖',
    description: '橙红暖调，秋日的温柔回忆',
    icon: '🍂',
    accent: '#CD853F',
  },
  {
    id: 'twilight',
    name: '暮色微光',
    description: '深蓝紫调，黄昏时分的宁静',
    icon: '🌙',
    accent: '#6B7F9E',
  },
  {
    id: 'ink',
    name: '墨染深夜',
    description: '深黑墨色，适合夜间阅读',
    icon: '🌌',
    accent: '#9CA3AF',
  },
]

function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_PREFERENCES, ...parsed }
    }
  } catch (e) {
    console.warn('Failed to load preferences:', e)
  }

  const legacyTheme = localStorage.getItem(THEME_STORAGE_KEY)
  const oldTheme = localStorage.getItem('theme')
  let theme: ThemeMode = 'classic'

  if (legacyTheme && THEME_CONFIGS.some(t => t.id === legacyTheme)) {
    theme = legacyTheme as ThemeMode
  } else if (oldTheme === 'dark') {
    theme = 'twilight'
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme = 'ink'
  }

  return { ...DEFAULT_PREFERENCES, theme }
}

export const usePreferencesStore = defineStore('preferences', {
  state: (): { preferences: UserPreferences; _isInitialized: boolean } => ({
    preferences: { ...DEFAULT_PREFERENCES },
    _isInitialized: false,
  }),

  getters: {
    theme: (state) => state.preferences.theme,
    ambientLevel: (state) => state.preferences.ambientLevel,
    animationLevel: (state) => state.preferences.animationLevel,
    reducedMotion: (state) => state.preferences.reducedMotion,
    fontSize: (state) => state.preferences.fontSize,
    soundEnabled: (state) => state.preferences.soundEnabled,
    isDarkTheme: (state) => state.preferences.theme === 'twilight' || state.preferences.theme === 'ink',
    themeConfig: (state) => THEME_CONFIGS.find(t => t.id === state.preferences.theme) || THEME_CONFIGS[0],
    particleCount(): number {
      const map: Record<AmbientLevel, number> = { off: 0, subtle: 8, normal: 18, rich: 32 }
      return map[this.ambientLevel]
    },
    animationDuration(): number {
      if (this.reducedMotion) return 0
      const map: Record<AnimationLevel, number> = { minimal: 1.6, normal: 1, playful: 0.7 }
      return map[this.animationLevel]
    },
  },

  actions: {
    initialize() {
      if (this._isInitialized) return
      this.preferences = loadPreferences()
      this._isInitialized = true
      this.applyToDocument()
    },

    setTheme(theme: ThemeMode) {
      this.preferences.theme = theme
      this.save()
      this.applyToDocument()
    },

    setAmbientLevel(level: AmbientLevel) {
      this.preferences.ambientLevel = level
      this.save()
      this.applyToDocument()
    },

    setAnimationLevel(level: AnimationLevel) {
      this.preferences.animationLevel = level
      this.save()
      this.applyToDocument()
    },

    setReducedMotion(value: boolean) {
      this.preferences.reducedMotion = value
      this.save()
      this.applyToDocument()
    },

    setFontSize(size: 'small' | 'normal' | 'large') {
      this.preferences.fontSize = size
      this.save()
      this.applyToDocument()
    },

    setSoundEnabled(value: boolean) {
      this.preferences.soundEnabled = value
      this.save()
    },

    cycleTheme() {
      const idx = THEME_CONFIGS.findIndex(t => t.id === this.preferences.theme)
      const nextIdx = (idx + 1) % THEME_CONFIGS.length
      this.setTheme(THEME_CONFIGS[nextIdx].id)
    },

    reset() {
      this.preferences = { ...DEFAULT_PREFERENCES }
      this.save()
      this.applyToDocument()
    },

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences))
        localStorage.setItem(THEME_STORAGE_KEY, this.preferences.theme)
      } catch (e) {
        console.warn('Failed to save preferences:', e)
      }
    },

    applyToDocument() {
      const root = document.documentElement

      root.classList.remove('theme-classic', 'theme-parchment', 'theme-twilight', 'theme-ink', 'theme-autumn')
      root.classList.add(`theme-${this.preferences.theme}`)

      if (this.isDarkTheme) {
        root.classList.add('dark')
        root.classList.remove('light')
      } else {
        root.classList.add('light')
        root.classList.remove('dark')
      }

      root.classList.remove('font-small', 'font-normal', 'font-large')
      root.classList.add(`font-${this.preferences.fontSize}`)

      root.classList.remove('ambient-off', 'ambient-subtle', 'ambient-normal', 'ambient-rich')
      root.classList.add(`ambient-${this.preferences.ambientLevel}`)

      root.classList.remove('anim-minimal', 'anim-normal', 'anim-playful')
      root.classList.add(`anim-${this.preferences.animationLevel}`)

      if (this.preferences.reducedMotion) {
        root.classList.add('reduce-motion')
      } else {
        root.classList.remove('reduce-motion')
      }

      root.style.setProperty('--animation-speed-multiplier', String(this.animationDuration))
    },
  },
})
