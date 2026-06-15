<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft, Link, Lightbulb, ChevronRight, Sparkles, X, Lock,
  Plus, Edit2, Trash2, Star, FolderKanban, Search, AlertCircle,
  RefreshCw, Repeat, AlertTriangle, Move, Archive, Trophy,
  Zap, Shield, TrendingUp, ChevronDown, ChevronUp
} from 'lucide-vue-next'
import { useGameStore } from '../stores/game'
import { useDynamicDifficulty } from '../composables/useDynamicDifficulty'
import type {
  Clue, ClueConnection, ConnectionValidationResult, Tag, Note,
  DynamicDifficultyLevel, ConnectionScoreResult, ConnectionConflict,
  DeductionConclusion, BoardCluePosition, DragLineState, ConnectionScoreLevel
} from '../types'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const showConclusion = ref<ClueConnection | null>(null)
const conclusionScore = ref<ConnectionScoreResult | null>(null)
const validationToast = ref<{ result: ConnectionValidationResult; type: 'error' | 'info' } | null>(null)
const conflictToast = ref<ConnectionConflict | null>(null)

const localKeyword = ref('')
const localTagFilters = ref<string[]>([])
const noteModalOpen = ref(false)
const editingNote = ref<Note | null>(null)
const activeClueForNote = ref<string | null>(null)
const aggregationMode = ref<'list' | 'tag'>('list')
const sidebarTab = ref<'connections' | 'conflicts' | 'archive'>('connections')
const noteForm = ref({
  title: '',
  content: '',
  tagIds: [] as string[],
  isImportant: false
})

const boardRef = ref<HTMLElement | null>(null)
const dragLine = reactive<DragLineState>({
  isDragging: false,
  fromClueId: null,
  fromX: 0,
  fromY: 0,
  toX: 0,
  toY: 0,
  targetClueId: null
})
const draggingClueId = ref<string | null>(null)
const dragOffset = reactive({ x: 0, y: 0 })

const commissionId = computed(() => route.params.id as string)
const commission = computed(() => gameStore.getCommissionById(commissionId.value))

const allCollectedClues = computed(() => gameStore.collectedCluesForCurrent)

const filteredClues = computed(() => {
  const kw = localKeyword.value.trim().toLowerCase()
  const tagF = localTagFilters.value
  return allCollectedClues.value.filter(clue => {
    const kwOk = kw === '' || clue.title.toLowerCase().includes(kw) || clue.content.toLowerCase().includes(kw)
    const tagOk = tagF.length === 0 || clue.tagIds.some(tid => tagF.includes(tid))
    return kwOk && tagOk
  })
})

const allConnections = computed(() => gameStore.getConnectionsForCommission(commissionId.value))
const discoveredConnections = computed(() =>
  allConnections.value.filter(conn => gameStore.state.discoveredConnections.includes(conn.id))
)

const activeConflicts = computed(() =>
  commissionId.value ? gameStore.detectConflictsForCommission(commissionId.value) : []
)

const archivedConclusions = computed(() =>
  commissionId.value ? gameStore.getArchivedConclusionsForCommission(commissionId.value) : []
)

const progressArchive = computed(() =>
  commissionId.value ? gameStore.getCommissionProgressArchive(commissionId.value) : null
)

const unifiedProgress = computed(() =>
  commissionId.value ? gameStore.getCommissionProgress(commissionId.value) : null
)

const progress = computed(() => ({
  total: unifiedProgress.value?.connectionProgress.total ?? 0,
  discovered: unifiedProgress.value?.connectionProgress.discovered ?? 0,
  percentage: unifiedProgress.value?.connectionProgress.percentage ?? 0
}))

const repairUnlockProgress = computed(() => {
  if (!commissionId.value) return { current: 0, required: 1, description: '', unlocked: false }
  const p = gameStore.getStepUnlockProgress(commissionId.value, 'repair')
  return { ...p, unlocked: gameStore.canAccessStep(commissionId.value, 'repair') }
})

const notesForCommission = computed(() =>
  commissionId.value ? gameStore.getNotesForCommission(commissionId.value) : []
)

const notesByTag = computed(() =>
  commissionId.value ? gameStore.aggregateNotesByTag(commissionId.value) : []
)

const allAvailableTags = computed(() => gameStore.allTags)

const {
  difficultyContext,
  effectiveDifficulty,
  difficultyScore,
  difficultyLabel,
  startPhaseTiming,
  endPhaseTiming
} = useDynamicDifficulty(() => commissionId.value || null)

const cluePositions = computed<BoardCluePosition[]>(() => {
  if (!commissionId.value) return []
  const saved = gameStore.getBoardCluePositions(commissionId.value)
  if (saved.length > 0) return saved
  return computeDefaultPositions(allCollectedClues.value)
})

function computeDefaultPositions(cluesList: Clue[]): BoardCluePosition[] {
  const positions: BoardCluePosition[] = []
  const cols = Math.min(Math.ceil(Math.sqrt(cluesList.length)), 3)
  cluesList.forEach((clue, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    positions.push({
      clueId: clue.id,
      x: 60 + col * 260,
      y: 60 + row * 180
    })
  })
  return positions
}

function getCluePos(clueId: string): { x: number; y: number } {
  const pos = cluePositions.value.find(p => p.clueId === clueId)
  return pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 }
}

watch(localKeyword, (v) => gameStore.setSearchKeyword(v))
watch(localTagFilters, (v) => gameStore.setActiveTagFilters(v), { deep: true })

function showValidationToast(result: ConnectionValidationResult, type: 'error' | 'info' = 'error') {
  validationToast.value = { result, type }
  setTimeout(() => { validationToast.value = null }, 2800)
}

function startDragLine(clueId: string, event: PointerEvent) {
  event.preventDefault()
  event.stopPropagation()
  const boardEl = boardRef.value
  if (!boardEl) return
  const rect = boardEl.getBoundingClientRect()
  const pos = getCluePos(clueId)
  dragLine.isDragging = true
  dragLine.fromClueId = clueId
  dragLine.fromX = pos.x + 80
  dragLine.fromY = pos.y + 40
  dragLine.toX = event.clientX - rect.left + boardEl.scrollLeft
  dragLine.toY = event.clientY - rect.top + boardEl.scrollTop
  dragLine.targetClueId = null
}

function onBoardPointerMove(event: PointerEvent) {
  const boardEl = boardRef.value
  if (!boardEl) return

  if (dragLine.isDragging) {
    const rect = boardEl.getBoundingClientRect()
    dragLine.toX = event.clientX - rect.left + boardEl.scrollLeft
    dragLine.toY = event.clientY - rect.top + boardEl.scrollTop
    dragLine.targetClueId = findClueUnderPoint(event.clientX, event.clientY)
    return
  }

  if (draggingClueId.value) {
    const rect = boardEl.getBoundingClientRect()
    const x = event.clientX - rect.left + boardEl.scrollLeft - dragOffset.x
    const y = event.clientY - rect.top + boardEl.scrollTop - dragOffset.y
    gameStore.setBoardCluePosition(commissionId.value, draggingClueId.value, Math.max(0, x), Math.max(0, y))
  }
}

function onBoardPointerUp() {
  if (dragLine.isDragging && dragLine.fromClueId && dragLine.targetClueId) {
    const fromId = dragLine.fromClueId
    const toId = dragLine.targetClueId
    if (fromId !== toId) {
      checkConnection(fromId, toId)
    }
  }
  dragLine.isDragging = false
  dragLine.fromClueId = null
  dragLine.targetClueId = null
  draggingClueId.value = null
}

function startDragClue(clueId: string, event: PointerEvent) {
  if (dragLine.isDragging) return
  event.preventDefault()
  const boardEl = boardRef.value
  if (!boardEl) return
  const rect = boardEl.getBoundingClientRect()
  const pos = getCluePos(clueId)
  const mx = event.clientX - rect.left + boardEl.scrollLeft
  const my = event.clientY - rect.top + boardEl.scrollTop
  dragOffset.x = mx - pos.x
  dragOffset.y = my - pos.y
  draggingClueId.value = clueId
}

function findClueUnderPoint(clientX: number, clientY: number): string | null {
  const elements = document.querySelectorAll('[data-clue-node]')
  for (const el of elements) {
    const rect = el.getBoundingClientRect()
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      return (el as HTMLElement).dataset.clueNode || null
    }
  }
  return null
}

function checkConnection(fromId?: string, toId?: string) {
  const fid = fromId
  const tid = toId
  if (!fid || !tid) return
  const result = gameStore.validateConnection(fid, tid)

  if (!result.isValid) {
    showValidationToast(result, 'error')
    return
  }

  if (result.connectionId) {
    const conn = gameStore.getConnectionById(result.connectionId)
    if (conn) {
      if (!gameStore.state.discoveredConnections.includes(conn.id)) {
        gameStore.discoverConnection(conn.id)
        const archived = gameStore.archiveConclusion(conn.id)
        if (archived) {
          conclusionScore.value = archived.score
        }
        const newConflicts = gameStore.detectConflictsForCommission(commissionId.value)
        const relatedConflict = newConflicts.find(c =>
          c.connectionA.id === conn.id || c.connectionB.id === conn.id
        )
        if (relatedConflict) {
          setTimeout(() => {
            conflictToast.value = relatedConflict
            setTimeout(() => { conflictToast.value = null }, 4000)
          }, 1500)
        }
      }
      showConclusion.value = conn
      if (!conclusionScore.value) {
        conclusionScore.value = gameStore.computeConnectionScore(conn.id)
      }
    }
  }
}

function closeConclusion() {
  showConclusion.value = null
  conclusionScore.value = null
}

function goBack() { router.push(`/commission/${commissionId.value}`) }

function goToRepair() {
  endPhaseTiming('deduction')
  gameStore.setCurrentStep('repair')
  router.push(`/repair/${commissionId.value}`)
}

function toggleTag(tagId: string) {
  const i = localTagFilters.value.indexOf(tagId)
  if (i >= 0) localTagFilters.value.splice(i, 1)
  else localTagFilters.value.push(tagId)
}

function openNewNote(clueId?: string) {
  editingNote.value = null
  activeClueForNote.value = clueId || null
  noteForm.value = {
    title: clueId ? gameStore.getClueById(clueId)?.title + ' · 笔记' : '新笔记',
    content: '',
    tagIds: clueId ? gameStore.getClueById(clueId)?.tagIds || [] : [],
    isImportant: false
  }
  noteModalOpen.value = true
}

function openEditNote(note: Note) {
  editingNote.value = note
  activeClueForNote.value = note.clueId || null
  noteForm.value = {
    title: note.title,
    content: note.content,
    tagIds: [...note.tagIds],
    isImportant: note.isImportant
  }
  noteModalOpen.value = true
}

function saveNote() {
  if (!commissionId.value) return
  if (!noteForm.value.title.trim()) noteForm.value.title = '未命名笔记'
  if (editingNote.value) {
    gameStore.updateNote(editingNote.value.id, {
      title: noteForm.value.title,
      content: noteForm.value.content,
      tagIds: noteForm.value.tagIds,
      isImportant: noteForm.value.isImportant
    })
  } else {
    gameStore.addNote({
      commissionId: commissionId.value,
      clueId: activeClueForNote.value || undefined,
      title: noteForm.value.title,
      content: noteForm.value.content,
      tagIds: noteForm.value.tagIds,
      isImportant: noteForm.value.isImportant
    })
  }
  noteModalOpen.value = false
}

function removeNote(noteId: string) {
  if (confirm('确定要删除这条笔记吗？')) {
    gameStore.deleteNote(noteId)
  }
}

function toggleNoteTag(tagId: string) {
  const i = noteForm.value.tagIds.indexOf(tagId)
  if (i >= 0) noteForm.value.tagIds.splice(i, 1)
  else noteForm.value.tagIds.push(tagId)
}

function getTagById(tagId: string): Tag | null {
  return gameStore.getTagById(tagId)
}

function getConnectionLinePath(fromPos: { x: number; y: number }, toPos: { x: number; y: number }): string {
  const fx = fromPos.x + 80
  const fy = fromPos.y + 40
  const tx = toPos.x + 80
  const ty = toPos.y + 40
  const dx = Math.abs(tx - fx) * 0.4
  return `M ${fx} ${fy} C ${fx + dx} ${fy}, ${tx - dx} ${ty}, ${tx} ${ty}`
}

function getScoreLevelBg(level: ConnectionScoreLevel): string {
  switch (level) {
    case 'critical': return 'bg-rose-100 text-rose-700 border-rose-300'
    case 'strong': return 'bg-emerald-100 text-emerald-700 border-emerald-300'
    case 'moderate': return 'bg-amber-100 text-amber-700 border-amber-300'
    case 'weak': return 'bg-stone-100 text-stone-600 border-stone-300'
  }
}

function getScoreLevelDot(level: ConnectionScoreLevel): string {
  switch (level) {
    case 'critical': return '#e11d48'
    case 'strong': return '#059669'
    case 'moderate': return '#d97706'
    case 'weak': return '#78716c'
  }
}

function getConflictTypeLabel(type: string): string {
  switch (type) {
    case 'logical_contradiction': return '逻辑矛盾'
    case 'mutually_exclusive': return '互斥关联'
    case 'timeline_conflict': return '时间线冲突'
    case 'evidence_conflict': return '证据冲突'
    case 'redundant_connection': return '冗余关联'
    default: return '冲突'
  }
}

const categoryColors: Record<string, string> = {
  object: 'bg-blue-50 border-blue-200 text-blue-700',
  memory: 'bg-purple-50 border-purple-200 text-purple-700',
  emotion: 'bg-rose-50 border-rose-200 text-rose-700',
  time: 'bg-amber-50 border-amber-200 text-amber-700'
}

const categoryLabels: Record<string, string> = {
  object: '物品',
  memory: '记忆',
  emotion: '情感',
  time: '时间'
}

const errorIcons: Record<string, object> = {
  same_clue: Repeat,
  already_connected: Link,
  circular_reference: RefreshCw,
  invalid_direction: AlertTriangle,
  no_connection: AlertCircle
}

function getErrorIcon(code?: string) {
  if (!code) return AlertCircle
  return (errorIcons[code] as any) || AlertCircle
}

function isClueInConflict(clueId: string): boolean {
  return activeConflicts.value.some(c =>
    c.connectionA.fromClueId === clueId || c.connectionA.toClueId === clueId ||
    c.connectionB.fromClueId === clueId || c.connectionB.toClueId === clueId
  )
}

function isConnectionConflicted(connId: string): boolean {
  return activeConflicts.value.some(c =>
    c.connectionA.id === connId || c.connectionB.id === connId
  )
}

onMounted(() => {
  gameStore.loadSavedGame()
  if (!commission.value) {
    router.push('/commissions')
  }
  localKeyword.value = gameStore.state.searchKeyword
  localTagFilters.value = [...gameStore.state.activeTagFilters]
  startPhaseTiming('deduction')
})
</script>

<template>
  <div class="min-h-screen py-8 px-4 paper-texture" @pointerup="onBoardPointerUp" @pointercancel="onBoardPointerUp">
    <div class="max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <button
          class="flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors font-serif"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5" />
          <span>返回旧物检视</span>
        </button>
        <div class="flex items-center gap-3">
          <div v-if="difficultyContext" class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-serif" :class="[difficultyLabel.color, 'bg-white/80']">
            <span class="text-base">{{ difficultyLabel.icon }}</span>
            <span class="font-medium">{{ difficultyLabel.text }}模式</span>
            <span class="text-stone-400">·</span>
            <span class="text-stone-500">综合评分 {{ difficultyScore }}分</span>
            <div class="w-16 h-1.5 bg-stone-200 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{
                  width: `${difficultyScore}%`,
                  backgroundColor: difficultyScore >= 70 ? '#ef4444' : difficultyScore >= 35 ? '#f59e0b' : '#3b82f6'
                }"
              />
            </div>
          </div>
          <div class="hidden sm:flex items-center gap-2 px-4 py-2 bg-stone-100/70 rounded-lg text-sm text-stone-600 font-serif">
            <span>综合进度</span>
            <span class="font-bold text-amber-700">{{ unifiedProgress?.overallPercentage ?? 0 }}%</span>
          </div>
          <div class="text-sm text-stone-500 font-serif">
            已发现关联：{{ progress.discovered }}/{{ progress.total }}
          </div>
        </div>
      </div>

      <div class="text-center mb-6">
        <h1 class="text-2xl font-display font-bold text-stone-800 mb-1 text-shadow-warm">
          推理板 2.0
        </h1>
        <p class="text-stone-500 text-sm font-serif">
          拖拽线索卡片排列布局 · 从连接点拖出线条建立关联
        </p>
        <div class="divider-ornament mt-3" />
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="card-warm p-5">
            <div class="flex flex-wrap items-center gap-2 mb-4">
              <Lightbulb class="w-5 h-5 text-amber-500" />
              <h3 class="font-serif font-bold text-stone-800">推理画布</h3>
              <span class="text-xs text-stone-400">（拖拽排列 · 连线推理）</span>

              <div class="flex-1" />

              <div class="relative w-full sm:w-56 mt-2 sm:mt-0">
                <Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  v-model="localKeyword"
                  type="text"
                  placeholder="关键词..."
                  class="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-200/60 bg-white/80 focus:border-amber-300 focus:ring-2 focus:ring-amber-200/40 outline-none transition-all font-serif"
                />
              </div>
            </div>

            <div v-if="allAvailableTags.length" class="flex flex-wrap gap-1.5 mb-4 pb-4 border-b border-stone-200/40">
              <button
                v-for="tag in allAvailableTags"
                :key="tag.id"
                :class="[
                  'px-2 py-0.5 rounded-full text-[11px] font-serif border transition-all',
                  localTagFilters.includes(tag.id)
                    ? 'border-transparent text-white shadow-sm'
                    : 'bg-white/60 border-stone-200/60 hover:border-stone-300'
                ]"
                :style="localTagFilters.includes(tag.id) ? { background: tag.color } : { color: tag.color }"
                @click="toggleTag(tag.id)"
              >
                {{ tag.name }}
              </button>
            </div>

            <div
              v-if="dragLine.isDragging"
              class="mb-3 p-2.5 bg-blue-50/60 rounded-xl border border-blue-200/40 text-xs font-serif text-blue-700 flex items-center gap-2"
            >
              <Link class="w-4 h-4 text-blue-500" />
              <span>正在连线：</span>
              <span class="font-medium">{{ gameStore.getClueById(dragLine.fromClueId!)?.icon }} {{ gameStore.getClueById(dragLine.fromClueId!)?.title }}</span>
              <span class="text-blue-400">→</span>
              <span v-if="dragLine.targetClueId" class="font-medium text-blue-800">
                {{ gameStore.getClueById(dragLine.targetClueId)?.icon }} {{ gameStore.getClueById(dragLine.targetClueId)?.title }}
              </span>
              <span v-else class="text-blue-400">请拖向目标线索</span>
            </div>

            <div
              ref="boardRef"
              class="deduction-board relative min-h-[420px] overflow-auto select-none"
              @pointermove="onBoardPointerMove"
            >
              <svg
                class="absolute inset-0 w-full h-full pointer-events-none"
                style="z-index: 1;"
              >
                <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#6B8E6B" opacity="0.6" />
                  </marker>
                  <marker id="arrowhead-conflict" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#e11d48" opacity="0.6" />
                  </marker>
                </defs>

                <path
                  v-for="conn in discoveredConnections"
                  :key="'line-' + conn.id"
                  :d="getConnectionLinePath(getCluePos(conn.fromClueId), getCluePos(conn.toClueId))"
                  :stroke="isConnectionConflicted(conn.id) ? '#e11d48' : '#6B8E6B'"
                  :stroke-width="conn.isKeyConnection ? 2.5 : 1.5"
                  fill="none"
                  :stroke-dasharray="isConnectionConflicted(conn.id) ? '6,3' : 'none'"
                  :marker-end="isConnectionConflicted(conn.id) ? 'url(#arrowhead-conflict)' : 'url(#arrowhead)'"
                  opacity="0.7"
                />

                <g
                  v-for="conn in discoveredConnections"
                  :key="'badge-' + conn.id"
                  class="cursor-pointer pointer-events-auto"
                  @click="showConclusion = conn; conclusionScore = gameStore.computeConnectionScore(conn.id)"
                >
                  <circle
                    :cx="(getCluePos(conn.fromClueId).x + getCluePos(conn.toClueId).x) / 2 + 80"
                    :cy="(getCluePos(conn.fromClueId).y + getCluePos(conn.toClueId).y) / 2 + 40"
                    r="12"
                    :fill="isConnectionConflicted(conn.id) ? '#fff1f2' : '#f0fdf4'"
                    :stroke="isConnectionConflicted(conn.id) ? '#e11d48' : '#6B8E6B'"
                    stroke-width="1.5"
                  />
                  <text
                    :x="(getCluePos(conn.fromClueId).x + getCluePos(conn.toClueId).x) / 2 + 80"
                    :y="(getCluePos(conn.fromClueId).y + getCluePos(conn.toClueId).y) / 2 + 44"
                    text-anchor="middle"
                    :fill="isConnectionConflicted(conn.id) ? '#e11d48' : '#059669'"
                    font-size="10"
                    font-weight="bold"
                  >
                    {{ gameStore.computeConnectionScore(conn.id)?.totalScore ?? '' }}
                  </text>
                </g>

                <path
                  v-if="dragLine.isDragging"
                  :d="`M ${dragLine.fromX} ${dragLine.fromY} L ${dragLine.toX} ${dragLine.toY}`"
                  stroke="#d97706"
                  stroke-width="2"
                  stroke-dasharray="8,4"
                  fill="none"
                  opacity="0.8"
                />
                <circle
                  v-if="dragLine.isDragging"
                  :cx="dragLine.toX"
                  :cy="dragLine.toY"
                  r="6"
                  :fill="dragLine.targetClueId ? '#059669' : '#d97706'"
                  opacity="0.8"
                />
              </svg>

              <div
                v-for="clue in filteredClues"
                :key="'node-' + clue.id"
                :data-clue-node="clue.id"
                :class="[
                  'board-clue-node absolute w-40 cursor-grab active:cursor-grabbing transition-shadow duration-200',
                  isClueInConflict(clue.id) && 'ring-2 ring-rose-400 ring-offset-2',
                  dragLine.targetClueId === clue.id && 'ring-2 ring-emerald-400 ring-offset-2'
                ]"
                :style="{
                  left: getCluePos(clue.id).x + 'px',
                  top: getCluePos(clue.id).y + 'px',
                  zIndex: draggingClueId === clue.id ? 20 : 2
                }"
                @pointerdown="startDragClue(clue.id, $event)"
              >
                <div class="p-3 rounded-xl border-2 bg-white/90 shadow-sm hover:shadow-md transition-shadow" :class="isClueInConflict(clue.id) ? 'border-rose-300' : 'border-stone-200/60'">
                  <div class="flex items-center gap-2 mb-1.5">
                    <span class="text-2xl">{{ clue.icon }}</span>
                    <div class="flex-1 min-w-0">
                      <h4 class="font-medium text-stone-800 text-xs font-serif truncate">{{ clue.title }}</h4>
                      <span
                        :class="['text-[9px] px-1.5 py-0.5 rounded-full border', categoryColors[clue.category]]"
                      >
                        {{ categoryLabels[clue.category] }}
                      </span>
                    </div>
                  </div>
                  <p class="text-[10px] text-stone-500 line-clamp-2 font-serif mb-2">
                    {{ clue.content }}
                  </p>
                  <div v-if="clue.tagIds.length" class="flex flex-wrap gap-0.5 mb-2">
                    <span
                      v-for="tid in clue.tagIds"
                      :key="tid"
                      class="px-1 py-0.5 rounded text-[8px] font-serif text-white"
                      :style="{ background: getTagById(tid)?.color || '#a8a29e' }"
                    >
                      {{ getTagById(tid)?.name || tid }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between pt-1.5 border-t border-stone-100">
                    <button
                      class="text-stone-300 hover:text-amber-600 transition-colors"
                      @click.stop="openNewNote(clue.id)"
                      title="添加笔记"
                    >
                      <Plus class="w-3 h-3" />
                    </button>
                    <div
                      class="w-6 h-6 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center cursor-crosshair hover:bg-amber-200 transition-colors"
                      title="从此处拖出连线"
                      @pointerdown.stop="startDragLine(clue.id, $event)"
                    >
                      <Link class="w-3 h-3 text-amber-600" />
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-if="filteredClues.length === 0 && allCollectedClues.length > 0"
                class="absolute inset-0 flex items-center justify-center text-stone-400"
              >
                <div class="text-center">
                  <div class="text-4xl mb-3">🔍</div>
                  <p class="font-serif text-sm">当前筛选条件下没有线索</p>
                  <button
                    class="mt-2 text-xs text-amber-600 hover:text-amber-800 font-serif underline"
                    @click="localKeyword = ''; localTagFilters = []"
                  >
                    清除筛选
                  </button>
                </div>
              </div>

              <div
                v-if="allCollectedClues.length === 0"
                class="absolute inset-0 flex items-center justify-center text-stone-400"
              >
                <div class="text-center">
                  <div class="text-5xl mb-4">🔍</div>
                  <p class="font-serif">还没有收集到线索</p>
                  <p class="text-sm mt-1">先去旧物那里探索吧</p>
                </div>
              </div>
            </div>
          </div>

          <div class="card-warm p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-serif font-bold text-stone-800 flex items-center gap-2">
                📝 推理笔记
              </h3>
              <div class="flex gap-1">
                <button
                  :class="[
                    'px-2 py-1 rounded text-xs transition-colors',
                    aggregationMode === 'list' ? 'bg-amber-100 text-amber-700' : 'text-stone-500 hover:bg-stone-100'
                  ]"
                  @click="aggregationMode = 'list'"
                >
                  列表
                </button>
                <button
                  :class="[
                    'px-2 py-1 rounded text-xs transition-colors',
                    aggregationMode === 'tag' ? 'bg-amber-100 text-amber-700' : 'text-stone-500 hover:bg-stone-100'
                  ]"
                  @click="aggregationMode = 'tag'"
                >
                  <FolderKanban class="w-3.5 h-3.5 inline" />
                  标签
                </button>
                <button
                  class="ml-2 flex items-center gap-1 px-2 py-1 text-xs text-amber-700 bg-amber-50 rounded hover:bg-amber-100 transition-colors font-serif"
                  @click="openNewNote()"
                >
                  <Plus class="w-3 h-3" />
                  新建
                </button>
              </div>
            </div>

            <div class="space-y-2 max-h-80 overflow-y-auto pr-1">
              <template v-if="aggregationMode === 'list'">
                <div
                  v-if="notesForCommission.length === 0"
                  class="text-center py-6 text-stone-400"
                >
                  <div class="text-2xl mb-1">📄</div>
                  <p class="text-xs font-serif">还没有推理笔记。点击线索卡片右上角 + 创建</p>
                </div>
                <div
                  v-for="note in notesForCommission"
                  :key="'note-' + note.id"
                  :class="['p-3 rounded-lg bg-white/80 border border-stone-200/40', note.isImportant && 'ring-1 ring-amber-300/50 bg-amber-50/30']"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1">
                        <Star v-if="note.isImportant" class="w-3 h-3 text-amber-500 fill-amber-400" />
                        <p class="text-xs font-medium text-stone-700 font-serif">{{ note.title }}</p>
                        <span v-if="note.clueId" class="text-[10px] text-stone-400 ml-1">
                          · {{ gameStore.getClueById(note.clueId)?.icon }} {{ gameStore.getClueById(note.clueId)?.title }}
                        </span>
                      </div>
                      <p v-if="note.content" class="text-[11px] text-stone-500 mt-1 line-clamp-2 font-serif">{{ note.content }}</p>
                      <div v-if="note.tagIds.length" class="flex flex-wrap gap-1 mt-1.5">
                        <span
                          v-for="tid in note.tagIds"
                          :key="tid"
                          class="px-1.5 py-0.5 rounded text-[9px] font-serif text-white"
                          :style="{ background: getTagById(tid)?.color || '#a8a29e' }"
                        >
                          {{ getTagById(tid)?.name || tid }}
                        </span>
                      </div>
                    </div>
                    <div class="flex gap-0.5 flex-shrink-0">
                      <button class="text-stone-400 hover:text-amber-600" @click="openEditNote(note)">
                        <Edit2 class="w-3 h-3" />
                      </button>
                      <button class="text-stone-400 hover:text-rose-500" @click="removeNote(note.id)">
                        <Trash2 class="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </template>

              <template v-else>
                <div v-if="notesByTag.length === 0" class="text-center py-6 text-stone-400">
                  <div class="text-2xl mb-1">📁</div>
                  <p class="text-xs font-serif">还没有笔记或笔记未加标签</p>
                </div>
                <div
                  v-for="group in notesByTag"
                  :key="'group-' + group.tagId"
                  class="p-3 rounded-xl bg-stone-50/80 border border-stone-200/40"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <span
                      class="px-2 py-0.5 rounded-full text-[11px] font-serif text-white font-medium"
                      :style="{ background: group.tag?.color || '#a8a29e' }"
                    >
                      {{ group.tag?.name || group.tagId }}
                    </span>
                    <span class="text-[10px] text-stone-400 font-serif">
                      {{ group.notes.length }} 笔记 · {{ group.clueCount }} 线索
                    </span>
                  </div>
                  <div class="space-y-1.5">
                    <div
                      v-for="note in group.notes"
                      :key="'agg-' + note.id"
                      :class="['p-2 rounded bg-white/80 border border-stone-100', note.isImportant && 'ring-1 ring-amber-300/50']"
                    >
                      <div class="flex items-start justify-between gap-1">
                        <div class="flex-1 min-w-0">
                          <p class="text-[11px] font-medium text-stone-700 font-serif flex items-center gap-1">
                            <Star v-if="note.isImportant" class="w-3 h-3 text-amber-500 fill-amber-400" />
                            {{ note.title }}
                          </p>
                          <p v-if="note.content" class="text-[10px] text-stone-500 mt-0.5 line-clamp-1 font-serif">{{ note.content }}</p>
                        </div>
                        <div class="flex gap-0.5 flex-shrink-0">
                          <button class="text-stone-400 hover:text-amber-600" @click="openEditNote(note)">
                            <Edit2 class="w-3 h-3" />
                          </button>
                          <button class="text-stone-400 hover:text-rose-500" @click="removeNote(note.id)">
                            <Trash2 class="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <div class="flex justify-end">
            <div class="flex flex-col items-end gap-2">
              <div v-if="!repairUnlockProgress.unlocked" class="flex items-center gap-2 text-sm text-stone-500 bg-stone-100 px-4 py-2 rounded-lg">
                <Lock class="w-4 h-4" />
                <span>{{ repairUnlockProgress.description }}</span>
              </div>
              <button
                :class="[
                  'flex items-center gap-2 px-6 py-3 rounded-xl font-serif font-medium transition-all duration-300',
                  repairUnlockProgress.unlocked
                    ? 'btn-primary'
                    : 'bg-stone-200/60 text-stone-400 cursor-not-allowed rounded-xl'
                ]"
                :disabled="!repairUnlockProgress.unlocked"
                @click="goToRepair"
              >
                <span>开始修复</span>
                <ChevronRight class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex gap-1 bg-stone-100/70 rounded-lg p-1">
            <button
              :class="['flex-1 px-2 py-1.5 rounded-md text-xs font-serif transition-all', sidebarTab === 'connections' ? 'bg-white shadow-sm text-amber-700 font-medium' : 'text-stone-500 hover:text-stone-700']"
              @click="sidebarTab = 'connections'"
            >
              <Link class="w-3 h-3 inline" /> 关联
            </button>
            <button
              :class="['flex-1 px-2 py-1.5 rounded-md text-xs font-serif transition-all relative', sidebarTab === 'conflicts' ? 'bg-white shadow-sm text-rose-700 font-medium' : 'text-stone-500 hover:text-stone-700']"
              @click="sidebarTab = 'conflicts'"
            >
              <AlertTriangle class="w-3 h-3 inline" /> 冲突
              <span v-if="activeConflicts.length" class="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px]">
                {{ activeConflicts.length }}
              </span>
            </button>
            <button
              :class="['flex-1 px-2 py-1.5 rounded-md text-xs font-serif transition-all', sidebarTab === 'archive' ? 'bg-white shadow-sm text-emerald-700 font-medium' : 'text-stone-500 hover:text-stone-700']"
              @click="sidebarTab = 'archive'"
            >
              <Archive class="w-3 h-3 inline" /> 归档
            </button>
          </div>

          <div v-if="sidebarTab === 'connections'" class="card-warm p-5 sticky top-8">
            <div class="flex items-center gap-2 mb-4">
              <Link class="w-5 h-5 text-green-600" />
              <h3 class="font-serif font-bold text-stone-800">已发现的关联</h3>
            </div>

            <div class="space-y-4 max-h-[500px] overflow-y-auto">
              <div
                v-for="conn in discoveredConnections"
                :key="conn.id"
                :class="[
                  'p-4 rounded-xl border cursor-pointer transition-all',
                  isConnectionConflicted(conn.id)
                    ? 'bg-rose-50/60 border-rose-200/50'
                    : 'bg-green-50/60 border-green-200/50'
                ]"
                @click="showConclusion = conn; conclusionScore = gameStore.computeConnectionScore(conn.id)"
              >
                <div class="flex items-center gap-2 mb-2">
                  <Sparkles v-if="!isConnectionConflicted(conn.id)" class="w-4 h-4 text-green-600" />
                  <AlertTriangle v-else class="w-4 h-4 text-rose-500" />
                  <span class="text-xs font-medium font-serif" :class="isConnectionConflicted(conn.id) ? 'text-rose-700' : 'text-green-700'">
                    {{ isConnectionConflicted(conn.id) ? '关联冲突' : '关联发现' }}
                  </span>
                  <span
                    v-if="conn.isKeyConnection"
                    class="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-serif"
                  >
                    关键
                  </span>
                </div>
                <div class="flex items-center gap-1 mb-2 text-[10px] font-serif text-stone-500 flex-wrap">
                  <span class="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                    {{ gameStore.getClueById(conn.fromClueId)?.icon }} {{ gameStore.getClueById(conn.fromClueId)?.title }}
                  </span>
                  <span class="text-green-400">⟶</span>
                  <span class="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                    {{ gameStore.getClueById(conn.toClueId)?.icon }} {{ gameStore.getClueById(conn.toClueId)?.title }}
                  </span>
                </div>
                <p class="text-sm text-stone-700 leading-relaxed mb-3 font-serif">
                  {{ conn.conclusion }}
                </p>
                <div class="flex items-center gap-2">
                  <span
                    :class="['text-[10px] px-2 py-0.5 rounded-full border font-serif', getScoreLevelBg(gameStore.computeConnectionScore(conn.id)?.level ?? 'weak')]"
                  >
                    {{ gameStore.getConnectionScoreLevelLabel(gameStore.computeConnectionScore(conn.id)?.level ?? 'weak') }}
                    {{ gameStore.computeConnectionScore(conn.id)?.totalScore ?? 0 }}分
                  </span>
                </div>
              </div>

              <div
                v-if="discoveredConnections.length === 0"
                class="text-center py-8 text-stone-400"
              >
                <div class="text-3xl mb-2">🔗</div>
                <p class="text-sm font-serif">还没有发现关联</p>
                <p class="text-xs mt-1">从线索卡片底部的 <Link class="w-3 h-3 inline" /> 按钮拖出连线</p>
              </div>
            </div>

            <div class="mt-4 pt-4 border-t border-amber-200/20">
              <div class="flex items-center justify-between text-xs text-stone-500 mb-2 font-serif">
                <span>
                  线索 {{ unifiedProgress?.clueProgress.collected ?? 0 }}/{{ unifiedProgress?.clueProgress.total ?? 0 }}
                  ｜笔记 {{ unifiedProgress?.noteProgress.count ?? 0 }}
                </span>
                <span>{{ unifiedProgress?.overallPercentage ?? 0 }}%</span>
              </div>
              <div class="h-2 bg-stone-200/60 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{
                    width: `${unifiedProgress?.overallPercentage ?? 0}%`,
                    background: 'linear-gradient(90deg, var(--color-green), #4ade80)'
                  }"
                />
              </div>
              <p v-if="!repairUnlockProgress.unlocked" class="text-xs text-stone-400 text-center mt-2 font-serif">
                {{ repairUnlockProgress.description }} 即可开始修复
              </p>
              <p v-else class="text-xs text-green-600 text-center mt-2 font-serif">
                修复已解锁，可以开始修复了！
              </p>
            </div>
          </div>

          <div v-if="sidebarTab === 'conflicts'" class="card-warm p-5">
            <div class="flex items-center gap-2 mb-4">
              <AlertTriangle class="w-5 h-5 text-rose-500" />
              <h3 class="font-serif font-bold text-stone-800">冲突检测</h3>
            </div>

            <div class="space-y-3 max-h-[500px] overflow-y-auto">
              <div
                v-for="conflict in activeConflicts"
                :key="conflict.id"
                class="p-4 bg-rose-50/60 rounded-xl border border-rose-200/50"
              >
                <div class="flex items-center gap-2 mb-2">
                  <AlertTriangle class="w-4 h-4 text-rose-500" />
                  <span class="text-xs font-medium text-rose-700 font-serif">
                    {{ getConflictTypeLabel(conflict.type) }}
                  </span>
                  <span
                    :class="[
                      'text-[9px] px-1.5 py-0.5 rounded-full font-serif',
                      conflict.severity === 'error'
                        ? 'bg-rose-200 text-rose-800'
                        : 'bg-amber-100 text-amber-700'
                    ]"
                  >
                    {{ conflict.severity === 'error' ? '严重' : '警告' }}
                  </span>
                </div>
                <p class="text-xs text-stone-700 font-serif mb-2">{{ conflict.description }}</p>
                <div class="flex items-center gap-1 mb-2 text-[10px] font-serif">
                  <span class="px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded">
                    {{ gameStore.getClueById(conflict.connectionA.fromClueId)?.title }} ↔ {{ gameStore.getClueById(conflict.connectionA.toClueId)?.title }}
                  </span>
                  <span class="text-rose-400">⟷</span>
                  <span class="px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded">
                    {{ gameStore.getClueById(conflict.connectionB.fromClueId)?.title }} ↔ {{ gameStore.getClueById(conflict.connectionB.toClueId)?.title }}
                  </span>
                </div>
                <div class="p-2 bg-amber-50 rounded-lg border border-amber-200/40">
                  <p class="text-[10px] text-amber-700 font-serif">💡 {{ conflict.hint }}</p>
                </div>
              </div>

              <div
                v-if="activeConflicts.length === 0"
                class="text-center py-8 text-stone-400"
              >
                <div class="text-3xl mb-2">✅</div>
                <p class="text-sm font-serif">暂无推理冲突</p>
                <p class="text-xs mt-1">所有已发现的关联逻辑自洽</p>
              </div>
            </div>
          </div>

          <div v-if="sidebarTab === 'archive'" class="card-warm p-5">
            <div class="flex items-center gap-2 mb-4">
              <Archive class="w-5 h-5 text-emerald-600" />
              <h3 class="font-serif font-bold text-stone-800">推理归档</h3>
            </div>

            <div v-if="progressArchive" class="mb-4 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/40">
              <div class="grid grid-cols-2 gap-2 text-center">
                <div class="p-2 bg-white/80 rounded-lg">
                  <div class="text-lg font-bold text-emerald-700 font-serif">{{ progressArchive.totalConclusionCount }}</div>
                  <div class="text-[10px] text-stone-500 font-serif">已归档结论</div>
                </div>
                <div class="p-2 bg-white/80 rounded-lg">
                  <div class="text-lg font-bold text-amber-700 font-serif">{{ progressArchive.averageScore }}</div>
                  <div class="text-[10px] text-stone-500 font-serif">平均评分</div>
                </div>
                <div class="p-2 bg-white/80 rounded-lg">
                  <div class="text-lg font-bold text-rose-600 font-serif">{{ progressArchive.keyConclusionCount }}</div>
                  <div class="text-[10px] text-stone-500 font-serif">关键结论</div>
                </div>
                <div class="p-2 bg-white/80 rounded-lg">
                  <div class="text-lg font-bold" :class="progressArchive.conflictCount > 0 ? 'text-rose-600' : 'text-emerald-600'">
                    {{ progressArchive.conflictCount }}
                  </div>
                  <div class="text-[10px] text-stone-500 font-serif">冲突数</div>
                </div>
              </div>
            </div>

            <div class="space-y-3 max-h-[400px] overflow-y-auto">
              <div
                v-for="concl in archivedConclusions"
                :key="concl.id"
                class="p-3 bg-white/80 rounded-xl border border-stone-200/40"
              >
                <div class="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    :class="['text-[10px] px-2 py-0.5 rounded-full border font-serif', getScoreLevelBg(concl.score.level)]"
                  >
                    {{ gameStore.getConnectionScoreLevelLabel(concl.score.level) }}
                    {{ concl.score.totalScore }}分
                  </span>
                  <div class="flex items-center gap-1">
                    <Trophy v-if="concl.isKeyConclusion" class="w-3 h-3 text-amber-500" />
                    <span class="text-[9px] text-stone-400 font-serif">#{{ concl.order }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-1 mb-1 text-[10px] font-serif text-stone-500">
                  <span>{{ gameStore.getClueById(concl.fromClueId)?.icon }} {{ gameStore.getClueById(concl.fromClueId)?.title }}</span>
                  <span class="text-emerald-400">→</span>
                  <span>{{ gameStore.getClueById(concl.toClueId)?.icon }} {{ gameStore.getClueById(concl.toClueId)?.title }}</span>
                </div>
                <p class="text-[11px] text-stone-600 font-serif line-clamp-2">{{ concl.conclusionText }}</p>
                <div v-if="concl.score.sharedTagNames.length" class="flex flex-wrap gap-1 mt-1.5">
                  <span
                    v-for="tagName in concl.score.sharedTagNames"
                    :key="tagName"
                    class="px-1 py-0.5 rounded text-[8px] bg-amber-50 text-amber-600 font-serif"
                  >
                    {{ tagName }}
                  </span>
                </div>
              </div>

              <div
                v-if="archivedConclusions.length === 0"
                class="text-center py-8 text-stone-400"
              >
                <div class="text-3xl mb-2">📦</div>
                <p class="text-sm font-serif">暂无归档结论</p>
                <p class="text-xs mt-1">发现关联后将自动归档</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="validationToast"
          class="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div
            :class="[
              'px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in-up',
              validationToast.type === 'error'
                ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white'
                : 'bg-gradient-to-r from-amber-400 to-amber-500 text-white'
            ]"
          >
            <component :is="getErrorIcon(validationToast.result.errorCode)" class="w-5 h-5" />
            <div class="text-sm font-serif">
              {{ validationToast.result.errorMessage }}
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="conflictToast"
          class="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div class="px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white animate-fade-in-up">
            <AlertTriangle class="w-5 h-5" />
            <div class="text-sm font-serif">
              推理冲突：{{ conflictToast.description }}
            </div>
            <button class="ml-2 text-white/80 hover:text-white" @click="conflictToast = null">
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showConclusion"
          class="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          @click.self="closeConclusion"
        >
          <div class="card-warm p-6 max-w-md w-full shadow-2xl animate-scale-in">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-2">
                <Sparkles class="w-6 h-6 text-amber-500" />
                <h3 class="text-lg font-serif font-bold text-stone-800">
                  发现关联！
                </h3>
              </div>
              <button
                class="text-stone-400 hover:text-stone-600 p-1"
                @click="closeConclusion"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="flex items-center gap-2 mb-4 text-sm text-stone-500 font-serif flex-wrap">
              <span class="px-2 py-1 bg-amber-100/80 rounded text-amber-700">
                {{ gameStore.getClueById(showConclusion.fromClueId)?.title }}
              </span>
              <span class="text-amber-400">⟶</span>
              <span class="px-2 py-1 bg-amber-100/80 rounded text-amber-700">
                {{ gameStore.getClueById(showConclusion.toClueId)?.title }}
              </span>
            </div>

            <div class="note-paper p-4 rounded-r-lg mb-4">
              <p class="text-stone-700 leading-relaxed font-serif">
                {{ showConclusion.conclusion }}
              </p>
            </div>

            <div v-if="conclusionScore" class="mb-4 p-3 rounded-xl border" :class="getScoreLevelBg(conclusionScore.level)">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-serif font-medium">关联评分</span>
                <span class="text-sm font-bold font-serif">{{ conclusionScore.totalScore }} 分</span>
              </div>
              <div class="flex gap-3 text-[10px] font-serif">
                <span>基础 {{ conclusionScore.baseScore }}</span>
                <span>标签 +{{ conclusionScore.tagOverlapScore }}</span>
                <span v-if="conclusionScore.categoryMatchScore">分类 +{{ conclusionScore.categoryMatchScore }}</span>
                <span v-if="conclusionScore.narrativeWeightScore">叙事 +{{ conclusionScore.narrativeWeightScore }}</span>
                <span v-if="conclusionScore.conflictPenaltyScore" class="text-rose-600">冲突 -{{ conclusionScore.conflictPenaltyScore }}</span>
              </div>
              <div v-if="conclusionScore.sharedTagNames.length" class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="tagName in conclusionScore.sharedTagNames"
                  :key="tagName"
                  class="px-1.5 py-0.5 rounded text-[9px] bg-white/60 font-serif"
                >
                  {{ tagName }}
                </span>
              </div>
            </div>

            <div class="bg-green-50/60 rounded-xl p-4 border border-green-200/40">
              <div class="flex items-center gap-2 text-green-700 font-medium mb-2 font-serif">
                <Lightbulb class="w-4 h-4" />
                <span>修复提示</span>
              </div>
              <p class="text-sm text-stone-600 font-serif">{{ showConclusion.repairHint }}</p>
            </div>

            <button
              class="btn-primary w-full mt-6"
              @click="closeConclusion"
            >
              继续推理
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="noteModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          @click.self="noteModalOpen = false"
        >
          <div class="card-warm p-6 max-w-lg w-full shadow-2xl animate-scale-in">
            <div class="flex items-start justify-between mb-4">
              <h3 class="text-lg font-serif font-bold text-stone-800">
                {{ editingNote ? '编辑推理笔记' : (activeClueForNote ? '为线索新建笔记' : '新建推理笔记') }}
              </h3>
              <button class="text-stone-400 hover:text-stone-600 p-1" @click="noteModalOpen = false">
                <X class="w-5 h-5" />
              </button>
            </div>

            <div v-if="activeClueForNote" class="mb-4 p-3 bg-amber-50/60 rounded-xl border border-amber-200/40">
              <p class="text-xs text-amber-700 font-serif">
                💡 关联线索：<span class="font-medium">{{ gameStore.getClueById(activeClueForNote)?.icon }} {{ gameStore.getClueById(activeClueForNote)?.title }}</span>
              </p>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-serif text-stone-600 mb-1.5">标题</label>
                <input
                  v-model="noteForm.title"
                  type="text"
                  class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200/60 bg-white/80 focus:border-amber-300 focus:ring-2 focus:ring-amber-200/40 outline-none transition-all font-serif"
                />
              </div>
              <div>
                <label class="block text-xs font-serif text-stone-600 mb-1.5">内容</label>
                <textarea
                  v-model="noteForm.content"
                  rows="5"
                  class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200/60 bg-white/80 focus:border-amber-300 focus:ring-2 focus:ring-amber-200/40 outline-none transition-all font-serif resize-none"
                  placeholder="写下你的推理过程..."
                />
              </div>
              <div>
                <label class="block text-xs font-serif text-stone-600 mb-1.5">标签</label>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="tag in allAvailableTags"
                    :key="tag.id"
                    :class="[
                      'px-2 py-1 rounded-full text-xs font-serif border transition-all',
                      noteForm.tagIds.includes(tag.id)
                        ? 'border-transparent text-white shadow-sm'
                        : 'bg-white/60 border-stone-200/60 hover:border-stone-300'
                    ]"
                    :style="noteForm.tagIds.includes(tag.id) ? { background: tag.color } : { color: tag.color }"
                    @click="toggleNoteTag(tag.id)"
                  >
                    {{ tag.name }}
                  </button>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <label class="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    v-model="noteForm.isImportant"
                    type="checkbox"
                    class="w-4 h-4 rounded text-amber-600 focus:ring-amber-400/40 border-stone-300"
                  />
                  <span class="text-xs text-stone-600 font-serif flex items-center gap-1">
                    <Star class="w-3.5 h-3.5" :class="noteForm.isImportant ? 'text-amber-500 fill-amber-400' : 'text-stone-400'" />
                    标记为重要
                  </span>
                </label>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button class="btn-secondary flex-1" @click="noteModalOpen = false">
                取消
              </button>
              <button class="btn-primary flex-1" @click="saveNote">
                {{ editingNote ? '保存修改' : '创建笔记' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.deduction-board {
  background-color: #f8f5f0;
  background-image:
    radial-gradient(circle, #d4b896 1px, transparent 1px);
  background-size: 24px 24px;
  border: 2px solid rgba(139, 105, 20, 0.12);
  border-radius: 0.75rem;
}

.board-clue-node {
  transition: box-shadow 0.2s ease;
}

.board-clue-node:active {
  z-index: 20 !important;
}
</style>
