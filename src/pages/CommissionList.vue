<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Filter, ScrollText, Map } from 'lucide-vue-next'
import CommissionCard from '../components/CommissionCard.vue'
import StoryDialogue from '../components/StoryDialogue.vue'
import DialogueHistoryPanel from '../components/DialogueHistoryPanel.vue'
import { useGameStore } from '../stores/game'
import { cn } from '../lib/utils'
import type { Commission } from '../types'

const router = useRouter()
const gameStore = useGameStore()

const showHistoryPanel = ref(false)
const pendingCommissionId = ref<string | null>(null)

type FilterType = 'all' | 'pending' | 'in_progress' | 'completed' | 'locked'
const currentFilter = ref<FilterType>('all')
const currentChapterFilter = ref<string>('all')

const chapters = computed(() => gameStore.getAllChapters())

const commissions = computed(() => gameStore.getAllCommissions())

const chapterFilterOptions = computed(() => [
  { value: 'all', label: '全部章节', disabled: false },
  ...chapters.value.map(c => ({
    value: c.id,
    label: `${c.subtitle} ${c.title}`,
    disabled: !c.isUnlocked
  }))
])

const filteredCommissions = computed(() => {
  let all = [...commissions.value]
  
  if (currentChapterFilter.value !== 'all') {
    all = all.filter(c => c.chapterId === currentChapterFilter.value)
  }
  
  switch (currentFilter.value) {
    case 'pending':
      return all.filter(c => gameStore.getCommissionStatus(c.id) === 'pending')
    case 'in_progress':
      return all.filter(c => gameStore.getCommissionStatus(c.id) === 'in_progress')
    case 'completed':
      return all.filter(c => gameStore.getCommissionStatus(c.id) === 'completed')
    case 'locked':
      return all.filter(c => gameStore.getCommissionStatus(c.id) === 'locked')
    default:
      return all
  }
})

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待接取' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'locked', label: '未解锁' }
]

function handleLockedCommissionClick(commission: Commission) {
  const chapter = gameStore.getChapterById(commission.chapterId)
  const chapterUnlocked = chapter?.isUnlocked
  
  if (!chapterUnlocked) {
    const chapterRule = chapter?.unlockRule
    let chapterReason = '需要解锁对应章节'
    if (chapterRule?.type === 'prerequisites' && chapterRule.prerequisiteCommissionIds) {
      const prereqNames = chapterRule.prerequisiteCommissionIds
        .map(id => gameStore.getCommissionById(id)?.title)
        .filter(Boolean)
        .join('、')
      chapterReason = `需先完成「${prereqNames}」解锁本章`
    } else if (chapterRule?.type === 'condition' && chapterRule.conditionType === 'completed_count') {
      chapterReason = `需完成 ${chapterRule.conditionValue} 个委托解锁本章`
    }
    alert(`章节未解锁：${chapterReason}`)
    return
  }
  
  const prereqNames = commission.prerequisiteCommissionIds
    .map(id => gameStore.getCommissionById(id)?.title)
    .filter(Boolean)
    .join('、')
  if (prereqNames) {
    alert(`此委托需要先完成：${prereqNames}`)
  } else {
    alert('此委托尚未解锁')
  }
}

function goToRoadmap() {
  router.push('/roadmap')
}

onMounted(() => {
  gameStore.loadSavedGame()
})

function goBack() {
  router.push('/')
}

function goToGallery() {
  router.push('/gallery')
}

function handleCommissionSelect(commission: Commission) {
  pendingCommissionId.value = commission.id
  gameStore.selectCommission(commission.id)
  gameStore.startDialogueSession(commission.id, 'commission_accept')
}

function handleDialogueEnd() {
  if (pendingCommissionId.value) {
    const cid = pendingCommissionId.value
    pendingCommissionId.value = null
    router.push(`/commission/${cid}`)
  }
}

function toggleHistoryPanel() {
  showHistoryPanel.value = !showHistoryPanel.value
}
</script>

<template>
  <div class="min-h-screen bg-stone-100 py-8 px-4">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <button
          class="flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5" />
          <span>返回店铺</span>
        </button>
        <div class="flex items-center gap-2">
          <button
            class="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
            @click="goToRoadmap"
          >
            <Map class="w-5 h-5" />
            <span>路线图</span>
          </button>
          <button
            class="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
            @click="toggleHistoryPanel"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>对话记录</span>
          </button>
          <button
            class="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors"
            @click="goToGallery"
          >
            <ScrollText class="w-5 h-5" />
            <span>陈列室</span>
          </button>
        </div>
      </div>

      <div class="text-center mb-8">
        <h1 class="text-3xl font-serif font-bold text-stone-800 mb-2">委托列表</h1>
        <p class="text-stone-500">选择一个委托，开始修复记忆</p>
      </div>

      <div class="flex flex-col items-center gap-4 mb-8">
        <div class="flex items-center gap-2">
          <Filter class="w-4 h-4 text-stone-400" />
          <div class="flex gap-1 bg-stone-200 rounded-lg p-1">
            <button
              v-for="option in filterOptions"
              :key="option.value"
              :class="[
                'px-3 py-1.5 text-sm rounded-md transition-all',
                currentFilter === option.value
                  ? 'bg-white text-stone-800 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              ]"
              @click="currentFilter = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <span class="text-sm text-stone-500">章节：</span>
          <select
            v-model="currentChapterFilter"
            class="px-3 py-1.5 text-sm bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option
              v-for="option in chapterFilterOptions"
              :key="option.value"
              :value="option.value"
              :disabled="option.disabled"
            >
              {{ option.label }}{{ option.disabled ? ' (未解锁)' : '' }}
            </option>
          </select>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <CommissionCard
          v-for="commission in filteredCommissions"
          :key="commission.id"
          :commission="commission"
          @locked-click="handleLockedCommissionClick"
          @commission-select="handleCommissionSelect"
        />
      </div>

      <div v-if="filteredCommissions.length === 0" class="text-center py-16">
        <div class="text-6xl mb-4">📋</div>
        <p class="text-stone-500">暂无相关委托</p>
      </div>

      <div class="mt-8 space-y-4">
        <h3 class="text-lg font-serif font-bold text-stone-700 flex items-center gap-2">
          <span>📖</span>
          <span>章节进度</span>
        </h3>
        <div class="grid gap-3 md:grid-cols-3">
          <div
            v-for="chapter in chapters"
            :key="chapter.id"
            :class="[
              'p-4 rounded-xl border-2 transition-all',
              chapter.isUnlocked ? 'bg-white border-amber-200' : 'bg-stone-50 border-stone-200 opacity-60'
            ]"
          >
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xl">{{ chapter.icon }}</span>
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-serif font-bold text-stone-800 truncate">{{ chapter.title }}</h4>
                <p class="text-xs text-stone-400">{{ chapter.subtitle }}</p>
              </div>
              <span
                v-if="chapter.isUnlocked"
                class="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full"
              >已解锁</span>
              <span
                v-else
                class="text-xs px-2 py-0.5 bg-stone-200 text-stone-500 rounded-full"
              >未解锁</span>
            </div>
            <div v-if="!chapter.isUnlocked" class="text-xs text-stone-400 mt-1">
              <template v-if="chapter.unlockRule.type === 'prerequisites' && chapter.unlockRule.prerequisiteCommissionIds">
                需完成：{{ chapter.unlockRule.prerequisiteCommissionIds.map(id => gameStore.getCommissionById(id)?.title).filter(Boolean).join('、') }}
              </template>
              <template v-else-if="chapter.unlockRule.type === 'condition' && chapter.unlockRule.conditionType === 'completed_count'">
                需完成 {{ chapter.unlockRule.conditionValue }} 个委托
              </template>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-12 text-center">
        <div class="inline-flex items-center gap-4 px-6 py-3 bg-amber-50 rounded-xl border border-amber-200">
          <div class="text-2xl">📊</div>
          <div class="text-left">
            <div class="text-sm text-stone-500">修复进度</div>
            <div class="text-lg font-bold text-stone-800">
              {{ gameStore.completionProgress.completed }} / {{ gameStore.completionProgress.total }}
              <span class="text-sm font-normal text-stone-500 ml-2">
                ({{ gameStore.completionProgress.percentage }}%)
              </span>
            </div>
          </div>
          <div class="w-32 h-2 bg-stone-200 rounded-full overflow-hidden">
            <div
              class="h-full bg-amber-500 transition-all duration-500"
              :style="{ width: `${gameStore.completionProgress.percentage}%` }"
            />
          </div>
        </div>
      </div>

      <StoryDialogue
        :showHistoryToggle="true"
        @dialogueEnd="handleDialogueEnd"
        @toggleHistory="toggleHistoryPanel"
      />

      <DialogueHistoryPanel
        v-model="showHistoryPanel"
      />
    </div>
  </div>
</template>

<style scoped>
.bg-stone-100 {
  background-color: #f5efe0;
  background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
}
</style>
