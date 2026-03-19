import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import Login from '../views/Login.vue'
import MainLayout from '../layouts/MainLayout.vue'
import DashboardEmpty from '../views/DashboardEmpty.vue'
import UploadReport from '../views/UploadReport.vue'
import SearchReport from '../views/SearchReport.vue'
import KeywordManage from '../views/KeywordManage.vue'
import UserManage from '../views/UserManage.vue'
import ReportPreviewWindow from '../views/ReportPreviewWindow.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: Login },

    // 独立预览窗口页
    { path: '/report-preview/:id', name: 'reportPreviewWindow', component: ReportPreviewWindow },

    {
      path: '/',
      component: MainLayout,
      children: [
        { path: '', name: 'home', component: DashboardEmpty },
        { path: 'upload', name: 'upload', component: UploadReport },
        { path: 'search', name: 'search', component: SearchReport },
        { path: 'keywords', name: 'keywords', component: KeywordManage, meta: { requiresAdmin: true } },
        { path: 'users', name: 'users', component: UserManage, meta: { requiresAdmin: true } },
      ],
    },

    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.loaded) {
    try {
      await auth.fetchMe()
    } catch {
      // ignore
    }
  }

  if (to.path !== '/login' && !auth.isAuthed) {
    return { path: '/login' }
  }

  if (to.path === '/login' && auth.isAuthed) {
    return { path: '/' }
  }

  return true
})

export default router
