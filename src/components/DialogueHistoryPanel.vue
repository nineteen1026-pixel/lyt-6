<template>
  <Teleport to="body">
    <Transition name="history-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[60] flex justify-end pointer-events-none"
      >
        <div
          class="absolute inset-0 bg-black/30 pointer-events-auto"
          @click="handleClose"
        ></div>

        <div
          class="relative w-full max-w-md h-full bg-stone-50 shadow-2xl pointer-events-auto flex flex-col overflow-hidden"
        >
          <div class="flex-shrink-0 px-6 py-5 bg-gradient-to-br from-stone-800 to-stone-900 text-white">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div>
                  <h2 class="text-xl font-bold">对话记录</h2>
                  <p class="text-xs text-stone-400 mt-0.5">按委托查看历史剧情</p>
                </div>
              </div>
              <button
                @click="handleClose"
                class="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-stone-300 hover:text-white"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              <button
                @click="selectedCommissionId = null"
                class="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                :class="selectedCommissionId === null
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-white/10 text-stone-300 hover:bg-white/20 hover:text-white'"
              >
                全部
              </button>
              <button
                v-for="commission in availableCommissions"
                :key="commission.id"
                @click="selectedCommissionId = commission.id"
                class="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                :class="selectedCommissionId === commission.id
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-white/10 text-stone-300 hover:bg-white/20 hover:text-white'"
              >
                {{ commission.title }}
              </button>
            </div>
          </div>

          <div class="flex-shrink-0 px-5 py-4 border-b border-stone-200 bg-white">
            <div class="relative">
              <svg
                class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              <input
                v-model="searchKeyword"
                type="text"
                placeholder="搜索对话内容..."
                class="w-full pl-11 pr-4 py-2.5 rounded-xl bg-stone-100 border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-5 py-4">
            <div v-if="filteredHistory.length === 0" class="flex flex-col items-center justify-center h-full text-center px-6">
              <div class="w-20 h-20 rounded-3xl bg-stone-100 flex items-center justify-center text-stone-300 text-4xl mb-5">
                💭
              </div>
              <p class="text-stone-500 font-medium mb-2">暂无对话记录</p>
              <p class="text-sm text-stone-400 leading-relaxed">
                {{ searchKeyword ? '没有匹配关键词的对话内容' : '开始游戏后，对话将自动记录在这里' }}
              </p>
            </div>

            <div v-else class="space-y-5">
              <div
                v-for="(group, commissionId) in groupedHistory"
                :key="commissionId"
                class="mb-6"
              >
                <div class="flex items-center gap-3 mb-4">
                  <div class="h-px flex-1 bg-stone-200"></div>
                  <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-stone-200 shadow-sm">
                    <span class="text-xs text-stone-500">{{ getCommissionName(commissionId) }}</span>
                    <span class="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      {{ group.length }} 条
                    </span>
                  </div>
                  <div class="h-px flex-1 bg-stone-200"></div>
                </div>

                <div class="space-y-4">
                  <div
                    v-for="entry in group"
                    :key="entry.id"
                    class="group"
                  >
                    <div
                      v-if="entry.choiceMade"
                      class="mb-2 flex justify-end"
                    >
                      <div class="max-w-[85%] px-4 py-2 rounded-2xl rounded-br-md bg-amber-50 border border-amber-200 text-right">
                        <div class="text-xs text-amber-600 font-medium mb-1">我的选择</div>
                        <div class="text-sm text-amber-900 leading-relaxed">{{ entry.choiceMade.choiceLabel }}</div>
                      </div>
                    </div>

                    <div
                      class="flex gap-3"
                      :class="isPlayerSide(entry.speaker) ? 'flex-row-reverse' : ''"
                    >
                      <div
                        class="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm border transition-all group-hover:scale-105"
                        :class="getSpeakerStyle(entry.speaker)"
                      >
                        {{ getSpeakerEmoji(entry.speaker) }}
                      </div>

                      <div
                        class="flex-1 min-w-0"
                        :class="isPlayerSide(entry.speaker) ? 'text-right' : ''"
                      >
                        <div class="flex items-center gap-2 mb-1.5" :class="isPlayerSide(entry.speaker) ? 'justify-end' : ''">
                          <span class="text-xs font-semibold" :class="getSpeakerNameColor(entry.speaker)">
                            {{ entry.speakerName || getSpeakerName(entry.speaker) }}
                          </span>
                          <span class="text-[10px] text-stone-400">{{ formatTime(entry.timestamp) }}</span>
                        </div>

                        <div
                          class="inline-block max-w-full px-4 py-3 rounded-2xl shadow-sm border"
                          :class="getBubbleStyle(entry.speaker, isPlayerSide(entry.speaker))"
                        >
                          <p
                            class="text-sm leading-relaxed whitespace-pre-wrap break-words"
                            :class="entry.speaker === 'narrator' || entry.speaker === 'inner_thought' ? 'italic text-stone-500' : 'text-stone-700'"
                          >
                            <mark
                              v-if="searchKeyword && hasMatch(entry.content)"
                              v-for="(part, idx) in highlightText(entry.content)"
                              :key="idx"
                              :class="part.highlight ? 'bg-yellow-200 text-yellow-900 rounded px-0.5' : ''"
                            >{{ part.text }}</mark>
                            <template v-else>{{ entry.content }}</template>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="filteredHistory.length > 0" class="flex-shrink-0 px-5 py-4 border-t border-stone-200 bg-white">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-sm text-stone-500">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <span>共 <span class="font-semibold text-stone-700">{{ filteredHistory.length }}</span> 条对话</span>
              </div>
              <button
                v-if="scrollContainerRef"
                @click="scrollToBottom"
                class="text-xs px-3 py-1.5 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
              >
                滚动到底部
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '../stores/game'
import type { DialogueHistoryEntry, DialogueCharacter } from '../types'
import { commissions } from '../data/gameData'

const props = defineProps<{
  modelValue: boolean
  commissionId?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const gameStore = useGameStore()
const searchKeyword = ref('')
const selectedCommissionId = ref<string | null>(props.commissionId || null)
const scrollContainerRef = ref<HTMLElement | null>(null)

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      selectedCommissionId.value = props.commissionId || null
      searchKeyword.value = ''
      setTimeout(scrollToBottom, 100)
    }
  }
)

const availableCommissions = computed(() => {
  return commissions.filter(c => 
    gameStore.getCommissionStatus(c.id) !== 'locked'
  )
})

const allHistory = computed<DialogueHistoryEntry[]>(() => {
  return [...gameStore.state.dialogueHistory].sort((a, b) => a.order - b.order)
})

const filteredByCommission = computed<DialogueHistoryEntry[]>(() => {
  if (!selectedCommissionId.value) return allHistory.value
  return allHistory.value.filter(h => h.commissionId === selectedCommissionId.value)
})

const filteredHistory = computed<DialogueHistoryEntry[]>(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return filteredByCommission.value
  return filteredByCommission.value.filter(h => {
    if (h.content.toLowerCase().includes(kw)) return true
    if (h.choiceMade?.choiceLabel.toLowerCase().includes(kw)) return true
    if (h.speakerName?.toLowerCase().includes(kw)) return true
    return false
  })
})

const groupedHistory = computed(() => {
  const groups: Record<string, DialogueHistoryEntry[]> = {}
  for (const entry of filteredHistory.value) {
    if (!groups[entry.commissionId]) {
      groups[entry.commissionId] = []
    }
    groups[entry.commissionId].push(entry)
  }
  return groups
})

function getCommissionName(id: string): string {
  return commissions.find(c => c.id === id)?.title || id
}

function handleClose() {
  emit('update:modelValue', false)
}

function scrollToBottom() {
  const container = document.querySelector('.flex-1.overflow-y-auto') as HTMLElement | null
  if (container) {
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
  }
}

function isPlayerSide(speaker: DialogueCharacter): boolean {
  return speaker === 'player'
}

const speakerConfigMap: Record<DialogueCharacter, { emoji: string; name: string }> = {
  shopkeeper: { emoji: '🧓', name: '修老板' },
  client: { emoji: '💁', name: '委托人' },
  narrator: { emoji: '📖', name: '旁白' },
  player: { emoji: '👤', name: '我' },
  inner_thought: { emoji: '💭', name: '内心活动' }
}

function getSpeakerEmoji(speaker: DialogueCharacter): string {
  return speakerConfigMap[speaker]?.emoji || '❓'
}

function getSpeakerName(speaker: DialogueCharacter): string {
  return speakerConfigMap[speaker]?.name || '未知'
}

function getSpeakerStyle(speaker: DialogueCharacter): string {
  const styles: Record<DialogueCharacter, string> = {
    shopkeeper: 'bg-gradient-to-br from-amber-100 to-orange-200 border-amber-300',
    client: 'bg-gradient-to-br from-blue-100 to-sky-200 border-blue-300',
    narrator: 'bg-gradient-to-br from-stone-100 to-gray-200 border-stone-300',
    player: 'bg-gradient-to-br from-emerald-100 to-teal-200 border-emerald-300',
    inner_thought: 'bg-gradient-to-br from-purple-100 to-violet-200 border-purple-300'
  }
  return styles[speaker] || styles.narrator
}

function getSpeakerNameColor(speaker: DialogueCharacter): string {
  const colors: Record<DialogueCharacter, string> = {
    shopkeeper: 'text-amber-700',
    client: 'text-blue-700',
    narrator: 'text-stone-500',
    player: 'text-emerald-700',
    inner_thought: 'text-purple-600'
  }
  return colors[speaker] || colors.narrator
}

function getBubbleStyle(speaker: DialogueCharacter, isRight: boolean): string {
  const radius = isRight
    ? 'rounded-tr-md rounded-2xl'
    : 'rounded-tl-md rounded-2xl'

  const styles: Record<DialogueCharacter, string> = {
    shopkeeper: `bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 ${radius}`,
    client: `bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200 ${radius}`,
    narrator: `bg-gradient-to-br from-stone-50 to-gray-100 border-stone-200 ${radius}`,
    player: `bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 ${radius}`,
    inner_thought: `bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 ${radius}`
  }
  return styles[speaker] || styles.narrator
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const sameDay = d.toDateString() === now.toDateString()
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    if (sameDay) return `${hh}:${mm}`
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${mo}/${dd} ${hh}:${mm}`
  } catch {
    return ''
  }
}

function hasMatch(text: string): boolean {
  const kw = searchKeyword.value.trim().toLowerCase()
  return kw.length > 0 && text.toLowerCase().includes(kw)
}

function highlightText(text: string): Array<{ text: string; highlight: boolean }> {
  const kw = searchKeyword.value.trim()
  if (!kw) return [{ text, highlight: false }]
  const result: Array<{ text: string; highlight: boolean }> = []
  const kwLower = kw.toLowerCase()
  const textLower = text.toLowerCase()
  let lastIndex = 0
  let idx = textLower.indexOf(kwLower)
  while (idx !== -1) {
    if (idx > lastIndex) {
      result.push({ text: text.slice(lastIndex, idx), highlight: false })
    }
    result.push({ text: text.slice(idx, idx + kw.length), highlight: true })
    lastIndex = idx + kw.length
    idx = textLower.indexOf(kwLower, lastIndex)
  }
  if (lastIndex < text.length) {
    result.push({ text: text.slice(lastIndex), highlight: false })
  }
  return result.length > 0 ? result : [{ text, highlight: false }]
}
</script>

<style scoped>
.history-fade-enter-active,
.history-fade-leave-active {
  transition: all 0.3s ease;
}

.history-fade-enter-from,
.history-fade-leave-to {
  opacity: 0;
}

.history-fade-enter-from .relative.w-full.max-w-md,
.history-fade-leave-to .relative.w-full.max-w-md {
  transform: translateX(100%);
}

.history-fade-enter-active .relative.w-full.max-w-md,
.history-fade-leave-active .relative.w-full.max-w-md {
  transition: transform 0.3s ease;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
