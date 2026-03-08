import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// 导入页面组件
import Login from '../views/Login.vue'
import MainLayout from '../layouts/MainLayout.vue'
import DashboardEmpty from '../views/DashboardEmpty.vue' // 新增：空白首页
import UploadReport from '../views/UploadReport.vue'
import SearchReport from '../views/SearchReport.vue'
import KeywordManage from '../views/KeywordManage.vue'
import UserManage from '../views/UserManage.vue'

// 创建路由器实例
const router = createRouter({
  history: createWebHistory(), // 使用HTML5 History模式（需要后端支持）
  routes: [
    // 登录页面（无需认证）
    { path: '/login', name: 'login', component: Login },

    {
      path: '/', // 主应用路由
      component: MainLayout, // 主布局组件
      // 改动：取消默认重定向，避免登录后自动进入某个功能页
      children: [
        // 改动：默认子路由为空白页（访问 / 时内容区完全空白）
        { path: '', name: 'home', component: DashboardEmpty },

        // 嵌套路由（在MainLayout中显示）
        { path: 'upload', name: 'upload', component: UploadReport },
        { path: 'search', name: 'search', component: SearchReport },
        // 原来：{ path: 'keywords', name: 'keywords', component: KeywordManage },
        { path: 'keywords', name: 'keywords', component: KeywordManage, meta: { requiresAdmin: true } },
        {
          path: 'users',
          name: 'users',
          component: UserManage,
          meta: { requiresAdmin: true }, // 路由元信息：需要管理员权限
        },
      ],
    },

    // 404路由：匹配所有未定义路径并重定向到首页
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// 全局前置导航守卫（每次路由跳转前执行）
router.beforeEach(async (to) => {
  const auth = useAuthStore() // 获取当前认证状态

  // 改动：fetchMe 失败时不阻塞路由（避免接口失败导致页面卡住/空白）
  if (!auth.loaded) {
    try {
      await auth.fetchMe()
    } catch {
      // 忽略错误，交给下面的 isAuthed 判断处理
    }
  }

  // 1. 未登录访问受保护页面 => 重定向到登录页
  if (to.path !== '/login' && !auth.isAuthed) {
    return { path: '/login' }
  }

  // 2. 非管理员访问管理员页面 => 重定向到首页（空白页）
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { path: '/' }
  }

  // 3. 已登录用户访问登录页 => 重定向到首页（空白页）
  if (to.path === '/login' && auth.isAuthed) {
    return { path: '/' }
  }

  // 4. 允许导航
  return true
})

export default router
