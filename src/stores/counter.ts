/**
 * Vue 3 + Pinia Composition API 风格的状态管理示例
 * 这是一个计数器Store，用于演示Pinia的基本用法
 * 注意：此Store仅用于前端状态管理，不与后端交互
 */

// 导入Vue 3的响应式API和Pinia
import { ref, computed } from 'vue'  // Vue 3的响应式API
import { defineStore } from 'pinia'  // Pinia状态管理库

/**
 * 使用Composition API风格定义Pinia Store
 *
 * 与Options API风格不同，Composition API风格：
 * 1. 更灵活，类似Vue 3的setup()函数
 * 2. 支持按需导入响应式API
 * 3. 适合复杂逻辑和类型推导
 *
 * @returns {Object} 包含状态、计算属性和方法的对象
 */
export const useCounterStore = defineStore('counter', () => {
  // 定义响应式状态 - 类似于Vue组件中的ref()
  const count = ref(0)  // count是一个响应式引用，初始值为0

  // 定义计算属性 - 类似于Vue组件中的computed()
  const doubleCount = computed(() => count.value * 2)

  // 定义操作方法 - 修改状态的方法
  function increment() {
    count.value++  // 修改ref的值需要使用.value
  }

  // 暴露给组件使用的属性和方法
  return {
    count,        // 响应式状态
    doubleCount,  // 计算属性
    increment     // 操作方法
  }
})
