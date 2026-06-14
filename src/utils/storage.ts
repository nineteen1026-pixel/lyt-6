import type { 
  GameState, 
  SavedGame, 
  CommissionStatus, 
  GameStep,
  SaveSlotData,
  SaveSlotInfo,
  SaveManagerState,
  LoadResult,
  KeyNodeSnapshot,
  SnapshotInfo,
  SnapshotTrigger,
  EndingReplay
} from '../types'
import { commissions, clues, connections, chapters, endings } from '../data/gameData'
import { MAX_SAVE_SLOTS, DEFAULT_SLOT_NAMES, MAX_SNAPSHOTS_PER_SLOT, CURRENT_SAVE_VERSION } from '../types'

const STORAGE_KEY = 'memory-repair-shop-save'
const SAVE_MANAGER_KEY = 'memory-repair-shop-save-manager'
const SAVE_VERSION = CURRENT_SAVE_VERSION

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
    searchKeyword: '',
    searchMatchMode: 'or',
    searchScope: 'all',
    noteSortBy: 'updatedAt',
    noteSortOrder: 'desc',
    noteAggregationType: 'tag',
    connectionHintsUsed: [],
    discoveredHints: [],
    progressMilestones: {},
    repairRetryCounts: {},
    connectionRetryCounts: {},
    dialogueFlags: {},
    dialogueHistory: [],
    completedDialogueNodeIds: [],
    archivedConclusions: [],
    boardCluePositions: {},
    discoveredConflicts: [],
    scoreHistory: [],
    unlockedAchievements: [],
    currentScore: null,
    branchTreeStates: {}
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

function migrateFromV1ToV2(v1State: GameStateV1): any {
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
    searchKeyword: '',
    searchMatchMode: 'or',
    searchScope: 'all',
    noteSortBy: 'updatedAt',
    noteSortOrder: 'desc',
    noteAggregationType: 'tag',
    connectionHintsUsed: [],
    discoveredHints: [],
    progressMilestones: {},
    repairRetryCounts: {},
    connectionRetryCounts: {},
    dialogueFlags: {},
    dialogueHistory: [],
    completedDialogueNodeIds: []
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

function migrateFromV2ToV3(v2State: GameStateV2): any {
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
    searchKeyword: '',
    searchMatchMode: 'or',
    searchScope: 'all',
    noteSortBy: 'updatedAt',
    noteSortOrder: 'desc',
    noteAggregationType: 'tag',
    connectionHintsUsed: [],
    discoveredHints: [],
    progressMilestones: {},
    repairRetryCounts: {},
    connectionRetryCounts: {},
    dialogueFlags: {},
    dialogueHistory: [],
    completedDialogueNodeIds: []
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
    searchKeyword: '',
    searchMatchMode: 'or',
    searchScope: 'all',
    noteSortBy: 'updatedAt',
    noteSortOrder: 'desc',
    noteAggregationType: 'tag',
    connectionHintsUsed: [],
    discoveredHints: [],
    progressMilestones: {},
    repairRetryCounts: {},
    connectionRetryCounts: {},
    dialogueFlags: {},
    dialogueHistory: [],
    completedDialogueNodeIds: [],
    archivedConclusions: [],
    boardCluePositions: {},
    discoveredConflicts: [],
    scoreHistory: [],
    unlockedAchievements: [],
    currentScore: null,
    branchTreeStates: {}
  }
}

interface GameStateV4 {
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
  notes: any[]
  customTags: any[]
  activeTagFilters: string[]
  searchKeyword: string
}

interface SavedGameV4 {
  version: string
  state: GameStateV4
  savedAt: string
}

function migrateFromV4ToV5(v4State: GameStateV4): GameState {
  return {
    currentCommissionId: v4State.currentCommissionId,
    currentChapterId: v4State.currentChapterId,
    currentStep: v4State.currentStep,
    completedCommissions: [...v4State.completedCommissions],
    unlockedChapters: [...v4State.unlockedChapters],
    collectedClues: [...v4State.collectedClues],
    discoveredConnections: [...v4State.discoveredConnections],
    unlockedEndings: [...v4State.unlockedEndings],
    currentEndingType: v4State.currentEndingType,
    lastSaveTime: v4State.lastSaveTime,
    totalPlayTime: v4State.totalPlayTime,
    commissionStatuses: { ...v4State.commissionStatuses },
    unlockedSteps: { ...v4State.unlockedSteps },
    notes: [...(v4State.notes || [])],
    customTags: [...(v4State.customTags || [])],
    activeTagFilters: [...(v4State.activeTagFilters || [])],
    searchKeyword: v4State.searchKeyword || '',
    searchMatchMode: 'or',
    searchScope: 'all',
    noteSortBy: 'updatedAt',
    noteSortOrder: 'desc',
    noteAggregationType: 'tag',
    connectionHintsUsed: [],
    discoveredHints: [],
    progressMilestones: {},
    repairRetryCounts: {},
    connectionRetryCounts: {},
    dialogueFlags: {},
    dialogueHistory: [],
    completedDialogueNodeIds: [],
    archivedConclusions: [],
    boardCluePositions: {},
    discoveredConflicts: [],
    scoreHistory: [],
    unlockedAchievements: [],
    currentScore: null,
    branchTreeStates: {}
  }
}

interface GameStateV5 {
  currentCommissionId: string | null
  currentChapterId: string | null
  currentStep: GameStep
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
  notes: any[]
  customTags: any[]
  activeTagFilters: string[]
  searchKeyword: string
  searchMatchMode: 'and' | 'or'
  searchScope: 'all' | 'clue' | 'note'
  noteSortBy: 'updatedAt' | 'createdAt' | 'importance' | 'title'
  noteSortOrder: 'asc' | 'desc'
  noteAggregationType: 'tag' | 'clue' | 'time' | 'importance'
  connectionHintsUsed: string[]
  discoveredHints: string[]
  progressMilestones: Record<string, boolean>
}

interface SavedGameV5 {
  version: string
  state: GameStateV5
  savedAt: string
}

function migrateFromV5ToV6(v5State: GameStateV5): GameState {
  return {
    currentCommissionId: v5State.currentCommissionId,
    currentChapterId: v5State.currentChapterId,
    currentStep: v5State.currentStep,
    completedCommissions: [...v5State.completedCommissions],
    unlockedChapters: [...v5State.unlockedChapters],
    collectedClues: [...v5State.collectedClues],
    discoveredConnections: [...v5State.discoveredConnections],
    unlockedEndings: [...v5State.unlockedEndings],
    currentEndingType: v5State.currentEndingType,
    lastSaveTime: v5State.lastSaveTime,
    totalPlayTime: v5State.totalPlayTime,
    commissionStatuses: { ...v5State.commissionStatuses },
    unlockedSteps: { ...v5State.unlockedSteps },
    notes: [...(v5State.notes || [])],
    customTags: [...(v5State.customTags || [])],
    activeTagFilters: [...(v5State.activeTagFilters || [])],
    searchKeyword: v5State.searchKeyword || '',
    searchMatchMode: v5State.searchMatchMode || 'or',
    searchScope: v5State.searchScope || 'all',
    noteSortBy: v5State.noteSortBy || 'updatedAt',
    noteSortOrder: v5State.noteSortOrder || 'desc',
    noteAggregationType: v5State.noteAggregationType || 'tag',
    connectionHintsUsed: [...(v5State.connectionHintsUsed || [])],
    discoveredHints: [...(v5State.discoveredHints || [])],
    progressMilestones: { ...(v5State.progressMilestones || {}) },
    repairRetryCounts: {},
    connectionRetryCounts: {},
    dialogueFlags: {},
    dialogueHistory: [],
    completedDialogueNodeIds: [],
    archivedConclusions: [],
    boardCluePositions: {},
    discoveredConflicts: [],
    scoreHistory: [],
    unlockedAchievements: [],
    currentScore: null,
    branchTreeStates: {}
  }
}

interface GameStateV6 {
  currentCommissionId: string | null
  currentChapterId: string | null
  currentStep: GameStep
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
  notes: any[]
  customTags: any[]
  activeTagFilters: string[]
  searchKeyword: string
  searchMatchMode: 'and' | 'or'
  searchScope: 'all' | 'clue' | 'note'
  noteSortBy: 'updatedAt' | 'createdAt' | 'importance' | 'title'
  noteSortOrder: 'asc' | 'desc'
  noteAggregationType: 'tag' | 'clue' | 'time' | 'importance'
  connectionHintsUsed: string[]
  discoveredHints: string[]
  progressMilestones: Record<string, boolean>
  repairRetryCounts: Record<string, number>
  connectionRetryCounts: Record<string, number>
}

interface SavedGameV6 {
  version: string
  state: GameStateV6
  savedAt: string
}

function migrateFromV6ToV7(v6State: GameStateV6): GameState {
  return {
    currentCommissionId: v6State.currentCommissionId,
    currentChapterId: v6State.currentChapterId,
    currentStep: v6State.currentStep,
    completedCommissions: [...v6State.completedCommissions],
    unlockedChapters: [...v6State.unlockedChapters],
    collectedClues: [...v6State.collectedClues],
    discoveredConnections: [...v6State.discoveredConnections],
    unlockedEndings: [...v6State.unlockedEndings],
    currentEndingType: v6State.currentEndingType,
    lastSaveTime: v6State.lastSaveTime,
    totalPlayTime: v6State.totalPlayTime,
    commissionStatuses: { ...v6State.commissionStatuses },
    unlockedSteps: { ...v6State.unlockedSteps },
    notes: [...(v6State.notes || [])],
    customTags: [...(v6State.customTags || [])],
    activeTagFilters: [...(v6State.activeTagFilters || [])],
    searchKeyword: v6State.searchKeyword || '',
    searchMatchMode: v6State.searchMatchMode || 'or',
    searchScope: v6State.searchScope || 'all',
    noteSortBy: v6State.noteSortBy || 'updatedAt',
    noteSortOrder: v6State.noteSortOrder || 'desc',
    noteAggregationType: v6State.noteAggregationType || 'tag',
    connectionHintsUsed: [...(v6State.connectionHintsUsed || [])],
    discoveredHints: [...(v6State.discoveredHints || [])],
    progressMilestones: { ...(v6State.progressMilestones || {}) },
    repairRetryCounts: { ...(v6State.repairRetryCounts || {}) },
    connectionRetryCounts: { ...(v6State.connectionRetryCounts || {}) },
    dialogueFlags: {},
    dialogueHistory: [],
    completedDialogueNodeIds: [],
    archivedConclusions: [],
    boardCluePositions: {},
    discoveredConflicts: [],
    scoreHistory: [],
    unlockedAchievements: [],
    currentScore: null,
    branchTreeStates: {}
  }
}

interface GameStateV7 {
  currentCommissionId: string | null
  currentChapterId: string | null
  currentStep: GameStep
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
  notes: any[]
  customTags: any[]
  activeTagFilters: string[]
  searchKeyword: string
  searchMatchMode: 'and' | 'or'
  searchScope: 'all' | 'clue' | 'note'
  noteSortBy: 'updatedAt' | 'createdAt' | 'importance' | 'title'
  noteSortOrder: 'asc' | 'desc'
  noteAggregationType: 'tag' | 'clue' | 'time' | 'importance'
  connectionHintsUsed: string[]
  discoveredHints: string[]
  progressMilestones: Record<string, boolean>
  repairRetryCounts: Record<string, number>
  connectionRetryCounts: Record<string, number>
  dialogueFlags: Record<string, string | number | boolean>
  dialogueHistory: any[]
  completedDialogueNodeIds: string[]
}

interface SavedGameV7 {
  version: string
  state: GameStateV7
  savedAt: string
}

function migrateFromV7ToV8(v7State: GameStateV7): GameState {
  return {
    currentCommissionId: v7State.currentCommissionId,
    currentChapterId: v7State.currentChapterId,
    currentStep: v7State.currentStep,
    completedCommissions: [...v7State.completedCommissions],
    unlockedChapters: [...v7State.unlockedChapters],
    collectedClues: [...v7State.collectedClues],
    discoveredConnections: [...v7State.discoveredConnections],
    unlockedEndings: [...v7State.unlockedEndings],
    currentEndingType: v7State.currentEndingType,
    lastSaveTime: v7State.lastSaveTime,
    totalPlayTime: v7State.totalPlayTime,
    commissionStatuses: { ...v7State.commissionStatuses },
    unlockedSteps: { ...v7State.unlockedSteps },
    notes: [...(v7State.notes || [])],
    customTags: [...(v7State.customTags || [])],
    activeTagFilters: [...(v7State.activeTagFilters || [])],
    searchKeyword: v7State.searchKeyword || '',
    searchMatchMode: v7State.searchMatchMode || 'or',
    searchScope: v7State.searchScope || 'all',
    noteSortBy: v7State.noteSortBy || 'updatedAt',
    noteSortOrder: v7State.noteSortOrder || 'desc',
    noteAggregationType: v7State.noteAggregationType || 'tag',
    connectionHintsUsed: [...(v7State.connectionHintsUsed || [])],
    discoveredHints: [...(v7State.discoveredHints || [])],
    progressMilestones: { ...(v7State.progressMilestones || {}) },
    repairRetryCounts: { ...(v7State.repairRetryCounts || {}) },
    connectionRetryCounts: { ...(v7State.connectionRetryCounts || {}) },
    dialogueFlags: { ...(v7State.dialogueFlags || {}) },
    dialogueHistory: [...(v7State.dialogueHistory || [])],
    completedDialogueNodeIds: [...(v7State.completedDialogueNodeIds || [])],
    archivedConclusions: [],
    boardCluePositions: {},
    discoveredConflicts: [],
    scoreHistory: [],
    unlockedAchievements: [],
    currentScore: null,
    branchTreeStates: {}
  }
}

interface GameStateV8 {
  currentCommissionId: string | null
  currentChapterId: string | null
  currentStep: GameStep
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
  notes: any[]
  customTags: any[]
  activeTagFilters: string[]
  searchKeyword: string
  searchMatchMode: 'and' | 'or'
  searchScope: 'all' | 'clue' | 'note'
  noteSortBy: 'updatedAt' | 'createdAt' | 'importance' | 'title'
  noteSortOrder: 'asc' | 'desc'
  noteAggregationType: 'tag' | 'clue' | 'time' | 'importance'
  connectionHintsUsed: string[]
  discoveredHints: string[]
  progressMilestones: Record<string, boolean>
  repairRetryCounts: Record<string, number>
  connectionRetryCounts: Record<string, number>
  dialogueFlags: Record<string, string | number | boolean>
  dialogueHistory: any[]
  completedDialogueNodeIds: string[]
}

interface SavedGameV8 {
  version: string
  state: GameStateV8
  savedAt: string
}

function migrateFromV8ToV9(v8State: GameStateV8): GameState {
  const migrated: GameState = {
    currentCommissionId: v8State.currentCommissionId,
    currentChapterId: v8State.currentChapterId,
    currentStep: v8State.currentStep,
    completedCommissions: [...v8State.completedCommissions],
    unlockedChapters: [...v8State.unlockedChapters],
    collectedClues: [...v8State.collectedClues],
    discoveredConnections: [...v8State.discoveredConnections],
    unlockedEndings: [...v8State.unlockedEndings],
    currentEndingType: v8State.currentEndingType,
    lastSaveTime: v8State.lastSaveTime,
    totalPlayTime: v8State.totalPlayTime,
    commissionStatuses: { ...v8State.commissionStatuses },
    unlockedSteps: { ...v8State.unlockedSteps },
    notes: [...(v8State.notes || [])],
    customTags: [...(v8State.customTags || [])],
    activeTagFilters: [...(v8State.activeTagFilters || [])],
    searchKeyword: v8State.searchKeyword || '',
    searchMatchMode: v8State.searchMatchMode || 'or',
    searchScope: v8State.searchScope || 'all',
    noteSortBy: v8State.noteSortBy || 'updatedAt',
    noteSortOrder: v8State.noteSortOrder || 'desc',
    noteAggregationType: v8State.noteAggregationType || 'tag',
    connectionHintsUsed: [...(v8State.connectionHintsUsed || [])],
    discoveredHints: [...(v8State.discoveredHints || [])],
    progressMilestones: { ...(v8State.progressMilestones || {}) },
    repairRetryCounts: { ...(v8State.repairRetryCounts || {}) },
    connectionRetryCounts: { ...(v8State.connectionRetryCounts || {}) },
    dialogueFlags: { ...(v8State.dialogueFlags || {}) },
    dialogueHistory: [...(v8State.dialogueHistory || [])],
    completedDialogueNodeIds: [...(v8State.completedDialogueNodeIds || [])],
    archivedConclusions: [],
    boardCluePositions: {},
    discoveredConflicts: [],
    scoreHistory: [],
    unlockedAchievements: [],
    currentScore: null,
    branchTreeStates: {}
  }

  const configCommissionIds = new Set(commissions.map(c => c.id))
  for (const [commId, status] of Object.entries(migrated.commissionStatuses)) {
    if (!configCommissionIds.has(commId)) {
      delete migrated.commissionStatuses[commId]
    }
  }
  for (const comm of commissions) {
    if (!(comm.id in migrated.commissionStatuses)) {
      migrated.commissionStatuses[comm.id] = comm.status
    }
  }

  const configChapterIds = new Set(chapters.map(c => c.id))
  migrated.unlockedChapters = migrated.unlockedChapters.filter(id => configChapterIds.has(id))
  if (migrated.unlockedChapters.length === 0) {
    migrated.unlockedChapters = ['chap-001']
  }

  const configClueIds = new Set(clues.map(c => c.id))
  migrated.collectedClues = migrated.collectedClues.filter(id => configClueIds.has(id))

  const configConnectionIds = new Set(connections.map(c => c.id))
  migrated.discoveredConnections = migrated.discoveredConnections.filter(id => configConnectionIds.has(id))

  const configEndingIds = new Set(endings.map(e => e.id))
  migrated.unlockedEndings = migrated.unlockedEndings.filter(id => configEndingIds.has(id))

  for (const commId of Object.keys(migrated.unlockedSteps)) {
    if (!configCommissionIds.has(commId)) {
      delete migrated.unlockedSteps[commId]
    }
  }
  for (const comm of commissions) {
    if (!(comm.id in migrated.unlockedSteps)) {
      migrated.unlockedSteps[comm.id] = ['item']
    }
  }

  return migrated
}

function migrateSavedGame(savedGame: SavedGameV1 | SavedGameV2 | SavedGameV3 | SavedGameV4 | SavedGameV5 | SavedGameV6 | SavedGameV7 | SavedGameV8 | SavedGame): GameState | null {
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
    if (!(state as any).searchMatchMode) (state as any).searchMatchMode = 'or'
    if (!(state as any).searchScope) (state as any).searchScope = 'all'
    if (!(state as any).noteSortBy) (state as any).noteSortBy = 'updatedAt'
    if (!(state as any).noteSortOrder) (state as any).noteSortOrder = 'desc'
    if (!(state as any).noteAggregationType) (state as any).noteAggregationType = 'tag'
    if (!(state as any).connectionHintsUsed) (state as any).connectionHintsUsed = []
    if (!(state as any).discoveredHints) (state as any).discoveredHints = []
    if (!(state as any).progressMilestones) (state as any).progressMilestones = {}
    if (!(state as any).repairRetryCounts) (state as any).repairRetryCounts = {}
    if (!(state as any).connectionRetryCounts) (state as any).connectionRetryCounts = {}
    if (!(state as any).dialogueFlags) (state as any).dialogueFlags = {}
    if (!(state as any).dialogueHistory) (state as any).dialogueHistory = []
    if (!(state as any).completedDialogueNodeIds) (state as any).completedDialogueNodeIds = []
    if (!(state as any).archivedConclusions) (state as any).archivedConclusions = []
    if (!(state as any).boardCluePositions) (state as any).boardCluePositions = {}
    if (!(state as any).discoveredConflicts) (state as any).discoveredConflicts = []
    if (!(state as any).scoreHistory) (state as any).scoreHistory = []
    if (!(state as any).unlockedAchievements) (state as any).unlockedAchievements = []
    if (!(state as any).currentScore) (state as any).currentScore = null
    return state
  }

  if (version === '8.0.0') {
    return migrateFromV8ToV9((savedGame as SavedGameV8).state)
  }

  if (version === '7.0.0') {
    const v8 = migrateFromV7ToV8((savedGame as SavedGameV7).state)
    return migrateFromV8ToV9(v8)
  }

  if (version === '6.0.0') {
    const v7 = migrateFromV6ToV7((savedGame as SavedGameV6).state)
    const v8 = migrateFromV7ToV8(v7)
    return migrateFromV8ToV9(v8)
  }

  if (version === '5.0.0') {
    const v6 = migrateFromV5ToV6((savedGame as SavedGameV5).state)
    const v7 = migrateFromV6ToV7(v6)
    const v8 = migrateFromV7ToV8(v7)
    return migrateFromV8ToV9(v8)
  }

  if (version === '4.0.0') {
    const v5 = migrateFromV4ToV5((savedGame as SavedGameV4).state)
    const v6 = migrateFromV5ToV6(v5 as any)
    const v7 = migrateFromV6ToV7(v6)
    const v8 = migrateFromV7ToV8(v7)
    return migrateFromV8ToV9(v8)
  }

  if (version === '3.0.0') {
    const v4 = migrateFromV3ToV4((savedGame as SavedGameV3).state)
    const v5 = migrateFromV4ToV5(v4 as any)
    const v6 = migrateFromV5ToV6(v5 as any)
    const v7 = migrateFromV6ToV7(v6)
    const v8 = migrateFromV7ToV8(v7)
    return migrateFromV8ToV9(v8)
  }

  if (version === '2.0.0') {
    const v3 = migrateFromV2ToV3((savedGame as SavedGameV2).state)
    const v4 = migrateFromV3ToV4(v3 as any)
    const v5 = migrateFromV4ToV5(v4 as any)
    const v6 = migrateFromV5ToV6(v5 as any)
    const v7 = migrateFromV6ToV7(v6)
    const v8 = migrateFromV7ToV8(v7)
    return migrateFromV8ToV9(v8)
  }

  if (version === '1.0.0') {
    const v2 = migrateFromV1ToV2((savedGame as SavedGameV1).state)
    const v3 = migrateFromV2ToV3(v2 as any)
    const v4 = migrateFromV3ToV4(v3 as any)
    const v5 = migrateFromV4ToV5(v4 as any)
    const v6 = migrateFromV5ToV6(v5 as any)
    const v7 = migrateFromV6ToV7(v6)
    const v8 = migrateFromV7ToV8(v7)
    return migrateFromV8ToV9(v8)
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
    createdAt: new Date().toISOString(),
    snapshots: []
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
    lastActiveSlotId,
    endingReplays: []
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
    
    if (!parsed.slots || parsed.slots.length === 0) {
      const state = initializeSaveManager()
      saveSaveManagerState(state)
      return state
    }

    for (const slot of parsed.slots) {
      if (!slot.snapshots) slot.snapshots = []
      if (slot.save) {
        const migrated = migrateSavedGame(slot.save)
        if (migrated) {
          slot.save.state = migrated
          slot.save.version = SAVE_VERSION
        } else {
          slot.save = null
        }
      }
      if (slot.backup) {
        const migrated = migrateSavedGame(slot.backup)
        if (migrated) {
          slot.backup.state = migrated
          slot.backup.version = SAVE_VERSION
        } else {
          slot.backup = null
        }
      }
    }

    if (parsed.slots.length > MAX_SAVE_SLOTS) {
      const activeIds = new Set([
        parsed.currentSlotId,
        parsed.lastActiveSlotId
      ].filter(Boolean) as string[])
      
      const activeSlots = parsed.slots.filter(s => activeIds.has(s.slotId) || s.save !== null)
      const emptySlots = parsed.slots.filter(s => !activeIds.has(s.slotId) && s.save === null)
      
      const kept: SaveSlotData[] = []
      for (const s of activeSlots) {
        if (kept.length < MAX_SAVE_SLOTS) kept.push(s)
      }
      for (const s of emptySlots) {
        if (kept.length < MAX_SAVE_SLOTS) kept.push(s)
      }
      while (kept.length < MAX_SAVE_SLOTS) {
        kept.push(createSaveSlot(`slot-${kept.length + 1}`, DEFAULT_SLOT_NAMES[kept.length]))
      }
      parsed.slots = kept.slice(0, MAX_SAVE_SLOTS)
      
      if (parsed.currentSlotId && !parsed.slots.find(s => s.slotId === parsed.currentSlotId)) {
        parsed.currentSlotId = null
      }
      if (parsed.lastActiveSlotId && !parsed.slots.find(s => s.slotId === parsed.lastActiveSlotId)) {
        parsed.lastActiveSlotId = parsed.slots.find(s => s.save !== null)?.slotId ?? null
      }
    }

    while (parsed.slots.length < MAX_SAVE_SLOTS) {
      parsed.slots.push(createSaveSlot(`slot-${parsed.slots.length + 1}`, DEFAULT_SLOT_NAMES[parsed.slots.length]))
    }

    for (let i = 0; i < parsed.slots.length; i++) {
      parsed.slots[i].slotId = `slot-${i + 1}`
    }

    if (!parsed.endingReplays) parsed.endingReplays = []
    
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
    backupSavedAt: slot.backup?.savedAt ?? null,
    snapshotCount: slot.snapshots?.length ?? 0
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

function snapshotToInfo(snap: KeyNodeSnapshot): SnapshotInfo {
  const state = snap.savedGame.state
  return {
    id: snap.id,
    label: snap.label,
    trigger: snap.trigger,
    createdAt: snap.createdAt,
    commissionId: snap.commissionId,
    chapterId: snap.chapterId,
    completedCount: state.completedCommissions.length,
    chapterProgress: getChapterProgress(state),
    currentCommissionTitle: getCurrentCommissionTitle(state)
  }
}

export function getSnapshotsForSlot(slotId: string): SnapshotInfo[] {
  const manager = loadSaveManagerState()
  const slot = manager.slots.find(s => s.slotId === slotId)
  if (!slot) return []
  return (slot.snapshots || []).map(snapshotToInfo)
}

export function createSnapshot(
  slotId: string,
  state: GameState,
  label: string,
  trigger: SnapshotTrigger
): boolean {
  try {
    const manager = loadSaveManagerState()
    const slot = manager.slots.find(s => s.slotId === slotId)
    if (!slot) return false
    if (!slot.snapshots) slot.snapshots = []

    const savedGame: SavedGame = {
      version: SAVE_VERSION,
      state: JSON.parse(JSON.stringify(state)),
      savedAt: new Date().toISOString()
    }

    const snapshot: KeyNodeSnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label,
      trigger,
      savedGame,
      createdAt: new Date().toISOString(),
      commissionId: state.currentCommissionId,
      chapterId: state.currentChapterId
    }

    slot.snapshots.push(snapshot)

    if (slot.snapshots.length > MAX_SNAPSHOTS_PER_SLOT) {
      slot.snapshots = slot.snapshots.slice(-MAX_SNAPSHOTS_PER_SLOT)
    }

    saveSaveManagerState(manager)
    return true
  } catch (e) {
    console.error('Failed to create snapshot:', e)
    return false
  }
}

export function loadSnapshot(slotId: string, snapshotId: string): LoadResult {
  try {
    const manager = loadSaveManagerState()
    const slot = manager.slots.find(s => s.slotId === slotId)
    if (!slot || !slot.snapshots) {
      return { success: false, error: '存档位不存在', recoverable: false, backupAvailable: false }
    }

    const snapshot = slot.snapshots.find(s => s.id === snapshotId)
    if (!snapshot) {
      return { success: false, error: '快照不存在', recoverable: false, backupAvailable: false }
    }

    const migratedState = migrateSavedGame(snapshot.savedGame)
    if (!migratedState) {
      return { success: false, error: '快照数据损坏', recoverable: false, backupAvailable: false }
    }

    if (slot.save) {
      slot.backup = { ...slot.save }
    }

    slot.save = {
      version: SAVE_VERSION,
      state: JSON.parse(JSON.stringify(migratedState)),
      savedAt: new Date().toISOString()
    }
    manager.lastActiveSlotId = slotId
    manager.currentSlotId = slotId
    saveSaveManagerState(manager)

    return { success: true, state: migratedState, fromBackup: false }
  } catch (e) {
    return { success: false, error: '读取快照时发生错误', recoverable: false, backupAvailable: false }
  }
}

export function deleteSnapshot(slotId: string, snapshotId: string): boolean {
  try {
    const manager = loadSaveManagerState()
    const slot = manager.slots.find(s => s.slotId === slotId)
    if (!slot || !slot.snapshots) return false

    const idx = slot.snapshots.findIndex(s => s.id === snapshotId)
    if (idx === -1) return false

    slot.snapshots.splice(idx, 1)
    saveSaveManagerState(manager)
    return true
  } catch (e) {
    console.error('Failed to delete snapshot:', e)
    return false
  }
}

export function addEndingReplay(endingId: string, commissionId: string, endingType: 'good' | 'neutral' | 'bad', slotId: string): boolean {
  try {
    const manager = loadSaveManagerState()
    const exists = manager.endingReplays.find(
      r => r.endingId === endingId && r.fromSlotId === slotId
    )
    if (exists) return true

    manager.endingReplays.push({
      endingId,
      commissionId,
      endingType,
      unlockedAt: new Date().toISOString(),
      fromSlotId: slotId
    })
    saveSaveManagerState(manager)
    return true
  } catch (e) {
    console.error('Failed to add ending replay:', e)
    return false
  }
}

export function getEndingReplays(): EndingReplay[] {
  const manager = loadSaveManagerState()
  return manager.endingReplays || []
}

export function getEndingReplaysForSlot(slotId: string): EndingReplay[] {
  const manager = loadSaveManagerState()
  return (manager.endingReplays || []).filter(r => r.fromSlotId === slotId)
}

export function getLatestSaveSlotInfo(): { slotId: string; info: SaveSlotInfo } | null {
  const manager = loadSaveManagerState()
  let latest: { slotId: string; savedAt: string } | null = null

  for (const slot of manager.slots) {
    if (slot.save && slot.save.savedAt) {
      if (!latest || slot.save.savedAt > latest.savedAt) {
        latest = { slotId: slot.slotId, savedAt: slot.save.savedAt }
      }
    }
  }

  if (!latest) return null
  const info = getSaveSlotInfo(latest.slotId)
  if (!info) return null
  return { slotId: latest.slotId, info }
}
