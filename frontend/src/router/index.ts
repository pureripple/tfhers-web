import { createRouter, createWebHistory } from 'vue-router'
import UserLayout from '@/layouts/UserLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAdminAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAdmin?: boolean
    guestOnly?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: UserLayout,
      children: [
        { path: '', name: 'news', component: () => import('@/views/user/NewsView.vue') },
        { path: 'lobby', name: 'lobby', component: () => import('@/views/user/LobbyView.vue') },
        { path: 'rankings', name: 'rankings', component: () => import('@/views/user/RankingsView.vue') },
        { path: 'tournaments', name: 'tournaments', component: () => import('@/views/user/TournamentsView.vue') },
        { path: 'characters', name: 'characters', component: () => import('@/views/user/CharactersView.vue') },
        { path: 'ai-chat', name: 'ai-chat', component: () => import('@/views/user/AiChatView.vue') },
        {
          path: 'login',
          name: 'login',
          component: () => import('@/views/user/LoginView.vue'),
          meta: { guestOnly: true },
        },
      ],
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/views/admin/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAdmin: true },
      children: [
        { path: '', name: 'admin-statistics', component: () => import('@/views/admin/StatisticsView.vue') },
        { path: 'articles', name: 'admin-articles', component: () => import('@/views/admin/ArticlesView.vue') },
        { path: 'characters', name: 'admin-characters', component: () => import('@/views/admin/CharactersView.vue') },
        { path: 'user-combos', name: 'admin-user-combos', component: () => import('@/views/admin/UserCombosView.vue') },
        { path: 'comment-review', name: 'admin-comment-review', component: () => import('@/views/admin/CommentReviewView.vue') },
        { path: 'games', name: 'admin-games', component: () => import('@/views/admin/GamesView.vue') },
        { path: 'tournaments', name: 'admin-tournaments', component: () => import('@/views/admin/TournamentsView.vue') },
        { path: 'reports', name: 'admin-reports', component: () => import('@/views/admin/ReportsView.vue') },
        { path: 'feedback', name: 'admin-feedback', component: () => import('@/views/admin/FeedbackView.vue') },
        { path: 'users', name: 'admin-users', component: () => import('@/views/admin/UsersView.vue') },
        { path: 'profile', name: 'admin-profile', component: () => import('@/views/admin/ProfileView.vue') },
        { path: 'ai-chat', name: 'admin-ai-chat', component: () => import('@/views/admin/AiChatView.vue') },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const adminAuth = useAdminAuthStore()

  if (to.matched.some((r) => r.meta.requiresAdmin) && !adminAuth.isLoggedIn) {
    return {
      name: 'admin-login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.name === 'admin-login' && adminAuth.isLoggedIn) {
    return { path: '/admin' }
  }

  return true
})

export default router
