import type { GameState, SavedGame, CommissionStatus, GameStep } from '../types'
import { commissions, clues, connections } from '../data/gameData'

const STORAGE_KEY = 'memory-repair-shop-save'
const SAVE_VERSION = '3.0.0'

function getInitialCommissionStatuses(): Record<string, CommissionStatus> {
  const statuses: Record<string, CommissionStatus> = {}
  commissions.forEach(c => {
    statuses[c.id] = c.status
  })
  return statuses
}

export function getInitialGameState(): GameState {
  const unlockedSteps: Record<string, GameStep[]> = {}
  commissions.forEach(c => {
    unlockedSteps[c.id] = ['item']
  })

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
    commissionStatuses: getInitialCommissionStatuses(),
    unlockedSteps
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

  const unlockedSteps = inferUnlockedSteps(v1State.collectedClues, v1State.discoveredConnections, v1State.completedCommissions)

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
    commissionStatuses,
    unlockedSteps
  }
}

interface GameStateV2 {
  currentCommissionId: string | null
  currentChapterId: string | null
  currentStep: 'commission' | 'item' | 'deduction' | 'repair' | 'ending' | 'roadmap'
  completedCommissions: string[]
  unlockedChapters: string[]
  collectedClues: string[]
  discoveredConnections: string[]
  unlockedEndings: string[]
  currentEndingType: string | null
  lastSaveTime: string | null
  totalPlayTime: number
  commissionStatuses: Record<string, CommissionStatus>
}

interface SavedGameV2 {
  version: string
  state: GameStateV2
  savedAt: string
}

function inferUnlockedSteps(
  collectedClues: string[],
  discoveredConnections: string[],
  completedCommissions: string[]
): Record<string, GameStep[]> {
  const unlockedSteps: Record<string, GameStep[]> = {}

  commissions.forEach(commission => {
    const steps: GameStep[] = ['item']

    const commissionClues = clues.filter(c => c.commissionId === commission.id)
    const collectedCount = commissionClues.filter(c => collectedClues.includes(c.id)).length

    const commissionConnections = connections.filter(conn => {
      const fromClue = clues.find(c => c.id === conn.fromClueId)
      return fromClue?.commissionId === commission.id
    })
    const discoveredCount = commissionConnections.filter(conn =>
      discoveredConnections.includes(conn.id)
    ).length

    for (const dep of commission.stepDependencies) {
      if (steps.includes(dep.step)) continue

      switch (dep.dependencyType) {
        case 'always':
          steps.push(dep.step)
          break
        case 'clue_count':
          if (collectedCount >= (dep.minCount ?? 1)) steps.push(dep.step)
          break
        case 'connection_count':
          if (discoveredCount >= (dep.minCount ?? 1)) steps.push(dep.step)
          break
        case 'clue_ids':
          if ((dep.requiredIds ?? []).every(id => collectedClues.includes(id))) steps.push(dep.step)
          break
        case 'connection_ids':
          if ((dep.requiredIds ?? []).every(id => discoveredConnections.includes(id))) steps.push(dep.step)
          break
      }
    }

    if (completedCommissions.includes(commission.id)) {
      if (!steps.includes('deduction')) steps.push('deduction')
      if (!steps.includes('repair')) steps.push('repair')
      if (!steps.includes('ending')) steps.push('ending')
    }

    unlockedSteps[commission.id] = steps
  })

  return unlockedSteps
}

function migrateFromV2ToV3(v2State: GameStateV2): GameState {
  return {
    currentCommissionId: v2State.currentCommissionId,
    currentChapterId: v2State.currentChapterId,
    currentStep: v2State.currentStep,
    completedCommissions: [...v2State.completedCommissions],
    unlockedChapters: [...v2State.unlockedChapters],
    collectedClues: [...v2State.collectedClues],
    discoveredConnections: [...v2State.discoveredConnections],
    unlockedEndings: [...v2State.unlockedEndings],
    currentEndingType: v2State.currentEndingType,
    lastSaveTime: v2State.lastSaveTime,
    totalPlayTime: v2State.totalPlayTime,
    commissionStatuses: { ...v2State.commissionStatuses },
    unlockedSteps: inferUnlockedSteps(v2State.collectedClues, v2State.discoveredConnections, v2State.completedCommissions)
  }
}

function migrateSavedGame(savedGame: SavedGameV1 | SavedGameV2 | SavedGame): GameState | null {
  const version = savedGame.version
  
  if (version === SAVE_VERSION) {
    const state = (savedGame as SavedGame).state
    if (!state.unlockedSteps) {
      state.unlockedSteps = inferUnlockedSteps(state.collectedClues, state.discoveredConnections, state.completedCommissions)
    }
    return state
  }

  if (version === '2.0.0') {
    return migrateFromV2ToV3((savedGame as SavedGameV2).state)
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

    const savedGame: SavedGameV1 | SavedGameV2 | SavedGame = JSON.parse(saved)
    
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
