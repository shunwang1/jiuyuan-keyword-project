import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // 新增 server 配置
  server: {
    host: 'localhost', // 开发服务器主机名
    port: 5173,        // 开发服务器端口（默认值，可修改）
    open: false,       // 启动后是否自动打开浏览器
    // 代理配置（关键！）
    proxy: {
      '/api': { // 匹配所有以 /api 开头的请求
        target: 'http://localhost:8080', // 你的Spring Boot后端地址
        changeOrigin: true, // 修改请求头中的Host为目标URL，用于解决跨域
        secure: false, // 如果后端使用HTTPS且证书不受信任，可设为false
        // 可选：重写路径。如果你的后端接口没有统一的前缀，可以移除/api
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
