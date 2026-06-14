import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { 
  GameState, 
  CommissionStatus, 
  Chapter, 
  Commission, 
  GameStep, 
  StepDependency, 
  SaveSlotInfo, 
  LoadResult, 
  Tag, 
  Note, 
  ClueSearchResult, 
  ProgressDetail, 
  NoteAggregate,
  NoteSearchResult,
  UnifiedSearchResult,
  SearchMatchMode,
  SearchScope,
  AggregationType,
  ClueNoteCluster,
  DifficultyContext,
  DynamicDifficultyLevel,
  RepairStep,
  RepairChoice,
  SnapshotInfo,
  SnapshotTrigger,
  EndingReplay
} from '../types'
import { 
  getInitialGameState, 
  saveGame, 
  loadGame, 
  hasSaveData, 
  clearSave,
  getAllSaveSlots,
  getSaveSlotInfo,
  getLastActiveSlotId,
  saveGameToSlot,
  loadGameFromSlot,
  loadBackupFromSlot,
  clearSlot,
  renameSlot,
  getCurrentSlotId,
  setCurrentSlotId,
  hasBackupInSlot,
  getSnapshotsForSlot,
  createSnapshot,
  loadSnapshot,
  deleteSnapshot,
  addEndingReplay,
  getEndingReplays,
  getLatestSaveSlotInfo
} from '../utils/storage'
import { commissions, clues, connections, endings, repairSteps, chapters, tags } from '../data/gameData'

export const useGameStore = defineStore('game', () => {
  const state = ref<GameState>(getInitialGameState())

  const hasSave = computed(() => hasSaveData())

  const currentCommission = computed(() => {
    if (!state.value.currentCommissionId) return null
    return commissions.find(c => c.id === state.value.currentCommissionId) || null
  })

  const currentChapter = computed(() => {
    if (!state.value.currentChapterId) return null
    return chapters.find(c => c.id === state.value.currentChapterId) || null
  })

  const allChapters = computed(() => chapters.map(chapter => ({
    ...chapter,
    isUnlocked: state.value.unlockedChapters.includes(chapter.id)
  })))

  const unlockedChapters = computed(() => 
    allChapters.value.filter(c => c.isUnlocked)
  )

  const collectedCluesForCurrent = computed(() => {
    if (!state.value.currentCommissionId) return []
    return clues.filter(c => 
      c.commissionId === state.value.currentCommissionId && 
      state.value.collectedClues.includes(c.id)
    )
  })

  const allCluesForCurrent = computed(() => {
    if (!state.value.currentCommissionId) return []
    return clues.filter(c => c.commissionId === state.value.currentCommissionId)
  })

  const discoveredConnectionsForCurrent = computed(() => {
    if (!state.value.currentCommissionId) return []
    return connections.filter(c => 
      state.value.discoveredConnections.includes(c.id)
    )
  })

  const unlockedEndingsForCurrent = computed(() => {
    if (!state.value.currentCommissionId) return []
    return endings.filter(e => 
      e.commissionId === state.value.currentCommissionId &&
      state.value.unlockedEndings.includes(e.id)
    )
  })

  const isCommissionCompleted = computed(() => {
    if (!state.value.currentCommissionId) return false
    return state.value.completedCommissions.includes(state.value.currentCommissionId)
  })

  const completionProgress = computed(() => {
    const total = commissions.length
    const completed = state.value.completedCommissions.length
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 }
  })

  function getCommissionStatus(commissionId: string): CommissionStatus {
    return state.value.commissionStatuses[commissionId] || 'locked'
  }

  function checkPrerequisitesMet(commission: Commission): boolean {
    return commission.prerequisiteCommissionIds.every(
      prereqId => state.value.completedCommissions.includes(prereqId)
    )
  }

  function getCollectedClueCount(commissionId: string): number {
    return clues.filter(c =>
      c.commissionId === commissionId &&
      state.value.collectedClues.includes(c.id)
    ).length
  }

  function getTotalClueCount(commissionId: string): number {
    return clues.filter(c => c.commissionId === commissionId).length
  }

  function getDiscoveredConnectionCount(commissionId: string): number {
    return connections.filter(conn => {
      const fromClue = clues.find(c => c.id === conn.fromClueId)
      return fromClue?.commissionId === commissionId &&
        state.value.discoveredConnections.includes(conn.id)
    }).length
  }

  function getTotalConnectionCount(commissionId: string): number {
    return connections.filter(conn => {
      const fromClue = clues.find(c => c.id === conn.fromClueId)
      return fromClue?.commissionId === commissionId
    }).length
  }

  function checkStepDependency(commissionId: string, dep: StepDependency): boolean {
    switch (dep.dependencyType) {
      case 'always':
        return true
      case 'clue_count':
        return getCollectedClueCount(commissionId) >= (dep.minCount ?? 1)
      case 'connection_count':
        return getDiscoveredConnectionCount(commissionId) >= (dep.minCount ?? 1)
      case 'clue_ids':
        return (dep.requiredIds ?? []).every(id => state.value.collectedClues.includes(id))
      case 'connection_ids':
        return (dep.requiredIds ?? []).every(id => state.value.discoveredConnections.includes(id))
      default:
        return false
    }
  }

  function isStepUnlocked(commissionId: string, step: GameStep): boolean {
    if (!state.value.unlockedSteps[commissionId]) {
      return step === 'item'
    }
    return state.value.unlockedSteps[commissionId].includes(step)
  }

  function checkAndUnlockSteps(commissionId: string): void {
    const commission = commissions.find(c => c.id === commissionId)
    if (!commission) return

    if (!state.value.unlockedSteps[commissionId]) {
      state.value.unlockedSteps[commissionId] = ['item']
    }

    const unlocked = state.value.unlockedSteps[commissionId]

    for (const dep of commission.stepDependencies) {
      if (unlocked.includes(dep.step)) continue
      if (checkStepDependency(commissionId, dep)) {
        unlocked.push(dep.step)
      }
    }
  }

  function getStepUnlockProgress(commissionId: string, step: GameStep): { current: number; required: number; description: string } {
    const commission = commissions.find(c => c.id === commissionId)
    if (!commission) return { current: 0, required: 1, description: '' }

    const dep = commission.stepDependencies.find(d => d.step === step)
    if (!dep) return { current: 1, required: 1, description: '已解锁' }

    switch (dep.dependencyType) {
      case 'always':
        return { current: 1, required: 1, description: '已解锁' }
      case 'clue_count': {
        const current = getCollectedClueCount(commissionId)
        const required = dep.minCount ?? 1
        const total = getTotalClueCount(commissionId)
        return { current, required, description: `收集线索 ${current}/${required}（共${total}条）` }
      }
      case 'connection_count': {
        const current = getDiscoveredConnectionCount(commissionId)
        const required = dep.minCount ?? 1
        const total = getTotalConnectionCount(commissionId)
        return { current, required, description: `发现关联 ${current}/${required}（共${total}条）` }
      }
      case 'clue_ids': {
        const requiredIds = dep.requiredIds ?? []
        const found = requiredIds.filter(id => state.value.collectedClues.includes(id)).length
        const clueNames = requiredIds.map(id => clues.find(c => c.id === id)?.title ?? id).join('、')
        return { current: found, required: requiredIds.length, description: `需要线索：${clueNames}` }
      }
      case 'connection_ids': {
        const requiredIds = dep.requiredIds ?? []
        const found = requiredIds.filter(id => state.value.discoveredConnections.includes(id)).length
        return { current: found, required: requiredIds.length, description: `需要发现 ${requiredIds.length} 条关联` }
      }
      default:
        return { current: 0, required: 1, description: '' }
    }
  }

  function canAccessStep(commissionId: string, step: GameStep): boolean {
    checkAndUnlockSteps(commissionId)
    return isStepUnlocked(commissionId, step)
  }

  function checkChapterUnlock(chapter: Chapter): boolean {
    const rule = chapter.unlockRule
    
    switch (rule.type) {
      case 'condition':
        if (rule.conditionType === 'custom' && rule.conditionValue === 'always_unlocked') {
          return true
        }
        if (rule.conditionType === 'completed_count' && typeof rule.conditionValue === 'number') {
          return state.value.completedCommissions.length >= rule.conditionValue
        }
        return false
      case 'prerequisites':
        if (rule.prerequisiteCommissionIds) {
          return rule.prerequisiteCommissionIds.every(
            id => state.value.completedCommissions.includes(id)
          )
        }
        return false
      default:
        return false
    }
  }

  function checkCommissionUnlock(commission: Commission): boolean {
    for (const rule of commission.unlockRules) {
      switch (rule.type) {
        case 'chapter':
          if (rule.chapterId && !state.value.unlockedChapters.includes(rule.chapterId)) {
            return false
          }
          break
        case 'prerequisites':
          if (rule.prerequisiteCommissionIds) {
            const allMet = rule.prerequisiteCommissionIds.every(
              id => state.value.completedCommissions.includes(id)
            )
            if (!allMet) return false
          }
          break
        case 'condition':
          if (rule.conditionType === 'completed_count' && typeof rule.conditionValue === 'number') {
            if (state.value.completedCommissions.length < rule.conditionValue) {
              return false
            }
          }
          break
      }
    }
    return true
  }

  function tryUnlockChapter(chapterId: string): boolean {
    const chapter = chapters.find(c => c.id === chapterId)
    if (!chapter) return false
    if (state.value.unlockedChapters.includes(chapterId)) return true

    if (checkChapterUnlock(chapter)) {
      state.value.unlockedChapters.push(chapterId)
      updateCommissionsForChapter(chapterId)
      saveCurrentGame()
      return true
    }
    return false
  }

  function tryUnlockCommission(commissionId: string): boolean {
    const commission = commissions.find(c => c.id === commissionId)
    if (!commission) return false

    const currentStatus = getCommissionStatus(commissionId)
    if (currentStatus !== 'locked') return true

    if (checkCommissionUnlock(commission)) {
      state.value.commissionStatuses[commissionId] = 'pending'
      saveCurrentGame()
      return true
    }
    return false
  }

  function updateCommissionsForChapter(chapterId: string): void {
    commissions
      .filter(c => c.chapterId === chapterId)
      .forEach(commission => {
        if (getCommissionStatus(commission.id) === 'locked' && checkCommissionUnlock(commission)) {
          state.value.commissionStatuses[commission.id] = 'pending'
        }
      })
  }

  function checkAndUnlockDependencies(completedCommissionId: string): void {
    commissions.forEach(commission => {
      if (commission.prerequisiteCommissionIds.includes(completedCommissionId)) {
        tryUnlockCommission(commission.id)
      }
    })

    chapters.forEach(chapter => {
      if (!state.value.unlockedChapters.includes(chapter.id)) {
        tryUnlockChapter(chapter.id)
      }
    })
  }

  function transitionCommissionStatus(
    commissionId: string, 
    newStatus: CommissionStatus
  ): boolean {
    const currentStatus = getCommissionStatus(commissionId)
    
    const validTransitions: Record<CommissionStatus, CommissionStatus[]> = {
      locked: ['pending'],
      pending: ['in_progress', 'locked'],
      in_progress: ['completed', 'failed', 'pending'],
      completed: [],
      failed: ['pending', 'in_progress']
    }

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      console.warn(`Invalid status transition: ${currentStatus} -> ${newStatus}`)
      return false
    }

    state.value.commissionStatuses[commissionId] = newStatus
    
    if (newStatus === 'completed') {
      const commission = commissions.find(c => c.id === commissionId)
      if (commission) {
        if (!state.value.completedCommissions.includes(commissionId)) {
          state.value.completedCommissions.push(commissionId)
        }
        checkAndUnlockDependencies(commissionId)
      }
    }
    
    return true
  }

  function getCommissionsByChapter(chapterId: string): Commission[] {
    return commissions
      .filter(c => c.chapterId === chapterId)
      .sort((a, b) => a.orderInChapter - b.orderInChapter)
  }

  function getChapterById(chapterId: string) {
    const chapter = chapters.find(c => c.id === chapterId)
    if (!chapter) return null
    return {
      ...chapter,
      isUnlocked: state.value.unlockedChapters.includes(chapterId)
    }
  }

  function getAllChapters() {
    return allChapters.value
  }

  function loadSavedGame() {
    const saved = loadGame()
    if (saved) {
      state.value = saved
      refreshAllUnlocks()
      return true
    }
    return false
  }

  function refreshAllUnlocks() {
    chapters.forEach(chapter => {
      if (!state.value.unlockedChapters.includes(chapter.id)) {
        tryUnlockChapter(chapter.id)
      }
    })

    commissions.forEach(commission => {
      if (getCommissionStatus(commission.id) === 'locked') {
        tryUnlockCommission(commission.id)
      }
    })
  }

  function saveCurrentGame() {
    state.value.lastSaveTime = new Date().toISOString()
    saveGame(state.value)
  }

  function autoSnapshotIfNeeded(trigger: SnapshotTrigger, label: string) {
    const slotId = currentSlotId.value
    if (!slotId) return
    createSnapshot(slotId, state.value, label, trigger)
  }

  function manualSnapshot(label: string): boolean {
    const slotId = currentSlotId.value
    if (!slotId) return false
    return createSnapshot(slotId, state.value, label, 'manual')
  }

  function startNewGame() {
    state.value = getInitialGameState()
    saveCurrentGame()
  }

  function selectCommission(commissionId: string) {
    const commission = commissions.find(c => c.id === commissionId)
    if (!commission) return

    if (!tryUnlockCommission(commissionId)) {
      console.warn('Commission is locked, cannot select')
      return
    }

    const status = getCommissionStatus(commissionId)
    if (status === 'locked') {
      console.warn('Commission is still locked after unlock attempt')
      return
    }

    if (status === 'pending') {
      transitionCommissionStatus(commissionId, 'in_progress')
    }

    state.value.currentCommissionId = commissionId
    state.value.currentChapterId = commission.chapterId
    state.value.currentStep = 'item'

    if (!state.value.unlockedSteps[commissionId]) {
      state.value.unlockedSteps[commissionId] = ['item']
    }
    checkAndUnlockSteps(commissionId)

    saveCurrentGame()
    autoSnapshotIfNeeded('auto_chapter_start', `开始：${commission.title}`)
  }

  function collectClue(clueId: string) {
    if (!state.value.collectedClues.includes(clueId)) {
      state.value.collectedClues.push(clueId)
      if (state.value.currentCommissionId) {
        checkAndUnlockSteps(state.value.currentCommissionId)
      }
      saveCurrentGame()
    }
  }

  function discoverConnection(connectionId: string) {
    if (!state.value.discoveredConnections.includes(connectionId)) {
      state.value.discoveredConnections.push(connectionId)
      if (state.value.currentCommissionId) {
        checkAndUnlockSteps(state.value.currentCommissionId)
      }
      saveCurrentGame()
    }
  }

  function setCurrentStep(step: GameState['currentStep']) {
    state.value.currentStep = step
    saveCurrentGame()
  }

  function unlockEnding(endingId: string) {
    if (!state.value.unlockedEndings.includes(endingId)) {
      state.value.unlockedEndings.push(endingId)
    }
    const ending = endings.find(e => e.id === endingId)
    if (ending) {
      state.value.currentEndingType = ending.type
      if (currentSlotId.value) {
        addEndingReplay(endingId, ending.commissionId, ending.type, currentSlotId.value)
      }
    }
    autoSnapshotIfNeeded('ending_unlocked', `解锁结局：${ending?.title ?? endingId}`)
    saveCurrentGame()
  }

  function completeCommission(commissionId: string) {
    const commission = commissions.find(c => c.id === commissionId)
    autoSnapshotIfNeeded('chapter_complete', `完成：${commission?.title ?? commissionId}`)
    transitionCommissionStatus(commissionId, 'completed')
    state.value.currentStep = 'ending'
    saveCurrentGame()
  }

  function goToGallery() {
    state.value.currentCommissionId = null
    state.value.currentStep = 'commission'
    saveCurrentGame()
  }

  function resetCurrentCommission() {
    if (!state.value.currentCommissionId) return
    
    const commissionId = state.value.currentCommissionId
    
    state.value.collectedClues = state.value.collectedClues.filter(id => {
      const clue = clues.find(c => c.id === id)
      return clue?.commissionId !== commissionId
    })
    
    state.value.discoveredConnections = state.value.discoveredConnections.filter(id => {
      const conn = connections.find(c => c.id === id)
      const fromClue = clues.find(c => c.id === conn?.fromClueId)
      return fromClue?.commissionId !== commissionId
    })
    
    state.value.currentEndingType = null
    state.value.currentStep = 'item'
    
    saveCurrentGame()
  }

  function clearAllData() {
    clearSave()
    state.value = getInitialGameState()
  }

  function canStartRepair(): boolean {
    if (!state.value.currentCommissionId) return false
    checkAndUnlockSteps(state.value.currentCommissionId)
    return isStepUnlocked(state.value.currentCommissionId, 'repair')
  }

  function getRepairSteps() {
    if (!state.value.currentCommissionId) return []
    return repairSteps[state.value.currentCommissionId] || []
  }

  function getCommissionById(id: string) {
    return commissions.find(c => c.id === id) || null
  }

  function getEndingById(id: string) {
    return endings.find(e => e.id === id) || null
  }

  function getEndingByType(commissionId: string, type: string) {
    return endings.find(e => e.commissionId === commissionId && e.type === type) || null
  }

  function getAllEndings() {
    return endings
  }

  function getAllCommissions() {
    return commissions
  }

  function getClueById(id: string) {
    return clues.find(c => c.id === id) || null
  }

  function getConnectionById(id: string) {
    return connections.find(c => c.id === id) || null
  }

  function getConnectionsForCommission(commissionId: string) {
    return connections.filter(c => {
      const fromClue = clues.find(clue => clue.id === c.fromClueId)
      return fromClue?.commissionId === commissionId
    })
  }

  function continueGame() {
    const latestInfo = getLatestSaveSlotInfo()
    if (latestInfo) {
      const result = loadFromSlot(latestInfo.slotId)
      if (result.success === true) {
        return state.value.currentStep
      }
    }
    if (loadSavedGame()) {
      return state.value.currentStep
    }
    return null
  }

  const currentSlotId = ref<string | null>(getCurrentSlotId())
  const lastActiveSlotId = ref<string | null>(getLastActiveSlotId())

  const saveSlots = computed<SaveSlotInfo[]>(() => getAllSaveSlots())

  function refreshSaveSlots() {
    return getAllSaveSlots()
  }

  function getSlotInfo(slotId: string): SaveSlotInfo | null {
    return getSaveSlotInfo(slotId)
  }

  function saveToSlot(slotId: string): boolean {
    const result = saveGameToSlot(slotId, state.value)
    if (result) {
      currentSlotId.value = slotId
    }
    return result
  }

  function loadFromSlot(slotId: string): LoadResult {
    const result = loadGameFromSlot(slotId)
    if (result.success) {
      state.value = result.state
      currentSlotId.value = slotId
      lastActiveSlotId.value = slotId
      refreshAllUnlocks()
    }
    return result
  }

  function restoreBackup(slotId: string): LoadResult {
    const result = loadBackupFromSlot(slotId)
    if (result.success) {
      state.value = result.state
      currentSlotId.value = slotId
      lastActiveSlotId.value = slotId
      refreshAllUnlocks()
    }
    return result
  }

  function deleteSlot(slotId: string): boolean {
    const result = clearSlot(slotId)
    if (result && currentSlotId.value === slotId) {
      currentSlotId.value = null
    }
    return result
  }

  function renameSaveSlot(slotId: string, newName: string): boolean {
    return renameSlot(slotId, newName)
  }

  function startNewGameInSlot(slotId: string) {
    state.value = getInitialGameState()
    saveGameToSlot(slotId, state.value)
    currentSlotId.value = slotId
    lastActiveSlotId.value = slotId
  }

  function hasBackup(slotId: string): boolean {
    return hasBackupInSlot(slotId)
  }

  function getSlotSnapshots(slotId: string): SnapshotInfo[] {
    return getSnapshotsForSlot(slotId)
  }

  function loadFromSnapshot(slotId: string, snapshotId: string): LoadResult {
    const result = loadSnapshot(slotId, snapshotId)
    if (result.success) {
      state.value = result.state
      currentSlotId.value = slotId
      lastActiveSlotId.value = slotId
      refreshAllUnlocks()
    }
    return result
  }

  function removeSnapshot(slotId: string, snapshotId: string): boolean {
    return deleteSnapshot(slotId, snapshotId)
  }

  const allEndingReplays = computed<EndingReplay[]>(() => getEndingReplays())

  function getReplaysForSlot(slotId: string): EndingReplay[] {
    return getEndingReplays().filter(r => r.fromSlotId === slotId)
  }

  const allTags = computed<Tag[]>(() => {
    const baseTags = [...tags, ...state.value.customTags]
    return baseTags.map(tag => {
      let count = 0
      for (const clue of clues) {
        if (state.value.collectedClues.includes(clue.id) && clue.tagIds.includes(tag.id)) {
          count++
        }
      }
      for (const note of state.value.notes) {
        if (note.tagIds.includes(tag.id)) {
          count++
        }
      }
      return { ...tag, usageCount: count }
    })
  })

  const filteredClues = computed<ClueSearchResult[]>(() => {
    const keyword = state.value.searchKeyword.trim().toLowerCase()
    const activeFilters = state.value.activeTagFilters
    const matchMode = state.value.searchMatchMode

    return clues
      .filter(c => state.value.collectedClues.includes(c.id))
      .map(clue => {
        const matchedTagIds = activeFilters.length > 0
          ? clue.tagIds.filter(tid => activeFilters.includes(tid))
          : []
        
        const matchedFields: string[] = []
        let matchScore = 0
        
        if (keyword !== '') {
          const titleLower = clue.title.toLowerCase()
          const contentLower = clue.content.toLowerCase()
          const kw = keyword
          
          if (titleLower.includes(kw)) {
            matchedFields.push('title')
            matchScore += 10
            if (titleLower.startsWith(kw)) matchScore += 5
          }
          if (contentLower.includes(kw)) {
            matchedFields.push('content')
            matchScore += 5
            const occurrences = contentLower.split(kw).length - 1
            matchScore += Math.min(occurrences, 5)
          }
        }
        
        const keywordMatched = matchedFields.length > 0
        
        let matchesTags: boolean
        if (activeFilters.length === 0) {
          matchesTags = true
        } else if (matchMode === 'and') {
          matchesTags = matchedTagIds.length === activeFilters.length
        } else {
          matchesTags = matchedTagIds.length > 0
        }
        
        const matchesKeyword = keyword === '' || keywordMatched
        const visible = matchesTags && matchesKeyword
        
        if (matchedTagIds.length > 0) {
          matchScore += matchedTagIds.length * 3
        }
        
        return { clue, matchedTagIds, keywordMatched, matchScore, matchedFields, visible }
      })
      .filter(r => r.visible)
      .sort((a, b) => b.matchScore - a.matchScore)
      .map(({ clue, matchedTagIds, keywordMatched, matchScore, matchedFields }) => ({ 
        clue, matchedTagIds, keywordMatched, matchScore, matchedFields 
      }))
  })

  function searchCluesByTagIds(tagIds: string[], matchMode: SearchMatchMode = 'or'): ClueSearchResult[] {
    if (tagIds.length === 0) {
      return clues
        .filter(c => state.value.collectedClues.includes(c.id))
        .map(clue => ({ clue, matchedTagIds: [], keywordMatched: false, matchScore: 0, matchedFields: [] }))
    }
    return clues
      .filter(c => state.value.collectedClues.includes(c.id))
      .map(clue => {
        const matchedTagIds = clue.tagIds.filter(tid => tagIds.includes(tid))
        const matchScore = matchedTagIds.length * 3
        return { clue, matchedTagIds, keywordMatched: false, matchScore, matchedFields: [] }
      })
      .filter(r => matchMode === 'and' ? r.matchedTagIds.length === tagIds.length : r.matchedTagIds.length > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
  }

  function searchCluesByKeyword(keyword: string): ClueSearchResult[] {
    const kw = keyword.trim().toLowerCase()
    if (kw === '') {
      return clues
        .filter(c => state.value.collectedClues.includes(c.id))
        .map(clue => ({ clue, matchedTagIds: [], keywordMatched: false, matchScore: 0, matchedFields: [] }))
    }
    return clues
      .filter(c => state.value.collectedClues.includes(c.id))
      .map(clue => {
        const matchedFields: string[] = []
        let matchScore = 0
        const titleLower = clue.title.toLowerCase()
        const contentLower = clue.content.toLowerCase()
        
        if (titleLower.includes(kw)) {
          matchedFields.push('title')
          matchScore += 10
          if (titleLower.startsWith(kw)) matchScore += 5
        }
        if (contentLower.includes(kw)) {
          matchedFields.push('content')
          matchScore += 5
          const occurrences = contentLower.split(kw).length - 1
          matchScore += Math.min(occurrences, 5)
        }
        
        return { clue, matchedTagIds: [], keywordMatched: matchedFields.length > 0, matchScore, matchedFields }
      })
      .filter(r => r.keywordMatched)
      .sort((a, b) => b.matchScore - a.matchScore)
  }

  function searchNotesByTagIds(tagIds: string[], matchMode: SearchMatchMode = 'or', commissionId?: string): NoteSearchResult[] {
    let relevantNotes = commissionId
      ? state.value.notes.filter(n => n.commissionId === commissionId)
      : state.value.notes
    
    if (tagIds.length === 0) {
      return relevantNotes.map(note => ({ 
        note, matchedTagIds: [], keywordMatched: false, matchScore: 0, matchedFields: [] 
      }))
    }
    
    return relevantNotes
      .map(note => {
        const matchedTagIds = note.tagIds.filter(tid => tagIds.includes(tid))
        const matchScore = matchedTagIds.length * 3
        return { note, matchedTagIds, keywordMatched: false, matchScore, matchedFields: [] }
      })
      .filter(r => matchMode === 'and' ? r.matchedTagIds.length === tagIds.length : r.matchedTagIds.length > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
  }

  function searchNotesByKeyword(keyword: string, commissionId?: string): NoteSearchResult[] {
    const kw = keyword.trim().toLowerCase()
    let relevantNotes = commissionId
      ? state.value.notes.filter(n => n.commissionId === commissionId)
      : state.value.notes
    
    if (kw === '') {
      return relevantNotes.map(note => ({ 
        note, matchedTagIds: [], keywordMatched: false, matchScore: 0, matchedFields: [] 
      }))
    }
    
    return relevantNotes
      .map(note => {
        const matchedFields: string[] = []
        let matchScore = 0
        const titleLower = note.title.toLowerCase()
        const contentLower = note.content.toLowerCase()
        
        if (titleLower.includes(kw)) {
          matchedFields.push('title')
          matchScore += 10
          if (titleLower.startsWith(kw)) matchScore += 5
        }
        if (contentLower.includes(kw)) {
          matchedFields.push('content')
          matchScore += 5
          const occurrences = contentLower.split(kw).length - 1
          matchScore += Math.min(occurrences, 5)
        }
        
        return { note, matchedTagIds: [], keywordMatched: matchedFields.length > 0, matchScore, matchedFields }
      })
      .filter(r => r.keywordMatched)
      .sort((a, b) => b.matchScore - a.matchScore)
  }

  function unifiedSearch(keyword: string, tagIds: string[], scope: SearchScope = 'all', matchMode: SearchMatchMode = 'or', commissionId?: string): UnifiedSearchResult {
    const kw = keyword.trim().toLowerCase()
    
    let clueResults: ClueSearchResult[] = []
    let noteResults: NoteSearchResult[] = []
    
    if (scope === 'all' || scope === 'clue') {
      clueResults = clues
        .filter(c => state.value.collectedClues.includes(c.id))
        .filter(c => !commissionId || c.commissionId === commissionId)
        .map(clue => {
          const matchedTagIds = tagIds.length > 0
            ? clue.tagIds.filter(tid => tagIds.includes(tid))
            : []
          
          const matchedFields: string[] = []
          let matchScore = 0
          
          if (kw !== '') {
            const titleLower = clue.title.toLowerCase()
            const contentLower = clue.content.toLowerCase()
            
            if (titleLower.includes(kw)) {
              matchedFields.push('title')
              matchScore += 10
              if (titleLower.startsWith(kw)) matchScore += 5
            }
            if (contentLower.includes(kw)) {
              matchedFields.push('content')
              matchScore += 5
            }
          }
          
          const keywordMatched = matchedFields.length > 0
          
          let matchesTags: boolean
          if (tagIds.length === 0) {
            matchesTags = true
          } else if (matchMode === 'and') {
            matchesTags = matchedTagIds.length === tagIds.length
          } else {
            matchesTags = matchedTagIds.length > 0
          }
          
          const matchesKeyword = kw === '' || keywordMatched
          
          if (matchedTagIds.length > 0) {
            matchScore += matchedTagIds.length * 3
          }
          
          return { clue, matchedTagIds, keywordMatched, matchScore, matchedFields, visible: matchesTags && matchesKeyword }
        })
        .filter(r => r.visible)
        .sort((a, b) => b.matchScore - a.matchScore)
        .map(({ clue, matchedTagIds, keywordMatched, matchScore, matchedFields }) => ({ 
          clue, matchedTagIds, keywordMatched, matchScore, matchedFields 
        }))
    }
    
    if (scope === 'all' || scope === 'note') {
      const relevantNotes = commissionId
        ? state.value.notes.filter(n => n.commissionId === commissionId)
        : state.value.notes
      
      noteResults = relevantNotes
        .map(note => {
          const matchedTagIds = tagIds.length > 0
            ? note.tagIds.filter(tid => tagIds.includes(tid))
            : []
          
          const matchedFields: string[] = []
          let matchScore = 0
          
          if (kw !== '') {
            const titleLower = note.title.toLowerCase()
            const contentLower = note.content.toLowerCase()
            
            if (titleLower.includes(kw)) {
              matchedFields.push('title')
              matchScore += 10
              if (titleLower.startsWith(kw)) matchScore += 5
            }
            if (contentLower.includes(kw)) {
              matchedFields.push('content')
              matchScore += 5
            }
          }
          
          const keywordMatched = matchedFields.length > 0
          
          let matchesTags: boolean
          if (tagIds.length === 0) {
            matchesTags = true
          } else if (matchMode === 'and') {
            matchesTags = matchedTagIds.length === tagIds.length
          } else {
            matchesTags = matchedTagIds.length > 0
          }
          
          const matchesKeyword = kw === '' || keywordMatched
          
          if (matchedTagIds.length > 0) {
            matchScore += matchedTagIds.length * 3
          }
          
          if (note.isImportant) {
            matchScore += 2
          }
          
          return { note, matchedTagIds, keywordMatched, matchScore, matchedFields, visible: matchesTags && matchesKeyword }
        })
        .filter(r => r.visible)
        .sort((a, b) => b.matchScore - a.matchScore)
        .map(({ note, matchedTagIds, keywordMatched, matchScore, matchedFields }) => ({ 
          note, matchedTagIds, keywordMatched, matchScore, matchedFields 
        }))
    }
    
    return {
      clues: clueResults,
      notes: noteResults,
      totalCount: clueResults.length + noteResults.length
    }
  }

  function setActiveTagFilters(tagIds: string[]): void {
    state.value.activeTagFilters = tagIds
    saveCurrentGame()
  }

  function setSearchKeyword(keyword: string): void {
    state.value.searchKeyword = keyword
    saveCurrentGame()
  }

  function setSearchMatchMode(mode: SearchMatchMode): void {
    state.value.searchMatchMode = mode
    saveCurrentGame()
  }

  function setSearchScope(scope: SearchScope): void {
    state.value.searchScope = scope
    saveCurrentGame()
  }

  function getTagById(tagId: string): Tag | null {
    return allTags.value.find(t => t.id === tagId) || null
  }

  function addCustomTag(tag: Omit<Tag, 'id'>): Tag {
    const newTag: Tag = { ...tag, id: `tag-custom-${Date.now()}` }
    state.value.customTags.push(newTag)
    saveCurrentGame()
    return newTag
  }

  function removeCustomTag(tagId: string): boolean {
    const idx = state.value.customTags.findIndex(t => t.id === tagId)
    if (idx === -1) return false
    state.value.customTags.splice(idx, 1)
    state.value.activeTagFilters = state.value.activeTagFilters.filter(id => id !== tagId)
    saveCurrentGame()
    return true
  }

  function addNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Note {
    const now = new Date().toISOString()
    const newNote: Note = {
      ...note,
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now
    }
    state.value.notes.push(newNote)
    saveCurrentGame()
    return newNote
  }

  function updateNote(noteId: string, updates: Partial<Pick<Note, 'title' | 'content' | 'tagIds' | 'isImportant'>>): boolean {
    const note = state.value.notes.find(n => n.id === noteId)
    if (!note) return false
    Object.assign(note, updates, { updatedAt: new Date().toISOString() })
    saveCurrentGame()
    return true
  }

  function deleteNote(noteId: string): boolean {
    const idx = state.value.notes.findIndex(n => n.id === noteId)
    if (idx === -1) return false
    state.value.notes.splice(idx, 1)
    saveCurrentGame()
    return true
  }

  function getNotesForCommission(commissionId: string): Note[] {
    return state.value.notes.filter(n => n.commissionId === commissionId)
  }

  function getNotesForClue(clueId: string): Note[] {
    return state.value.notes.filter(n => n.clueId === clueId)
  }

  function aggregateNotesByTag(commissionId?: string): NoteAggregate[] {
    const relevantNotes = commissionId
      ? state.value.notes.filter(n => n.commissionId === commissionId)
      : state.value.notes

    const tagMap = new Map<string, Note[]>()
    for (const note of relevantNotes) {
      for (const tagId of note.tagIds) {
        if (!tagMap.has(tagId)) tagMap.set(tagId, [])
        tagMap.get(tagId)!.push(note)
      }
    }

    const results: NoteAggregate[] = []
    for (const [tagId, tagNotes] of tagMap) {
      const tag = allTags.value.find(t => t.id === tagId) || null
      const associatedClueIds = new Set<string>()
      for (const clue of clues) {
        if (clue.tagIds.includes(tagId) && state.value.collectedClues.includes(clue.id)) {
          if (!commissionId || clue.commissionId === commissionId) {
            associatedClueIds.add(clue.id)
          }
        }
      }
      const importantCount = tagNotes.filter(n => n.isImportant).length
      const lastUpdatedAt = tagNotes.reduce((latest, note) => 
        note.updatedAt > latest ? note.updatedAt : latest, ''
      )
      results.push({ tagId, tag, notes: tagNotes, clueCount: associatedClueIds.size, importantCount, lastUpdatedAt })
    }

    return results.sort((a, b) => b.notes.length - a.notes.length)
  }

  function getClueNoteClusters(commissionId?: string): ClueNoteCluster[] {
    const relevantClues = clues.filter(c => 
      state.value.collectedClues.includes(c.id) && 
      (!commissionId || c.commissionId === commissionId)
    )

    const clusters: ClueNoteCluster[] = []

    for (const clue of relevantClues) {
      const noteList = state.value.notes.filter(n => n.clueId === clue.id)
      
      const relatedClueIds = new Set<string>()
      for (const conn of connections) {
        if (state.value.discoveredConnections.includes(conn.id)) {
          if (conn.fromClueId === clue.id) {
            relatedClueIds.add(conn.toClueId)
          } else if (conn.toClueId === clue.id) {
            relatedClueIds.add(conn.fromClueId)
          }
        }
      }
      const relatedClues = clues.filter(c => relatedClueIds.has(c.id) && state.value.collectedClues.includes(c.id))
      
      const tagCountMap = new Map<string, number>()
      for (const note of noteList) {
        for (const tagId of note.tagIds) {
          tagCountMap.set(tagId, (tagCountMap.get(tagId) || 0) + 1)
        }
      }
      for (const tagId of clue.tagIds) {
        tagCountMap.set(tagId, (tagCountMap.get(tagId) || 0) + 1)
      }
      
      const tagSummary: { tag: Tag; count: number }[] = []
      for (const [tagId, count] of tagCountMap) {
        const tag = allTags.value.find(t => t.id === tagId)
        if (tag) {
          tagSummary.push({ tag, count })
        }
      }
      tagSummary.sort((a, b) => b.count - a.count)

      clusters.push({
        clue,
        notes: noteList,
        relatedClues,
        tagSummary
      })
    }

    return clusters.sort((a, b) => b.notes.length - a.notes.length)
  }

  function getSortedNotes(
    commissionId?: string, 
    sortBy: 'updatedAt' | 'createdAt' | 'importance' | 'title' = 'updatedAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Note[] {
    let relevantNotes = commissionId
      ? state.value.notes.filter(n => n.commissionId === commissionId)
      : [...state.value.notes]

    const multiplier = sortOrder === 'desc' ? -1 : 1

    return relevantNotes.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'updatedAt':
          comparison = a.updatedAt.localeCompare(b.updatedAt)
          break
        case 'createdAt':
          comparison = a.createdAt.localeCompare(b.createdAt)
          break
        case 'importance':
          if (a.isImportant && !b.isImportant) comparison = 1
          else if (!a.isImportant && b.isImportant) comparison = -1
          else comparison = a.updatedAt.localeCompare(b.updatedAt)
          break
        case 'title':
          comparison = a.title.localeCompare(b.title, 'zh-CN')
          break
      }
      return comparison * multiplier
    })
  }

  function setNoteSortBy(sortBy: 'updatedAt' | 'createdAt' | 'importance' | 'title'): void {
    state.value.noteSortBy = sortBy
    saveCurrentGame()
  }

  function setNoteSortOrder(sortOrder: 'asc' | 'desc'): void {
    state.value.noteSortOrder = sortOrder
    saveCurrentGame()
  }

  function setNoteAggregationType(type: AggregationType): void {
    state.value.noteAggregationType = type
    saveCurrentGame()
  }

  function getImportantNotes(commissionId?: string): Note[] {
    return state.value.notes.filter(n => 
      n.isImportant && (!commissionId || n.commissionId === commissionId)
    ).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  function validateConnection(fromClueId: string, toClueId: string): import('../types').ConnectionValidationResult {
    const fromClue = clues.find(c => c.id === fromClueId)
    const toClue = clues.find(c => c.id === toClueId)

    const commissionId = fromClue?.commissionId || toClue?.commissionId || null
    
    if (!fromClue && !toClue) {
      return { 
        isValid: false, 
        errorCode: 'both_clues_missing', 
        errorMessage: '两个线索都不存在',
        suggestion: '请选择有效的线索进行连接'
      }
    }
    if (!fromClue) {
      return { 
        isValid: false, 
        errorCode: 'one_clue_missing', 
        errorMessage: '起始线索不存在',
        suggestion: '请检查起始线索是否正确',
        toClueTitle: toClue?.title
      }
    }
    if (!toClue) {
      return { 
        isValid: false, 
        errorCode: 'one_clue_missing', 
        errorMessage: '目标线索不存在',
        suggestion: '请检查目标线索是否正确',
        fromClueTitle: fromClue?.title
      }
    }

    if (fromClueId === toClueId) {
      if (commissionId) incrementConnectionRetryCount(commissionId)
      return { 
        isValid: false, 
        errorCode: 'same_clue', 
        errorMessage: '不能连接同一个线索',
        suggestion: '请选择两个不同的线索进行连接',
        fromClueTitle: fromClue.title,
        toClueTitle: toClue.title
      }
    }

    const existing = connections.find(c =>
      (c.fromClueId === fromClueId && c.toClueId === toClueId) ||
      (c.fromClueId === toClueId && c.toClueId === fromClueId)
    )
    if (existing) {
      if (state.value.discoveredConnections.includes(existing.id)) {
        if (commissionId) incrementConnectionRetryCount(commissionId)
        return { 
          isValid: false, 
          errorCode: 'already_connected', 
          errorMessage: '这两个线索已经建立了关联', 
          connectionId: existing.id,
          suggestion: '可以查看已有的关联结论',
          fromClueTitle: fromClue.title,
          toClueTitle: toClue.title
        }
      }
    }

    const visited = new Set<string>()
    const queue = [toClueId]
    visited.add(toClueId)
    let depth = 0
    while (queue.length > 0) {
      const levelSize = queue.length
      for (let i = 0; i < levelSize; i++) {
        const current = queue.shift()!
        const neighborConns = connections.filter(c =>
          state.value.discoveredConnections.includes(c.id) &&
          (c.fromClueId === current || c.toClueId === current)
        )
        for (const conn of neighborConns) {
          const neighbor = conn.fromClueId === current ? conn.toClueId : conn.fromClueId
          if (neighbor === fromClueId) {
            if (commissionId) incrementConnectionRetryCount(commissionId)
            return {
              isValid: false,
              errorCode: 'circular_reference',
              errorMessage: '添加此连接会形成循环引用',
              suggestion: `这两条线索通过 ${depth + 1} 步已经间接相连`,
              fromClueTitle: fromClue.title,
              toClueTitle: toClue.title
            }
          }
          if (!visited.has(neighbor)) {
            visited.add(neighbor)
            queue.push(neighbor)
          }
        }
      }
      depth++
    }

    const validConnection = connections.find(c =>
      c.fromClueId === fromClueId && c.toClueId === toClueId
    )
    if (!validConnection) {
      const reverseConnection = connections.find(c =>
        c.fromClueId === toClueId && c.toClueId === fromClueId
      )
      if (!reverseConnection) {
        if (commissionId) incrementConnectionRetryCount(commissionId)
        const sharedTags = fromClue.tagIds.filter(tid => toClue.tagIds.includes(tid))
        let suggestion = '尝试寻找其他相关的线索组合'
        let confidence = 0
        if (sharedTags.length > 0) {
          suggestion = `这两条线索有 ${sharedTags.length} 个共同标签，但暂未预设关联`
          confidence = sharedTags.length * 10
        }
        return { 
          isValid: false, 
          errorCode: 'no_connection', 
          errorMessage: '这两个线索之间没有可用的推理关联',
          suggestion,
          confidence,
          fromClueTitle: fromClue.title,
          toClueTitle: toClue.title
        }
      }
      return { 
        isValid: true, 
        connectionId: reverseConnection.id,
        confidence: 100,
        fromClueTitle: toClue.title,
        toClueTitle: fromClue.title
      }
    }

    return { 
      isValid: true, 
      connectionId: validConnection.id,
      confidence: 100,
      fromClueTitle: fromClue.title,
      toClueTitle: toClue.title
    }
  }

  function getConnectionHints(commissionId: string): import('../types').ConnectionHint[] {
    const commissionClues = clues.filter(c => c.commissionId === commissionId)
    const undiscoveredConns = connections.filter(c => {
      const fromClue = clues.find(clue => clue.id === c.fromClueId)
      return fromClue?.commissionId === commissionId && 
        !state.value.discoveredConnections.includes(c.id) &&
        state.value.collectedClues.includes(c.fromClueId) &&
        state.value.collectedClues.includes(c.toClueId)
    })

    const hints: import('../types').ConnectionHint[] = []
    for (const conn of undiscoveredConns) {
      const fromClue = clues.find(c => c.id === conn.fromClueId)
      const toClue = clues.find(c => c.id === conn.toClueId)
      if (!fromClue || !toClue) continue

      const sharedTags = fromClue.tagIds.filter(tid => toClue.tagIds.includes(tid))
      let difficulty: 'easy' | 'medium' | 'hard' = 'hard'
      let hint = ''

      if (sharedTags.length >= 2) {
        difficulty = 'easy'
        const tagNames = sharedTags.slice(0, 2).map(tid => getTagById(tid)?.name || '').join('、')
        hint = `试试找找都有「${tagNames}」标签的线索`
      } else if (sharedTags.length === 1) {
        difficulty = 'medium'
        const tagName = getTagById(sharedTags[0])?.name || ''
        hint = `它们都和「${tagName}」有关`
      } else {
        const categoryMatch = fromClue.category === toClue.category
        if (categoryMatch) {
          difficulty = 'medium'
          hint = `它们属于同一类线索`
        } else {
          hint = `仔细想想这两条线索之间的联系`
        }
      }

      hints.push({
        fromClueId: conn.fromClueId,
        toClueId: conn.toClueId,
        hint,
        difficulty
      })
    }

    return hints.sort((a, b) => {
      const order = { easy: 0, medium: 1, hard: 2 }
      return order[a.difficulty] - order[b.difficulty]
    })
  }

  function getConnectionGraph(commissionId: string): import('../types').ConnectionGraphNode[] {
    const commissionClues = clues.filter(c => 
      c.commissionId === commissionId && state.value.collectedClues.includes(c.id)
    )
    
    const nodes: Map<string, import('../types').ConnectionGraphNode> = new Map()
    const edges: Map<string, Set<string>> = new Map()
    
    for (const clue of commissionClues) {
      edges.set(clue.id, new Set())
    }
    
    for (const conn of connections) {
      if (!state.value.discoveredConnections.includes(conn.id)) continue
      const fromClue = clues.find(c => c.id === conn.fromClueId)
      if (fromClue?.commissionId !== commissionId) continue
      
      if (edges.has(conn.fromClueId)) {
        edges.get(conn.fromClueId)!.add(conn.toClueId)
      }
      if (edges.has(conn.toClueId)) {
        edges.get(conn.toClueId)!.add(conn.fromClueId)
      }
    }
    
    const visited = new Set<string>()
    let maxDepth = 0
    
    function dfs(clueId: string, depth: number) {
      if (visited.has(clueId)) return
      visited.add(clueId)
      maxDepth = Math.max(maxDepth, depth)
      
      const neighbors = edges.get(clueId) || new Set()
      const isHub = neighbors.size >= 3
      
      nodes.set(clueId, {
        clueId,
        connections: Array.from(neighbors),
        depth,
        isHub
      })
      
      for (const neighbor of neighbors) {
        dfs(neighbor, depth + 1)
      }
    }
    
    for (const clue of commissionClues) {
      if (!visited.has(clue.id)) {
        dfs(clue.id, 0)
      }
    }
    
    return Array.from(nodes.values())
  }

  function getCommissionProgress(commissionId: string): ProgressDetail {
    const collectedClueCount = getCollectedClueCount(commissionId)
    const totalClueCount = getTotalClueCount(commissionId)
    const discoveredConnCount = getDiscoveredConnectionCount(commissionId)
    const totalConnCount = getTotalConnectionCount(commissionId)
    const noteCount = state.value.notes.filter(n => n.commissionId === commissionId).length
    const importantNoteCount = state.value.notes.filter(n => 
      n.commissionId === commissionId && n.isImportant
    ).length

    const clueWeight = 0.5
    const connWeight = 0.35
    const noteWeight = 0.15

    const cluePct = totalClueCount > 0 ? (collectedClueCount / totalClueCount) * 100 : 0
    const connPct = totalConnCount > 0 ? (discoveredConnCount / totalConnCount) * 100 : 0
    
    const expectedNotes = Math.max(totalClueCount * 0.5, 2)
    const noteScore = Math.min(noteCount / expectedNotes, 1) * 100
    const noteWeightedScore = noteScore * noteWeight
    
    const clueWeightedScore = cluePct * clueWeight
    const connWeightedScore = connPct * connWeight
    
    const weightedOverall = clueWeightedScore + connWeightedScore + noteWeightedScore
    const overallPercentage = Math.round(weightedOverall)

    const commissionClues = clues.filter(c => 
      c.commissionId === commissionId && state.value.collectedClues.includes(c.id)
    )
    const usedTagIds = new Set<string>()
    for (const clue of commissionClues) {
      for (const tid of clue.tagIds) {
        usedTagIds.add(tid)
      }
    }
    for (const note of state.value.notes.filter(n => n.commissionId === commissionId)) {
      for (const tid of note.tagIds) {
        usedTagIds.add(tid)
      }
    }
    const totalTagCount = allTags.value.length
    const tagPct = totalTagCount > 0 ? Math.round((usedTagIds.size / totalTagCount) * 100) : 0

    return {
      clueProgress: { 
        collected: collectedClueCount, 
        total: totalClueCount, 
        percentage: Math.round(cluePct),
        weightedScore: Math.round(clueWeightedScore)
      },
      connectionProgress: { 
        discovered: discoveredConnCount, 
        total: totalConnCount, 
        percentage: Math.round(connPct),
        weightedScore: Math.round(connWeightedScore)
      },
      noteProgress: { 
        count: noteCount,
        weightedScore: Math.round(noteWeightedScore)
      },
      tagProgress: {
        usedTagCount: usedTagIds.size,
        totalTagCount,
        percentage: tagPct
      },
      overallPercentage,
      weightedOverall: Math.round(weightedOverall)
    }
  }

  function getChapterProgress(chapterId: string): ProgressDetail {
    const chapterCommissions = commissions.filter(c => c.chapterId === chapterId)
    let totalClues = 0, collectedClues = 0, totalConns = 0, discoveredConns = 0
    let noteCount = 0, totalWeightedScore = 0, count = 0
    let totalTagCount = 0, usedTagIdsSet = new Set<string>()

    for (const comm of chapterCommissions) {
      const progress = getCommissionProgress(comm.id)
      totalClues += progress.clueProgress.total
      collectedClues += progress.clueProgress.collected
      totalConns += progress.connectionProgress.total
      discoveredConns += progress.connectionProgress.discovered
      noteCount += progress.noteProgress.count
      totalWeightedScore += progress.weightedOverall
      count++
      if (progress.tagProgress) {
        totalTagCount = progress.tagProgress.totalTagCount
        const commissionClues = clues.filter(c => 
          c.commissionId === comm.id && state.value.collectedClues.includes(c.id)
        )
        for (const clue of commissionClues) {
          for (const tid of clue.tagIds) {
            usedTagIdsSet.add(tid)
          }
        }
        for (const note of state.value.notes.filter(n => n.commissionId === comm.id)) {
          for (const tid of note.tagIds) {
            usedTagIdsSet.add(tid)
          }
        }
      }
    }

    const cluePct = totalClues > 0 ? Math.round((collectedClues / totalClues) * 100) : 0
    const connPct = totalConns > 0 ? Math.round((discoveredConns / totalConns) * 100) : 0
    const overall = totalClues + totalConns > 0
      ? Math.round(((collectedClues + discoveredConns) / (totalClues + totalConns)) * 100)
      : 0

    const avgWeighted = count > 0 ? Math.round(totalWeightedScore / count) : 0
    const tagPct = totalTagCount > 0 ? Math.round((usedTagIdsSet.size / totalTagCount) * 100) : 0

    return {
      clueProgress: { 
        collected: collectedClues, 
        total: totalClues, 
        percentage: cluePct,
        weightedScore: Math.round(cluePct * 0.5)
      },
      connectionProgress: { 
        discovered: discoveredConns, 
        total: totalConns, 
        percentage: connPct,
        weightedScore: Math.round(connPct * 0.35)
      },
      noteProgress: { 
        count: noteCount,
        weightedScore: 0
      },
      tagProgress: {
        usedTagCount: usedTagIdsSet.size,
        totalTagCount,
        percentage: tagPct
      },
      overallPercentage: overall,
      weightedOverall: avgWeighted
    }
  }

  function getOverallProgress(): ProgressDetail {
    let totalClues = 0, collectedClues = 0, totalConns = 0, discoveredConns = 0
    let totalWeightedScore = 0, count = 0
    let usedTagIdsSet = new Set<string>()

    for (const clue of clues) {
      totalClues++
      if (state.value.collectedClues.includes(clue.id)) {
        collectedClues++
        for (const tid of clue.tagIds) {
          usedTagIdsSet.add(tid)
        }
      }
    }
    for (const conn of connections) {
      totalConns++
      if (state.value.discoveredConnections.includes(conn.id)) discoveredConns++
    }
    
    for (const note of state.value.notes) {
      for (const tid of note.tagIds) {
        usedTagIdsSet.add(tid)
      }
    }

    for (const comm of commissions) {
      if (getCommissionStatus(comm.id) !== 'locked') {
        const progress = getCommissionProgress(comm.id)
        totalWeightedScore += progress.weightedOverall
        count++
      }
    }

    const cluePct = totalClues > 0 ? Math.round((collectedClues / totalClues) * 100) : 0
    const connPct = totalConns > 0 ? Math.round((discoveredConns / totalConns) * 100) : 0
    const overall = totalClues + totalConns > 0
      ? Math.round(((collectedClues + discoveredConns) / (totalClues + totalConns)) * 100)
      : 0

    const avgWeighted = count > 0 ? Math.round(totalWeightedScore / count) : 0
    const totalTagCount = allTags.value.length
    const tagPct = totalTagCount > 0 ? Math.round((usedTagIdsSet.size / totalTagCount) * 100) : 0

    return {
      clueProgress: { 
        collected: collectedClues, 
        total: totalClues, 
        percentage: cluePct,
        weightedScore: Math.round(cluePct * 0.5)
      },
      connectionProgress: { 
        discovered: discoveredConns, 
        total: totalConns, 
        percentage: connPct,
        weightedScore: Math.round(connPct * 0.35)
      },
      noteProgress: { 
        count: state.value.notes.length,
        weightedScore: 0
      },
      tagProgress: {
        usedTagCount: usedTagIdsSet.size,
        totalTagCount,
        percentage: tagPct
      },
      overallPercentage: overall,
      weightedOverall: avgWeighted
    }
  }

  function checkAndUnlockMilestones(commissionId: string): void {
    const progress = getCommissionProgress(commissionId)
    const milestones: Record<string, boolean> = { ...state.value.progressMilestones }
    
    const cluePct = progress.clueProgress.percentage
    const connPct = progress.connectionProgress.percentage
    
    if (cluePct >= 25 && !milestones[`${commissionId}-clue-25`]) {
      milestones[`${commissionId}-clue-25`] = true
    }
    if (cluePct >= 50 && !milestones[`${commissionId}-clue-50`]) {
      milestones[`${commissionId}-clue-50`] = true
    }
    if (cluePct >= 75 && !milestones[`${commissionId}-clue-75`]) {
      milestones[`${commissionId}-clue-75`] = true
    }
    if (cluePct >= 100 && !milestones[`${commissionId}-clue-100`]) {
      milestones[`${commissionId}-clue-100`] = true
    }
    
    if (connPct >= 50 && !milestones[`${commissionId}-conn-50`]) {
      milestones[`${commissionId}-conn-50`] = true
    }
    if (connPct >= 100 && !milestones[`${commissionId}-conn-100`]) {
      milestones[`${commissionId}-conn-100`] = true
    }
    
    if (progress.noteProgress.count >= 3 && !milestones[`${commissionId}-notes-3`]) {
      milestones[`${commissionId}-notes-3`] = true
    }
    
    state.value.progressMilestones = milestones
    saveCurrentGame()
  }

  function computeDifficultyContext(commissionId: string): DifficultyContext {
    const commission = commissions.find(c => c.id === commissionId)
    if (!commission) {
      return {
        clueCollectionRate: 0,
        retryCount: 0,
        commissionBaseDifficulty: 'simple',
        effectiveDifficulty: 'standard' as DynamicDifficultyLevel
      }
    }

    const collected = getCollectedClueCount(commissionId)
    const total = getTotalClueCount(commissionId)
    const clueCollectionRate = total > 0 ? collected / total : 0

    const repairRetries = Object.entries(state.value.repairRetryCounts)
      .filter(([key]) => key.startsWith(commissionId))
      .reduce((sum, [, count]) => sum + count, 0)
    const connectionRetries = state.value.connectionRetryCounts[commissionId] || 0
    const retryCount = repairRetries + connectionRetries

    let effectiveDifficulty: DynamicDifficultyLevel = 'standard'

    if (clueCollectionRate < 0.4 || (clueCollectionRate < 0.6 && retryCount >= 3)) {
      effectiveDifficulty = 'assisted'
    } else if (clueCollectionRate >= 0.8 && retryCount === 0) {
      effectiveDifficulty = 'challenging'
    } else if (clueCollectionRate >= 0.6 && retryCount <= 1) {
      effectiveDifficulty = 'challenging'
    } else if (retryCount >= 2) {
      effectiveDifficulty = 'assisted'
    }

    return {
      clueCollectionRate: Math.round(clueCollectionRate * 100) / 100,
      retryCount,
      commissionBaseDifficulty: commission.difficulty,
      effectiveDifficulty
    }
  }

  function getDifficultyLevel(commissionId: string): DynamicDifficultyLevel {
    return computeDifficultyContext(commissionId).effectiveDifficulty
  }

  function getHotspotHintForDifficulty(hotspot: import('../types').Hotspot, commissionId: string): string {
    const level = getDifficultyLevel(commissionId)
    if (hotspot.hints && hotspot.hints[level]) {
      return hotspot.hints[level]
    }
    return hotspot.description
  }

  function getRepairStepsForDifficulty(commissionId: string): RepairStep[] {
    const steps = repairSteps[commissionId]
    if (!steps) return []

    const level = getDifficultyLevel(commissionId)

    return steps.map(step => {
      const variant = step.difficultyVariants?.[level]
      const merged: RepairStep = {
        ...step,
        description: variant?.description || step.description
      }

      if (variant?.extraChoices && variant.extraChoices.length > 0) {
        merged.choices = [...step.choices, ...variant.extraChoices]
      }

      merged.difficultyVariants = step.difficultyVariants
      return merged
    })
  }

  function incrementRepairRetryCount(commissionId: string, stepId: string): void {
    const key = `${commissionId}-${stepId}`
    state.value.repairRetryCounts[key] = (state.value.repairRetryCounts[key] || 0) + 1
    saveCurrentGame()
  }

  function incrementConnectionRetryCount(commissionId: string): void {
    state.value.connectionRetryCounts[commissionId] = (state.value.connectionRetryCounts[commissionId] || 0) + 1
    saveCurrentGame()
  }

  return {
    currentSlotId,
    lastActiveSlotId,
    saveSlots,
    refreshSaveSlots,
    getSlotInfo,
    saveToSlot,
    loadFromSlot,
    restoreBackup,
    deleteSlot,
    renameSaveSlot,
    startNewGameInSlot,
    hasBackup,
    getSlotSnapshots,
    loadFromSnapshot,
    removeSnapshot,
    manualSnapshot,
    allEndingReplays,
    getReplaysForSlot,
    state,
    hasSave,
    currentCommission,
    currentChapter,
    allChapters,
    unlockedChapters,
    collectedCluesForCurrent,
    allCluesForCurrent,
    discoveredConnectionsForCurrent,
    unlockedEndingsForCurrent,
    isCommissionCompleted,
    completionProgress,
    loadSavedGame,
    saveCurrentGame,
    startNewGame,
    selectCommission,
    collectClue,
    discoverConnection,
    setCurrentStep,
    unlockEnding,
    completeCommission,
    goToGallery,
    resetCurrentCommission,
    clearAllData,
    canStartRepair,
    getRepairSteps,
    getCommissionById,
    getEndingById,
    getEndingByType,
    getAllEndings,
    getAllCommissions,
    getClueById,
    getConnectionById,
    getConnectionsForCommission,
    continueGame,
    getCommissionStatus,
    checkPrerequisitesMet,
    tryUnlockChapter,
    tryUnlockCommission,
    transitionCommissionStatus,
    getCommissionsByChapter,
    getChapterById,
    getAllChapters,
    refreshAllUnlocks,
    canAccessStep,
    isStepUnlocked,
    checkAndUnlockSteps,
    getStepUnlockProgress,
    getCollectedClueCount,
    getTotalClueCount,
    getDiscoveredConnectionCount,
    getTotalConnectionCount,
    allTags,
    filteredClues,
    searchCluesByTagIds,
    searchCluesByKeyword,
    searchNotesByTagIds,
    searchNotesByKeyword,
    unifiedSearch,
    setActiveTagFilters,
    setSearchKeyword,
    setSearchMatchMode,
    setSearchScope,
    getTagById,
    addCustomTag,
    removeCustomTag,
    addNote,
    updateNote,
    deleteNote,
    getNotesForCommission,
    getNotesForClue,
    aggregateNotesByTag,
    getClueNoteClusters,
    getSortedNotes,
    setNoteSortBy,
    setNoteSortOrder,
    setNoteAggregationType,
    getImportantNotes,
    validateConnection,
    getConnectionHints,
    getConnectionGraph,
    getCommissionProgress,
    getChapterProgress,
    getOverallProgress,
    checkAndUnlockMilestones,
    computeDifficultyContext,
    getDifficultyLevel,
    getHotspotHintForDifficulty,
    getRepairStepsForDifficulty,
    incrementRepairRetryCount,
    incrementConnectionRetryCount
  }
})
