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

export interface ChapterConfig {
  id: string
  number: number
  title: string
  subtitle: string
  description: string
  theme: string
  icon: string
  unlockRule: UnlockRule
  commissionIds: string[]
}

export interface Chapter extends ChapterConfig {
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

export interface CommissionConfig {
  id: string
  chapterId: string
  title: string
  clientName: string
  clientAvatar: string
  description: string
  difficulty: 'simple' | 'medium' | 'complex'
  item: ItemConfig
  unlockRules: UnlockRule[]
  prerequisiteCommissionIds: string[]
  stepDependencies: StepDependency[]
  orderInChapter: number
}

export interface Commission extends CommissionConfig {
  status: CommissionStatus
  item: Item
  unlockedAt?: string
  completedAt?: string
}

export interface ItemConfig {
  id: string
  name: string
  description: string
  image: string
  hotspots: HotspotConfig[]
}

export interface Item extends ItemConfig {
  hotspots: Hotspot[]
}

export type DynamicDifficultyLevel = 'assisted' | 'standard' | 'challenging'

export interface DifficultyContext {
  clueCollectionRate: number
  retryCount: number
  commissionBaseDifficulty: 'simple' | 'medium' | 'complex'
  effectiveDifficulty: DynamicDifficultyLevel
  deductionTimeMs: number
  difficultyScore: number
}

export type GamePhase = 'item' | 'deduction' | 'repair'

export interface PhaseTiming {
  totalTimeMs: number
  currentStartTime: string | null
  sessionCount: number
}

export interface DifficultyTiming {
  item: PhaseTiming
  deduction: PhaseTiming
  repair: PhaseTiming
}

export interface HotspotConfig {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  description: string
  clueId?: string
  hints?: Record<DynamicDifficultyLevel, string>
}

export interface Hotspot extends HotspotConfig {
  isDiscovered: boolean
}

export interface Tag {
  id: string
  name: string
  color: string
  description?: string
  usageCount?: number
}

export type SearchMatchMode = 'and' | 'or'

export type SearchScope = 'all' | 'clue' | 'note'

export interface ClueSearchResult {
  clue: Clue
  matchedTagIds: string[]
  keywordMatched: boolean
  matchScore: number
  matchedFields: string[]
}

export interface NoteSearchResult {
  note: Note
  matchedTagIds: string[]
  keywordMatched: boolean
  matchScore: number
  matchedFields: string[]
}

export interface UnifiedSearchResult {
  clues: ClueSearchResult[]
  notes: NoteSearchResult[]
  totalCount: number
}

export interface ProgressDetail {
  clueProgress: { collected: number; total: number; percentage: number; weightedScore: number }
  connectionProgress: { discovered: number; total: number; percentage: number; weightedScore: number }
  noteProgress: { count: number; weightedScore: number }
  tagProgress?: { usedTagCount: number; totalTagCount: number; percentage: number }
  overallPercentage: number
  weightedOverall: number
}

export type AggregationType = 'tag' | 'clue' | 'time' | 'importance'

export interface NoteAggregate {
  tagId: string
  tag: Tag | null
  notes: Note[]
  clueCount: number
  importantCount: number
  lastUpdatedAt: string
}

export interface ClueNoteCluster {
  clue: Clue
  notes: Note[]
  relatedClues: Clue[]
  tagSummary: { tag: Tag; count: number }[]
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

export interface ClueConfig {
  id: string
  commissionId: string
  title: string
  content: string
  icon: string
  category: 'object' | 'memory' | 'emotion' | 'time'
  hotspotId?: string
  tagIds: string[]
}

export interface Clue extends ClueConfig {
  isCollected: boolean
}

export type ConnectionErrorCode = 
  | 'same_clue' 
  | 'already_connected' 
  | 'circular_reference' 
  | 'invalid_direction' 
  | 'no_connection'
  | 'one_clue_missing'
  | 'both_clues_missing'
  | 'same_category_forbidden'
  | 'weak_connection'
  | 'max_connections_reached'

export interface ConnectionValidationResult {
  isValid: boolean
  errorCode?: ConnectionErrorCode
  errorMessage?: string
  connectionId?: string
  suggestion?: string
  confidence?: number
  fromClueTitle?: string
  toClueTitle?: string
}

export interface ConnectionHint {
  fromClueId: string
  toClueId: string
  hint: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface ConnectionGraphNode {
  clueId: string
  connections: string[]
  depth: number
  isHub: boolean
}

export interface ClueConnectionConfig {
  id: string
  fromClueId: string
  toClueId: string
  conclusion: string
  repairHint: string
  scoreConfig?: Partial<ConnectionScoreConfig>
  isKeyConnection?: boolean
  conflictsWith?: string[]
}

export interface ClueConnection extends ClueConnectionConfig {
  isDiscovered: boolean
}

export interface EndingConfig {
  id: string
  commissionId: string
  type: 'good' | 'neutral' | 'bad'
  title: string
  story: string
  choiceCondition: string
  image: string
}

export interface Ending extends EndingConfig {
  isUnlocked: boolean
}

export interface RepairStepConfig {
  id: string
  title: string
  description: string
  choices: RepairChoice[]
  difficultyVariants?: Record<DynamicDifficultyLevel, {
    description?: string
    extraChoices?: RepairChoice[]
  }>
}

export interface RepairStep extends RepairStepConfig {
  isCompleted: boolean
  selectedChoice?: string
}

export interface RepairChoice {
  id: string
  label: string
  description: string
  endingType: 'good' | 'neutral' | 'bad'
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
  snapshotCount: number
}

export interface SaveSlotData {
  slotId: string
  slotName: string
  save: SavedGame | null
  backup: SavedGame | null
  createdAt: string
  snapshots: KeyNodeSnapshot[]
}

export type SnapshotTrigger = 'manual' | 'chapter_complete' | 'ending_unlocked' | 'milestone' | 'auto_chapter_start'

export interface KeyNodeSnapshot {
  id: string
  label: string
  trigger: SnapshotTrigger
  savedGame: SavedGame
  createdAt: string
  commissionId: string | null
  chapterId: string | null
}

export interface SnapshotInfo {
  id: string
  label: string
  trigger: SnapshotTrigger
  createdAt: string
  commissionId: string | null
  chapterId: string | null
  completedCount: number
  chapterProgress: string
  currentCommissionTitle: string | null
}

export interface EndingReplay {
  endingId: string
  commissionId: string
  endingType: 'good' | 'neutral' | 'bad'
  unlockedAt: string
  fromSlotId: string
}

export interface SaveManagerState {
  slots: SaveSlotData[]
  currentSlotId: string | null
  lastActiveSlotId: string | null
  endingReplays: EndingReplay[]
}

export type LoadResult = 
  | { success: true; state: GameState; fromBackup: boolean }
  | { success: false; error: string; recoverable: boolean; backupAvailable: boolean }

export const MAX_SAVE_SLOTS = 3
export const DEFAULT_SLOT_NAMES = ['存档一', '存档二', '存档三']
export const MAX_SNAPSHOTS_PER_SLOT = 10

export type DialogueNodeType =
  | 'commission_accept'
  | 'commission_intro'
  | 'repair_pre'
  | 'repair_post'
  | 'story_interlude'
  | 'branch'
  | 'narration'

export type DialogueCharacter =
  | 'shopkeeper'
  | 'client'
  | 'narrator'
  | 'player'
  | 'inner_thought'

export interface DialogueCondition {
  type: 'clue_collected' | 'clue_count' | 'connection_count' | 'ending_type_chosen' | 'always' | 'custom_flag'
  clueId?: string
  minCount?: number
  flagKey?: string
  flagValue?: string | number | boolean
  endingType?: 'good' | 'neutral' | 'bad'
}

export interface DialogueChoice {
  id: string
  label: string
  description?: string
  nextNodeId: string
  conditions?: DialogueCondition[]
  effects?: DialogueEffect[]
  conditionOperator?: 'and' | 'or'
}

export interface DialogueEffect {
  type: 'set_flag' | 'set_repair_choice_hint' | 'unlock_content' | 'add_tag'
  flagKey?: string
  flagValue?: string | number | boolean
  contentId?: string
  tagId?: string
}

export interface DialogueNode {
  id: string
  commissionId: string
  nodeType: DialogueNodeType
  order: number
  speaker: DialogueCharacter
  speakerName?: string
  speakerAvatar?: string
  content: string
  mood?: 'happy' | 'sad' | 'worried' | 'hopeful' | 'mysterious' | 'neutral' | 'grateful'
  nextNodeId?: string | null
  choices?: DialogueChoice[]
  conditions?: DialogueCondition[]
  conditionOperator?: 'and' | 'or'
  effects?: DialogueEffect[]
  triggersRepairStep?: string
  isEndNode?: boolean
}

export interface DialogueHistoryEntry {
  id: string
  nodeId: string
  commissionId: string
  nodeType: DialogueNodeType
  speaker: DialogueCharacter
  speakerName: string
  speakerAvatar: string
  content: string
  choiceMade?: {
    choiceId: string
    choiceLabel: string
  }
  timestamp: string
  order: number
}

export interface DialogueSessionState {
  currentCommissionId: string | null
  currentNodeId: string | null
  sessionType: DialogueNodeType | null
  isActive: boolean
  order: number
  completedNodeIds: string[]
}

export interface GameDataConfig {
  tags: Tag[]
  chapters: ChapterConfig[]
  commissions: CommissionConfig[]
  clues: ClueConfig[]
  connections: ClueConnectionConfig[]
  endings: EndingConfig[]
  repairSteps: Record<string, RepairStepConfig[]>
  dialogueNodes: DialogueNode[]
}

export const CURRENT_CONFIG_VERSION = '9.0.0'
export const CURRENT_SAVE_VERSION = '9.0.0'

export type ConnectionScoreLevel = 'weak' | 'moderate' | 'strong' | 'critical'

export interface ConnectionScoreConfig {
  baseScore: number
  tagOverlapBonus: number
  categoryMatchBonus: number
  narrativeWeight: number
  conflictPenalty: number
}

export interface ConnectionScoreResult {
  totalScore: number
  baseScore: number
  tagOverlapScore: number
  categoryMatchScore: number
  narrativeWeightScore: number
  conflictPenaltyScore: number
  level: ConnectionScoreLevel
  sharedTagIds: string[]
  sharedTagNames: string[]
  isCategoryMatch: boolean
}

export type ConflictType = 
  | 'logical_contradiction'
  | 'mutually_exclusive'
  | 'timeline_conflict'
  | 'evidence_conflict'
  | 'redundant_connection'

export interface ConnectionConflictConfig {
  id: string
  type: ConflictType
  connectionAId: string
  connectionBId: string
  description: string
  hint: string
  severity: 'warning' | 'error'
}

export interface ConnectionConflict {
  id: string
  type: ConflictType
  connectionA: ClueConnection
  connectionB: ClueConnection
  description: string
  hint: string
  severity: 'warning' | 'error'
  isActive: boolean
}

export interface BoardCluePosition {
  clueId: string
  x: number
  y: number
}

export interface DragLineState {
  isDragging: boolean
  fromClueId: string | null
  fromX: number
  fromY: number
  toX: number
  toY: number
  targetClueId: string | null
}

export interface DeductionConclusion {
  id: string
  commissionId: string
  connectionId: string
  fromClueId: string
  toClueId: string
  conclusionText: string
  score: ConnectionScoreResult
  archivedAt: string
  order: number
  isKeyConclusion: boolean
}

export interface CommissionProgressArchive {
  commissionId: string
  conclusions: DeductionConclusion[]
  averageScore: number
  totalScore: number
  keyConclusionCount: number
  totalConclusionCount: number
  conflictCount: number
  lastArchivedAt: string | null
}

export type ScoreDimension = 
  | 'craftsmanship' 
  | 'clue_completeness' 
  | 'reasoning_depth' 
  | 'emotional_resonance' 
  | 'efficiency'

export interface DimensionScore {
  dimension: ScoreDimension
  name: string
  description: string
  score: number
  maxScore: number
  percentage: number
  icon: string
  color: string
}

export interface MultiDimensionalScore {
  id: string
  commissionId: string
  endingId: string
  endingType: 'good' | 'neutral' | 'bad'
  totalScore: number
  maxTotalScore: number
  overallPercentage: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  dimensions: DimensionScore[]
  choiceScoreBreakdown: {
    goodChoices: number
    neutralChoices: number
    badChoices: number
    totalChoices: number
  }
  metadata: {
    clueCollected: number
    clueTotal: number
    connectionsDiscovered: number
    connectionsTotal: number
    repairRetries: number
    connectionRetries: number
    hintsUsed: number
    difficultyLevel: string
  }
  achievedAt: string
}

export interface ScoreGradeConfig {
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  minPercentage: number
  color: string
  bgColor: string
  label: string
  description: string
}

export const SCORE_GRADES: ScoreGradeConfig[] = [
  { grade: 'S', minPercentage: 95, color: 'text-amber-500', bgColor: 'bg-amber-50', label: '大师级', description: '完美的修复，展现了非凡的技艺与同理心' },
  { grade: 'A', minPercentage: 85, color: 'text-green-600', bgColor: 'bg-green-50', label: '专业级', description: '出色的修复，每一个细节都处理得当' },
  { grade: 'B', minPercentage: 70, color: 'text-blue-600', bgColor: 'bg-blue-50', label: '熟练级', description: '良好的修复，达成了委托人的期望' },
  { grade: 'C', minPercentage: 50, color: 'text-stone-600', bgColor: 'bg-stone-50', label: '入门级', description: '基本完成修复，但仍有提升空间' },
  { grade: 'D', minPercentage: 0, color: 'text-rose-600', bgColor: 'bg-rose-50', label: '待提升', description: '修复未能完成，需要更多的练习' }
]

export const SCORE_DIMENSION_CONFIG: Record<ScoreDimension, { name: string; description: string; icon: string; color: string; weight: number }> = {
  craftsmanship: { name: '修复技艺', description: '修复选择的质量与专业性', icon: '🔧', color: 'text-amber-600', weight: 0.30 },
  clue_completeness: { name: '线索完整度', description: '收集线索的完整程度', icon: '🔍', color: 'text-blue-600', weight: 0.20 },
  reasoning_depth: { name: '推理深度', description: '发现关联的数量与质量', icon: '🧩', color: 'text-purple-600', weight: 0.20 },
  emotional_resonance: { name: '情感共鸣', description: '与委托人情感的连接程度', icon: '💝', color: 'text-rose-500', weight: 0.20 },
  efficiency: { name: '效率表现', description: '完成任务的效率与独立性', icon: '⚡', color: 'text-green-600', weight: 0.10 }
}

export interface AchievementConfig {
  id: string
  name: string
  description: string
  icon: string
  category: 'score' | 'ending' | 'collection' | 'special'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  condition: {
    type: 'total_score' | 'dimension_score' | 'grade' | 'ending_count' | 'perfect_commission' | 'all_endings' | 'no_hints' | 'consecutive_good'
    value: number | string
    dimension?: ScoreDimension
    commissionId?: string
  }
  reward?: {
    type: 'title' | 'badge' | 'unlock'
    value: string
  }
}

export interface Achievement extends AchievementConfig {
  isUnlocked: boolean
  unlockedAt?: string
  progress?: number
  target?: number
}

export type ReputationLevel = 'emerging' | 'known' | 'respected' | 'renowned' | 'legendary'

export const REPUTATION_LEVELS: { level: ReputationLevel; label: string; minScore: number; icon: string; color: string; bgColor: string; description: string }[] = [
  { level: 'emerging', label: '初出茅庐', minScore: 0, icon: '🌱', color: 'text-stone-500', bgColor: 'bg-stone-50 border-stone-200', description: '你的店铺刚刚开业，还有很长的路要走' },
  { level: 'known', label: '小有名气', minScore: 20, icon: '🏡', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', description: '附近的人开始知道你的手艺' },
  { level: 'respected', label: '远近闻名', minScore: 45, icon: '🏪', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', description: '你的店铺是镇上修复旧物的首选' },
  { level: 'renowned', label: '声名远扬', minScore: 70, icon: '🏛️', color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200', description: '人们从远方慕名而来' },
  { level: 'legendary', label: '传奇匠人', minScore: 90, icon: '👑', color: 'text-amber-500', bgColor: 'bg-amber-50 border-amber-200', description: '你的名字已成为修复技艺的代名词' }
]

export interface VisitorReview {
  id: string
  visitorName: string
  visitorAvatar: string
  rating: number
  comment: string
  timestamp: string
  commissionId: string
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative'
}

export interface ExhibitRevenue {
  baseRevenue: number
  qualityBonus: number
  reputationBonus: number
  totalRevenue: number
  currency: string
  breakdown: {
    label: string
    amount: number
  }[]
}

export interface ExhibitData {
  commissionId: string
  createdAt: string
  revenue: ExhibitRevenue
  reviews: VisitorReview[]
  visitorCount: number
  displayQuality: number
  accumulatedRevenue: number
  lastCollectedAt: string | null
}

export interface ShowroomStats {
  totalRevenue: number
  totalVisitors: number
  averageRating: number
  exhibitCount: number
  reputationLevel: ReputationLevel
  reputationScore: number
  reputationProgress: number
  nextLevelLabel: string | null
  bestReview: VisitorReview | null
  worstReview: VisitorReview | null
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
  searchMatchMode: SearchMatchMode
  searchScope: SearchScope
  noteSortBy: 'updatedAt' | 'createdAt' | 'importance' | 'title'
  noteSortOrder: 'asc' | 'desc'
  noteAggregationType: AggregationType
  connectionHintsUsed: string[]
  discoveredHints: string[]
  progressMilestones: Record<string, boolean>
  repairRetryCounts: Record<string, number>
  connectionRetryCounts: Record<string, number>
  dialogueFlags: Record<string, string | number | boolean>
  dialogueHistory: DialogueHistoryEntry[]
  completedDialogueNodeIds: string[]
  archivedConclusions: DeductionConclusion[]
  boardCluePositions: Record<string, BoardCluePosition[]>
  discoveredConflicts: string[]
  scoreHistory: MultiDimensionalScore[]
  unlockedAchievements: string[]
  currentScore: MultiDimensionalScore | null
  branchTreeStates: Record<string, BranchTreeState>
  showroomExhibits: Record<string, ExhibitData>
  phaseTimings: Record<string, DifficultyTiming>
}

export interface ChoiceWeight {
  choiceId: string
  baseWeight: number
  clueBonus: number
  difficultyBonus: number
  totalWeight: number
  normalizedWeight: number
}

export interface RepairRemedy {
  id: string
  commissionId: string
  stepId: string
  failedChoiceId: string
  remedyChoiceId: string
  remedyType: 'retry' | 'alternative' | 'hint_guided'
  description: string
  weight: number
  isAvailable: boolean
  requiresClueIds: string[]
}

export interface BranchTreeHistoryEntry {
  id: string
  commissionId: string
  stepId: string
  stepIndex: number
  choiceId: string
  choiceLabel: string
  endingType: 'good' | 'neutral' | 'bad'
  weight: number
  normalizedWeight: number
  timestamp: string
  isRemedy: boolean
  remedyFromChoiceId: string | null
  triggeredEndingId: string | null
}

export interface BranchTreeNode {
  id: string
  stepId: string
  stepIndex: number
  choiceId: string | null
  choiceLabel: string | null
  endingType: 'good' | 'neutral' | 'bad' | null
  parentId: string | null
  childIds: string[]
  isCurrentPath: boolean
  isVisited: boolean
  depth: number
  weight: number
  normalizedWeight: number
  isRemedyNode: boolean
  remedyFromChoiceId: string | null
  triggeredEndingId: string | null
  remedyAvailable: boolean
}

export interface BranchTreePath {
  id: string
  nodeIds: string[]
  endingType: 'good' | 'neutral' | 'bad' | null
  endingId: string | null
  completedAt: string | null
  isComplete: boolean
}

export interface BranchTreeState {
  commissionId: string
  currentNodeId: string
  rootNodeId: string
  nodes: Record<string, BranchTreeNode>
  paths: BranchTreePath[]
  currentPathId: string
  visitedChoiceIds: string[]
  totalPossiblePaths: number
  discoveredPaths: number
  history: BranchTreeHistoryEntry[]
  remedies: RepairRemedy[]
  pendingRemedies: string[]
}

export interface BranchTreeStats {
  totalNodes: number
  visitedNodes: number
  totalPaths: number
  discoveredPaths: number
  discoveryPercentage: number
  endingsUnlocked: number
  totalEndings: number
}

