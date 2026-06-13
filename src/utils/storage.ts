import type { GameState, SavedGame, CommissionStatus } from '../types'
import { commissions } from '../data/gameData'

const STORAGE_KEY = 'memory-repair-shop-save'
const SAVE_VERSION = '2.0.0'

function getInitialCommissionStatuses(): Record<string, CommissionStatus> {
  const statuses: Record<string, CommissionStatus> = {}
  commissions.forEach(c => {
    statuses[c.id] = c.status
  })
  return statuses
}

export function getInitialGameState(): GameState {
  return {
    currentCommissionId: null,
    currentChapterId: null,
    currentStep: 'commission',
    completedCommissions: [],
    unlockedChapters: ['chap-001'],
    collectedClues: [],
    discoveredConnections: [],
    unlockedEndings: [],
    currentEndingType: null,
    lastSaveTime: null,
    totalPlayTime: 0,
    commissionStatuses: getInitialCommissionStatuses()
  }
}

interface GameStateV1 {
  currentCommissionId: string | null
  currentStep: 'commission' | 'item' | 'deduction' | 'repair' | 'ending'
  completedCommissions: string[]
  collectedClues: string[]
  discoveredConnections: string[]
  unlockedEndings: string[]
  currentEndingType: string | null
  lastSaveTime: string | null
  totalPlayTime: number
}

interface SavedGameV1 {
  version: string
  state: GameStateV1
  savedAt: string
}

function migrateFromV1ToV2(v1State: GameStateV1): GameState {
  const commissionStatuses: Record<string, CommissionStatus> = {}
  
  commissions.forEach(c => {
    if (v1State.completedCommissions.includes(c.id)) {
      commissionStatuses[c.id] = 'completed'
    } else if (v1State.currentCommissionId === c.id) {
      commissionStatuses[c.id] = 'in_progress'
    } else if (c.prerequisiteCommissionIds.every(
      prereq => v1State.completedCommissions.includes(prereq)
    )) {
      commissionStatuses[c.id] = 'pending'
    } else {
      commissionStatuses[c.id] = 'locked'
    }
  })

  const unlockedChapters = commissions
    .filter(c => commissionStatuses[c.id] !== 'locked')
    .map(c => c.chapterId)
    .filter((id, index, self) => self.indexOf(id) === index)

  return {
    currentCommissionId: v1State.currentCommissionId,
    currentChapterId: v1State.currentCommissionId 
      ? commissions.find(c => c.id === v1State.currentCommissionId)?.chapterId || null
      : null,
    currentStep: v1State.currentStep,
    completedCommissions: [...v1State.completedCommissions],
    unlockedChapters: unlockedChapters.length > 0 ? unlockedChapters : ['chap-001'],
    collectedClues: [...v1State.collectedClues],
    discoveredConnections: [...v1State.discoveredConnections],
    unlockedEndings: [...v1State.unlockedEndings],
    currentEndingType: v1State.currentEndingType,
    lastSaveTime: v1State.lastSaveTime,
    totalPlayTime: v1State.totalPlayTime,
    commissionStatuses
  }
}

function migrateSavedGame(savedGame: SavedGameV1 | SavedGame): GameState | null {
  const version = savedGame.version
  
  if (version === SAVE_VERSION) {
    return (savedGame as SavedGame).state
  }

  if (version === '1.0.0') {
    return migrateFromV1ToV2((savedGame as SavedGameV1).state)
  }

  console.warn(`Unsupported save version: ${version}, starting new game`)
  return null
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

    const savedGame: SavedGameV1 | SavedGame = JSON.parse(saved)
    
    return migrateSavedGame(savedGame)
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
