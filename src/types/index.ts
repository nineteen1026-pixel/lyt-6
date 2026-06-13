export interface Commission {
  id: string
  title: string
  clientName: string
  clientAvatar: string
  description: string
  difficulty: 'simple' | 'medium' | 'complex'
  item: Item
  status: 'pending' | 'in_progress' | 'completed'
  unlockedAt?: string
  completedAt?: string
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
  currentStep: 'commission' | 'item' | 'deduction' | 'repair' | 'ending'
  completedCommissions: string[]
  collectedClues: string[]
  discoveredConnections: string[]
  unlockedEndings: string[]
  currentEndingType: string | null
  lastSaveTime: string | null
  totalPlayTime: number
}

export interface SavedGame {
  version: string
  state: GameState
  savedAt: string
}
