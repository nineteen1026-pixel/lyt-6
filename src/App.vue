<script setup lang="ts">
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'
import AchievementToast from './components/AchievementToast.vue'
import { useAchievements } from './composables/useAchievements'

const router = useRouter()
const { currentToast, isToastVisible, closeToast, startListening } = useAchievements()

onMounted(() => {
  startListening()
})
</script>

<template>
  <router-view v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" />
    </Transition>
  </router-view>
  
  <AchievementToast
    v-if="currentToast"
    :achievement="currentToast"
    :visible="isToastVisible"
    @close="closeToast"
  />
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: all 0.4s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(20px);
  filter: blur(4px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-20px);
  filter: blur(4px);
}
</style>
