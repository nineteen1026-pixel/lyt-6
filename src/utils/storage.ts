import type { GameState, SavedGame } from '../types'

const STORAGE_KEY = 'memory-repair-shop-save'
const SAVE_VERSION = '1.0.0'

export function getInitialGameState(): GameState {
  return {
    currentCommissionId: null,
    currentStep: 'commission',
    completedCommissions: [],
    collectedClues: [],
    discoveredConnections: [],
    unlockedEndings: [],
    currentEndingType: null,
    lastSaveTime: null,
    totalPlayTime: 0
  }
}

export function saveGame(state: GameState): void {
  try {
    const savedGame: SavedGame = {
      version: SAVE_VERSION,
      state,
      savedAt: new Date().toISOString()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedGame))
  } catch (e) {
    console.error('Failed to save game:', e)
  }
}

export function loadGame(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return null

    const savedGame: SavedGame = JSON.parse(saved)
    
    if (savedGame.version !== SAVE_VERSION) {
      console.warn('Save version mismatch, starting new game')
      return null
    }

    return savedGame.state
  } catch (e) {
    console.error('Failed to load game:', e)
    return null
  }
}

export function hasSaveData(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null
}

export function clearSave(): void {
  localStorage.removeItem(STORAGE_KEY)
}
