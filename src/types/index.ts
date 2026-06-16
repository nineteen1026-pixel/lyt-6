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
  tutorialState: TutorialState
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

export type TutorialStepKey =
  | 'home_welcome'
  | 'home_continue'
  | 'roadmap_intro'
  | 'commissions_list'
  | 'commission_select'
  | 'item_intro'
  | 'item_hotspot'
  | 'item_clue_collected'
  | 'item_go_deduction'
  | 'deduction_intro'
  | 'deduction_connect'
  | 'deduction_go_repair'
  | 'repair_intro'
  | 'repair_choice'
  | 'ending_intro'
  | 'ending_score'
  | 'gallery_intro'
  | 'tutorial_complete'

export interface TutorialStepConfig {
  key: TutorialStepKey
  title: string
  content: string
  routeName?: string
  targetSelector?: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  highlightPadding?: number
  canSkip?: boolean
  autoTrigger?: boolean
  prerequisiteSteps?: TutorialStepKey[]
  persistOnNavigate?: boolean
  milestone?: string
  requiredForCompletion?: boolean
}

export type TutorialRouteGuardAction =
  | { type: 'proceed' }
  | { type: 'redirect'; routeName: string; params?: Record<string, string>; reason: string }
  | { type: 'pause_and_save'; resumeRouteName: string; resumeParams?: Record<string, string> }

export interface TutorialRouteContext {
  isTutorialActive: boolean
  currentStep: TutorialStepKey | null
  expectedRouteName: string | null
  canProceed: boolean
  shouldRedirect: boolean
  redirectTarget?: { name: string; params?: Record<string, string> }
}

export type TutorialResumeContext = {
  routeName: string
  routeParams?: Record<string, string>
  targetStep: TutorialStepKey
  timestamp: string
}

export interface TutorialState {
  isActive: boolean
  currentStep: TutorialStepKey | null
  completedSteps: TutorialStepKey[]
  skippedSteps: TutorialStepKey[]
  isCompleted: boolean
  lastActiveAt: string | null
  totalShown: number
  lastRouteName?: string | null
  lastRouteParams?: Record<string, string> | null
  resumeContext?: TutorialResumeContext | null
  wasInterrupted?: boolean
  interruptionReason?: 'route_change' | 'page_reload' | 'manual_pause' | null
}

export interface TutorialNavigationResult {
  shouldRedirect: boolean
  targetRoute?: string
  targetParams?: Record<string, string>
}

export const TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    key: 'home_welcome',
    title: '欢迎来到记忆修复店',
    content: '你将扮演一位记忆修复师，通过修复旧物帮助客户找回失落的记忆。让我们开始这段温暖的旅程吧！',
    routeName: 'home',
    placement: 'center',
    canSkip: true,
    autoTrigger: true,
    persistOnNavigate: false,
    milestone: 'tutorial_started',
    requiredForCompletion: true,
  },
  {
    key: 'home_continue',
    title: '踏入店铺',
    content: '点击「踏入店铺」按钮，开始你的第一个委托。如果之前有存档，可以点击「继续修复」从中断处继续。',
    routeName: 'home',
    targetSelector: '[data-tutorial="enter-shop"]',
    placement: 'bottom',
    canSkip: false,
    autoTrigger: true,
    prerequisiteSteps: ['home_welcome'],
    persistOnNavigate: false,
    milestone: 'entered_shop',
    requiredForCompletion: true,
  },
  {
    key: 'roadmap_intro',
    title: '修复路线图',
    content: '这里展示了所有章节的进度。每完成一个委托，都会解锁新的故事。循着记忆的路线，一步步前行吧。',
    routeName: 'roadmap',
    placement: 'center',
    canSkip: true,
    autoTrigger: true,
    prerequisiteSteps: ['home_continue'],
    persistOnNavigate: true,
    milestone: 'roadmap_introduced',
    requiredForCompletion: false,
  },
  {
    key: 'commissions_list',
    title: '委托列表',
    content: '这里是所有可接取的委托。不同的委托对应不同的故事和记忆，选择一个你感兴趣的开始吧。',
    routeName: 'commissions',
    placement: 'center',
    canSkip: true,
    autoTrigger: true,
    prerequisiteSteps: ['home_continue'],
    persistOnNavigate: true,
    milestone: 'commission_list_shown',
    requiredForCompletion: true,
  },
  {
    key: 'commission_select',
    title: '选择委托',
    content: '点击委托卡片来接取它。每个委托都有独特的旧物和故事等待你去发现。',
    routeName: 'commissions',
    targetSelector: '[data-tutorial="commission-card"]',
    placement: 'right',
    canSkip: false,
    autoTrigger: true,
    prerequisiteSteps: ['commissions_list'],
    persistOnNavigate: false,
    milestone: 'commission_selected',
    requiredForCompletion: true,
  },
  {
    key: 'item_intro',
    title: '检视旧物',
    content: '这就是委托人送来的旧物。仔细观察它，点击上面发光的区域来发现隐藏的线索。',
    routeName: 'commission',
    placement: 'center',
    canSkip: true,
    autoTrigger: true,
    prerequisiteSteps: ['commission_select'],
    persistOnNavigate: true,
    milestone: 'item_view_introduced',
    requiredForCompletion: true,
  },
  {
    key: 'item_hotspot',
    title: '寻找线索',
    content: '点击物品上这些发光的热点区域，每一个都可能藏着重要的线索。试着点击看看吧！',
    routeName: 'commission',
    targetSelector: '[data-tutorial="hotspot"]',
    placement: 'top',
    highlightPadding: 8,
    canSkip: false,
    autoTrigger: true,
    prerequisiteSteps: ['item_intro'],
    persistOnNavigate: false,
    milestone: 'first_hotspot_found',
    requiredForCompletion: true,
  },
  {
    key: 'item_clue_collected',
    title: '发现线索！',
    content: '很好！你已经发现了第一条线索。收集足够的线索后，就可以前往推理板进行关联分析了。',
    routeName: 'commission',
    placement: 'center',
    canSkip: true,
    autoTrigger: true,
    prerequisiteSteps: ['item_hotspot'],
    persistOnNavigate: true,
    milestone: 'first_clue_collected',
    requiredForCompletion: true,
  },
  {
    key: 'item_go_deduction',
    title: '前往推理板',
    content: '当你收集到足够的线索后，点击「前往推理板」按钮，开始将线索关联起来，推理出修复方案。',
    routeName: 'commission',
    targetSelector: '[data-tutorial="go-deduction"]',
    placement: 'top',
    canSkip: false,
    autoTrigger: true,
    prerequisiteSteps: ['item_clue_collected'],
    persistOnNavigate: false,
    milestone: 'ready_for_deduction',
    requiredForCompletion: true,
  },
  {
    key: 'deduction_intro',
    title: '线索推理板',
    content: '把相关的线索连接在一起，它们会揭示出记忆的真相。每条正确的关联都会帮助你更接近修复方案。',
    routeName: 'deduction',
    placement: 'center',
    canSkip: true,
    autoTrigger: true,
    prerequisiteSteps: ['item_go_deduction'],
    persistOnNavigate: true,
    milestone: 'deduction_board_introduced',
    requiredForCompletion: true,
  },
  {
    key: 'deduction_connect',
    title: '关联线索',
    content: '拖拽或点击两条线索来尝试建立关联。正确的关联会显示出推理结论，让你更了解这段记忆。',
    routeName: 'deduction',
    targetSelector: '[data-tutorial="clue-card"]',
    placement: 'right',
    canSkip: false,
    autoTrigger: true,
    prerequisiteSteps: ['deduction_intro'],
    persistOnNavigate: false,
    milestone: 'first_connection_made',
    requiredForCompletion: true,
  },
  {
    key: 'deduction_go_repair',
    title: '开始修复',
    content: '当你推理出足够的信息后，就可以开始正式修复这件旧物了。你的选择将决定记忆的结局。',
    routeName: 'deduction',
    targetSelector: '[data-tutorial="go-repair"]',
    placement: 'top',
    canSkip: false,
    autoTrigger: true,
    prerequisiteSteps: ['deduction_connect'],
    persistOnNavigate: false,
    milestone: 'ready_for_repair',
    requiredForCompletion: true,
  },
  {
    key: 'repair_intro',
    title: '修复流程',
    content: '根据你推理出的结论，选择最合适的修复方式。每个选择都会影响最终的结局，请谨慎选择。',
    routeName: 'repair',
    placement: 'center',
    canSkip: true,
    autoTrigger: true,
    prerequisiteSteps: ['deduction_go_repair'],
    persistOnNavigate: true,
    milestone: 'repair_introduced',
    requiredForCompletion: true,
  },
  {
    key: 'repair_choice',
    title: '做出选择',
    content: '阅读每个选项的描述，选择你认为最合适的修复方式。记住，你的选择将唤醒不同的记忆。',
    routeName: 'repair',
    targetSelector: '[data-tutorial="repair-choice"]',
    placement: 'right',
    canSkip: false,
    autoTrigger: true,
    prerequisiteSteps: ['repair_intro'],
    persistOnNavigate: false,
    milestone: 'first_repair_choice',
    requiredForCompletion: true,
  },
  {
    key: 'ending_intro',
    title: '记忆重现',
    content: '修复完成！这段被遗忘的记忆终于重见天日。仔细阅读故事，感受其中的情感。',
    routeName: 'ending',
    placement: 'center',
    canSkip: true,
    autoTrigger: true,
    prerequisiteSteps: ['repair_choice'],
    persistOnNavigate: true,
    milestone: 'ending_introduced',
    requiredForCompletion: true,
  },
  {
    key: 'ending_score',
    title: '修复评价',
    content: '根据你的选择和表现，系统会给出综合评价。尝试探索不同的选择，解锁所有结局吧！',
    routeName: 'ending',
    targetSelector: '[data-tutorial="score-card"]',
    placement: 'top',
    canSkip: true,
    autoTrigger: true,
    prerequisiteSteps: ['ending_intro'],
    persistOnNavigate: true,
    milestone: 'score_evaluated',
    requiredForCompletion: false,
  },
  {
    key: 'gallery_intro',
    title: '陈列室',
    content: '你修复好的每一件旧物都会陈列在这里。它们是你修复的记忆，也是你作为修复师的成长见证。',
    routeName: 'gallery',
    placement: 'center',
    canSkip: true,
    autoTrigger: true,
    prerequisiteSteps: ['ending_score'],
    persistOnNavigate: true,
    milestone: 'gallery_introduced',
    requiredForCompletion: false,
  },
  {
    key: 'tutorial_complete',
    title: '新手引导完成',
    content: '恭喜！你已经完成了新手引导，现在可以自由探索记忆修复店了。每一件旧物都藏着独特的故事，等待你去发现。',
    routeName: 'home',
    placement: 'center',
    canSkip: false,
    autoTrigger: true,
    prerequisiteSteps: ['gallery_intro'],
    persistOnNavigate: false,
    milestone: 'tutorial_completed',
    requiredForCompletion: true,
  },
]

export const TUTORIAL_VERSION = '1.0.0'

export type TimelineEventType =
  | 'clue_collected'
  | 'connection_discovered'
  | 'conclusion_made'
  | 'ending_unlocked'
  | 'repair_choice'
  | 'note_created'
  | 'commission_started'
  | 'commission_completed'

export interface TimelineEvent {
  id: string
  commissionId: string
  type: TimelineEventType
  timestamp: string
  order: number
  title: string
  content: string
  icon: string
  color: string
  relatedClueIds?: string[]
  relatedConnectionId?: string
  relatedEndingId?: string
  relatedNoteId?: string
  relatedChoiceId?: string
  isKeyMoment?: boolean
}

export interface TimelineGroup {
  commissionId: string
  commissionTitle: string
  commissionImage: string
  clientName: string
  clientAvatar: string
  chapterId: string
  chapterTitle: string
  events: TimelineEvent[]
  startedAt?: string
  completedAt?: string
  isCompleted: boolean
  totalEvents: number
  keyMoments: TimelineEvent[]
}

export interface TimelineFilterState {
  selectedCommissionIds: string[]
  selectedEventTypes: TimelineEventType[]
  selectedChapterIds: string[]
  searchKeyword: string
  showKeyMomentsOnly: boolean
  sortOrder: 'asc' | 'desc'
  groupByCommission: boolean
}

export interface TimelinePlaybackState {
  isPlaying: boolean
  currentEventIndex: number
  currentGroupIndex: number
  playbackSpeed: number
  isPaused: boolean
  highlightedEventId: string | null
}

export interface TimelineStats {
  totalCommissions: number
  completedCommissions: number
  totalEvents: number
  keyMomentsCount: number
  totalCluesCollected: number
  totalConnectionsDiscovered: number
  totalEndingsUnlocked: number
  totalNotesCreated: number
  eventTypeBreakdown: Record<TimelineEventType, number>
  averageEventsPerCommission: number
  completionPercentage: number
}

export const TIMELINE_EVENT_TYPE_CONFIG: Record<TimelineEventType, { label: string; icon: string; color: string; bgColor: string }> = {
  clue_collected: { label: '线索发现', icon: '🔍', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
  connection_discovered: { label: '关联建立', icon: '🔗', color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200' },
  conclusion_made: { label: '推理结论', icon: '💡', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
  ending_unlocked: { label: '结局解锁', icon: '✨', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' },
  repair_choice: { label: '修复选择', icon: '🔧', color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200' },
  note_created: { label: '笔记记录', icon: '📝', color: 'text-stone-600', bgColor: 'bg-stone-50 border-stone-200' },
  commission_started: { label: '委托开始', icon: '🎯', color: 'text-indigo-600', bgColor: 'bg-indigo-50 border-indigo-200' },
  commission_completed: { label: '委托完成', icon: '🏆', color: 'text-amber-500', bgColor: 'bg-amber-50 border-amber-200' }
}

