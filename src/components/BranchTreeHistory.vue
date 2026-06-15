<script setup lang="ts">
import { computed } from 'vue'
import { Shield, Sparkles, Clock } from 'lucide-vue-next'
import { useGameStore } from '../stores/game'
import type { BranchTreeHistoryEntry } from '../types'

const props = defineProps<{
  commissionId: string
}>()

const gameStore = useGameStore()

const history = computed(() => gameStore.getBranchTreeHistory(props.commissionId))

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  const s = date.getSeconds().toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

function endingTypeLabel(type: string): string {
  switch (type) {
    case 'good': return '优'
    case 'neutral': return '中'
    case 'bad': return '差'
    default: return type
  }
}

function endingTypeColor(type: string): string {
  switch (type) {
    case 'good': return 'bg-green-100 text-green-700'
    case 'neutral': return 'bg-amber-100 text-amber-700'
    case 'bad': return 'bg-rose-100 text-rose-700'
    default: return 'bg-stone-100 text-stone-700'
  }
}

function endingTypeDot(type: string): string {
  switch (type) {
    case 'good': return 'bg-green-400'
    case 'neutral': return 'bg-amber-400'
    case 'bad': return 'bg-rose-400'
    default: return 'bg-stone-400'
  }
}

const summaryStats = computed(() => {
  const entries = history.value
  if (entries.length === 0) return null

  const goodCount = entries.filter(e => e.endingType === 'good').length
  const neutralCount = entries.filter(e => e.endingType === 'neutral').length
  const badCount = entries.filter(e => e.endingType === 'bad').length
  const remedyCount = entries.filter(e => e.isRemedy).length
  const avgWeight = entries.reduce((sum, e) => sum + e.weight, 0) / entries.length

  return {
    goodCount,
    neutralCount,
    badCount,
    remedyCount,
    avgWeight: Math.round(avgWeight * 100) / 100,
    totalChoices: entries.length
  }
})
</script>

<template>
  <div class="branch-tree-history">
    <div v-if="summaryStats" class="mb-4 p-3 bg-white/60 rounded-lg border border-stone-200">
      <div class="text-xs text-stone-500 mb-2 font-serif">选择统计</div>
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="p-1.5 rounded-md bg-green-50 border border-green-100">
          <div class="text-lg font-bold text-green-600">{{ summaryStats.goodCount }}</div>
          <div class="text-[10px] text-green-500">优选择</div>
        </div>
        <div class="p-1.5 rounded-md bg-amber-50 border border-amber-100">
          <div class="text-lg font-bold text-amber-600">{{ summaryStats.neutralCount }}</div>
          <div class="text-[10px] text-amber-500">中选择</div>
        </div>
        <div class="p-1.5 rounded-md bg-rose-50 border border-rose-100">
          <div class="text-lg font-bold text-rose-600">{{ summaryStats.badCount }}</div>
          <div class="text-[10px] text-rose-500">差选择</div>
        </div>
      </div>
      <div class="flex items-center justify-between mt-2 text-[10px] text-stone-400 font-serif">
        <span>补救 {{ summaryStats.remedyCount }} 次</span>
        <span>平均权重 {{ summaryStats.avgWeight }}</span>
      </div>
    </div>

    <div v-if="history.length === 0" class="text-center py-8 text-stone-400">
      <Clock class="w-10 h-10 mx-auto mb-2 opacity-40" />
      <p class="text-sm font-serif">暂无历史记录</p>
      <p class="text-xs mt-1 font-serif">开始修复选择后，记录将出现在此处</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="(entry, index) in history"
        :key="entry.id"
        class="relative p-2.5 rounded-lg border transition-all"
        :class="[
          entry.isRemedy
            ? 'bg-purple-50/60 border-purple-200/60'
            : entry.endingType === 'good'
              ? 'bg-green-50/40 border-green-200/40'
              : entry.endingType === 'bad'
                ? 'bg-rose-50/40 border-rose-200/40'
                : 'bg-amber-50/40 border-amber-200/40'
        ]"
      >
        <div v-if="index < history.length - 1" 
          class="absolute left-5 bottom-0 w-px h-2 translate-y-full"
          :class="entry.isRemedy ? 'bg-purple-200' : 'bg-stone-200'"
        />

        <div class="flex items-start gap-2">
          <div class="flex flex-col items-center gap-1 flex-shrink-0 mt-0.5">
            <div
              class="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
              :class="[
                entry.isRemedy ? 'bg-purple-200 text-purple-600' : endingTypeDot(entry.endingType),
                entry.triggeredEndingId ? 'ring-2 ring-blue-300' : ''
              ]"
            >
              <Shield v-if="entry.isRemedy" class="w-3 h-3" />
              <Sparkles v-else-if="entry.triggeredEndingId" class="w-3 h-3 text-white" />
              <span v-else class="text-white font-medium">{{ index + 1 }}</span>
            </div>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-medium text-stone-700 font-serif truncate">
                {{ entry.choiceLabel }}
              </span>
              <span
                class="text-[9px] px-1 py-0.5 rounded-full flex-shrink-0"
                :class="entry.isRemedy ? 'bg-purple-100 text-purple-600' : endingTypeColor(entry.endingType)"
              >
                {{ entry.isRemedy ? '补救' : endingTypeLabel(entry.endingType) }}
              </span>
              <span
                v-if="entry.triggeredEndingId"
                class="text-[9px] px-1 py-0.5 rounded-full bg-blue-100 text-blue-600 flex-shrink-0"
              >
                结局触发
              </span>
            </div>

            <div class="flex items-center gap-3 mt-1 text-[10px] text-stone-400 font-serif">
              <span>步骤 {{ entry.stepIndex + 1 }}</span>
              <span>权重 {{ Math.round(entry.weight * 100) / 100 }}</span>
              <span>{{ Math.round(entry.normalizedWeight * 100) }}%</span>
              <span>{{ formatTime(entry.timestamp) }}</span>
            </div>

            <div v-if="entry.remedyFromChoiceId" class="mt-1 text-[10px] text-purple-500 font-serif flex items-center gap-1">
              <Shield class="w-2.5 h-2.5" />
              <span>从失败选择补救</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.branch-tree-history {
  position: relative;
}
</style>
