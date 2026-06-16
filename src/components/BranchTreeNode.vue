<script lang="ts">
import { defineComponent, computed } from 'vue'
import { ChevronDown, ChevronRight, Shield, Star } from 'lucide-vue-next'
import type { BranchTreeNode as BranchTreeNodeType } from '../types'
import { useSound } from '../composables/useSound'

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
  components: { ChevronDown, ChevronRight, Shield, Star },
  setup(props, { emit }) {
    const { playClick, playSuccess, playError, playTransition, playDiscover, playComplete, playUndo } = useSound()

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
          if (a.isRemedyNode && !b.isRemedyNode) return 1
          if (!a.isRemedyNode && b.isRemedyNode) return -1
          const typeOrder: Record<string, number> = { good: 0, neutral: 1, bad: 2 }
          const aType = a.endingType || 'neutral'
          const bType = b.endingType || 'neutral'
          return (typeOrder[aType] || 1) - (typeOrder[bType] || 1)
        })
    })

    const nodeIcon = computed(() => {
      if (props.node.stepId === 'root') return '🌱'
      if (props.node.isRemedyNode) return '🛡️'
      if (props.node.triggeredEndingId) return '🎯'
      switch (props.node.endingType) {
        case 'good': return '✨'
        case 'neutral': return '🌿'
        case 'bad': return '⚠️'
        default: return '🔧'
      }
    })

    const nodeColorClass = computed(() => {
      if (isCurrent.value) {
        if (props.node.isRemedyNode) return 'border-purple-400 bg-purple-50 text-purple-700'
        switch (props.node.endingType) {
          case 'good': return 'border-green-400 bg-green-50 text-green-700'
          case 'neutral': return 'border-amber-400 bg-amber-50 text-amber-700'
          case 'bad': return 'border-rose-400 bg-rose-50 text-rose-700'
          default: return 'border-amber-400 bg-amber-50 text-amber-700'
        }
      }
      if (props.node.isRemedyNode) return 'border-purple-200 bg-purple-50/30 text-purple-500'
      if (props.node.triggeredEndingId) return 'border-blue-200 bg-blue-50/30 text-blue-500'
      if (props.node.isVisited) {
        return 'border-stone-300 bg-stone-100 text-stone-500'
      }
      return 'border-stone-200 bg-stone-50 text-stone-400'
    })

    const nodeBgClass = computed(() => {
      if (isCurrent.value) {
        if (props.node.isRemedyNode) return 'bg-purple-500 text-white'
        switch (props.node.endingType) {
          case 'good': return 'bg-green-500 text-white'
          case 'neutral': return 'bg-amber-500 text-white'
          case 'bad': return 'bg-rose-500 text-white'
          default: return 'bg-amber-500 text-white'
        }
      }
      if (props.node.isRemedyNode) return 'bg-purple-300 text-purple-700'
      if (props.node.triggeredEndingId) return 'bg-blue-300 text-blue-700'
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

    const weightPercent = computed(() => {
      return Math.round(props.node.normalizedWeight * 100)
    })

    const weightBarColor = computed(() => {
      if (props.node.isRemedyNode) return 'bg-purple-400'
      switch (props.node.endingType) {
        case 'good': return 'bg-green-400'
        case 'neutral': return 'bg-amber-400'
        case 'bad': return 'bg-rose-400'
        default: return 'bg-stone-400'
      }
    })

    function handleToggle() {
      playClick()
      emit('toggle', props.node.id)
    }

    function handleClick() {
      if (props.node.isVisited && !isCurrent.value) {
        playTransition()
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
      weightPercent,
      weightBarColor,
      handleToggle,
      handleClick,
      ChevronDown,
      ChevronRight,
      Shield,
      Star
    }
  },
  template: `
    <div class="branch-tree-node">
      <div
        class="flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer transition-all"
        :class="[
          nodeColorClass,
          isCurrent ? 'ring-2 ring-offset-1 ring-amber-400' : '',
          node.isVisited && !isCurrent ? 'hover:shadow-md' : 'cursor-default opacity-60'
        ]"
        @click="handleClick"
      >
        <button
          v-if="hasChildren"
          class="w-4 h-4 flex items-center justify-center rounded hover:bg-black/5 transition-colors flex-shrink-0"
          @click.stop="handleToggle"
        >
          <ChevronDown v-if="isExpanded" class="w-3 h-3" />
          <ChevronRight v-else class="w-3 h-3" />
        </button>
        <div v-else class="w-4 h-4 flex-shrink-0"></div>
        
        <div
          class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0"
          :class="nodeBgClass"
        >
          {{ nodeIcon }}
        </div>
        
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1">
            <span class="text-xs font-medium truncate font-serif">{{ stepTitle }}</span>
            <span
              v-if="node.isRemedyNode"
              class="text-[9px] px-1 py-0.5 rounded-full bg-purple-200/60 text-purple-600 flex-shrink-0"
            >
              补救
            </span>
            <span
              v-if="node.triggeredEndingId"
              class="text-[9px] px-1 py-0.5 rounded-full bg-blue-200/60 text-blue-600 flex-shrink-0"
            >
              结局
            </span>
            <span
              v-if="node.remedyAvailable"
              class="text-[9px] px-1 py-0.5 rounded-full bg-amber-200/60 text-amber-600 flex-shrink-0"
            >
              可补救
            </span>
          </div>
          <div v-if="node.stepId !== 'root'" class="flex items-center gap-2 mt-0.5">
            <span class="text-[10px] opacity-60 font-serif">步骤 {{ node.stepIndex + 1 }}</span>
            <div class="flex-1 h-1 rounded-full bg-black/5 overflow-hidden max-w-16">
              <div
                class="h-full rounded-full transition-all duration-300"
                :class="weightBarColor"
                :style="{ width: weightPercent + '%' }"
              />
            </div>
            <span class="text-[10px] opacity-50 font-serif">{{ weightPercent }}%</span>
          </div>
        </div>

        <div v-if="isCurrent" class="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/50 flex-shrink-0">
          当前
        </div>
      </div>
      
      <div
        v-if="hasChildren && isExpanded"
        class="ml-5 mt-1 pl-3 border-l-2 space-y-1"
        :class="node.isRemedyNode ? 'border-purple-200' : 'border-stone-200'"
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
