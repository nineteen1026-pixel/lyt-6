import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, CommissionStatus, Chapter, Commission, GameStep, StepDependency, SaveSlotInfo, LoadResult } from '../types'
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
  hasBackupInSlot
} from '../utils/storage'
import { commissions, clues, connections, endings, repairSteps, chapters } from '../data/gameData'

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
    }
    saveCurrentGame()
  }

  function completeCommission(commissionId: string) {
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
    getTotalConnectionCount
  }
})
