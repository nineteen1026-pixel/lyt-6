<script lang="ts">
import { defineComponent, computed } from 'vue'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import type { BranchTreeNode as BranchTreeNodeType } from '../types'

export default defineComponent({
  name: 'BranchTreeNode',
  props: {
    node: {
      type: Object as () => BranchTreeNodeType,
      required: true
    },
    treeNodes: {
      type: Object as () => Record<string, BranchTreeNodeType>,
      required: true
    },
    expandedNodes: {
      type: Set as unknown as () => Set<string>,
      required: true
    },
    currentNodeId: {
      type: String,
      default: null
    }
  },
  emits: ['toggle', 'jump'],
  setup(props, { emit }) {
    const hasChildren = computed(() => {
      return props.node.childIds && props.node.childIds.length > 0
    })

    const isExpanded = computed(() => {
      return props.expandedNodes.has(props.node.id)
    })

    const isCurrent = computed(() => {
      return props.currentNodeId === props.node.id
    })

    const children = computed(() => {
      return props.node.childIds
        .map(id => props.treeNodes[id])
        .filter((n): n is BranchTreeNodeType => n !== undefined)
        .sort((a, b) => {
          const typeOrder: Record<string, number> = { good: 0, neutral: 1, bad: 2 }
          const aType = a.endingType || 'neutral'
          const bType = b.endingType || 'neutral'
          return (typeOrder[aType] || 1) - (typeOrder[bType] || 1)
        })
    })

    const nodeIcon = computed(() => {
      if (props.node.stepId === 'root') return '🌱'
      switch (props.node.endingType) {
        case 'good': return '✨'
        case 'neutral': return '🌿'
        case 'bad': return '⚠️'
        default: return '🔧'
      }
    })

    const nodeColorClass = computed(() => {
      if (isCurrent.value) {
        switch (props.node.endingType) {
          case 'good': return 'border-green-400 bg-green-50 text-green-700'
          case 'neutral': return 'border-amber-400 bg-amber-50 text-amber-700'
          case 'bad': return 'border-rose-400 bg-rose-50 text-rose-700'
          default: return 'border-amber-400 bg-amber-50 text-amber-700'
        }
      }
      if (props.node.isVisited) {
        return 'border-stone-300 bg-stone-100 text-stone-500'
      }
      return 'border-stone-200 bg-stone-50 text-stone-400'
    })

    const nodeBgClass = computed(() => {
      if (isCurrent.value) {
        switch (props.node.endingType) {
          case 'good': return 'bg-green-500 text-white'
          case 'neutral': return 'bg-amber-500 text-white'
          case 'bad': return 'bg-rose-500 text-white'
          default: return 'bg-amber-500 text-white'
        }
      }
      if (props.node.isVisited) {
        return 'bg-stone-300 text-stone-600'
      }
      return 'bg-stone-200 text-stone-400'
    })

    const stepTitle = computed(() => {
      if (props.node.stepId === 'root') return '开始'
      if (props.node.choiceLabel) return props.node.choiceLabel
      return `步骤 ${props.node.stepIndex + 1}`
    })

    function handleToggle() {
      emit('toggle', props.node.id)
    }

    function handleClick() {
      if (props.node.isVisited && !isCurrent.value) {
        emit('jump', props.node.id)
      }
    }

    return {
      hasChildren,
      isExpanded,
      isCurrent,
      children,
      nodeIcon,
      nodeColorClass,
      nodeBgClass,
      stepTitle,
      handleToggle,
      handleClick,
      ChevronDown,
      ChevronRight
    }
  },
  template: `
    <div class="branch-tree-node">
      <div
        class="flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all"
        :class="[
          nodeColorClass,
          isCurrent ? 'ring-2 ring-offset-1 ring-amber-400' : '',
          node.isVisited && !isCurrent ? 'hover:shadow-md' : 'cursor-default opacity-60'
        ]"
        @click="handleClick"
      >
        <button
          v-if="hasChildren"
          class="w-5 h-5 flex items-center justify-center rounded hover:bg-black/5 transition-colors"
          @click.stop="handleToggle"
        >
          <ChevronDown v-if="isExpanded" class="w-4 h-4" />
          <ChevronRight v-else class="w-4 h-4" />
        </button>
        <div v-else class="w-5 h-5"></div>
        
        <div
          class="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
          :class="nodeBgClass"
        >
          {{ nodeIcon }}
        </div>
        
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">{{ stepTitle }}</div>
          <div v-if="node.stepId !== 'root'" class="text-xs opacity-70">
            步骤 {{ node.stepIndex + 1 }}
          </div>
        </div>

        <div v-if="isCurrent" class="text-xs font-medium px-2 py-0.5 rounded-full bg-white/50">
          当前
        </div>
      </div>
      
      <div
        v-if="hasChildren && isExpanded"
        class="ml-6 mt-1 pl-3 border-l-2 border-stone-200 space-y-1"
      >
        <BranchTreeNode
          v-for="child in children"
          :key="child.id"
          :node="child"
          :tree-nodes="treeNodes"
          :expanded-nodes="expandedNodes"
          :current-node-id="currentNodeId"
          @toggle="(id: string) => emit('toggle', id)"
          @jump="(id: string) => emit('jump', id)"
        />
      </div>
    </div>
  `
})
</script>
