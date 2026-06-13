export type CommissionStatus = 
  | 'locked'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'

export interface UnlockRule {
  type: 'chapter' | 'prerequisites' | 'condition'
  chapterId?: string
  prerequisiteCommissionIds?: string[]
  conditionType?: 'completed_count' | 'ending_type' | 'custom'
  conditionValue?: string | number
}

export interface Chapter {
  id: string
  number: number
  title: string
  subtitle: string
  description: string
  theme: string
  icon: string
  unlockRule: UnlockRule
  commissionIds: string[]
  isUnlocked: boolean
  unlockedAt?: string
}

export type GameStep = 'commission' | 'item' | 'deduction' | 'repair' | 'ending' | 'roadmap'

export type StepDependencyType = 'clue_count' | 'connection_count' | 'clue_ids' | 'connection_ids' | 'always'

export interface StepDependency {
  step: GameStep
  dependencyType: StepDependencyType
  minCount?: number
  requiredIds?: string[]
}

export interface Commission {
  id: string
  chapterId: string
  title: string
  clientName: string
  clientAvatar: string
  description: string
  difficulty: 'simple' | 'medium' | 'complex'
  item: Item
  status: CommissionStatus
  unlockRules: UnlockRule[]
  prerequisiteCommissionIds: string[]
  stepDependencies: StepDependency[]
  unlockedAt?: string
  completedAt?: string
  orderInChapter: number
}

export interface Item {
  id: string
  name: string
  description: string
  image: string
  hotspots: Hotspot[]
}

export interface Hotspot {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  description: string
  clueId?: string
  isDiscovered: boolean
}

export interface Tag {
  id: string
  name: string
  color: string
  description?: string
}

export interface ClueSearchResult {
  clue: Clue
  matchedTagIds: string[]
  keywordMatched: boolean
}

export interface ProgressDetail {
  clueProgress: { collected: number; total: number; percentage: number }
  connectionProgress: { discovered: number; total: number; percentage: number }
  noteProgress: { count: number }
  overallPercentage: number
}

export interface NoteAggregate {
  tagId: string
  tag: Tag | null
  notes: Note[]
  clueCount: number
}

export interface Note {
  id: string
  commissionId: string
  clueId?: string
  title: string
  content: string
  tagIds: string[]
  createdAt: string
  updatedAt: string
  isImportant: boolean
}

export interface Clue {
  id: string
  commissionId: string
  title: string
  content: string
  icon: string
  category: 'object' | 'memory' | 'emotion' | 'time'
  isCollected: boolean
  hotspotId?: string
  tagIds: string[]
}

export interface ConnectionValidationResult {
  isValid: boolean
  errorCode?: 'same_clue' | 'already_connected' | 'circular_reference' | 'invalid_direction' | 'no_connection'
  errorMessage?: string
  connectionId?: string
}

export interface ClueConnection {
  id: string
  fromClueId: string
  toClueId: string
  conclusion: string
  isDiscovered: boolean
  repairHint: string
}

export interface Ending {
  id: string
  commissionId: string
  type: 'good' | 'neutral' | 'bad'
  title: string
  story: string
  choiceCondition: string
  image: string
  isUnlocked: boolean
}

export interface RepairStep {
  id: string
  title: string
  description: string
  choices: RepairChoice[]
  isCompleted: boolean
  selectedChoice?: string
}

export interface RepairChoice {
  id: string
  label: string
  description: string
  endingType: 'good' | 'neutral' | 'bad'
}

export interface GameState {
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
  notes: Note[]
  customTags: Tag[]
  activeTagFilters: string[]
  searchKeyword: string
}

export interface SavedGame {
  version: string
  state: GameState
  savedAt: string
}

export interface SaveSlotInfo {
  slotId: string
  slotName: string
  savedAt: string | null
  playTime: number
  completedCount: number
  totalCount: number
  chapterProgress: string
  currentCommissionTitle: string | null
  hasBackup: boolean
  backupSavedAt: string | null
}

export interface SaveSlotData {
  slotId: string
  slotName: string
  save: SavedGame | null
  backup: SavedGame | null
  createdAt: string
}

export interface SaveManagerState {
  slots: SaveSlotData[]
  currentSlotId: string | null
  lastActiveSlotId: string | null
}

export type LoadResult = 
  | { success: true; state: GameState; fromBackup: boolean }
  | { success: false; error: string; recoverable: boolean; backupAvailable: boolean }

export const MAX_SAVE_SLOTS = 6
export const DEFAULT_SLOT_NAMES = ['存档一', '存档二', '存档三', '存档四', '存档五', '存档六']
