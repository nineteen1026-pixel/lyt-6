<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { GitBranch, X, RotateCcw, Map } from 'lucide-vue-next'
import { useGameStore } from '../stores/game'
import BranchTreeNode from './BranchTreeNode.vue'

const props = defineProps<{
  commissionId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'jumpToNode', nodeId: string): void
  (e: 'goBack'): void
}>()

const gameStore = useGameStore()

const expandedNodes = ref<Set<string>>(new Set())

const treeState = computed(() => gameStore.getBranchTreeState(props.commissionId))
const currentNode = computed(() => gameStore.getCurrentBranchNode(props.commissionId))
const stats = computed(() => gameStore.getBranchTreeStats(props.commissionId))

const rootNode = computed(() => {
  if (!treeState.value) return null
  return treeState.value.nodes[treeState.value.rootNodeId] || null
})

const canGoBack = computed(() => gameStore.canGoBack(props.commissionId))

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
      
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="p-2.5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200">
          <div class="text-stone-500 mb-0.5">已探索路径</div>
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
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="rootNode && treeState" class="tree-container space-y-1">
        <BranchTreeNode 
          :node="rootNode"
          :tree-nodes="treeState.nodes"
          :expanded-nodes="expandedNodes"
          :current-node-id="currentNode?.id || null"
          @toggle="handleToggle"
          @jump="handleJump"
        />
      </div>
      
      <div v-else class="text-center py-12 text-stone-400">
        <Map class="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p class="text-sm">暂无分支数据</p>
        <p class="text-xs mt-1">开始修复以探索不同分支</p>
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
      
      <div class="flex items-center justify-center gap-4 text-xs text-stone-500 pt-1">
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-green-500"></span>
          <span>优选择</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-amber-500"></span>
          <span>中选择</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-rose-500"></span>
          <span>差选择</span>
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
