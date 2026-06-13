<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Play, RotateCcw, DoorOpen, ScrollText, Map, Save, Trash2, Clock, BookOpen, AlertTriangle, Shield, X } from 'lucide-vue-next'
import { useGameStore } from '../stores/game'
import type { SaveSlotInfo } from '../types'

const router = useRouter()
const gameStore = useGameStore()

const hasSave = computed(() => gameStore.hasSave)
const progress = computed(() => gameStore.completionProgress)
const saveSlots = computed(() => gameStore.saveSlots)
const lastActiveSlotId = computed(() => gameStore.lastActiveSlotId)

const showSlotSelector = ref(false)
const slotSelectorMode = ref<'continue' | 'new'>('continue')
const selectedSlot = ref<SaveSlotInfo | null>(null)
const showConfirmDialog = ref(false)
const confirmType = ref<'overwrite' | 'delete' | 'recover'>('overwrite')
const showRecoveryTip = ref(false)
const recoverySlotId = ref<string | null>(null)
const recoveryError = ref('')

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
  if (lastActiveSlotId.value) {
    const result = gameStore.loadFromSlot(lastActiveSlotId.value)
    if (result.success === true) {
      navigateToGame()
      return
    }
    if (result.success === false && result.recoverable && result.backupAvailable) {
      recoverySlotId.value = lastActiveSlotId.value
      recoveryError.value = result.error
      showRecoveryTip.value = true
      return
    }
    openSlotSelector('continue')
  } else {
    openSlotSelector('continue')
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

        <button
          class="btn-secondary w-full text-lg py-4"
          @click="goToGallery"
        >
          <ScrollText class="w-5 h-5" />
          <span>历史陈列室</span>
        </button>

        <button
          class="btn-secondary w-full text-lg py-4"
          @click="goToRoadmap"
        >
          <Map class="w-5 h-5" />
          <span>修复路线图</span>
        </button>
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
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                    <div v-if="slot.hasBackup" class="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                      <Shield class="w-3 h-3" />
                      <span>有备份</span>
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
                  此操作将同时删除主存档和备份，且无法恢复。
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
