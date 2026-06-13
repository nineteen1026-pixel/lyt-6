<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Link, Lightbulb, ChevronRight, Sparkles, X, Lock, Plus, Edit2, Trash2, Star, FolderKanban, Search, AlertCircle, RefreshCw, Repeat, AlertTriangle } from 'lucide-vue-next'
import { useGameStore } from '../stores/game'
import type { Clue, ClueConnection, ConnectionValidationResult, Tag, Note } from '../types'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const selectedClue1 = ref<Clue | null>(null)
const selectedClue2 = ref<Clue | null>(null)
const showConclusion = ref<ClueConnection | null>(null)
const validationToast = ref<{ result: ConnectionValidationResult; type: 'error' | 'info' } | null>(null)

const localKeyword = ref('')
const localTagFilters = ref<string[]>([])
const noteModalOpen = ref(false)
const editingNote = ref<Note | null>(null)
const activeClueForNote = ref<string | null>(null)
const aggregationMode = ref<'list' | 'tag'>('list')
const noteForm = ref({
  title: '',
  content: '',
  tagIds: [] as string[],
  isImportant: false
})

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

watch(localKeyword, (v) => gameStore.setSearchKeyword(v))
watch(localTagFilters, (v) => gameStore.setActiveTagFilters(v), { deep: true })

function showValidationToast(result: ConnectionValidationResult, type: 'error' | 'info' = 'error') {
  validationToast.value = { result, type }
  setTimeout(() => { validationToast.value = null }, 2800)
}

function selectClue(clue: Clue) {
  if (selectedClue1.value?.id === clue.id) {
    selectedClue1.value = null
    return
  }
  if (selectedClue2.value?.id === clue.id) {
    selectedClue2.value = null
    return
  }

  if (!selectedClue1.value) {
    selectedClue1.value = clue
  } else if (!selectedClue2.value) {
    selectedClue2.value = clue
    checkConnection()
  } else {
    selectedClue1.value = clue
    selectedClue2.value = null
  }
}

function checkConnection() {
  if (!selectedClue1.value || !selectedClue2.value) return
  const result = gameStore.validateConnection(selectedClue1.value.id, selectedClue2.value.id)

  if (!result.isValid) {
    showValidationToast(result, 'error')
    setTimeout(() => {
      selectedClue1.value = null
      selectedClue2.value = null
    }, 1200)
    return
  }

  if (result.connectionId) {
    const conn = gameStore.getConnectionById(result.connectionId)
    if (conn) {
      if (!gameStore.state.discoveredConnections.includes(conn.id)) {
        gameStore.discoverConnection(conn.id)
      }
      showConclusion.value = conn
    }
  }
}

function isClueSelected(clueId: string): boolean {
  return selectedClue1.value?.id === clueId || selectedClue2.value?.id === clueId
}

function closeConclusion() {
  showConclusion.value = null
  selectedClue1.value = null
  selectedClue2.value = null
}

function goBack() { router.push(`/commission/${commissionId.value}`) }

function goToRepair() {
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

onMounted(() => {
  gameStore.loadSavedGame()
  if (!commission.value) {
    router.push('/commissions')
  }
  localKeyword.value = gameStore.state.searchKeyword
  localTagFilters.value = [...gameStore.state.activeTagFilters]
})
</script>

<template>
  <div class="min-h-screen py-8 px-4 paper-texture">
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
          <div class="hidden sm:flex items-center gap-2 px-4 py-2 bg-stone-100/70 rounded-lg text-sm text-stone-600 font-serif">
            <span>综合进度</span>
            <span class="font-bold text-amber-700">{{ unifiedProgress?.overallPercentage ?? 0 }}%</span>
          </div>
          <div class="text-sm text-stone-500 font-serif">
            已发现关联：{{ progress.discovered }}/{{ progress.total }}
          </div>
        </div>
      </div>

      <div class="text-center mb-8">
        <h1 class="text-2xl font-display font-bold text-stone-800 mb-2 text-shadow-warm">
          线索推理板
        </h1>
        <p class="text-stone-500 text-sm font-serif">
          尝试将相关的线索连接起来，发现隐藏的真相
        </p>
        <div class="divider-ornament mt-3" />
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="card-warm p-5 min-h-96">
            <div class="flex flex-wrap items-center gap-2 mb-4">
              <Lightbulb class="w-5 h-5 text-amber-500" />
              <h3 class="font-serif font-bold text-stone-800">收集到的线索</h3>
              <span class="text-xs text-stone-400">（点击两个线索尝试关联）</span>

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
              v-if="selectedClue1 || selectedClue2"
              class="mb-4 p-3 bg-amber-50/60 rounded-xl border border-amber-200/40 text-xs font-serif text-amber-800"
            >
              <div class="flex items-center gap-2">
                <Sparkles class="w-4 h-4 text-amber-500" />
                <span>
                  已选：
                  <span v-if="selectedClue1" class="font-medium bg-amber-100 px-2 py-0.5 rounded">{{ selectedClue1.icon }} {{ selectedClue1.title }}</span>
                  <span v-if="!selectedClue1" class="text-amber-400">线索 1</span>
                  <span class="mx-2 text-amber-400">+</span>
                  <span v-if="selectedClue2" class="font-medium bg-amber-100 px-2 py-0.5 rounded">{{ selectedClue2.icon }} {{ selectedClue2.title }}</span>
                  <span v-else class="text-amber-400">线索 2（请选择）</span>
                </span>
                <button
                  v-if="selectedClue1 || selectedClue2"
                  class="ml-auto text-amber-500 hover:text-amber-700 text-xs"
                  @click="selectedClue1 = null; selectedClue2 = null"
                >
                  清除选择
                </button>
              </div>
            </div>

            <div class="grid sm:grid-cols-2 gap-4">
              <div
                v-for="clue in filteredClues"
                :key="clue.id"
                :class="[
                  'p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 relative',
                  isClueSelected(clue.id)
                    ? 'border-amber-500 bg-amber-50 shadow-lg scale-[1.02] z-10'
                    : 'border-stone-200/60 bg-white/80 hover:border-amber-300/60 hover:shadow-md'
                ]"
                @click="selectClue(clue)"
              >
                <div class="flex items-start gap-3">
                  <span class="text-3xl flex-shrink-0">{{ clue.icon }}</span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 class="font-medium text-stone-800 text-sm font-serif">{{ clue.title }}</h4>
                      <span
                        :class="[
                          'text-[10px] px-2 py-0.5 rounded-full border',
                          categoryColors[clue.category]
                        ]"
                      >
                        {{ categoryLabels[clue.category] }}
                      </span>
                    </div>
                    <p class="text-xs text-stone-500 line-clamp-2 font-serif">
                      {{ clue.content }}
                    </p>
                    <div v-if="clue.tagIds.length" class="flex flex-wrap gap-1 mt-2">
                      <span
                        v-for="tid in clue.tagIds"
                        :key="tid"
                        class="px-1.5 py-0.5 rounded text-[9px] font-serif text-white"
                        :style="{ background: getTagById(tid)?.color || '#a8a29e' }"
                      >
                        {{ getTagById(tid)?.name || tid }}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  class="absolute top-2 right-2 text-stone-300 hover:text-amber-600 transition-colors"
                  @click.stop="openNewNote(clue.id)"
                  title="为这个线索添加笔记"
                >
                  <Plus class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div
              v-if="filteredClues.length === 0 && allCollectedClues.length > 0"
              class="text-center py-10 text-stone-400"
            >
              <div class="text-4xl mb-3">🔍</div>
              <p class="font-serif text-sm">当前筛选条件下没有线索</p>
              <button
                class="mt-2 text-xs text-amber-600 hover:text-amber-800 font-serif underline"
                @click="localKeyword = ''; localTagFilters = []"
              >
                清除筛选
              </button>
            </div>

            <div
              v-if="allCollectedClues.length === 0"
              class="text-center py-16 text-stone-400"
            >
              <div class="text-5xl mb-4">🔍</div>
              <p class="font-serif">还没有收集到线索</p>
              <p class="text-sm mt-1">先去旧物那里探索吧</p>
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

        <div>
          <div class="card-warm p-5 sticky top-8">
            <div class="flex items-center gap-2 mb-4">
              <Link class="w-5 h-5 text-green-600" />
              <h3 class="font-serif font-bold text-stone-800">已发现的关联</h3>
            </div>

            <div class="space-y-4 max-h-[500px] overflow-y-auto">
              <div
                v-for="conn in discoveredConnections"
                :key="conn.id"
                class="p-4 bg-green-50/60 rounded-xl border border-green-200/50"
              >
                <div class="flex items-center gap-2 mb-2">
                  <Sparkles class="w-4 h-4 text-green-600" />
                  <span class="text-xs font-medium text-green-700 font-serif">关联发现</span>
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
                <div class="pt-3 border-t border-green-200/40">
                  <div class="text-xs text-green-600 font-medium mb-1">💡 修复提示</div>
                  <p class="text-xs text-stone-600 font-serif">{{ conn.repairHint }}</p>
                </div>
              </div>

              <div
                v-if="discoveredConnections.length === 0"
                class="text-center py-8 text-stone-400"
              >
                <div class="text-3xl mb-2">🔗</div>
                <p class="text-sm font-serif">还没有发现关联</p>
                <p class="text-xs mt-1">试着把相关的线索连起来</p>
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
.animate-shake { animation: shake 0.3s ease-in-out; }
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
</style>
