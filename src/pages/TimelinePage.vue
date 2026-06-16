<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Clock, 
  Star, 
  BookOpen, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  ChevronDown,
  ChevronUp,
  X,
  Calendar,
  Layers
} from 'lucide-vue-next'
import { useGameStore } from '../stores/game'
import { useSound } from '../composables/useSound'
import type { 
  TimelineEvent, 
  TimelineGroup, 
  TimelineFilterState, 
  TimelineEventType,
  TimelineStats 
} from '../types'
import { TIMELINE_EVENT_TYPE_CONFIG } from '../types'

const router = useRouter()
const gameStore = useGameStore()
const { playClick, playSuccess, playError, playTransition, playDiscover, playComplete, playUndo } = useSound()

const viewMode = ref<'grouped' | 'chronological'>('grouped')
const expandedGroups = ref<Set<string>>(new Set())
const highlightedEventId = ref<string | null>(null)

const filter = ref<TimelineFilterState>({
  selectedCommissionIds: [],
  selectedEventTypes: [],
  selectedChapterIds: [],
  searchKeyword: '',
  showKeyMomentsOnly: false,
  sortOrder: 'asc',
  groupByCommission: true
})

const showFilterPanel = ref(false)
const playbackState = ref({
  isPlaying: false,
  currentEventIndex: 0,
  currentGroupIndex: 0,
  playbackSpeed: 1,
  isPaused: false
})

const allCommissions = computed(() => gameStore.getAllCommissions())
const allChapters = computed(() => gameStore.getAllChapters())

const availableCommissions = computed(() => 
  allCommissions.value.filter(c => gameStore.getCommissionStatus(c.id) !== 'locked')
)

const timelineGroups = computed<TimelineGroup[]>(() => 
  gameStore.getTimelineGroups(filter.value)
)

const chronologicalEvents = computed<TimelineEvent[]>(() => 
  gameStore.getAllTimelineEvents(filter.value)
)

const timelineStats = computed<TimelineStats>(() => 
  gameStore.getTimelineStats()
)

const eventTypeOptions = computed(() => {
  return Object.entries(TIMELINE_EVENT_TYPE_CONFIG).map(([key, config]) => ({
    value: key as TimelineEventType,
    label: config.label,
    icon: config.icon,
    color: config.color
  }))
})

const filteredCount = computed(() => {
  if (viewMode.value === 'grouped') {
    return timelineGroups.value.reduce((sum, g) => sum + g.events.length, 0)
  }
  return chronologicalEvents.value.length
})

function toggleGroup(commissionId: string) {
  if (expandedGroups.value.has(commissionId)) {
    expandedGroups.value.delete(commissionId)
  } else {
    expandedGroups.value.add(commissionId)
  }
}

function toggleEventType(eventType: TimelineEventType) {
  const idx = filter.value.selectedEventTypes.indexOf(eventType)
  if (idx >= 0) {
    filter.value.selectedEventTypes.splice(idx, 1)
  } else {
    filter.value.selectedEventTypes.push(eventType)
  }
}

function toggleCommission(commissionId: string) {
  const idx = filter.value.selectedCommissionIds.indexOf(commissionId)
  if (idx >= 0) {
    filter.value.selectedCommissionIds.splice(idx, 1)
  } else {
    filter.value.selectedCommissionIds.push(commissionId)
  }
}

function toggleChapter(chapterId: string) {
  playClick()
  const idx = filter.value.selectedChapterIds.indexOf(chapterId)
  if (idx >= 0) {
    filter.value.selectedChapterIds.splice(idx, 1)
  } else {
    filter.value.selectedChapterIds.push(chapterId)
  }
}

function clearFilters() {
  filter.value = {
    selectedCommissionIds: [],
    selectedEventTypes: [],
    selectedChapterIds: [],
    searchKeyword: '',
    showKeyMomentsOnly: false,
    sortOrder: 'asc',
    groupByCommission: true
  }
}

function goBack() {
  playClick()
  router.push('/')
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getEventTypeConfig(type: TimelineEventType) {
  return TIMELINE_EVENT_TYPE_CONFIG[type]
}

function highlightEvent(eventId: string) {
  highlightedEventId.value = eventId
}

function clearHighlight() {
  highlightedEventId.value = null
}

function startPlayback() {
  playClick()
  if (viewMode.value === 'grouped') {
    if (timelineGroups.value.length === 0) return
    playbackState.value.isPlaying = true
    playbackState.value.isPaused = false
    playbackState.value.currentGroupIndex = 0
    playbackState.value.currentEventIndex = 0
    expandedGroups.value.add(timelineGroups.value[0].commissionId)
    playNextEvent()
  } else {
    if (chronologicalEvents.value.length === 0) return
    playbackState.value.isPlaying = true
    playbackState.value.isPaused = false
    playbackState.value.currentEventIndex = 0
    playNextChronologicalEvent()
  }
}

function pausePlayback() {
  playClick()
  playbackState.value.isPaused = true
  playbackState.value.isPlaying = false
}

function stopPlayback() {
  playbackState.value.isPlaying = false
  playbackState.value.isPaused = false
  playbackState.value.currentEventIndex = 0
  playbackState.value.currentGroupIndex = 0
  highlightedEventId.value = null
}

function playNextEvent() {
  if (!playbackState.value.isPlaying || playbackState.value.isPaused) return
  
  const group = timelineGroups.value[playbackState.value.currentGroupIndex]
  if (!group) {
    stopPlayback()
    return
  }

  if (playbackState.value.currentEventIndex >= group.events.length) {
    playbackState.value.currentGroupIndex++
    playbackState.value.currentEventIndex = 0
    if (playbackState.value.currentGroupIndex >= timelineGroups.value.length) {
      stopPlayback()
      return
    }
    expandedGroups.value.add(timelineGroups.value[playbackState.value.currentGroupIndex].commissionId)
    setTimeout(playNextEvent, 500 / playbackState.value.playbackSpeed)
    return
  }

  const event = group.events[playbackState.value.currentEventIndex]
  highlightedEventId.value = event.id
  
  playbackState.value.currentEventIndex++
  setTimeout(playNextEvent, 2000 / playbackState.value.playbackSpeed)
}

function playNextChronologicalEvent() {
  if (!playbackState.value.isPlaying || playbackState.value.isPaused) return
  
  if (playbackState.value.currentEventIndex >= chronologicalEvents.value.length) {
    stopPlayback()
    return
  }

  const event = chronologicalEvents.value[playbackState.value.currentEventIndex]
  highlightedEventId.value = event.id
  
  playbackState.value.currentEventIndex++
  setTimeout(playNextChronologicalEvent, 2000 / playbackState.value.playbackSpeed)
}

function skipBack() {
  playClick()
  if (playbackState.value.currentEventIndex > 0) {
    playbackState.value.currentEventIndex--
  }
}

function skipForward() {
  if (viewMode.value === 'grouped') {
    const group = timelineGroups.value[playbackState.value.currentGroupIndex]
    if (group && playbackState.value.currentEventIndex < group.events.length - 1) {
      playbackState.value.currentEventIndex++
    }
  } else {
    if (playbackState.value.currentEventIndex < chronologicalEvents.value.length - 1) {
      playbackState.value.currentEventIndex++
    }
  }
}

function viewEnding(endingId: string) {
  const ending = gameStore.getEndingById(endingId)
  if (ending) {
    router.push(`/ending/${ending.commissionId}/${ending.type}`)
  }
}

function viewCommission(commissionId: string) {
  router.push(`/commission/${commissionId}`)
}

function setViewMode(mode: 'grouped' | 'chronological') {
  playClick()
  viewMode.value = mode
}

function toggleFilterPanel() {
  playClick()
  showFilterPanel.value = !showFilterPanel.value
}

function handleSortOrderChange() {
  playClick()
}

function handleKeyMomentsOnlyChange() {
  playClick()
}

watch(() => viewMode.value, () => {
  stopPlayback()
})

onMounted(() => {
  gameStore.loadSavedGame()
  timelineGroups.value.forEach(group => {
    expandedGroups.value.add(group.commissionId)
  })
})
</script>

<template>
  <div class="min-h-screen timeline-page py-8 px-4">
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <button
          class="flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5" />
          <span>返回店铺</span>
        </button>
      </div>

      <div class="text-center mb-8">
        <div class="text-5xl mb-3">📜</div>
        <h1 class="text-3xl font-serif font-bold text-stone-800 mb-2">记忆时间线</h1>
        <p class="text-stone-500">按委托汇聚线索、连接结论与结局，回溯你的修复旅程</p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="card-warm p-4 text-center">
          <div class="flex justify-center mb-2">
            <BookOpen class="w-6 h-6 text-amber-500" />
          </div>
          <div class="text-2xl font-bold text-stone-800">{{ timelineStats.totalCommissions }}</div>
          <div class="text-xs text-stone-500">进行中委托</div>
        </div>
        <div class="card-warm p-4 text-center">
          <div class="flex justify-center mb-2">
            <Clock class="w-6 h-6 text-blue-500" />
          </div>
          <div class="text-2xl font-bold text-stone-800">{{ timelineStats.totalEvents }}</div>
          <div class="text-xs text-stone-500">时间线事件</div>
        </div>
        <div class="card-warm p-4 text-center">
          <div class="flex justify-center mb-2">
            <Star class="w-6 h-6 text-amber-500 fill-amber-500" />
          </div>
          <div class="text-2xl font-bold text-stone-800">{{ timelineStats.keyMomentsCount }}</div>
          <div class="text-xs text-stone-500">关键时刻</div>
        </div>
        <div class="card-warm p-4 text-center">
          <div class="flex justify-center mb-2">
            <Layers class="w-6 h-6 text-purple-500" />
          </div>
          <div class="text-2xl font-bold text-stone-800">{{ timelineStats.completionPercentage }}%</div>
          <div class="text-xs text-stone-500">总体完成度</div>
        </div>
      </div>

      <div class="card-warm p-4 mb-6 rounded-2xl">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex-1 min-w-[200px]">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                v-model="filter.searchKeyword"
                type="text"
                placeholder="搜索事件标题或内容..."
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-stone-200 focus:border-amber-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all"
              :class="showFilterPanel ? 'bg-amber-500 text-white' : 'bg-white text-stone-600 border-2 border-stone-200 hover:border-amber-300'"
              @click="toggleFilterPanel"
            >
              <Filter class="w-4 h-4" />
              <span>筛选</span>
            </button>

            <div class="flex bg-white rounded-xl border-2 border-stone-200 overflow-hidden">
              <button
                class="px-4 py-2.5 font-medium transition-all"
                :class="viewMode === 'grouped' ? 'bg-amber-500 text-white' : 'text-stone-600 hover:bg-stone-50'"
                @click="setViewMode('grouped')"
              >
                按委托
              </button>
              <button
                class="px-4 py-2.5 font-medium transition-all"
                :class="viewMode === 'chronological' ? 'bg-amber-500 text-white' : 'text-stone-600 hover:bg-stone-50'"
                @click="viewMode = 'chronological'"
              >
                时间顺序
              </button>
            </div>

            <div class="flex items-center gap-1 bg-white rounded-xl border-2 border-stone-200 p-1">
              <button
                class="p-2 rounded-lg transition-all"
                :class="!playbackState.isPlaying ? 'bg-amber-500 text-white' : 'text-stone-400'"
                :disabled="filteredCount === 0"
                @click="startPlayback"
              >
                <Play class="w-4 h-4" />
              </button>
              <button
                class="p-2 rounded-lg transition-all"
                :class="playbackState.isPlaying ? 'bg-amber-500 text-white' : 'text-stone-400'"
                :disabled="!playbackState.isPlaying"
                @click="pausePlayback"
              >
                <Pause class="w-4 h-4" />
              </button>
              <button
                class="p-2 rounded-lg transition-all text-stone-400 hover:text-stone-600"
                :disabled="!playbackState.isPlaying && !playbackState.isPaused"
                @click="stopPlayback"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <Transition name="slide">
          <div v-if="showFilterPanel" class="mt-4 pt-4 border-t border-stone-200">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 class="font-medium text-stone-700 mb-3 flex items-center gap-2">
                  <Calendar class="w-4 h-4" />
                  <span>按章节筛选</span>
                </h4>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                  <label
                    v-for="chapter in allChapters"
                    :key="chapter.id"
                    class="flex items-center gap-2 cursor-pointer hover:bg-stone-50 p-2 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      :checked="filter.selectedChapterIds.includes(chapter.id)"
                      @change="toggleChapter(chapter.id)"
                      class="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span class="text-sm text-stone-600">{{ chapter.icon }} {{ chapter.title }}</span>
                  </label>
                </div>
              </div>

              <div>
                <h4 class="font-medium text-stone-700 mb-3 flex items-center gap-2">
                  <BookOpen class="w-4 h-4" />
                  <span>按委托筛选</span>
                </h4>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                  <label
                    v-for="commission in availableCommissions"
                    :key="commission.id"
                    class="flex items-center gap-2 cursor-pointer hover:bg-stone-50 p-2 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      :checked="filter.selectedCommissionIds.includes(commission.id)"
                      @change="toggleCommission(commission.id)"
                      class="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span class="text-sm text-stone-600 truncate">{{ commission.item.image }} {{ commission.title }}</span>
                  </label>
                </div>
              </div>

              <div>
                <h4 class="font-medium text-stone-700 mb-3 flex items-center gap-2">
                  <Clock class="w-4 h-4" />
                  <span>按事件类型筛选</span>
                </h4>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                  <label
                    v-for="option in eventTypeOptions"
                    :key="option.value"
                    class="flex items-center gap-2 cursor-pointer hover:bg-stone-50 p-2 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      :checked="filter.selectedEventTypes.includes(option.value)"
                      @change="toggleEventType(option.value)"
                      class="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span class="text-lg">{{ option.icon }}</span>
                    <span class="text-sm text-stone-600">{{ option.label }}</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between mt-4 pt-4 border-t border-stone-200">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="filter.showKeyMomentsOnly"
                  @change="handleKeyMomentsOnlyChange"
                  class="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                />
                <span class="text-sm text-stone-600">仅显示关键时刻</span>
                <Star class="w-4 h-4 text-amber-500 fill-amber-500" />
              </label>

              <div class="flex items-center gap-2">
                <span class="text-sm text-stone-500">排序：</span>
                <select
                  v-model="filter.sortOrder"
                  @change="handleSortOrderChange"
                  class="px-3 py-1.5 rounded-lg border-2 border-stone-200 text-sm focus:border-amber-400 focus:outline-none"
                >
                  <option value="asc">正序（旧→新）</option>
                  <option value="desc">倒序（新→旧）</option>
                </select>
              </div>

              <button
                class="text-sm text-amber-600 hover:text-amber-700 font-medium"
                @click="clearFilters"
              >
                清除所有筛选
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <div v-if="filteredCount === 0" class="text-center py-16">
        <div class="text-5xl mb-4">🔍</div>
        <h3 class="text-xl font-serif font-bold text-stone-800 mb-2">没有找到匹配的事件</h3>
        <p class="text-stone-500">尝试调整筛选条件或搜索关键词</p>
      </div>

      <div v-else-if="viewMode === 'grouped'" class="space-y-6">
        <div
          v-for="group in timelineGroups"
          :key="group.commissionId"
          class="rounded-2xl border-2 overflow-hidden transition-all duration-300"
          :class="group.isCompleted ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200'"
        >
          <div
            class="p-5 cursor-pointer hover:bg-amber-50/50 transition-colors"
            @click="toggleGroup(group.commissionId)"
          >
            <div class="flex items-start justify-between">
              <div class="flex items-start gap-4">
                <div class="text-4xl">{{ group.commissionImage }}</div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-serif font-bold text-stone-800 text-lg">
                      {{ group.commissionTitle }}
                    </h3>
                    <span
                      v-if="group.isCompleted"
                      class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium"
                    >
                      已完成
                    </span>
                    <span
                      v-else
                      class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium"
                    >
                      进行中
                    </span>
                  </div>
                  <p class="text-sm text-stone-500 mb-2">
                    {{ group.clientAvatar }} {{ group.clientName }} · {{ group.chapterTitle }}
                  </p>
                  <div class="flex items-center gap-4 text-xs text-stone-400">
                    <span class="flex items-center gap-1">
                      <Clock class="w-3 h-3" />
                      {{ group.totalEvents }} 个事件
                    </span>
                    <span class="flex items-center gap-1">
                      <Star class="w-3 h-3 fill-amber-400 text-amber-400" />
                      {{ group.keyMoments.length }} 个关键时刻
                    </span>
                    <span v-if="group.startedAt" class="flex items-center gap-1">
                      <Calendar class="w-3 h-3" />
                      {{ formatDate(group.startedAt) }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="px-3 py-1.5 text-sm rounded-lg bg-white border border-stone-200 text-stone-600 hover:border-amber-300 transition-colors"
                  @click.stop="viewCommission(group.commissionId)"
                >
                  查看委托
                </button>
                <component
                  :is="expandedGroups.has(group.commissionId) ? ChevronUp : ChevronDown"
                  class="w-5 h-5 text-stone-400"
                />
              </div>
            </div>
          </div>

          <Transition name="expand">
            <div v-show="expandedGroups.has(group.commissionId)" class="border-t border-stone-200">
              <div class="p-5 bg-white">
                <div class="relative pl-8">
                  <div class="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-300 via-purple-300 to-blue-300"></div>

                  <div
                    v-for="(event, index) in group.events"
                    :key="event.id"
                    class="relative mb-6 last:mb-0 transition-all duration-300"
                    :class="{
                      'scale-102': highlightedEventId === event.id,
                      'opacity-50': highlightedEventId && highlightedEventId !== event.id
                    }"
                    @mouseenter="highlightEvent(event.id)"
                    @mouseleave="clearHighlight"
                  >
                    <div
                      class="absolute -left-5 w-4 h-4 rounded-full border-3 border-white shadow-md"
                      :class="[
                        getEventTypeConfig(event.type).bgColor,
                        highlightedEventId === event.id ? 'ring-4 ring-amber-200' : ''
                      ]"
                    >
                      <span class="absolute inset-0 flex items-center justify-center text-[10px]">
                        {{ getEventTypeConfig(event.type).icon }}
                      </span>
                    </div>

                    <div
                      class="rounded-xl border-2 p-4 transition-all duration-300 cursor-pointer"
                      :class="[
                        getEventTypeConfig(event.type).bgColor,
                        highlightedEventId === event.id ? 'ring-2 ring-amber-400 shadow-lg' : 'hover:shadow-md'
                      ]"
                    >
                      <div class="flex items-start justify-between mb-2">
                        <div class="flex items-center gap-2">
                          <span class="text-lg">{{ getEventTypeConfig(event.type).icon }}</span>
                          <span
                            class="text-xs px-2 py-0.5 rounded-full font-medium"
                            :class="getEventTypeConfig(event.type).color"
                          >
                            {{ getEventTypeConfig(event.type).label }}
                          </span>
                          <Star
                            v-if="event.isKeyMoment"
                            class="w-4 h-4 text-amber-500 fill-amber-500"
                          />
                        </div>
                        <span class="text-xs text-stone-400">{{ formatDate(event.timestamp) }}</span>
                      </div>

                      <h4 class="font-medium text-stone-800 mb-1">{{ event.title }}</h4>
                      <p class="text-sm text-stone-600 leading-relaxed">{{ event.content }}</p>

                      <div
                        v-if="event.relatedEndingId"
                        class="mt-3 pt-3 border-t border-stone-200/50"
                      >
                        <button
                          class="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                          @click.stop="viewEnding(event.relatedEndingId!)"
                        >
                          <BookOpen class="w-4 h-4" />
                          <span>查看结局详情 →</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <div v-else class="card-warm p-6 rounded-2xl">
        <h3 class="font-serif font-bold text-stone-800 text-lg mb-6 flex items-center gap-2">
          <Clock class="w-5 h-5 text-amber-500" />
          <span>时间顺序叙事轴</span>
          <span class="text-sm font-normal text-stone-400 ml-2">
            共 {{ chronologicalEvents.length }} 个事件
          </span>
        </h3>

        <div class="relative pl-8">
          <div class="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-300 via-purple-300 to-blue-300"></div>

          <div
            v-for="(event, index) in chronologicalEvents"
            :key="event.id"
            class="relative mb-6 last:mb-0 transition-all duration-300"
            :class="{
              'scale-102': highlightedEventId === event.id,
              'opacity-50': highlightedEventId && highlightedEventId !== event.id
            }"
            @mouseenter="highlightEvent(event.id)"
            @mouseleave="clearHighlight"
          >
            <div
              class="absolute -left-5 w-4 h-4 rounded-full border-3 border-white shadow-md"
              :class="[
                getEventTypeConfig(event.type).bgColor,
                highlightedEventId === event.id ? 'ring-4 ring-amber-200' : ''
              ]"
            >
              <span class="absolute inset-0 flex items-center justify-center text-[10px]">
                {{ getEventTypeConfig(event.type).icon }}
              </span>
            </div>

            <div class="flex items-start gap-3">
              <div class="text-xs text-stone-400 w-20 flex-shrink-0 pt-1">
                {{ formatDate(event.timestamp) }}
              </div>

              <div
                class="flex-1 rounded-xl border-2 p-4 transition-all duration-300 cursor-pointer"
                :class="[
                  getEventTypeConfig(event.type).bgColor,
                  highlightedEventId === event.id ? 'ring-2 ring-amber-400 shadow-lg' : 'hover:shadow-md'
                ]"
              >
                <div class="flex items-start justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">{{ getEventTypeConfig(event.type).icon }}</span>
                    <span
                      class="text-xs px-2 py-0.5 rounded-full font-medium"
                      :class="getEventTypeConfig(event.type).color"
                    >
                      {{ getEventTypeConfig(event.type).label }}
                    </span>
                    <Star
                      v-if="event.isKeyMoment"
                      class="w-4 h-4 text-amber-500 fill-amber-500"
                    />
                    <span class="text-xs text-stone-400">
                      {{ gameStore.getCommissionById(event.commissionId)?.item.image }}
                      {{ gameStore.getCommissionById(event.commissionId)?.title }}
                    </span>
                  </div>
                </div>

                <h4 class="font-medium text-stone-800 mb-1">{{ event.title }}</h4>
                <p class="text-sm text-stone-600 leading-relaxed">{{ event.content }}</p>

                <div
                  v-if="event.relatedEndingId"
                  class="mt-3 pt-3 border-t border-stone-200/50"
                >
                  <button
                    class="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                    @click.stop="viewEnding(event.relatedEndingId!)"
                  >
                    <BookOpen class="w-4 h-4" />
                    <span>查看结局详情 →</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-12 text-center">
        <div class="inline-flex items-center gap-6 px-8 py-4 bg-stone-50/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm">
          <div class="text-center">
            <div class="text-2xl font-bold text-stone-800">{{ timelineStats.totalCluesCollected }}</div>
            <div class="text-xs text-stone-400">线索发现</div>
          </div>
          <div class="w-px h-10 bg-stone-200" />
          <div class="text-center">
            <div class="text-2xl font-bold text-stone-800">{{ timelineStats.totalConnectionsDiscovered }}</div>
            <div class="text-xs text-stone-400">关联建立</div>
          </div>
          <div class="w-px h-10 bg-stone-200" />
          <div class="text-center">
            <div class="text-2xl font-bold text-stone-800">{{ timelineStats.totalEndingsUnlocked }}</div>
            <div class="text-xs text-stone-400">结局解锁</div>
          </div>
          <div class="w-px h-10 bg-stone-200" />
          <div class="text-center">
            <div class="text-2xl font-bold text-stone-800">{{ timelineStats.totalNotesCreated }}</div>
            <div class="text-xs text-stone-400">笔记记录</div>
          </div>
          <div class="w-px h-10 bg-stone-200" />
          <div class="text-center">
            <div class="text-2xl font-bold text-stone-800">{{ timelineStats.averageEventsPerCommission }}</div>
            <div class="text-xs text-stone-400">平均事件数</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-page {
  background-color: #f5efe0;
  background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
}

.card-warm {
  background: rgba(255, 253, 245, 0.9);
  border: 1px solid rgba(210, 180, 140, 0.3);
  box-shadow: 0 2px 8px rgba(139, 119, 79, 0.08);
  backdrop-filter: blur(10px);
}

.scale-102 {
  transform: scale(1.02);
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 2000px;
}
</style>
