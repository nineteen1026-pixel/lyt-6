import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, CommissionStatus, Chapter, Commission } from '../types'
import { getInitialGameState, saveGame, loadGame, hasSaveData, clearSave } from '../utils/storage'
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
    saveCurrentGame()
  }

  function collectClue(clueId: string) {
    if (!state.value.collectedClues.includes(clueId)) {
      state.value.collectedClues.push(clueId)
      saveCurrentGame()
    }
  }

  function discoverConnection(connectionId: string) {
    if (!state.value.discoveredConnections.includes(connectionId)) {
      state.value.discoveredConnections.push(connectionId)
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
    const collected = collectedCluesForCurrent.value.length
    const total = allCluesForCurrent.value.length
    return total > 0 && collected >= Math.ceil(total * 0.5)
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

  return {
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
    refreshAllUnlocks
  }
})
