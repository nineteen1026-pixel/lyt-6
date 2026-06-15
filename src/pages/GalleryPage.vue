<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Trophy, Lock, Star, BookOpen, Award, Medal, GitBranch, Coins, Users, MessageSquare, TrendingUp } from 'lucide-vue-next'
import { useGameStore } from '../stores/game'
import type { Ending, Commission, MultiDimensionalScore, Achievement, ExhibitData, VisitorReview } from '../types'
import { REPUTATION_LEVELS } from '../types'

const router = useRouter()
const gameStore = useGameStore()

const activeTab = ref<'endings' | 'achievements' | 'scores' | 'showroom'>('endings')

const allCommissions = computed(() => gameStore.getAllCommissions())
const allEndings = computed(() => gameStore.getAllEndings())
const progress = computed(() => gameStore.completionProgress)
const allScores = computed(() => gameStore.getAllScores())
const allAchievements = computed(() => gameStore.allAchievements)

const unlockedEndingIds = computed(() => gameStore.state.unlockedEndings)
const unlockedAchievementCount = computed(() => gameStore.state.unlockedAchievements.length)

const showroomStats = computed(() => gameStore.getShowroomStats())
const completedExhibits = computed(() => {
  return allCommissions.value
    .filter(c => gameStore.state.completedCommissions.includes(c.id))
    .map(c => ({
      commission: c,
      exhibit: gameStore.getExhibitForCommission(c.id)
    }))
    .filter(e => e.exhibit !== null)
})

const reputationLevelConfig = computed(() => {
  const level = showroomStats.value.reputationLevel
  return REPUTATION_LEVELS.find(l => l.level === level) || REPUTATION_LEVELS[0]
})

const collectResult = ref<{ amount: number; count: number } | null>(null)

const overallBranchStats = computed(() => {
  let totalPaths = 0
  let discoveredPaths = 0
  let totalEndings = 0
  let unlockedEndings = 0
  
  allCommissions.value.forEach(commission => {
    const stats = gameStore.getBranchTreeStats(commission.id)
    totalPaths += stats.totalPaths
    discoveredPaths += stats.discoveredPaths
    totalEndings += stats.totalEndings
    unlockedEndings += stats.endingsUnlocked
  })
  
  return {
    totalPaths,
    discoveredPaths,
    totalEndings,
    unlockedEndings,
    overallDiscoveryPercentage: totalPaths > 0 ? Math.round((discoveredPaths / totalPaths) * 100) : 0
  }
})

function getBranchStats(commissionId: string) {
  return gameStore.getBranchTreeStats(commissionId)
}

function isEndingUnlocked(endingId: string): boolean {
  return unlockedEndingIds.value.includes(endingId)
}

function isCommissionCompleted(commissionId: string): boolean {
  return gameStore.state.completedCommissions.includes(commissionId)
}

function getEndingsForCommission(commissionId: string): Ending[] {
  return allEndings.value.filter(e => e.commissionId === commissionId)
}

function getBestScoreForCommission(commissionId: string): MultiDimensionalScore | null {
  return gameStore.getBestScoreForCommission(commissionId)
}

function getScoresForCommission(commissionId: string): MultiDimensionalScore[] {
  return allScores.value.filter(s => s.commissionId === commissionId)
}

const endingTypeConfig: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  good: { label: '完美', icon: '✨', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
  neutral: { label: '温暖', icon: '🌿', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
  bad: { label: '遗憾', icon: '🌧️', color: 'text-stone-500', bgColor: 'bg-stone-50 border-stone-200' }
}

const sentimentConfig: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  very_positive: { label: '极度好评', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', icon: '😍' },
  positive: { label: '好评', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', icon: '😊' },
  neutral: { label: '中评', color: 'text-stone-500', bgColor: 'bg-stone-50 border-stone-200', icon: '😐' },
  negative: { label: '差评', color: 'text-rose-500', bgColor: 'bg-rose-50 border-rose-200', icon: '😕' }
}

function goBack() {
  router.push('/')
}

function viewEnding(ending: Ending) {
  if (!isEndingUnlocked(ending.id)) return
  router.push(`/ending/${ending.commissionId}/${ending.type}`)
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

function getGradeColor(grade: string): string {
  const config = gameStore.getGradeConfig(grade)
  return config?.color || 'text-stone-600'
}

function getGradeBgColor(grade: string): string {
  const config = gameStore.getGradeConfig(grade)
  return config?.bgColor || 'bg-stone-50'
}

function handleCollectAll() {
  const result = gameStore.collectAllExhibitRevenue()
  collectResult.value = { amount: result.totalCollected, count: result.exhibitCount }
  setTimeout(() => {
    collectResult.value = null
  }, 3000)
}

function getRatingStars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

onMounted(() => {
  gameStore.loadSavedGame()
})
</script>

<template>
  <div class="min-h-screen gallery-page py-8 px-4">
    <div class="max-w-5xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <button
          class="flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5" />
          <span>返回店铺</span>
        </button>
        <div class="flex items-center gap-2 text-amber-600">
          <Trophy class="w-5 h-5" />
          <span class="font-medium">
            {{ progress.completed }} / {{ progress.total }} 已修复
          </span>
        </div>
      </div>

      <div class="text-center mb-8">
        <div class="text-5xl mb-3">🏛️</div>
        <h1 class="text-3xl font-serif font-bold text-stone-800 mb-2">历史陈列室</h1>
        <p class="text-stone-500">在这里回顾你修复过的每一件旧物和解锁的结局</p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="card-warm p-4 text-center">
          <div class="flex justify-center mb-2">
            <Trophy class="w-6 h-6 text-amber-500" />
          </div>
          <div class="text-2xl font-bold text-stone-800">{{ progress.completed }}/{{ progress.total }}</div>
          <div class="text-xs text-stone-500">已修复委托</div>
        </div>
        <div class="card-warm p-4 text-center">
          <div class="flex justify-center mb-2">
            <GitBranch class="w-6 h-6 text-purple-500" />
          </div>
          <div class="text-2xl font-bold text-stone-800">{{ overallBranchStats.discoveredPaths }}/{{ overallBranchStats.totalPaths }}</div>
          <div class="text-xs text-stone-500">已探索路径</div>
        </div>
        <div class="card-warm p-4 text-center">
          <div class="flex justify-center mb-2">
            <Star class="w-6 h-6 text-green-500" />
          </div>
          <div class="text-2xl font-bold text-stone-800">{{ overallBranchStats.overallDiscoveryPercentage }}%</div>
          <div class="text-xs text-stone-500">总体探索度</div>
        </div>
        <div class="card-warm p-4 text-center">
          <div class="flex justify-center mb-2">
            <Award class="w-6 h-6 text-blue-500" />
          </div>
          <div class="text-2xl font-bold text-stone-800">{{ overallBranchStats.unlockedEndings }}/{{ overallBranchStats.totalEndings }}</div>
          <div class="text-xs text-stone-500">结局解锁</div>
        </div>
      </div>

      <div class="flex justify-center gap-2 mb-8 flex-wrap">
        <button
          v-for="tab in [
            { key: 'endings', label: '结局收藏', icon: BookOpen },
            { key: 'achievements', label: '成就墙', icon: Trophy },
            { key: 'scores', label: '评分记录', icon: Award },
            { key: 'showroom', label: '陈列室经营', icon: Coins }
          ]"
          :key="tab.key"
          class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300"
          :class="activeTab === tab.key 
            ? 'bg-amber-500 text-white shadow-lg' 
            : 'bg-white text-stone-600 border-2 border-stone-200 hover:border-amber-300'"
          @click="activeTab = tab.key as any"
        >
          <component :is="tab.icon" class="w-4 h-4" />
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <div v-show="activeTab === 'endings'" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="commission in allCommissions"
          :key="commission.id"
          class="rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:shadow-lg"
          :class="isCommissionCompleted(commission.id) ? 'bg-amber-50 border-amber-200' : 'bg-stone-50 border-stone-200 opacity-70'"
        >
          <div
            class="p-5"
            :class="!isCommissionCompleted(commission.id) ? 'blur-[1px]' : ''"
          >
            <div class="flex items-start gap-4 mb-4">
              <div class="text-4xl">{{ commission.item.image }}</div>
              <div class="flex-1 min-w-0">
                <h3 class="font-serif font-bold text-stone-800 text-lg truncate">
                  {{ commission.title }}
                </h3>
                <p class="text-sm text-stone-500">
                  {{ commission.clientAvatar }} {{ commission.clientName }}
                </p>
              </div>
              <div v-if="isCommissionCompleted(commission.id)" class="flex items-center gap-1 text-amber-500">
                <Star class="w-4 h-4 fill-amber-500" />
              </div>
            </div>

            <div v-if="isCommissionCompleted(commission.id)" class="mb-4">
              <div class="text-xs text-stone-400 flex items-center gap-1 mb-2">
                <Medal class="w-3 h-3" />
                <span>最佳评分</span>
              </div>
              <div 
                v-if="getBestScoreForCommission(commission.id)"
                class="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer hover:shadow-md transition-all"
                :class="getGradeBgColor(getBestScoreForCommission(commission.id)!.grade)"
                @click="viewEnding(getEndingsForCommission(commission.id).find(e => e.type === getBestScoreForCommission(commission.id)!.endingType)!)"
              >
                <span class="text-2xl font-bold" :class="getGradeColor(getBestScoreForCommission(commission.id)!.grade)">
                  {{ getBestScoreForCommission(commission.id)!.grade }}
                </span>
                <div class="flex-1">
                  <div class="text-sm font-medium text-stone-800">
                    {{ getBestScoreForCommission(commission.id)!.overallPercentage }}分
                  </div>
                  <div class="text-xs text-stone-500">
                    {{ gameStore.getGradeConfig(getBestScoreForCommission(commission.id)!.grade)?.label }}
                  </div>
                </div>
              </div>
              <div v-else class="p-2.5 rounded-lg border border-stone-200 bg-stone-50 text-center text-xs text-stone-400">
                暂无评分记录
              </div>
            </div>

            <div v-if="isCommissionCompleted(commission.id)" class="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
              <div class="flex items-center justify-between mb-2">
                <div class="text-xs text-purple-600 flex items-center gap-1">
                  <GitBranch class="w-3 h-3" />
                  <span>分支探索</span>
                </div>
                <span class="text-sm font-bold text-purple-600">
                  {{ getBranchStats(commission.id).discoveryPercentage }}%
                </span>
              </div>
              <div class="w-full bg-purple-100 rounded-full h-1.5">
                <div 
                  class="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                  :style="{ width: getBranchStats(commission.id).discoveryPercentage + '%' }"
                ></div>
              </div>
              <div class="flex justify-between mt-2 text-xs text-purple-400">
                <span>{{ getBranchStats(commission.id).discoveredPaths }} 条路径</span>
                <span>{{ getBranchStats(commission.id).endingsUnlocked }}/{{ getBranchStats(commission.id).totalEndings }} 结局</span>
              </div>
            </div>

            <div class="space-y-2">
              <div class="text-xs text-stone-400 flex items-center gap-1 mb-2">
                <BookOpen class="w-3 h-3" />
                <span>结局一览</span>
              </div>
              <div
                v-for="ending in getEndingsForCommission(commission.id)"
                :key="ending.id"
                class="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-200"
                :class="[
                  isEndingUnlocked(ending.id)
                    ? `${endingTypeConfig[ending.type].bgColor} border hover:shadow-md hover:-translate-y-0.5`
                    : 'bg-stone-100 border border-stone-200 cursor-default'
                ]"
                @click="viewEnding(ending)"
              >
                <span class="text-lg">
                  {{ isEndingUnlocked(ending.id) ? endingTypeConfig[ending.type].icon : '🔒' }}
                </span>
                <div class="flex-1 min-w-0">
                  <div
                    :class="['text-sm font-medium truncate', isEndingUnlocked(ending.id) ? endingTypeConfig[ending.type].color : 'text-stone-400']"
                  >
                    {{ isEndingUnlocked(ending.id) ? ending.title : '未解锁' }}
                  </div>
                  <div class="text-xs text-stone-400">
                    {{ endingTypeConfig[ending.type].label }}结局
                  </div>
                </div>
                <Lock v-if="!isEndingUnlocked(ending.id)" class="w-3 h-3 text-stone-300" />
              </div>
            </div>
          </div>

          <div
            v-if="!isCommissionCompleted(commission.id)"
            class="px-5 py-3 bg-stone-100/80 border-t border-stone-200 text-center"
          >
            <span class="text-sm text-stone-400">尚未完成修复</span>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'achievements'" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="achievement in allAchievements"
          :key="achievement.id"
          class="rounded-2xl border-2 overflow-hidden transition-all duration-300"
          :class="[
            achievement.isUnlocked
              ? gameStore.getRarityBgColor(achievement.rarity) + ' hover:shadow-lg'
              : 'bg-stone-50 border-stone-200 opacity-70'
          ]"
        >
          <div class="p-5" :class="!achievement.isUnlocked ? 'blur-[1px]' : ''">
            <div class="flex items-start gap-4 mb-3">
              <div class="text-4xl" :class="!achievement.isUnlocked ? 'grayscale' : ''">
                {{ achievement.icon }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-serif font-bold text-stone-800">
                    {{ achievement.isUnlocked ? achievement.name : '???' }}
                  </h3>
                  <span 
                    v-if="achievement.isUnlocked"
                    class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    :class="[
                      gameStore.getRarityColor(achievement.rarity),
                      achievement.rarity === 'legendary' ? 'bg-amber-100' :
                      achievement.rarity === 'epic' ? 'bg-purple-100' :
                      achievement.rarity === 'rare' ? 'bg-blue-100' : 'bg-stone-100'
                    ]"
                  >
                    {{ gameStore.getRarityLabel(achievement.rarity) }}
                  </span>
                </div>
                <p class="text-sm text-stone-500">
                  {{ achievement.isUnlocked ? achievement.description : '完成特定条件解锁' }}
                </p>
              </div>
              <div v-if="achievement.isUnlocked" class="flex items-center gap-1 text-amber-500">
                <Star class="w-4 h-4 fill-amber-500" />
              </div>
            </div>

            <div v-if="!achievement.isUnlocked" class="mt-3">
              <div class="flex items-center justify-between text-xs text-stone-500 mb-1">
                <span>解锁进度</span>
                <span>{{ achievement.progress || 0 }} / {{ achievement.target || 1 }}</span>
              </div>
              <div class="h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  class="h-full bg-amber-400 rounded-full transition-all duration-500"
                  :style="{ width: `${Math.min(((achievement.progress || 0) / (achievement.target || 1)) * 100, 100)}%` }"
                />
              </div>
            </div>
          </div>
        </div>

        <div v-if="allAchievements.length === 0" class="col-span-full text-center py-16">
          <div class="text-5xl mb-4">🏆</div>
          <h3 class="text-xl font-serif font-bold text-stone-800 mb-2">暂无成就</h3>
          <p class="text-stone-500">完成特定条件后，这里会显示你的成就</p>
        </div>
      </div>

      <div v-show="activeTab === 'scores'" class="space-y-4">
        <div
          v-for="score in allScores"
          :key="score.id"
          class="rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer"
          :class="getGradeBgColor(score.grade)"
          @click="viewEnding(getEndingsForCommission(score.commissionId).find(e => e.type === score.endingType)!)"
        >
          <div class="p-5">
            <div class="flex items-center gap-4 mb-4">
              <div class="text-center">
                <div class="text-3xl font-bold" :class="getGradeColor(score.grade)">
                  {{ score.grade }}
                </div>
                <div class="text-xs text-stone-500">
                  {{ gameStore.getGradeConfig(score.grade)?.label }}
                </div>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-serif font-bold text-stone-800">
                    {{ gameStore.getCommissionById(score.commissionId)?.item.image }}
                    {{ gameStore.getCommissionById(score.commissionId)?.title }}
                  </h3>
                  <span class="text-xs px-2 py-0.5 rounded-full" :class="[
                    score.endingType === 'good' ? 'bg-amber-100 text-amber-600' :
                    score.endingType === 'neutral' ? 'bg-blue-100 text-blue-600' : 'bg-stone-100 text-stone-500'
                  ]">
                    {{ endingTypeConfig[score.endingType].label }}结局
                  </span>
                </div>
                <div class="flex items-center gap-4 text-xs text-stone-500">
                  <span>{{ gameStore.getCommissionById(score.commissionId)?.clientAvatar }} {{ gameStore.getCommissionById(score.commissionId)?.clientName }}</span>
                  <span>·</span>
                  <span>{{ formatDate(score.achievedAt) }}</span>
                </div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold text-stone-800">
                  {{ score.overallPercentage }}<span class="text-sm text-stone-500">分</span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-5 gap-2 mb-4">
              <div
                v-for="dim in score.dimensions"
                :key="dim.dimension"
                class="text-center"
              >
                <div class="text-lg mb-1">{{ dim.icon }}</div>
                <div class="text-[10px] text-stone-600 mb-1">{{ dim.name }}</div>
                <div class="h-1.5 bg-stone-200 rounded-full overflow-hidden mb-1">
                  <div
                    class="h-full rounded-full"
                    :style="{ width: `${dim.percentage}%` }"
                    :class="[
                      dim.percentage >= 80 ? 'bg-green-500' :
                      dim.percentage >= 60 ? 'bg-amber-500' :
                      dim.percentage >= 40 ? 'bg-orange-500' : 'bg-rose-500'
                    ]"
                  />
                </div>
                <div class="text-[10px] font-bold" :class="dim.color">
                  {{ dim.score }}
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-200/50">
              <div class="flex items-center gap-4">
                <span>选择: <span class="font-medium text-stone-700">{{ score.choiceScoreBreakdown.goodChoices }}优 {{ score.choiceScoreBreakdown.neutralChoices }}中 {{ score.choiceScoreBreakdown.badChoices }}差</span></span>
              </div>
              <div class="flex items-center gap-4">
                <span>线索: <span class="font-medium text-stone-700">{{ score.metadata.clueCollected }}/{{ score.metadata.clueTotal }}</span></span>
                <span>关联: <span class="font-medium text-stone-700">{{ score.metadata.connectionsDiscovered }}/{{ score.metadata.connectionsTotal }}</span></span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="allScores.length === 0" class="text-center py-16">
          <div class="text-5xl mb-4">📊</div>
          <h3 class="text-xl font-serif font-bold text-stone-800 mb-2">暂无评分记录</h3>
          <p class="text-stone-500">完成修复委托后，这里会显示你的评分记录</p>
        </div>
      </div>

      <div v-show="activeTab === 'showroom'">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div class="card-warm p-4 text-center">
            <div class="flex justify-center mb-2">
              <Coins class="w-6 h-6 text-amber-500" />
            </div>
            <div class="text-2xl font-bold text-stone-800">{{ showroomStats.totalRevenue }}</div>
            <div class="text-xs text-stone-500">累计收益（灵石）</div>
          </div>
          <div class="card-warm p-4 text-center">
            <div class="flex justify-center mb-2">
              <Users class="w-6 h-6 text-blue-500" />
            </div>
            <div class="text-2xl font-bold text-stone-800">{{ showroomStats.totalVisitors }}</div>
            <div class="text-xs text-stone-500">累计访客</div>
          </div>
          <div class="card-warm p-4 text-center">
            <div class="flex justify-center mb-2">
              <MessageSquare class="w-6 h-6 text-green-500" />
            </div>
            <div class="text-2xl font-bold text-stone-800">{{ showroomStats.averageRating }}</div>
            <div class="text-xs text-stone-500">平均评分</div>
          </div>
          <div class="card-warm p-4 text-center">
            <div class="flex justify-center mb-2">
              <span class="text-2xl">{{ reputationLevelConfig.icon }}</span>
            </div>
            <div class="text-2xl font-bold" :class="reputationLevelConfig.color">{{ reputationLevelConfig.label }}</div>
            <div class="text-xs text-stone-500">口碑等级</div>
          </div>
        </div>

        <div class="card-warm p-6 mb-8">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <span class="text-3xl">{{ reputationLevelConfig.icon }}</span>
              <div>
                <h3 class="font-serif font-bold text-stone-800 text-lg">{{ reputationLevelConfig.label }}</h3>
                <p class="text-sm text-stone-500">{{ reputationLevelConfig.description }}</p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold" :class="reputationLevelConfig.color">{{ showroomStats.reputationScore }}</div>
              <div class="text-xs text-stone-400">口碑分</div>
            </div>
          </div>
          <div class="w-full bg-stone-200 rounded-full h-3 overflow-hidden mb-2">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="[
                showroomStats.reputationScore >= 70 ? 'bg-gradient-to-r from-purple-500 to-amber-500' :
                showroomStats.reputationScore >= 45 ? 'bg-gradient-to-r from-blue-500 to-purple-500' :
                showroomStats.reputationScore >= 20 ? 'bg-gradient-to-r from-green-500 to-blue-500' :
                'bg-gradient-to-r from-stone-400 to-green-500'
              ]"
              :style="{ width: `${showroomStats.reputationProgress}%` }"
            ></div>
          </div>
          <div class="flex justify-between text-xs text-stone-400">
            <span>{{ reputationLevelConfig.label }}</span>
            <span v-if="showroomStats.nextLevelLabel">下一等级：{{ showroomStats.nextLevelLabel }}</span>
            <span v-else>已达最高等级</span>
          </div>
        </div>

        <div class="flex justify-center mb-6">
          <button
            class="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-md hover:shadow-lg"
            :class="completedExhibits.length > 0 
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700' 
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'"
            :disabled="completedExhibits.length === 0"
            @click="handleCollectAll"
          >
            <Coins class="w-5 h-5" />
            <span>收取全部收益</span>
            <span v-if="completedExhibits.length > 0" class="text-sm opacity-80">({{ completedExhibits.length }}件展品)</span>
          </button>
        </div>

        <Transition name="fade">
          <div v-if="collectResult" class="mb-6 text-center">
            <div class="inline-flex items-center gap-2 px-6 py-3 bg-amber-50 border-2 border-amber-200 rounded-xl shadow-md">
              <Coins class="w-5 h-5 text-amber-500" />
              <span class="font-bold text-amber-700">+{{ collectResult.amount }} 灵石</span>
              <span class="text-amber-600 text-sm">（{{ collectResult.count }}件展品）</span>
            </div>
          </div>
        </Transition>

        <div class="space-y-6">
          <div
            v-for="{ commission, exhibit } in completedExhibits"
            :key="commission.id"
            class="card-warm overflow-hidden"
          >
            <div class="p-5">
              <div class="flex items-start gap-4 mb-4">
                <div class="text-4xl">{{ commission.item.image }}</div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-serif font-bold text-stone-800 text-lg truncate">{{ commission.title }}</h3>
                  <p class="text-sm text-stone-500">{{ commission.clientAvatar }} {{ commission.clientName }}</p>
                </div>
                <div class="text-right">
                  <div class="text-xl font-bold text-amber-600 flex items-center gap-1">
                    <Coins class="w-4 h-4" />
                    {{ exhibit!.accumulatedRevenue }}
                  </div>
                  <div class="text-xs text-stone-400">累计灵石</div>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div class="text-lg font-bold text-amber-600">{{ exhibit!.revenue.totalRevenue }}</div>
                  <div class="text-[10px] text-stone-500">初始收益</div>
                </div>
                <div class="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div class="text-lg font-bold text-blue-600">{{ exhibit!.visitorCount }}</div>
                  <div class="text-[10px] text-stone-500">访客人数</div>
                </div>
                <div class="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                  <div class="text-lg font-bold text-green-600">{{ exhibit!.displayQuality }}%</div>
                  <div class="text-[10px] text-stone-500">展示品质</div>
                </div>
              </div>

              <div class="mb-4 p-3 bg-stone-50 rounded-lg border border-stone-100">
                <div class="text-xs text-stone-500 mb-2">收益构成</div>
                <div class="space-y-1.5">
                  <div v-for="item in exhibit!.revenue.breakdown" :key="item.label" class="flex items-center justify-between text-xs">
                    <span class="text-stone-500">{{ item.label }}</span>
                    <span class="font-medium text-stone-700">+{{ item.amount }}</span>
                  </div>
                </div>
              </div>

              <div>
                <div class="text-xs text-stone-500 flex items-center gap-1 mb-3">
                  <MessageSquare class="w-3 h-3" />
                  <span>访客评价（{{ exhibit!.reviews.length }}条）</span>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="review in exhibit!.reviews"
                    :key="review.id"
                    class="p-3 rounded-lg border"
                    :class="sentimentConfig[review.sentiment]?.bgColor"
                  >
                    <div class="flex items-center gap-2 mb-1.5">
                      <span class="text-lg">{{ review.visitorAvatar }}</span>
                      <span class="text-sm font-medium text-stone-700">{{ review.visitorName }}</span>
                      <span class="text-xs" :class="sentimentConfig[review.sentiment]?.color">
                        {{ sentimentConfig[review.sentiment]?.icon }}
                        {{ getRatingStars(review.rating) }}
                      </span>
                    </div>
                    <p class="text-sm text-stone-600 pl-8">{{ review.comment }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="completedExhibits.length === 0" class="text-center py-16">
            <div class="text-5xl mb-4">🏪</div>
            <h3 class="text-xl font-serif font-bold text-stone-800 mb-2">陈列室尚无展品</h3>
            <p class="text-stone-500">完成委托修复后，展品将在此展出并产生收益</p>
          </div>
        </div>

        <div v-if="showroomStats.bestReview" class="mt-8">
          <div class="card-warm p-5">
            <h3 class="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2">
              <TrendingUp class="w-4 h-4 text-amber-500" />
              <span>最佳评价</span>
            </h3>
            <div class="p-3 rounded-lg border bg-amber-50 border-amber-200">
              <div class="flex items-center gap-2 mb-1.5">
                <span class="text-lg">{{ showroomStats.bestReview.visitorAvatar }}</span>
                <span class="text-sm font-medium text-stone-700">{{ showroomStats.bestReview.visitorName }}</span>
                <span class="text-xs text-amber-600">
                  {{ getRatingStars(showroomStats.bestReview.rating) }}
                </span>
              </div>
              <p class="text-sm text-stone-600 pl-8">{{ showroomStats.bestReview.comment }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-12 text-center">
        <div class="inline-flex items-center gap-6 px-8 py-4 bg-stone-50/80 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm">
          <div class="text-center">
            <div class="text-2xl font-bold text-stone-800">{{ progress.completed }}</div>
            <div class="text-xs text-stone-400">已修复</div>
          </div>
          <div class="w-px h-10 bg-stone-200" />
          <div class="text-center">
            <div class="text-2xl font-bold text-stone-800">{{ unlockedEndingIds.length }}</div>
            <div class="text-xs text-stone-400">结局解锁</div>
          </div>
          <div class="w-px h-10 bg-stone-200" />
          <div class="text-center">
            <div class="text-2xl font-bold text-stone-800">{{ unlockedAchievementCount }}/{{ allAchievements.length }}</div>
            <div class="text-xs text-stone-400">成就达成</div>
          </div>
          <div class="w-px h-10 bg-stone-200" />
          <div class="text-center">
            <div class="text-2xl font-bold text-stone-800">{{ allScores.length }}</div>
            <div class="text-xs text-stone-400">评分记录</div>
          </div>
          <div class="w-px h-10 bg-stone-200" />
          <div class="text-center">
            <div class="text-2xl font-bold text-amber-600">{{ showroomStats.totalRevenue }}</div>
            <div class="text-xs text-stone-400">灵石收益</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gallery-page {
  background-color: #f5efe0;
  background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
