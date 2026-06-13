import type { 
  GameState, 
  SavedGame, 
  CommissionStatus, 
  GameStep,
  SaveSlotData,
  SaveSlotInfo,
  SaveManagerState,
  LoadResult
} from '../types'
import { commissions, clues, connections, chapters } from '../data/gameData'
import { MAX_SAVE_SLOTS, DEFAULT_SLOT_NAMES } from '../types'

const STORAGE_KEY = 'memory-repair-shop-save'
const SAVE_MANAGER_KEY = 'memory-repair-shop-save-manager'
const SAVE_VERSION = '4.0.0'

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
    unlockedSteps,
    notes: [],
    customTags: [],
    activeTagFilters: [],
    searchKeyword: ''
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
    unlockedSteps,
    notes: [],
    customTags: [],
    activeTagFilters: [],
    searchKeyword: ''
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
    unlockedSteps: inferUnlockedSteps(v2State.collectedClues, v2State.discoveredConnections, v2State.completedCommissions),
    notes: [],
    customTags: [],
    activeTagFilters: [],
    searchKeyword: ''
  }
}

interface GameStateV3 {
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
  unlockedSteps: Record<string, GameStep[]>
}

interface SavedGameV3 {
  version: string
  state: GameStateV3
  savedAt: string
}

function migrateFromV3ToV4(v3State: GameStateV3): GameState {
  return {
    currentCommissionId: v3State.currentCommissionId,
    currentChapterId: v3State.currentChapterId,
    currentStep: v3State.currentStep,
    completedCommissions: [...v3State.completedCommissions],
    unlockedChapters: [...v3State.unlockedChapters],
    collectedClues: [...v3State.collectedClues],
    discoveredConnections: [...v3State.discoveredConnections],
    unlockedEndings: [...v3State.unlockedEndings],
    currentEndingType: v3State.currentEndingType,
    lastSaveTime: v3State.lastSaveTime,
    totalPlayTime: v3State.totalPlayTime,
    commissionStatuses: { ...v3State.commissionStatuses },
    unlockedSteps: { ...v3State.unlockedSteps },
    notes: [],
    customTags: [],
    activeTagFilters: [],
    searchKeyword: ''
  }
}

function migrateSavedGame(savedGame: SavedGameV1 | SavedGameV2 | SavedGameV3 | SavedGame): GameState | null {
  const version = savedGame.version
  
  if (version === SAVE_VERSION) {
    const state = (savedGame as SavedGame).state
    if (!state.unlockedSteps) {
      state.unlockedSteps = inferUnlockedSteps(state.collectedClues, state.discoveredConnections, state.completedCommissions)
    }
    if (!state.notes) state.notes = []
    if (!state.customTags) state.customTags = []
    if (!state.activeTagFilters) state.activeTagFilters = []
    if (state.searchKeyword === undefined) state.searchKeyword = ''
    return state
  }

  if (version === '3.0.0') {
    return migrateFromV3ToV4((savedGame as SavedGameV3).state)
  }

  if (version === '2.0.0') {
    const v3 = migrateFromV2ToV3((savedGame as SavedGameV2).state)
    return migrateFromV3ToV4(v3)
  }

  if (version === '1.0.0') {
    const v2 = migrateFromV1ToV2((savedGame as SavedGameV1).state)
    const v3 = migrateFromV2ToV3(v2)
    return migrateFromV3ToV4(v3)
  }

  console.warn(`Unsupported save version: ${version}, starting new game`)
  return null
}

function validateGameState(state: unknown): state is GameState {
  if (!state || typeof state !== 'object') return false
  const s = state as Record<string, unknown>
  return (
    'completedCommissions' in s &&
    Array.isArray(s.completedCommissions) &&
    'commissionStatuses' in s &&
    typeof s.commissionStatuses === 'object' &&
    s.commissionStatuses !== null
  )
}

function parseSavedGame(raw: string): SavedGame | null {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (!('version' in parsed) || !('state' in parsed) || !('savedAt' in parsed)) return null
    if (!validateGameState(parsed.state)) return null
    return parsed as SavedGame
  } catch {
    return null
  }
}

function createSaveSlot(slotId: string, slotName: string): SaveSlotData {
  return {
    slotId,
    slotName,
    save: null,
    backup: null,
    createdAt: new Date().toISOString()
  }
}

function initializeSaveManager(): SaveManagerState {
  const slots: SaveSlotData[] = []
  for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
    slots.push(createSaveSlot(`slot-${i + 1}`, DEFAULT_SLOT_NAMES[i]))
  }
  
  const legacySaveRaw = localStorage.getItem(STORAGE_KEY)
  let lastActiveSlotId: string | null = null
  
  if (legacySaveRaw) {
    const legacySave = parseSavedGame(legacySaveRaw)
    if (legacySave) {
      slots[0].save = legacySave
      slots[0].backup = { ...legacySave }
      lastActiveSlotId = slots[0].slotId
    }
  }
  
  return {
    slots,
    currentSlotId: null,
    lastActiveSlotId
  }
}

function loadSaveManagerState(): SaveManagerState {
  try {
    const raw = localStorage.getItem(SAVE_MANAGER_KEY)
    if (!raw) {
      const state = initializeSaveManager()
      saveSaveManagerState(state)
      return state
    }
    
    const parsed = JSON.parse(raw) as SaveManagerState
    if (!parsed.slots || parsed.slots.length !== MAX_SAVE_SLOTS) {
      const state = initializeSaveManager()
      saveSaveManagerState(state)
      return state
    }
    
    for (const slot of parsed.slots) {
      if (slot.save) {
        const migrated = migrateSavedGame(slot.save)
        if (migrated) {
          slot.save.state = migrated
        } else {
          slot.save = null
        }
      }
      if (slot.backup) {
        const migrated = migrateSavedGame(slot.backup)
        if (migrated) {
          slot.backup.state = migrated
        } else {
          slot.backup = null
        }
      }
    }
    
    return parsed
  } catch (e) {
    console.error('Failed to load save manager state:', e)
    const state = initializeSaveManager()
    saveSaveManagerState(state)
    return state
  }
}

function saveSaveManagerState(state: SaveManagerState): void {
  try {
    localStorage.setItem(SAVE_MANAGER_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save save manager state:', e)
  }
}

function getChapterProgress(state: GameState): string {
  const unlockedCount = state.unlockedChapters.length
  const totalCount = chapters.length
  const currentChapter = chapters.find(c => c.id === state.currentChapterId)
  if (currentChapter) {
    return `第${currentChapter.number}章 · ${currentChapter.title}`
  }
  return `${unlockedCount}/${totalCount} 章`
}

function getCurrentCommissionTitle(state: GameState): string | null {
  if (!state.currentCommissionId) return null
  const commission = commissions.find(c => c.id === state.currentCommissionId)
  return commission?.title || null
}

function slotToInfo(slot: SaveSlotData): SaveSlotInfo {
  const save = slot.save
  const hasData = save !== null
  
  return {
    slotId: slot.slotId,
    slotName: slot.slotName,
    savedAt: save?.savedAt ?? null,
    playTime: save?.state.totalPlayTime ?? 0,
    completedCount: save?.state.completedCommissions.length ?? 0,
    totalCount: commissions.length,
    chapterProgress: hasData ? getChapterProgress(save!.state) : '空存档',
    currentCommissionTitle: hasData ? getCurrentCommissionTitle(save!.state) : null,
    hasBackup: slot.backup !== null,
    backupSavedAt: slot.backup?.savedAt ?? null
  }
}

export function getAllSaveSlots(): SaveSlotInfo[] {
  const manager = loadSaveManagerState()
  return manager.slots.map(slotToInfo)
}

export function getSaveSlotInfo(slotId: string): SaveSlotInfo | null {
  const manager = loadSaveManagerState()
  const slot = manager.slots.find(s => s.slotId === slotId)
  return slot ? slotToInfo(slot) : null
}

export function getLastActiveSlotId(): string | null {
  const manager = loadSaveManagerState()
  return manager.lastActiveSlotId
}

export function hasAnySaveData(): boolean {
  const manager = loadSaveManagerState()
  return manager.slots.some(s => s.save !== null)
}

export function hasSaveDataInSlot(slotId: string): boolean {
  const manager = loadSaveManagerState()
  const slot = manager.slots.find(s => s.slotId === slotId)
  return slot?.save !== null
}

export function saveGameToSlot(slotId: string, state: GameState): boolean {
  try {
    const manager = loadSaveManagerState()
    const slot = manager.slots.find(s => s.slotId === slotId)
    if (!slot) return false

    if (slot.save) {
      slot.backup = { ...slot.save }
    }

    const savedGame: SavedGame = {
      version: SAVE_VERSION,
      state: JSON.parse(JSON.stringify(state)),
      savedAt: new Date().toISOString()
    }

    slot.save = savedGame
    manager.lastActiveSlotId = slotId
    manager.currentSlotId = slotId

    saveSaveManagerState(manager)
    return true
  } catch (e) {
    console.error('Failed to save game to slot:', e)
    return false
  }
}

export function loadGameFromSlot(slotId: string): LoadResult {
  try {
    const manager = loadSaveManagerState()
    const slot = manager.slots.find(s => s.slotId === slotId)
    
    if (!slot) {
      return { success: false, error: '存档位不存在', recoverable: false, backupAvailable: false }
    }

    if (!slot.save) {
      return { success: false, error: '该存档位为空', recoverable: false, backupAvailable: slot.backup !== null }
    }

    const migratedState = migrateSavedGame(slot.save)
    
    if (!migratedState) {
      if (slot.backup) {
        const backupMigrated = migrateSavedGame(slot.backup)
        if (backupMigrated) {
          return { success: false, error: '存档数据损坏', recoverable: true, backupAvailable: true }
        }
      }
      return { success: false, error: '存档数据损坏且无法恢复', recoverable: false, backupAvailable: false }
    }

    manager.lastActiveSlotId = slotId
    manager.currentSlotId = slotId
    saveSaveManagerState(manager)

    return { success: true, state: migratedState, fromBackup: false }
  } catch (e) {
    return { success: false, error: '读取存档时发生错误', recoverable: false, backupAvailable: false }
  }
}

export function loadBackupFromSlot(slotId: string): LoadResult {
  try {
    const manager = loadSaveManagerState()
    const slot = manager.slots.find(s => s.slotId === slotId)
    
    if (!slot || !slot.backup) {
      return { success: false, error: '没有可用的备份', recoverable: false, backupAvailable: false }
    }

    const migratedState = migrateSavedGame(slot.backup)
    
    if (!migratedState) {
      return { success: false, error: '备份数据也已损坏', recoverable: false, backupAvailable: false }
    }

    slot.save = { ...slot.backup }
    manager.lastActiveSlotId = slotId
    manager.currentSlotId = slotId
    saveSaveManagerState(manager)

    return { success: true, state: migratedState, fromBackup: true }
  } catch (e) {
    return { success: false, error: '恢复备份时发生错误', recoverable: false, backupAvailable: false }
  }
}

export function clearSlot(slotId: string): boolean {
  try {
    const manager = loadSaveManagerState()
    const slot = manager.slots.find(s => s.slotId === slotId)
    if (!slot) return false

    slot.save = null
    slot.backup = null
    slot.createdAt = new Date().toISOString()

    if (manager.lastActiveSlotId === slotId) {
      manager.lastActiveSlotId = null
    }
    if (manager.currentSlotId === slotId) {
      manager.currentSlotId = null
    }

    saveSaveManagerState(manager)
    return true
  } catch (e) {
    console.error('Failed to clear slot:', e)
    return false
  }
}

export function renameSlot(slotId: string, newName: string): boolean {
  try {
    const manager = loadSaveManagerState()
    const slot = manager.slots.find(s => s.slotId === slotId)
    if (!slot) return false

    slot.slotName = newName.trim() || slot.slotName
    saveSaveManagerState(manager)
    return true
  } catch (e) {
    console.error('Failed to rename slot:', e)
    return false
  }
}

export function getCurrentSlotId(): string | null {
  const manager = loadSaveManagerState()
  return manager.currentSlotId
}

export function setCurrentSlotId(slotId: string | null): void {
  const manager = loadSaveManagerState()
  manager.currentSlotId = slotId
  if (slotId) {
    manager.lastActiveSlotId = slotId
  }
  saveSaveManagerState(manager)
}

export function hasBackupInSlot(slotId: string): boolean {
  const manager = loadSaveManagerState()
  const slot = manager.slots.find(s => s.slotId === slotId)
  return slot?.backup !== null
}

export function saveGame(state: GameState): void {
  const currentSlotId = getCurrentSlotId()
  if (currentSlotId) {
    saveGameToSlot(currentSlotId, state)
  } else {
    const firstSlot = 'slot-1'
    saveGameToSlot(firstSlot, state)
  }
}

export function loadGame(): GameState | null {
  const lastSlotId = getLastActiveSlotId()
  if (!lastSlotId) {
    const legacySaveRaw = localStorage.getItem(STORAGE_KEY)
    if (legacySaveRaw) {
      const legacySave = parseSavedGame(legacySaveRaw)
      if (legacySave) {
        return migrateSavedGame(legacySave)
      }
    }
    return null
  }
  
  const result = loadGameFromSlot(lastSlotId)
  if (result.success) {
    return result.state
  }
  return null
}

export function hasSaveData(): boolean {
  if (hasAnySaveData()) return true
  return localStorage.getItem(STORAGE_KEY) !== null
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_MANAGER_KEY)
  localStorage.removeItem(STORAGE_KEY)
}
