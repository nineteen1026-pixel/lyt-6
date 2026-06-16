<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Lightbulb, Search, ChevronRight, X, Lock, Plus, Edit2, Trash2, Star, FolderKanban } from 'lucide-vue-next'
import { useGameStore } from '../stores/game'
import { useDynamicDifficulty } from '../composables/useDynamicDifficulty'
import StoryDialogue from '../components/StoryDialogue.vue'
import DialogueHistoryPanel from '../components/DialogueHistoryPanel.vue'
import type { Hotspot, Tag, Note, DynamicDifficultyLevel } from '../types'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const selectedHotspot = ref<Hotspot | null>(null)
const foundClue = ref<{ id: string; title: string } | null>(null)
const localKeyword = ref('')
const localTagFilters = ref<string[]>([])
const noteModalOpen = ref(false)
const editingNote = ref<Note | null>(null)
const activeClueForNote = ref<string | null>(null)
const noteForm = ref({
  title: '',
  content: '',
  tagIds: [] as string[],
  isImportant: false
})
const aggregationMode = ref<'list' | 'tag'>('list')
const showHistoryPanel = ref(false)

const {
  difficultyContext,
  effectiveDifficulty,
  difficultyScore,
  visualParams,
  hotspotStyle: dynamicHotspotStyle,
  difficultyLabel,
  difficultyBreakdown,
  getHotspotHint,
  startPhaseTiming,
  endPhaseTiming,
  formatTime,
  startAutoRefresh
} = useDynamicDifficulty(() => commissionId.value || null)

function getHintForHotspot(hotspot: Hotspot): string {
  return getHotspotHint(hotspot)
}

const commissionId = computed(() => route.params.id as string)

const commission = computed(() => gameStore.getCommissionById(commissionId.value))
const item = computed(() => commission.value?.item)

const unifiedProgress = computed(() =>
  commissionId.value ? gameStore.getCommissionProgress(commissionId.value) : null
)

const discoveredHotspots = computed(() =>
  gameStore.state.collectedClues.filter(clueId => {
    const clue = gameStore.getClueById(clueId)
    return clue?.commissionId === commissionId.value
  })
)

const progress = computed(() => {
  if (!unifiedProgress.value) return { current: 0, total: 0, percentage: 0 }
  return {
    current: unifiedProgress.value.clueProgress.collected,
    total: unifiedProgress.value.clueProgress.total,
    percentage: unifiedProgress.value.clueProgress.percentage
  }
})

const deductionUnlockProgress = computed(() => {
  if (!commissionId.value) return { current: 0, required: 1, description: '', unlocked: false }
  const p = gameStore.getStepUnlockProgress(commissionId.value, 'deduction')
  return { ...p, unlocked: gameStore.canAccessStep(commissionId.value, 'deduction') }
})

const repairUnlockProgress = computed(() => {
  if (!commissionId.value) return { current: 0, required: 1, description: '', unlocked: false }
  const p = gameStore.getStepUnlockProgress(commissionId.value, 'repair')
  return { ...p, unlocked: gameStore.canAccessStep(commissionId.value, 'repair') }
})

const allAvailableTags = computed(() => gameStore.allTags)

const filteredClueResults = computed(() => {
  const results = gameStore.searchCluesByTagIds(localTagFilters.value)
  const kw = localKeyword.value.trim().toLowerCase()
  if (!kw) return results.filter(r => r.clue.commissionId === commissionId.value)
  return results.filter(r =>
    r.clue.commissionId === commissionId.value && (
      r.clue.title.toLowerCase().includes(kw) ||
      r.clue.content.toLowerCase().includes(kw)
    )
  )
})

const notesForCommission = computed(() =>
  commissionId.value ? gameStore.getNotesForCommission(commissionId.value) : []
)

const notesByTag = computed(() =>
  commissionId.value ? gameStore.aggregateNotesByTag(commissionId.value) : []
)

watch(localKeyword, (v) => gameStore.setSearchKeyword(v))
watch(localTagFilters, (v) => gameStore.setActiveTagFilters(v), { deep: true })

onMounted(() => {
  gameStore.loadSavedGame()
  if (!commission.value) {
    router.push('/commissions')
    return
  }
  if (!gameStore.state.currentCommissionId) {
    gameStore.selectCommission(commissionId.value)
  }
  localKeyword.value = gameStore.state.searchKeyword
  localTagFilters.value = [...gameStore.state.activeTagFilters]
  if (gameStore.hasDialogueForSession(commissionId.value, 'commission_intro')
      && !gameStore.hasCompletedDialogueForType(commissionId.value, 'commission_intro')) {
    gameStore.startDialogueSession(commissionId.value, 'commission_intro')
  }
  startPhaseTiming('item')
  startAutoRefresh(5000)
})

function isHotspotDiscovered(hotspot: Hotspot): boolean {
  if (!hotspot.clueId) return false
  return gameStore.state.collectedClues.includes(hotspot.clueId)
}

function handleHotspotClick(hotspot: Hotspot) {
  selectedHotspot.value = hotspot
  if (hotspot.clueId && !gameStore.state.collectedClues.includes(hotspot.clueId)) {
    gameStore.collectClue(hotspot.clueId)
    const clue = gameStore.getClueById(hotspot.clueId)
    if (clue) {
      foundClue.value = { id: clue.id, title: clue.title }
      setTimeout(() => { foundClue.value = null }, 2500)
    }
  }
}

function closeModal() { selectedHotspot.value = null }

function goBack() { router.push('/commissions') }

function goToDeduction() {
  gameStore.setCurrentStep('deduction')
  router.push(`/deduction/${commissionId.value}`)
}

function getHotspotStyle(hotspot: Hotspot) {
  const baseStyle = {
    left: `${hotspot.x}%`,
    top: `${hotspot.y}%`,
    width: `${hotspot.width}%`,
    height: `${hotspot.height}%`
  }
  if (isHotspotDiscovered(hotspot)) {
    return baseStyle
  }
  return {
    ...baseStyle,
    '--glowColor': visualParams.value.hotspotGlowColor,
    '--glowIntensity': visualParams.value.hotspotGlowIntensity,
    '--pulseSpeed': `${visualParams.value.hotspotPulseSpeed}s`,
    '--hintOpacity': visualParams.value.hintOpacity
  }
}

function getHotspotGlowStyle(hotspot: Hotspot) {
  if (isHotspotDiscovered(hotspot)) {
    return {}
  }
  const intensity = visualParams.value.hotspotGlowIntensity
  const color = visualParams.value.hotspotGlowColor
  return {
    boxShadow: `0 0 ${20 * intensity}px ${10 * intensity}px ${color}`,
    animationDuration: `${visualParams.value.hotspotPulseSpeed}s`
  }
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
  if (!noteForm.value.title.trim()) {
    noteForm.value.title = '未命名笔记'
  }
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

function handleDialogueEnd() {
}

function toggleHistoryPanel() {
  showHistoryPanel.value = !showHistoryPanel.value
}
</script>

<template>
  <div class="min-h-screen py-8 px-4 paper-texture">
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <button
          class="flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors font-serif"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5" />
          <span>返回委托列表</span>
        </button>
        <div class="flex items-center gap-2">
          <button
            class="p-2 text-stone-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="对话记录"
            @click="toggleHistoryPanel"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </button>
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
        </div>
      </div>

      <div class="text-center mb-6">
        <h1 class="text-2xl font-display font-bold text-stone-800 mb-1 text-shadow-warm">
          {{ commission?.title }}
        </h1>
        <p class="text-stone-500 text-sm font-serif">
          委托人：{{ commission?.clientAvatar }} {{ commission?.clientName }}
        </p>
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="card-warm p-6 relative overflow-hidden spotlight">
            <div class="absolute top-4 left-4 flex items-center gap-2 text-xs text-stone-500 bg-white/80 px-3 py-1.5 rounded-full backdrop-blur-sm z-10">
              <Search class="w-3 h-3" />
              <span>点击发光处检查细节</span>
            </div>

            <div class="relative aspect-[4/3] bg-gradient-to-br from-amber-50/50 to-stone-100/50 rounded-xl flex items-center justify-center mt-8 overflow-hidden">
              <div class="absolute inset-0" style="background: radial-gradient(ellipse at center, rgba(212, 175, 55, 0.1) 0%, transparent 60%);" />

              <div class="text-9xl relative z-10 animate-float-gentle filter drop-shadow-lg">
                {{ item?.image }}
              </div>

              <div
                v-for="hotspot in item?.hotspots"
                :key="hotspot.id"
                class="absolute cursor-pointer group"
                :style="getHotspotStyle(hotspot)"
                data-tutorial="hotspot"
                @click="handleHotspotClick(hotspot)"
              >
                <div
                  :class="[
                    'absolute inset-0 rounded-lg transition-all duration-300',
                    isHotspotDiscovered(hotspot)
                      ? 'bg-green-400/15 border-2 border-green-500/40'
                      : 'bg-amber-400/20 border-2 border-amber-400/60 group-hover:bg-amber-400/40'
                  ]"
                  :style="!isHotspotDiscovered(hotspot) ? {
                    animation: `pulse-soft ${visualParams.hotspotPulseSpeed}s ease-in-out infinite`,
                    boxShadow: `0 0 ${20 * visualParams.hotspotGlowIntensity}px ${8 * visualParams.hotspotGlowIntensity}px ${visualParams.hotspotGlowColor}`
                  } : {}"
                />
                <div
                  v-if="!isHotspotDiscovered(hotspot)"
                  class="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full"
                  :style="{
                    animation: `pulse-soft ${visualParams.hotspotPulseSpeed}s ease-in-out infinite`,
                    opacity: visualParams.hintOpacity
                  }"
                />
                <div
                  v-else
                  class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                >
                  <span class="text-white text-xs leading-none">✓</span>
                </div>
              </div>
            </div>

            <div class="mt-6">
              <h3 class="text-lg font-serif font-bold text-stone-800 mb-2">{{ item?.name }}</h3>
              <p class="text-stone-600 text-sm leading-relaxed font-serif">{{ item?.description }}</p>
            </div>

            <div class="mt-4 stitch-border">
              <div class="flex items-center justify-between text-xs text-stone-500 mb-2">
                <span class="font-serif">检视进度 · 综合</span>
                <span>
                  线索 {{ progress.current }}/{{ progress.total }} ·
                  连线 {{ unifiedProgress?.connectionProgress.discovered ?? 0 }}/{{ unifiedProgress?.connectionProgress.total ?? 0 }} ·
                  笔记 {{ unifiedProgress?.noteProgress.count ?? 0 }}
                </span>
              </div>
              <div class="h-2 bg-stone-200/60 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{
                    width: `${unifiedProgress?.overallPercentage ?? 0}%`,
                    background: 'linear-gradient(90deg, var(--color-gold-light), var(--color-primary))'
                  }"
                />
              </div>
            </div>
          </div>

          <div class="mt-6 flex justify-end">
            <div class="flex flex-col items-end gap-2">
              <div v-if="!deductionUnlockProgress.unlocked" class="flex items-center gap-2 text-sm text-stone-500 bg-stone-100 px-4 py-2 rounded-lg">
                <Lock class="w-4 h-4" />
                <span>{{ deductionUnlockProgress.description }}</span>
              </div>
              <button
                :class="[
                  'flex items-center gap-2 px-6 py-3 rounded-xl font-serif font-medium transition-all duration-300',
                  deductionUnlockProgress.unlocked
                    ? 'btn-primary'
                    : 'bg-stone-200/60 text-stone-400 cursor-not-allowed rounded-xl'
                ]"
                :disabled="!deductionUnlockProgress.unlocked"
                data-tutorial="go-deduction"
                @click="goToDeduction"
              >
                <span>前往推理板</span>
                <ChevronRight class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="card-warm p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-serif font-bold text-stone-800 flex items-center gap-2">
                <Search class="w-5 h-5 text-amber-500" />
                线索与笔记
              </h3>
              <div class="flex gap-1">
                <button
                  :class="[
                    'px-2 py-1 rounded text-xs transition-colors',
                    aggregationMode === 'list' ? 'bg-amber-100 text-amber-700' : 'text-stone-500 hover:bg-stone-100'
                  ]"
                  @click="aggregationMode = 'list'"
                >
                  <Lightbulb class="w-3.5 h-3.5 inline" />
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
              </div>
            </div>

            <div class="mb-4 space-y-3">
              <div class="relative">
                <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  v-model="localKeyword"
                  type="text"
                  placeholder="搜索线索关键词..."
                  class="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-200/60 bg-white/80 focus:border-amber-300 focus:ring-2 focus:ring-amber-200/40 outline-none transition-all font-serif"
                />
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="tag in allAvailableTags"
                  :key="tag.id"
                  :class="[
                    'px-2 py-1 rounded-full text-xs font-serif border transition-all',
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
            </div>

            <div class="flex items-center justify-between mb-3">
              <span class="text-xs text-stone-500 font-serif">
                已发现 {{ discoveredHotspots.length }} 条线索，{{ notesForCommission.length }} 条笔记
              </span>
              <button
                class="flex items-center gap-1 px-2 py-1 text-xs text-amber-700 bg-amber-50 rounded hover:bg-amber-100 transition-colors font-serif"
                @click="openNewNote()"
              >
                <Plus class="w-3 h-3" />
                新建笔记
              </button>
            </div>

            <div class="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              <template v-if="aggregationMode === 'list'">
                <div
                  v-for="result in filteredClueResults"
                  :key="'clue-' + result.clue.id"
                  class="p-3 note-paper rounded-r-lg"
                >
                  <div class="flex items-start gap-2">
                    <span class="text-lg">{{ result.clue.icon }}</span>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-start justify-between gap-2">
                        <h4 class="font-medium text-stone-800 text-sm font-serif">
                          {{ result.clue.title }}
                        </h4>
                        <button
                          class="text-stone-400 hover:text-amber-600 flex-shrink-0"
                          :title="`为「${result.clue.title}」添加笔记`"
                          @click="openNewNote(result.clue.id)"
                        >
                          <Plus class="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p class="text-xs text-stone-500 mt-1 font-serif leading-relaxed">
                        {{ result.clue.content }}
                      </p>
                      <div v-if="result.clue.tagIds.length" class="flex flex-wrap gap-1 mt-2">
                        <span
                          v-for="tid in result.clue.tagIds"
                          :key="tid"
                          class="px-1.5 py-0.5 rounded text-[10px] font-serif text-white"
                          :style="{ background: getTagById(tid)?.color || '#a8a29e' }"
                        >
                          {{ getTagById(tid)?.name || tid }}
                        </span>
                      </div>
                      <div v-if="gameStore.getNotesForClue(result.clue.id).length" class="mt-2 pt-2 border-t border-amber-200/30 space-y-1.5">
                        <div
                          v-for="note in gameStore.getNotesForClue(result.clue.id)"
                          :key="note.id"
                          :class="['p-2 rounded bg-white/60 border border-stone-100', note.isImportant && 'ring-1 ring-amber-300/50']"
                        >
                          <div class="flex items-start justify-between gap-1">
                            <p class="text-[11px] text-stone-700 font-medium font-serif flex items-center gap-1">
                              <Star v-if="note.isImportant" class="w-3 h-3 text-amber-500 fill-amber-400" />
                              {{ note.title }}
                            </p>
                            <div class="flex gap-0.5 flex-shrink-0">
                              <button class="text-stone-400 hover:text-amber-600" @click="openEditNote(note)">
                                <Edit2 class="w-3 h-3" />
                              </button>
                              <button class="text-stone-400 hover:text-rose-500" @click="removeNote(note.id)">
                                <Trash2 class="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p v-if="note.content" class="text-[11px] text-stone-500 mt-1 line-clamp-2 font-serif">{{ note.content }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  v-for="note in notesForCommission.filter(n => !n.clueId)"
                  :key="'note-' + note.id"
                  :class="['p-3 rounded-r-lg bg-white/80 border-l-4 border-stone-300', note.isImportant && 'ring-1 ring-amber-300/50']"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-medium text-stone-700 font-serif flex items-center gap-1">
                        <Star v-if="note.isImportant" class="w-3 h-3 text-amber-500 fill-amber-400" />
                        📝 {{ note.title }}
                      </p>
                      <p v-if="note.content" class="text-[11px] text-stone-500 mt-1 line-clamp-3 font-serif">{{ note.content }}</p>
                      <div v-if="note.tagIds.length" class="flex flex-wrap gap-1 mt-2">
                        <span
                          v-for="tid in note.tagIds"
                          :key="tid"
                          class="px-1.5 py-0.5 rounded text-[10px] font-serif text-white"
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
                  <div class="text-2xl mb-2">📁</div>
                  <p class="text-xs font-serif">还没有笔记。创建笔记时添加标签即可聚合。</p>
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
                      :key="'agg-note-' + note.id"
                      :class="['p-2 rounded bg-white/80 border border-stone-100', note.isImportant && 'ring-1 ring-amber-300/50']"
                    >
                      <div class="flex items-start justify-between gap-1">
                        <div class="flex-1 min-w-0">
                          <p class="text-[11px] font-medium text-stone-700 font-serif flex items-center gap-1">
                            <Star v-if="note.isImportant" class="w-3 h-3 text-amber-500 fill-amber-400" />
                            {{ note.title }}
                            <span v-if="note.clueId" class="text-[9px] text-stone-400">
                              · 线索「{{ gameStore.getClueById(note.clueId)?.title }}」
                            </span>
                          </p>
                          <p v-if="note.content" class="text-[10px] text-stone-500 mt-0.5 line-clamp-2 font-serif">{{ note.content }}</p>
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

              <div
                v-if="filteredClueResults.length === 0 && notesForCommission.length === 0"
                class="text-center py-8 text-stone-400"
              >
                <div class="text-3xl mb-2">🔍</div>
                <p class="text-sm font-serif">还没有发现线索</p>
                <p class="text-xs mt-1">点击物品上的发光区域探索</p>
              </div>
            </div>

            <div class="mt-4 pt-4 border-t border-amber-200/30">
              <p v-if="!deductionUnlockProgress.unlocked" class="text-xs text-stone-400 text-center font-serif">
                {{ deductionUnlockProgress.description }} 即可开始推理
              </p>
              <p v-else class="text-xs text-green-600 text-center font-serif">
                推理板已解锁，可以前往推理了！
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="foundClue"
          class="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div class="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in-up">
            <span class="text-2xl">💡</span>
            <div>
              <div class="text-sm opacity-80">发现新线索！</div>
              <div class="font-medium font-serif">{{ foundClue.title }}</div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="selectedHotspot"
          class="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          @click.self="closeModal"
        >
          <div class="card-warm p-6 max-w-md w-full shadow-2xl animate-scale-in">
            <div class="flex items-start justify-between mb-4">
              <h3 class="text-lg font-serif font-bold text-stone-800">{{ selectedHotspot.name }}</h3>
              <button class="text-stone-400 hover:text-stone-600 p-1" @click="closeModal">
                <X class="w-5 h-5" />
              </button>
            </div>
            <p class="text-stone-600 leading-relaxed font-serif">{{ getHintForHotspot(selectedHotspot) }}</p>
            <div v-if="selectedHotspot.clueId" class="mt-4 pt-4 border-t border-amber-200/30 flex items-center justify-between">
              <div class="flex items-center gap-2 text-green-600 font-serif">
                <span>✓</span>
                <span class="text-sm">已记录到线索笔记</span>
              </div>
              <button
                class="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded hover:bg-amber-100 transition-colors font-serif"
                @click="openNewNote(selectedHotspot.clueId!); closeModal()"
              >
                <Plus class="w-3 h-3" /> 添加笔记
              </button>
            </div>
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
                {{ editingNote ? '编辑笔记' : (activeClueForNote ? '为线索新建笔记' : '新建笔记') }}
              </h3>
              <button class="text-stone-400 hover:text-stone-600 p-1" @click="noteModalOpen = false">
                <X class="w-5 h-5" />
              </button>
            </div>

            <div v-if="activeClueForNote" class="mb-4 p-3 bg-amber-50/60 rounded-xl border border-amber-200/40">
              <p class="text-xs text-amber-700 font-serif">
                💡 关联线索：<span class="font-medium">{{ gameStore.getClueById(activeClueForNote)?.title }}</span>
              </p>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-serif text-stone-600 mb-1.5">标题</label>
                <input
                  v-model="noteForm.title"
                  type="text"
                  class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200/60 bg-white/80 focus:border-amber-300 focus:ring-2 focus:ring-amber-200/40 outline-none transition-all font-serif"
                  placeholder="笔记标题..."
                />
              </div>

              <div>
                <label class="block text-xs font-serif text-stone-600 mb-1.5">内容</label>
                <textarea
                  v-model="noteForm.content"
                  rows="5"
                  class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200/60 bg-white/80 focus:border-amber-300 focus:ring-2 focus:ring-amber-200/40 outline-none transition-all font-serif resize-none"
                  placeholder="写下你的思考、分析、猜想..."
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
              <button
                class="btn-secondary flex-1"
                @click="noteModalOpen = false"
              >
                取消
              </button>
              <button
                class="btn-primary flex-1"
                @click="saveNote"
              >
                {{ editingNote ? '保存修改' : '创建笔记' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <StoryDialogue
      :showHistoryToggle="true"
      @dialogueEnd="handleDialogueEnd"
      @toggleHistory="toggleHistoryPanel"
    />

    <DialogueHistoryPanel
      v-model="showHistoryPanel"
      :commissionId="commissionId"
    />
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
