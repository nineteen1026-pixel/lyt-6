import { computed, onMounted } from 'vue'
import { usePreferencesStore, type ThemeMode } from '../stores/preferences'

export type Theme = 'light' | 'dark'

export function useTheme() {
  const prefs = usePreferencesStore()

  onMounted(() => {
    prefs.initialize()
  })

  const theme = computed<Theme>(() => (prefs.isDarkTheme ? 'dark' : 'light'))

  const isDark = computed(() => prefs.isDarkTheme)

  const currentThemeMode = computed<ThemeMode>(() => prefs.theme)

  function toggleTheme() {
    prefs.cycleTheme()
  }

  function setThemeMode(mode: ThemeMode) {
    prefs.setTheme(mode)
  }

  function getPreferredTheme(): Theme {
    return prefs.isDarkTheme ? 'dark' : 'light'
  }

  function applyTheme(t: Theme) {
    if (t === 'dark') {
      prefs.setTheme('ink')
    } else {
      prefs.setTheme('classic')
    }
  }

  return {
    theme,
    toggleTheme,
    isDark,
    currentThemeMode,
    setThemeMode,
    getPreferredTheme,
    applyTheme,
  }
}
