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

export interface Clue {
  id: string
  commissionId: string
  title: string
  content: string
  icon: string
  category: 'object' | 'memory' | 'emotion' | 'time'
  isCollected: boolean
  hotspotId?: string
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
}

export interface SavedGame {
  version: string
  state: GameState
  savedAt: string
}
