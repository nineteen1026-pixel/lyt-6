<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Play, RotateCcw, DoorOpen, ScrollText, Map, Save, Trash2, Clock, BookOpen, AlertTriangle, Shield, X, Camera, History, Film, ChevronRight, Eye, Coins, Users } from 'lucide-vue-next'
import { useGameStore } from '../stores/game'
import type { SaveSlotInfo, SnapshotInfo, EndingReplay } from '../types'
import { REPUTATION_LEVELS } from '../types'

const router = useRouter()
const gameStore = useGameStore()

const hasSave = computed(() => gameStore.hasSave)
const progress = computed(() => gameStore.completionProgress)
const saveSlots = computed(() => gameStore.saveSlots)
const lastActiveSlotId = computed(() => gameStore.lastActiveSlotId)
const endingReplays = computed(() => gameStore.allEndingReplays)

const showroomStats = computed(() => gameStore.getShowroomStats())
const reputationConfig = computed(() => {
  const level = showroomStats.value.reputationLevel
  return REPUTATION_LEVELS.find(l => l.level === level) || REPUTATION_LEVELS[0]
})

const showSlotSelector = ref(false)
const slotSelectorMode = ref<'continue' | 'new'>('continue')
const selectedSlot = ref<SaveSlotInfo | null>(null)
const showConfirmDialog = ref(false)
const confirmType = ref<'overwrite' | 'delete' | 'recover'>('overwrite')
const showRecoveryTip = ref(false)
const recoverySlotId = ref<string | null>(null)
const recoveryError = ref('')

const showSnapshotPanel = ref(false)
const snapshotSlotId = ref<string | null>(null)
const snapshotList = ref<SnapshotInfo[]>([])
const showEndingReplayPanel = ref(false)

const dustParticles = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  style: {
    '--dust-x': `${Math.random() * 100}%`,
    '--dust-delay': `${Math.random() * 8}s`,
    '--dust-duration': `${6 + Math.random() * 8}s`,
    '--dust-size': `${2 + Math.random() * 3}px`
  }
}))

onMounted(() => {
  gameStore.refreshSaveSlots()
})

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function navigateToGame() {
  const step = gameStore.state.currentStep
  const commissionId = gameStore.state.currentCommissionId
  
  switch (step) {
    case 'item':
      router.push(commissionId ? `/commission/${commissionId}` : '/commissions')
      break
    case 'deduction':
      router.push(commissionId ? `/deduction/${commissionId}` : '/commissions')
      break
    case 'repair':
      router.push(commissionId ? `/repair/${commissionId}` : '/commissions')
      break
    case 'ending':
      router.push(commissionId ? `/commission/${commissionId}` : '/commissions')
      break
    default:
      router.push('/commissions')
  }
}

function continueGame() {
  const latestSlot = lastActiveSlotId.value
  if (latestSlot) {
    const result = gameStore.loadFromSlot(latestSlot)
    if (result.success === true) {
      navigateToGame()
      return
    }
    if (result.success === false && result.recoverable && result.backupAvailable) {
      recoverySlotId.value = latestSlot
      recoveryError.value = result.error
      showRecoveryTip.value = true
      return
    }
    openSlotSelector('continue')
  } else {
    openSlotSelector('continue')
  }
}

function selectSlotDirect(slot: SaveSlotInfo) {
  const result = gameStore.loadFromSlot(slot.slotId)
  if (result.success === true) {
    navigateToGame()
    return
  }
  if (result.success === false && result.recoverable && result.backupAvailable) {
    recoverySlotId.value = slot.slotId
    recoveryError.value = result.error
    showRecoveryTip.value = true
  }
}

function openSlotSelector(mode: 'continue' | 'new') {
  slotSelectorMode.value = mode
  selectedSlot.value = null
  showSlotSelector.value = true
  gameStore.refreshSaveSlots()
}

function closeSlotSelector() {
  showSlotSelector.value = false
  selectedSlot.value = null
}

function selectSlot(slot: SaveSlotInfo) {
  selectedSlot.value = slot
  
  if (slotSelectorMode.value === 'continue') {
    if (!slot.savedAt) return
    
    const result = gameStore.loadFromSlot(slot.slotId)
    if (result.success === true) {
      closeSlotSelector()
      navigateToGame()
      return
    }
    if (result.success === false && result.recoverable && result.backupAvailable) {
      closeSlotSelector()
      recoverySlotId.value = slot.slotId
      recoveryError.value = result.error
      showRecoveryTip.value = true
    }
  }
}

function handleNewGameSlot(slot: SaveSlotInfo) {
  if (slot.savedAt) {
    selectedSlot.value = slot
    confirmType.value = 'overwrite'
    showConfirmDialog.value = true
  } else {
    startNewGameInSlot(slot.slotId)
  }
}

function confirmOverwrite() {
  if (selectedSlot.value && slotSelectorMode.value === 'new') {
    startNewGameInSlot(selectedSlot.value.slotId)
  }
  showConfirmDialog.value = false
}

function startNewGameInSlot(slotId: string) {
  gameStore.startNewGameInSlot(slotId)
  closeSlotSelector()
  router.push('/commissions')
}

function startNewGame() {
  if (hasSave.value) {
    openSlotSelector('new')
  } else {
    gameStore.startNewGame()
    router.push('/commissions')
  }
}

function deleteSlot(slot: SaveSlotInfo) {
  selectedSlot.value = slot
  confirmType.value = 'delete'
  showConfirmDialog.value = true
}

function confirmDelete() {
  if (selectedSlot.value) {
    gameStore.deleteSlot(selectedSlot.value.slotId)
    gameStore.refreshSaveSlots()
  }
  showConfirmDialog.value = false
  selectedSlot.value = null
}

function confirmRecovery() {
  if (recoverySlotId.value) {
    const result = gameStore.restoreBackup(recoverySlotId.value)
    if (result.success) {
      showRecoveryTip.value = false
      recoverySlotId.value = null
      navigateToGame()
    }
  }
}

function cancelRecovery() {
  showRecoveryTip.value = false
  recoverySlotId.value = null
}

function goToGallery() {
  router.push('/gallery')
}

function goToRoadmap() {
  router.push('/roadmap')
}

function resetGame() {
  if (confirm('确定要清除所有存档数据吗？此操作不可恢复。')) {
    gameStore.clearAllData()
    gameStore.refreshSaveSlots()
  }
}

function openSnapshotPanel(slotId: string) {
  snapshotSlotId.value = slotId
  snapshotList.value = gameStore.getSlotSnapshots(slotId)
  showSnapshotPanel.value = true
}

function closeSnapshotPanel() {
  showSnapshotPanel.value = false
  snapshotSlotId.value = null
  snapshotList.value = []
}

function loadSnapshot(snapshotId: string) {
  if (!snapshotSlotId.value) return
  const result = gameStore.loadFromSnapshot(snapshotSlotId.value, snapshotId)
  if (result.success) {
    closeSnapshotPanel()
    closeSlotSelector()
    navigateToGame()
  }
}

function removeSnapshot(snapshotId: string) {
  if (!snapshotSlotId.value) return
  gameStore.removeSnapshot(snapshotSlotId.value, snapshotId)
  snapshotList.value = gameStore.getSlotSnapshots(snapshotSlotId.value!)
}

function openEndingReplayPanel() {
  showEndingReplayPanel.value = true
}

function closeEndingReplayPanel() {
  showEndingReplayPanel.value = false
}

function replayEnding(replay: EndingReplay) {
  router.push(`/ending/${replay.commissionId}/${replay.endingType}`)
  closeEndingReplayPanel()
}

const triggerLabelMap: Record<string, { label: string; icon: string; color: string }> = {
  manual: { label: '手动', icon: '📸', color: 'text-amber-600' },
  chapter_complete: { label: '完成', icon: '✅', color: 'text-emerald-600' },
  ending_unlocked: { label: '结局', icon: '🎬', color: 'text-purple-600' },
  milestone: { label: '里程碑', icon: '🏆', color: 'text-blue-600' },
  auto_chapter_start: { label: '开始', icon: '🚀', color: 'text-cyan-600' }
}
</script>

<template>
  <div class="home-page min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden paper-texture">
    <div class="absolute inset-0 pointer-events-none">
      <div class="ambient-glow glow-top" />
      <div class="ambient-glow glow-bottom" />
    </div>

    <div
      v-for="dust in dustParticles"
      :key="dust.id"
      class="dust-mote"
      :style="dust.style"
    />

    <div class="relative z-10 text-center max-w-lg w-full">
      <div class="shop-icon mb-4">
        <span class="text-8xl block animate-float-gentle glow-warm rounded-full">🏪</span>
      </div>

      <h1 class="text-5xl md:text-6xl font-display font-bold text-stone-800 mb-3 tracking-widest text-shadow-warm">
        记忆修复店
      </h1>
      <p class="text-stone-500 text-lg mb-3 font-serif italic tracking-wide">
        "每一件旧物，都藏着一段被遗忘的故事"
      </p>
      <div class="divider-ornament mb-10" />

      <div class="space-y-4 mb-8">
        <button
          v-if="hasSave"
          class="btn-primary w-full text-lg py-4"
          @click="continueGame"
        >
          <Play class="w-5 h-5" />
          <span>继续修复</span>
          <span class="opacity-70 text-sm ml-1">
            ({{ progress.completed }}/{{ progress.total }} 已完成)
          </span>
        </button>

        <button
          :class="hasSave ? 'btn-secondary w-full text-lg py-4' : 'btn-primary w-full text-lg py-4'"
          @click="startNewGame"
        >
          <DoorOpen class="w-5 h-5" />
          <span>{{ hasSave ? '重新开始' : '踏入店铺' }}</span>
        </button>

        <div class="grid grid-cols-2 gap-3">
          <button
            class="btn-secondary py-3"
            @click="goToGallery"
          >
            <ScrollText class="w-4 h-4" />
            <span class="text-sm">陈列室</span>
          </button>
          <button
            class="btn-secondary py-3"
            @click="goToRoadmap"
          >
            <Map class="w-4 h-4" />
            <span class="text-sm">路线图</span>
          </button>
        </div>

        <button
          v-if="endingReplays.length > 0"
          class="btn-secondary w-full py-3"
          @click="openEndingReplayPanel"
        >
          <Film class="w-4 h-4" />
          <span class="text-sm">结局回放</span>
          <span class="opacity-70 text-xs ml-1">({{ endingReplays.length }})</span>
        </button>
      </div>

      <div v-if="hasSave" class="mb-6">
        <div class="text-stone-400 text-xs mb-3 flex items-center justify-center gap-1">
          <Save class="w-3 h-3" />
          <span>存档位</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div
            v-for="slot in saveSlots"
            :key="slot.slotId"
            :class="[
              'slot-mini-card',
              { 'has-data': slot.savedAt },
              { 'is-active': lastActiveSlotId === slot.slotId }
            ]"
            @click="slot.savedAt ? selectSlotDirect(slot) : startNewGameInSlot(slot.slotId)"
          >
            <div class="slot-mini-name">{{ slot.slotName }}</div>
            <div v-if="slot.savedAt" class="slot-mini-info">
              <div class="text-xs text-stone-500 truncate">{{ slot.chapterProgress }}</div>
              <div class="flex items-center gap-1 mt-1">
                <span class="text-xs text-amber-600 font-medium">{{ slot.completedCount }}/{{ slot.totalCount }}</span>
                <button
                  v-if="slot.snapshotCount > 0"
                  class="snapshot-badge"
                  @click.stop="openSnapshotPanel(slot.slotId)"
                  :title="`${slot.snapshotCount} 个快照`"
                >
                  <Camera class="w-3 h-3" />
                  <span>{{ slot.snapshotCount }}</span>
                </button>
              </div>
            </div>
            <div v-else class="slot-mini-empty">
              <span class="text-stone-400 text-xs">空</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="hasSave" class="text-center mb-6">
        <button
          class="text-stone-400 text-sm hover:text-rose-500 transition-colors inline-flex items-center gap-1"
          @click="resetGame"
        >
          <RotateCcw class="w-3 h-3" />
          <span>清除存档</span>
        </button>
      </div>

      <div v-if="hasSave && showroomStats.exhibitCount > 0" class="mb-6 mx-auto max-w-sm">
        <div class="bg-gradient-to-br from-amber-50/90 to-orange-50/90 backdrop-blur-sm rounded-xl p-4 border border-amber-200/60 shadow-sm">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-lg">{{ reputationConfig.icon }}</span>
            <span class="text-sm font-medium text-amber-800">陈列室概况</span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div>
              <div class="flex items-center justify-center gap-1 text-amber-600">
                <Coins class="w-3.5 h-3.5" />
                <span class="text-lg font-bold">{{ showroomStats.totalRevenue }}</span>
              </div>
              <div class="text-[10px] text-stone-500">灵石</div>
            </div>
            <div>
              <div class="flex items-center justify-center gap-1 text-blue-600">
                <Users class="w-3.5 h-3.5" />
                <span class="text-lg font-bold">{{ showroomStats.totalVisitors }}</span>
              </div>
              <div class="text-[10px] text-stone-500">访客</div>
            </div>
            <div>
              <div class="text-lg font-bold" :class="reputationConfig.color">{{ reputationConfig.label }}</div>
              <div class="text-[10px] text-stone-500">口碑</div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8 text-stone-400 text-xs space-y-2">
        <p class="tip" style="--tip-delay: 0.2s">✦ 点击旧物上的发光区域寻找线索</p>
        <p class="tip" style="--tip-delay: 0.5s">✦ 将线索关联起来发现真相</p>
        <p class="tip" style="--tip-delay: 0.8s">✦ 你的选择将决定记忆的结局</p>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showSlotSelector" class="modal-overlay" @click.self="closeSlotSelector">
          <div class="modal-content max-w-2xl w-full mx-4">
            <div class="modal-header">
              <h2 class="text-xl font-bold text-stone-800">
                {{ slotSelectorMode === 'continue' ? '选择存档' : '选择存档位' }}
              </h2>
              <button class="modal-close-btn" @click="closeSlotSelector">
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="modal-body">
              <div class="grid grid-cols-3 gap-3">
                <div
                  v-for="slot in saveSlots"
                  :key="slot.slotId"
                  :class="[
                    'save-slot-card',
                    { 'has-data': slot.savedAt },
                    { 'is-selected': selectedSlot?.slotId === slot.slotId }
                  ]"
                  @click="slotSelectorMode === 'continue' ? selectSlot(slot) : handleNewGameSlot(slot)"
                >
                  <div class="flex items-center justify-between mb-2">
                    <span class="slot-name font-medium text-stone-700">{{ slot.slotName }}</span>
                    <Save v-if="slot.savedAt" class="w-4 h-4 text-amber-500" />
                    <span v-else class="text-xs text-stone-400">空</span>
                  </div>

                  <div v-if="slot.savedAt" class="slot-info">
                    <div class="flex items-center gap-1 text-xs text-stone-500 mb-1">
                      <Clock class="w-3 h-3" />
                      <span>{{ formatDate(slot.savedAt) }}</span>
                    </div>
                    <div class="flex items-center gap-1 text-xs text-stone-500 mb-1">
                      <BookOpen class="w-3 h-3" />
                      <span>{{ slot.completedCount }}/{{ slot.totalCount }} 委托</span>
                    </div>
                    <div class="text-xs text-stone-400 truncate">{{ slot.chapterProgress }}</div>
                    <div class="flex items-center gap-2 mt-2">
                      <div v-if="slot.hasBackup" class="flex items-center gap-1 text-xs text-emerald-600">
                        <Shield class="w-3 h-3" />
                        <span>备份</span>
                      </div>
                      <button
                        v-if="slot.snapshotCount > 0"
                        class="snapshot-badge"
                        @click.stop="openSnapshotPanel(slot.slotId)"
                      >
                        <Camera class="w-3 h-3" />
                        <span>{{ slot.snapshotCount }} 快照</span>
                      </button>
                    </div>
                  </div>
                  <div v-else class="slot-empty">
                    <span class="text-stone-400 text-sm">暂无存档</span>
                  </div>

                  <div v-if="slot.savedAt && slotSelectorMode === 'new'" class="slot-delete">
                    <button
                      class="delete-btn"
                      @click.stop="deleteSlot(slot)"
                    >
                      <Trash2 class="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-secondary" @click="closeSlotSelector">取消</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showSnapshotPanel" class="modal-overlay" @click.self="closeSnapshotPanel">
          <div class="modal-content max-w-xl w-full mx-4">
            <div class="modal-header">
              <h2 class="text-lg font-bold text-stone-800 flex items-center gap-2">
                <Camera class="w-5 h-5 text-amber-500" />
                <span>关键节点快照</span>
              </h2>
              <button class="modal-close-btn" @click="closeSnapshotPanel">
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="modal-body">
              <div v-if="snapshotList.length === 0" class="text-center py-8">
                <Camera class="w-10 h-10 text-stone-300 mx-auto mb-3" />
                <p class="text-stone-400 text-sm">暂无快照</p>
                <p class="text-stone-400 text-xs mt-1">在关键节点会自动创建快照</p>
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="snap in snapshotList"
                  :key="snap.id"
                  class="snapshot-item"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-sm">{{ triggerLabelMap[snap.trigger]?.icon ?? '📌' }}</span>
                      <span class="text-sm font-medium text-stone-700 truncate">{{ snap.label }}</span>
                      <span :class="['text-xs px-1.5 py-0.5 rounded-full', triggerLabelMap[snap.trigger]?.color ?? 'text-stone-500', 'bg-stone-100']">
                        {{ triggerLabelMap[snap.trigger]?.label ?? snap.trigger }}
                      </span>
                    </div>
                    <div class="flex items-center gap-3 text-xs text-stone-400">
                      <span class="flex items-center gap-1">
                        <Clock class="w-3 h-3" />
                        {{ formatDate(snap.createdAt) }}
                      </span>
                      <span>{{ snap.completedCount }} 委托完成</span>
                      <span class="truncate">{{ snap.chapterProgress }}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 ml-2 flex-shrink-0">
                    <button
                      class="snapshot-action-btn"
                      title="回溯到此节点"
                      @click="loadSnapshot(snap.id)"
                    >
                      <History class="w-4 h-4" />
                    </button>
                    <button
                      class="snapshot-action-btn delete"
                      title="删除快照"
                      @click="removeSnapshot(snap.id)"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-secondary" @click="closeSnapshotPanel">关闭</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showEndingReplayPanel" class="modal-overlay" @click.self="closeEndingReplayPanel">
          <div class="modal-content max-w-xl w-full mx-4">
            <div class="modal-header">
              <h2 class="text-lg font-bold text-stone-800 flex items-center gap-2">
                <Film class="w-5 h-5 text-purple-500" />
                <span>结局回放</span>
              </h2>
              <button class="modal-close-btn" @click="closeEndingReplayPanel">
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="modal-body">
              <div v-if="endingReplays.length === 0" class="text-center py-8">
                <Film class="w-10 h-10 text-stone-300 mx-auto mb-3" />
                <p class="text-stone-400 text-sm">暂无解锁的结局</p>
                <p class="text-stone-400 text-xs mt-1">完成委托修复后，结局将在这里回放</p>
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="replay in endingReplays"
                  :key="`${replay.endingId}-${replay.fromSlotId}`"
                  class="ending-replay-item"
                  @click="replayEnding(replay)"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-lg">
                        {{ replay.endingType === 'good' ? '✨' : replay.endingType === 'neutral' ? '🌿' : '🌧️' }}
                      </span>
                      <div class="min-w-0">
                        <div class="text-sm font-medium text-stone-700 truncate">
                          {{ gameStore.getEndingById(replay.endingId)?.title ?? '未知结局' }}
                        </div>
                        <div class="text-xs text-stone-400">
                          {{ gameStore.getCommissionById(replay.commissionId)?.title ?? '' }}
                          ·
                          {{ replay.endingType === 'good' ? '完美' : replay.endingType === 'neutral' ? '温暖' : '遗憾' }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 ml-2 text-stone-400">
                    <Eye class="w-4 h-4" />
                    <ChevronRight class="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-secondary" @click="closeEndingReplayPanel">关闭</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showConfirmDialog" class="modal-overlay" @click.self="showConfirmDialog = false">
          <div class="modal-content max-w-sm w-full mx-4">
            <div class="modal-header">
              <h2 class="text-lg font-bold text-stone-800 flex items-center gap-2">
                <AlertTriangle v-if="confirmType === 'overwrite' || confirmType === 'delete'" class="w-5 h-5 text-amber-500" />
                <span>
                  {{ confirmType === 'overwrite' ? '覆盖存档' : confirmType === 'delete' ? '删除存档' : '恢复备份' }}
                </span>
              </h2>
            </div>

            <div class="modal-body">
              <p class="text-stone-600 text-sm leading-relaxed">
                <template v-if="confirmType === 'overwrite'">
                  确定要覆盖「{{ selectedSlot?.slotName }}」吗？<br>
                  原有的存档数据将被覆盖，但会保留一份自动备份。
                </template>
                <template v-else-if="confirmType === 'delete'">
                  确定要删除「{{ selectedSlot?.slotName }}」吗？<br>
                  此操作将同时删除主存档、备份和快照，且无法恢复。
                </template>
                <template v-else>
                  确定要从备份恢复吗？
                </template>
              </p>
            </div>

            <div class="modal-footer gap-2">
              <button class="btn-secondary" @click="showConfirmDialog = false">取消</button>
              <button
                :class="confirmType === 'delete' ? 'btn-danger' : 'btn-primary'"
                @click="confirmType === 'overwrite' ? confirmOverwrite() : confirmDelete()"
              >
                {{ confirmType === 'overwrite' ? '确定覆盖' : confirmType === 'delete' ? '确认删除' : '确认恢复' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showRecoveryTip" class="modal-overlay" @click.self="cancelRecovery">
          <div class="modal-content max-w-sm w-full mx-4">
            <div class="modal-header">
              <h2 class="text-lg font-bold text-stone-800 flex items-center gap-2">
                <AlertTriangle class="w-5 h-5 text-amber-500" />
                <span>存档异常</span>
              </h2>
            </div>

            <div class="modal-body">
              <p class="text-stone-600 text-sm leading-relaxed mb-3">
                {{ recoveryError }}
              </p>
              <p class="text-emerald-600 text-sm flex items-center gap-1">
                <Shield class="w-4 h-4" />
                检测到可用备份，可以恢复到上一次正常保存的状态。
              </p>
            </div>

            <div class="modal-footer gap-2">
              <button class="btn-secondary" @click="cancelRecovery">暂不恢复</button>
              <button class="btn-primary" @click="confirmRecovery">从备份恢复</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.ambient-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}

.glow-top {
  top: -10%;
  left: 30%;
  width: 40%;
  height: 35%;
  background: radial-gradient(ellipse, rgba(212, 175, 55, 0.12) 0%, transparent 70%);
}

.glow-bottom {
  bottom: -5%;
  right: 20%;
  width: 35%;
  height: 25%;
  background: radial-gradient(ellipse, rgba(139, 105, 20, 0.08) 0%, transparent 70%);
}

.dust-mote {
  position: absolute;
  bottom: -5%;
  left: var(--dust-x);
  width: var(--dust-size);
  height: var(--dust-size);
  background: radial-gradient(circle, rgba(212, 175, 55, 0.6), rgba(212, 175, 55, 0.1));
  border-radius: 50%;
  animation: dust-float var(--dust-duration) var(--dust-delay) linear infinite;
  pointer-events: none;
}

.shop-icon {
  filter: drop-shadow(0 4px 12px rgba(212, 175, 55, 0.25));
}

.tip {
  animation: fade-in-up 0.6s ease-out both;
  animation-delay: var(--tip-delay);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: linear-gradient(135deg, #fefcf7 0%, #faf5eb 100%);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(212, 175, 55, 0.2);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.2);
  background: linear-gradient(to right, rgba(212, 175, 55, 0.05), transparent);
}

.modal-close-btn {
  color: #78716c;
  padding: 4px;
  border-radius: 8px;
  transition: all 0.2s;
}

.modal-close-btn:hover {
  color: #44403c;
  background: rgba(0, 0, 0, 0.05);
}

.modal-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid rgba(212, 175, 55, 0.2);
  background: rgba(250, 245, 235, 0.5);
}

.save-slot-card {
  position: relative;
  padding: 16px;
  border-radius: 12px;
  border: 2px solid rgba(212, 175, 55, 0.2);
  background: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.25s ease;
  min-height: 120px;
  display: flex;
  flex-direction: column;
}

.save-slot-card:hover {
  border-color: rgba(212, 175, 55, 0.5);
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(212, 175, 55, 0.15);
}

.save-slot-card.is-selected {
  border-color: #d4af37;
  background: rgba(212, 175, 55, 0.08);
  box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.2);
}

.save-slot-card:not(.has-data) {
  border-style: dashed;
  opacity: 0.7;
}

.save-slot-card:not(.has-data):hover {
  opacity: 1;
}

.slot-info {
  flex: 1;
}

.slot-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slot-delete {
  position: absolute;
  top: 8px;
  right: 8px;
}

.delete-btn {
  opacity: 0;
  color: #ef4444;
  padding: 4px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.1);
  transition: all 0.2s;
}

.save-slot-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.slot-mini-card {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1.5px solid rgba(212, 175, 55, 0.15);
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.slot-mini-card:hover {
  border-color: rgba(212, 175, 55, 0.4);
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.1);
}

.slot-mini-card.is-active {
  border-color: #d4af37;
  background: rgba(212, 175, 55, 0.06);
  box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.15);
}

.slot-mini-card:not(.has-data) {
  border-style: dashed;
  opacity: 0.5;
}

.slot-mini-card:not(.has-data):hover {
  opacity: 0.8;
}

.slot-mini-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: #57534e;
  margin-bottom: 4px;
}

.slot-mini-info {
  min-height: 28px;
}

.slot-mini-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
}

.snapshot-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(212, 175, 55, 0.1);
  color: #92400e;
  font-size: 0.65rem;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
}

.snapshot-badge:hover {
  background: rgba(212, 175, 55, 0.2);
}

.snapshot-item {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(212, 175, 55, 0.15);
  background: rgba(255, 255, 255, 0.6);
  transition: all 0.2s ease;
}

.snapshot-item:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(212, 175, 55, 0.3);
}

.snapshot-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: #78716c;
  transition: all 0.2s;
}

.snapshot-action-btn:hover {
  background: rgba(212, 175, 55, 0.15);
  color: #92400e;
}

.snapshot-action-btn.delete:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.ending-replay-item {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(139, 105, 20, 0.1);
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.ending-replay-item:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(212, 175, 55, 0.3);
  transform: translateX(4px);
}

.btn-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.75rem;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
}

.btn-danger:active {
  transform: translateY(0);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-content,
.modal-fade-leave-to .modal-content {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
</style>
