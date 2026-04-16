import { createRouter, createWebHistory } from 'vue-router'
import HubView from '../views/HubView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'hub',
      component: HubView
    },
    {
      path: '/period',
      name: 'period',
      component: () => import('../views/period/PeriodHome.vue')
    },
    {
      path: '/period/log',
      name: 'period-log',
      component: () => import('../views/period/PeriodLog.vue')
    },
    {
      path: '/period/cycle/:id',
      name: 'period-cycle',
      component: () => import('../views/period/CycleDetail.vue')
    },
    {
      path: '/logs',
      name: 'logs',
      component: () => import('../views/LogsDashboard.vue')
    }
  ]
})

export default router