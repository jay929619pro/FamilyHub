import { createRouter, createWebHistory } from 'vue-router'
import Lobby from '../views/Lobby/index.vue'

const routes = [
  {
    path: '/',
    name: 'Lobby',
    component: Lobby
  },
  {
    path: '/apps/draw-guess',
    name: 'DrawAndGuess',
    component: () => import('../apps/DrawAndGuess/index.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
