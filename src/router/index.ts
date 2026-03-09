import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import Login from '../views/Login.vue'
import MainLayout from '../layouts/MainLayout.vue'
import DashboardEmpty from '../views/DashboardEmpty.vue'
import UploadReport from '../views/UploadReport.vue'
import SearchReport from '../views/SearchReport.vue'
import KeywordManage from '../views/KeywordManage.vue'
import UserManage from '../views/UserManage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: Login },

    {
      path: '/',
      component: MainLayout,
      children: [
        { path: '', name: 'home', component: DashboardEmpty },
        { path: 'upload', name: 'upload', component: UploadReport },
        { path: 'search', name: 'search', component: SearchReport },

        // 仍保留 requiresAdmin 标记，便于未来后端补齐 role 后恢复前端强校验
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

  // 未登录访问受保护页面 => 去登录
  if (to.path !== '/login' && !auth.isAuthed) {
    return { path: '/login' }
  }

  // 已登录访问登录页 => 回首页
  if (to.path === '/login' && auth.isAuthed) {
    return { path: '/' }
  }

  /**
   * 联调模式说明：
   * - JWT payload 目前不包含 role/securityLevel，前端无法可靠判断管理员
   * - 因此这里不再做 requiresAdmin 的前端拦截
   * - 管理员权限由后端鉴权返回 403 兜底（页面会提示“无权限”）
   *
   * 等后端补充 role 后，可恢复：
   * if (to.meta.requiresAdmin && !auth.isAdmin) return { path: '/' }
   */
  return true
})

export default router
