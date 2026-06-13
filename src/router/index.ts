import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import CommissionList from '@/pages/CommissionList.vue'
import ItemDetail from '@/pages/ItemDetail.vue'
import DeductionBoard from '@/pages/DeductionBoard.vue'
import RepairProcess from '@/pages/RepairProcess.vue'
import EndingPage from '@/pages/EndingPage.vue'
import GalleryPage from '@/pages/GalleryPage.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/commissions',
    name: 'commissions',
    component: CommissionList,
  },
  {
    path: '/commission/:id',
    name: 'commission',
    component: ItemDetail,
  },
  {
    path: '/deduction/:id',
    name: 'deduction',
    component: DeductionBoard,
  },
  {
    path: '/repair/:id',
    name: 'repair',
    component: RepairProcess,
  },
  {
    path: '/ending/:id/:type',
    name: 'ending',
    component: EndingPage,
  },
  {
    path: '/gallery',
    name: 'gallery',
    component: GalleryPage,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
