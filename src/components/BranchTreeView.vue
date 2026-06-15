<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { GitBranch, X, RotateCcw, Map, History, Shield, Sparkles } from 'lucide-vue-next'
import { useGameStore } from '../stores/game'
import BranchTreeNode from './BranchTreeNode.vue'
import BranchTreeHistory from './BranchTreeHistory.vue'

const props = defineProps<{
  commissionId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'jumpToNode', nodeId: string): void
  (e: 'goBack'): void
  (e: 'applyRemedy', remedyId: string, stepIndex: number): void
}>()

const gameStore = useGameStore()

const expandedNodes = ref<Set<string>>(new Set())
const activeTab = ref<'tree' | 'history'>('tree')

const treeState = computed(() => gameStore.getBranchTreeState(props.commissionId))
const currentNode = computed(() => gameStore.getCurrentBranchNode(props.commissionId))
const stats = computed(() => gameStore.getBranchTreeStats(props.commissionId))
const pendingRemedies = computed(() => gameStore.getPendingRemedies(props.commissionId))

const rootNode = computed(() => {
  if (!treeState.value) return null
  return treeState.value.nodes[treeState.value.rootNodeId] || null
})

const canGoBack = computed(() => gameStore.canGoBack(props.commissionId))

const hasRemedies = computed(() => pendingRemedies.value.length > 0)

watch(() => props.commissionId, () => {
  expandedNodes.value = new Set()
  if (rootNode.value) {
    expandToCurrentNode()
  }
}, { immediate: true })

function expandToCurrentNode() {
  if (!treeState.value || !currentNode.value) return
  
  let node: typeof currentNode.value = currentNode.value
  while (node) {
    expandedNodes.value.add(node.id)
    if (!node.parentId) break
    node = treeState.value.nodes[node.parentId] || null
  }
}

function handleToggle(nodeId: string) {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId)
  } else {
    expandedNodes.value.add(nodeId)
  }
}

function handleJump(nodeId: string) {
  emit('jumpToNode', nodeId)
}

function handleGoBack() {
  emit('goBack')
}

function handleApplyRemedy(remedyId: string) {
  const treeStateVal = treeState.value
  if (!treeStateVal) return
  const remedy = treeStateVal.remedies.find(r => r.id === remedyId)
  if (!remedy) return
  const stepIndex = remedy.stepId.split('-').map(Number).pop() || 0
  emit('applyRemedy', remedyId, stepIndex - 1)
}

function formatWeight(weight: number): string {
  return Math.round(weight * 100) / 100 + ''
}

const weightDistribution = computed(() => {
  if (!currentNode.value || !treeState.value) return null
  const stepIndex = currentNode.value.stepIndex + 1
  return gameStore.getWeightDistributionForStep(props.commissionId, stepIndex)
})
</script>

<template>
  <div class="branch-tree-view h-full flex flex-col bg-stone-50/95 backdrop-blur-sm">
    <div class="p-4 border-b border-stone-200 bg-white">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <GitBranch class="w-5 h-5 text-amber-600" />
          <h3 class="font-serif font-bold text-stone-800">分支树</h3>
        </div>
        <button
          class="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-lg hover:bg-stone-100"
          @click="emit('close')"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
      
      <div class="grid grid-cols-3 gap-2 text-xs">
        <div class="p-2.5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200">
          <div class="text-stone-500 mb-0.5">已探索</div>
          <div class="text-lg font-bold text-amber-600">
            {{ stats.discoveredPaths }}/{{ stats.totalPaths }}
          </div>
        </div>
        <div class="p-2.5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
          <div class="text-stone-500 mb-0.5">探索度</div>
          <div class="text-lg font-bold text-green-600">
            {{ stats.discoveryPercentage }}%
          </div>
        </div>
        <div class="p-2.5 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg border border-purple-200">
          <div class="text-stone-500 mb-0.5">结局</div>
          <div class="text-lg font-bold text-purple-600">
            {{ stats.endingsUnlocked }}/{{ stats.totalEndings }}
          </div>
        </div>
      </div>

      <div v-if="hasRemedies" class="mt-3 p-2.5 bg-gradient-to-r from-amber-50 to-rose-50 rounded-lg border border-amber-200">
        <div class="flex items-center gap-1.5 mb-2">
          <Shield class="w-3.5 h-3.5 text-amber-600" />
          <span class="text-xs font-medium text-amber-700 font-serif">补救机会</span>
        </div>
        <div class="space-y-1.5">
          <button
            v-for="remedy in pendingRemedies"
            :key="remedy.id"
            class="w-full text-left p-2 rounded-md bg-white/80 hover:bg-white border border-amber-200/60 transition-all text-xs"
            @click="handleApplyRemedy(remedy.id)"
          >
            <div class="flex items-center gap-1.5">
              <Sparkles class="w-3 h-3 text-amber-500 flex-shrink-0" />
              <span class="font-serif text-stone-700">{{ remedy.description }}</span>
            </div>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-amber-600">权重 {{ formatWeight(remedy.weight) }}</span>
              <span class="px-1.5 py-0.5 rounded-full text-[10px]"
                :class="remedy.remedyType === 'alternative' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'"
              >
                {{ remedy.remedyType === 'alternative' ? '替代方案' : '提示引导' }}
              </span>
            </div>
          </button>
        </div>
      </div>

      <div v-if="weightDistribution" class="mt-3 p-2.5 bg-white/60 rounded-lg border border-stone-200">
        <div class="text-xs text-stone-500 mb-2 font-serif">下一步权重分布</div>
        <div class="flex items-center gap-1 h-4 rounded-full overflow-hidden">
          <div
            v-if="weightDistribution.total > 0"
            class="h-full bg-green-400 transition-all duration-500"
            :style="{ width: `${(weightDistribution.goodWeight / weightDistribution.total) * 100}%` }"
          />
          <div
            v-if="weightDistribution.total > 0"
            class="h-full bg-amber-400 transition-all duration-500"
            :style="{ width: `${(weightDistribution.neutralWeight / weightDistribution.total) * 100}%` }"
          />
          <div
            v-if="weightDistribution.total > 0"
            class="h-full bg-rose-400 transition-all duration-500"
            :style="{ width: `${(weightDistribution.badWeight / weightDistribution.total) * 100}%` }"
          />
        </div>
        <div class="flex justify-between mt-1.5 text-[10px] text-stone-400 font-serif">
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-green-400"></span>
            优 {{ weightDistribution.total > 0 ? Math.round((weightDistribution.goodWeight / weightDistribution.total) * 100) : 0 }}%
          </span>
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            中 {{ weightDistribution.total > 0 ? Math.round((weightDistribution.neutralWeight / weightDistribution.total) * 100) : 0 }}%
          </span>
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-rose-400"></span>
            差 {{ weightDistribution.total > 0 ? Math.round((weightDistribution.badWeight / weightDistribution.total) * 100) : 0 }}%
          </span>
        </div>
      </div>
    </div>

    <div class="flex border-b border-stone-200 bg-white">
      <button
        class="flex-1 py-2 text-xs font-serif transition-colors flex items-center justify-center gap-1.5"
        :class="activeTab === 'tree' ? 'text-amber-600 border-b-2 border-amber-500' : 'text-stone-400 hover:text-stone-600'"
        @click="activeTab = 'tree'"
      >
        <GitBranch class="w-3.5 h-3.5" />
        <span>分支图</span>
      </button>
      <button
        class="flex-1 py-2 text-xs font-serif transition-colors flex items-center justify-center gap-1.5"
        :class="activeTab === 'history' ? 'text-amber-600 border-b-2 border-amber-500' : 'text-stone-400 hover:text-stone-600'"
        @click="activeTab = 'history'"
      >
        <History class="w-3.5 h-3.5" />
        <span>历史</span>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="activeTab === 'tree'" class="tree-container space-y-1">
        <BranchTreeNode 
          v-if="rootNode && treeState"
          :node="rootNode"
          :tree-nodes="treeState.nodes"
          :expanded-nodes="expandedNodes"
          :current-node-id="currentNode?.id || null"
          @toggle="handleToggle"
          @jump="handleJump"
        />
        
        <div v-else class="text-center py-12 text-stone-400">
          <Map class="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p class="text-sm">暂无分支数据</p>
          <p class="text-xs mt-1">开始修复以探索不同分支</p>
        </div>
      </div>

      <div v-else>
        <BranchTreeHistory :commission-id="commissionId" />
      </div>
    </div>

    <div class="p-4 border-t border-stone-200 bg-white space-y-3">
      <button
        class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-200 text-stone-700 rounded-lg font-medium hover:bg-stone-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-stone-200"
        :disabled="!canGoBack"
        @click="handleGoBack"
      >
        <RotateCcw class="w-4 h-4" />
        <span>回退一步</span>
      </button>
      
      <div class="flex items-center justify-center gap-3 text-xs text-stone-500 pt-1">
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-green-500"></span>
          <span>优</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-amber-500"></span>
          <span>中</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-rose-500"></span>
          <span>差</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-purple-500"></span>
          <span>补救</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-blue-500 opacity-60"></span>
          <span>结局</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tree-container {
  position: relative;
}
</style>
