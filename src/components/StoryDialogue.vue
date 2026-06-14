<template>
  <Teleport to="body">
    <Transition name="dialogue-fade">
      <div
        v-if="gameStore.dialogueSession.isActive && currentNode"
        class="fixed inset-0 z-50 flex items-end justify-center pointer-events-none"
      >
        <div
          class="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
          @click="handleBackdropClick"
        ></div>

        <div class="relative w-full max-w-5xl mx-4 mb-8 pointer-events-auto">
          <div class="flex justify-end mb-3 gap-2">
            <button
              v-if="showHistoryToggle"
              @click="$emit('toggleHistory')"
              class="px-4 py-2 rounded-xl bg-white/90 text-stone-700 text-sm font-medium shadow-lg hover:bg-white transition-all border border-stone-200 flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>对话记录</span>
            </button>
            <button
              @click="handleSkip"
              class="px-4 py-2 rounded-xl bg-white/90 text-stone-500 text-sm font-medium shadow-lg hover:bg-white hover:text-stone-700 transition-all border border-stone-200"
            >
              跳过对话
            </button>
          </div>

          <div
            class="relative rounded-3xl shadow-2xl overflow-hidden transition-all duration-300"
            :class="speakerBoxClass"
          >
            <div class="absolute top-0 left-0 right-0 h-1.5 opacity-30"
                 :class="speakerBarClass"></div>

            <div class="flex gap-5 p-6 md:p-7">
              <div class="flex-shrink-0">
                <div
                  class="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center text-4xl md:text-5xl shadow-lg border-2 transition-all duration-300"
                  :class="avatarBoxClass"
                >
                  {{ speakerEmoji }}
                </div>
              </div>

              <div class="flex-1 min-w-0 flex flex-col">
                <div class="flex items-center gap-3 mb-3">
                  <span
                    class="text-lg md:text-xl font-bold tracking-wide"
                    :class="speakerNameClass"
                  >
                    {{ speakerDisplayName }}
                  </span>
                  <span
                    v-if="currentNode.mood && currentNode.mood !== 'neutral'"
                    class="px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="moodTagClass"
                  >
                    {{ moodDisplay }}
                  </span>
                </div>

                <div
                  class="text-base md:text-lg leading-relaxed min-h-[80px] whitespace-pre-wrap break-words"
                  :class="contentClass"
                >
                  {{ displayedText }}
                  <span
                    v-if="isTyping"
                    class="inline-block w-0.5 h-5 animate-pulse align-middle ml-0.5"
                    :class="typingCursorClass"
                  ></span>
                </div>

                <div
                  v-if="filteredChoices.length > 0 && !isTyping"
                  class="mt-6 pt-5 border-t border-stone-200/50"
                >
                  <p class="text-sm text-stone-500 mb-3 font-medium">请做出选择：</p>
                  <div class="flex flex-col gap-3">
                    <button
                      v-for="choice in filteredChoices"
                      :key="choice.id"
                      @click="handleChoiceSelect(choice.id)"
                      class="group w-full text-left px-5 py-4 rounded-2xl border-2 border-stone-200 bg-white/60 hover:bg-white hover:border-amber-400 hover:shadow-lg transition-all duration-200"
                    >
                      <div class="flex items-start gap-3">
                        <div class="flex-shrink-0 w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold group-hover:bg-amber-500 group-hover:text-white transition-all mt-0.5">
                          {{ ['①','②','③','④','⑤'][filteredChoices.indexOf(choice)] || '●' }}
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="font-medium text-stone-800 group-hover:text-amber-900 transition-colors">
                            {{ choice.label }}
                          </div>
                          <div
                            v-if="choice.description"
                            class="text-sm text-stone-500 mt-1.5 leading-snug"
                          >
                            {{ choice.description }}
                          </div>
                        </div>
                        <svg class="flex-shrink-0 w-5 h-5 text-stone-300 group-hover:text-amber-500 transition-colors mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </div>
                    </button>
                  </div>
                </div>

                <div
                  v-if="(filteredChoices.length === 0 || isTyping) && !isTyping"
                  class="mt-auto pt-5 flex justify-end items-center"
                >
                  <button
                    @click="handleAdvance"
                    class="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                    :class="advanceBtnClass"
                  >
                    <span>{{ isLastNode ? '完成' : '继续' }}</span>
                    <svg class="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                    </svg>
                  </button>
                </div>

                <div
                  v-if="isTyping"
                  class="mt-auto pt-5 flex justify-end"
                >
                  <button
                    @click="skipTyping"
                    class="text-xs text-stone-400 hover:text-stone-600 transition-colors px-3 py-1.5"
                  >
                    点击跳过文字动画
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useGameStore } from '../stores/game'
import type { DialogueCharacter } from '../types'

const props = defineProps<{
  showHistoryToggle?: boolean
}>()

const emit = defineEmits<{
  (e: 'dialogueEnd'): void
  (e: 'toggleHistory'): void
}>()

const gameStore = useGameStore()

const displayedText = ref('')
const isTyping = ref(false)
const typingSpeed = 28

let typingTimer: ReturnType<typeof setTimeout> | null = null

const currentNode = computed(() => gameStore.currentDialogueNode)

const filteredChoices = computed(() => {
  if (!currentNode.value) return []
  return gameStore.getFilteredChoices(currentNode.value)
})

const isLastNode = computed(() => {
  if (!currentNode.value) return false
  if (currentNode.value.isEndNode) return true
  if (filteredChoices.value.length > 0) return false
  if (currentNode.value.nextNodeId) return false
  return true
})

const speakerConfig: Record<DialogueCharacter, { emoji: string; name: string; theme: string }> = {
  shopkeeper: {
    emoji: '🧓',
    name: '修老板',
    theme: 'shopkeeper'
  },
  client: {
    emoji: '💁',
    name: '委托人',
    theme: 'client'
  },
  narrator: {
    emoji: '📖',
    name: '旁白',
    theme: 'narrator'
  },
  player: {
    emoji: '👤',
    name: '我',
    theme: 'player'
  },
  inner_thought: {
    emoji: '💭',
    name: '内心活动',
    theme: 'inner'
  }
}

const speakerTheme = computed(() => {
  if (!currentNode.value) return speakerConfig.narrator
  return speakerConfig[currentNode.value.speaker] || speakerConfig.narrator
})

const speakerEmoji = computed(() => speakerTheme.value.emoji)

const speakerDisplayName = computed(() => {
  if (!currentNode.value) return ''
  return currentNode.value.speakerName || speakerTheme.value.name
})

const themeStyles = {
  shopkeeper: {
    box: 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border border-amber-200',
    bar: 'bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400',
    avatar: 'bg-gradient-to-br from-amber-100 to-orange-200 border-amber-300 text-amber-900',
    name: 'text-amber-800',
    content: 'text-stone-700',
    cursor: 'bg-amber-600',
    btn: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg'
  },
  client: {
    box: 'bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 border border-blue-200',
    bar: 'bg-gradient-to-r from-blue-400 via-sky-400 to-indigo-400',
    avatar: 'bg-gradient-to-br from-blue-100 to-sky-200 border-blue-300 text-blue-900',
    name: 'text-blue-800',
    content: 'text-stone-700',
    cursor: 'bg-blue-600',
    btn: 'bg-gradient-to-r from-blue-500 to-sky-500 text-white hover:from-blue-600 hover:to-sky-600 shadow-md hover:shadow-lg'
  },
  narrator: {
    box: 'bg-gradient-to-br from-stone-100 via-neutral-50 to-gray-100 border border-stone-300',
    bar: 'bg-gradient-to-r from-stone-400 via-neutral-400 to-gray-400',
    avatar: 'bg-gradient-to-br from-stone-100 to-gray-200 border-stone-300 text-stone-700',
    name: 'text-stone-600 italic',
    content: 'text-stone-600 italic',
    cursor: 'bg-stone-500',
    btn: 'bg-gradient-to-r from-stone-500 to-gray-600 text-white hover:from-stone-600 hover:to-gray-700 shadow-md hover:shadow-lg'
  },
  player: {
    box: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 border border-emerald-200',
    bar: 'bg-gradient-to-r from-emerald-400 via-teal-400 to-green-400',
    avatar: 'bg-gradient-to-br from-emerald-100 to-teal-200 border-emerald-300 text-emerald-900',
    name: 'text-emerald-800',
    content: 'text-stone-700',
    cursor: 'bg-emerald-600',
    btn: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-md hover:shadow-lg'
  },
  inner: {
    box: 'bg-gradient-to-br from-purple-50 via-violet-50 to-fuchsia-50 border border-purple-200',
    bar: 'bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400',
    avatar: 'bg-gradient-to-br from-purple-100 to-violet-200 border-purple-300 text-purple-900',
    name: 'text-purple-700',
    content: 'text-stone-600 italic',
    cursor: 'bg-purple-600',
    btn: 'bg-gradient-to-r from-purple-500 to-violet-500 text-white hover:from-purple-600 hover:to-violet-600 shadow-md hover:shadow-lg'
  }
}

const activeTheme = computed(() => themeStyles[speakerTheme.value.theme as keyof typeof themeStyles] || themeStyles.narrator)

const speakerBoxClass = computed(() => activeTheme.value.box)
const speakerBarClass = computed(() => activeTheme.value.bar)
const avatarBoxClass = computed(() => activeTheme.value.avatar)
const speakerNameClass = computed(() => activeTheme.value.name)
const contentClass = computed(() => activeTheme.value.content)
const typingCursorClass = computed(() => activeTheme.value.cursor)
const advanceBtnClass = computed(() => activeTheme.value.btn)

const moodDisplay = computed(() => {
  const moods: Record<string, string> = {
    happy: '开心',
    sad: '悲伤',
    worried: '忧虑',
    hopeful: '期待',
    mysterious: '神秘',
    neutral: '平静',
    grateful: '感激'
  }
  if (!currentNode.value?.mood) return ''
  return moods[currentNode.value.mood] || ''
})

const moodTagClass = computed(() => {
  const classes: Record<string, string> = {
    happy: 'bg-yellow-100 text-yellow-700',
    sad: 'bg-blue-100 text-blue-700',
    worried: 'bg-orange-100 text-orange-700',
    hopeful: 'bg-green-100 text-green-700',
    mysterious: 'bg-purple-100 text-purple-700',
    neutral: 'bg-gray-100 text-gray-600',
    grateful: 'bg-pink-100 text-pink-700'
  }
  if (!currentNode.value?.mood) return classes.neutral
  return classes[currentNode.value.mood] || classes.neutral
})

function startTyping(text: string) {
  if (typingTimer) {
    clearTimeout(typingTimer)
    typingTimer = null
  }

  displayedText.value = ''
  isTyping.value = true
  let i = 0

  function typeNext() {
    if (i < text.length) {
      displayedText.value += text[i]
      i++
      typingTimer = setTimeout(typeNext, typingSpeed)
    } else {
      isTyping.value = false
      typingTimer = null
    }
  }

  typeNext()
}

function skipTyping() {
  if (!currentNode.value) return
  if (typingTimer) {
    clearTimeout(typingTimer)
    typingTimer = null
  }
  displayedText.value = currentNode.value.content
  isTyping.value = false
}

function handleAdvance() {
  if (isTyping.value) {
    skipTyping()
    return
  }
  const result = gameStore.advanceDialogueNode()
  if (result.finished) {
    emit('dialogueEnd')
  }
}

function handleChoiceSelect(choiceId: string) {
  if (isTyping.value) return
  const result = gameStore.selectDialogueChoice(choiceId)
  if (!result.success) return
  if (result.finished) {
    emit('dialogueEnd')
  }
}

function handleSkip() {
  if (typingTimer) {
    clearTimeout(typingTimer)
    typingTimer = null
  }
  gameStore.skipDialogueSession()
  emit('dialogueEnd')
}

function handleBackdropClick() {
  if (isTyping.value) {
    skipTyping()
    return
  }
}

watch(
  () => currentNode.value?.id,
  (newId) => {
    if (newId && currentNode.value) {
      nextTick(() => {
        startTyping(currentNode.value!.content)
      })
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (currentNode.value) {
    startTyping(currentNode.value.content)
  }
})
</script>

<style scoped>
.dialogue-fade-enter-active,
.dialogue-fade-leave-active {
  transition: all 0.35s ease;
}

.dialogue-fade-enter-from,
.dialogue-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
