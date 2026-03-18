<template>
  <div class="viewer">
    <div v-if="normalizedKeywords.length" class="toolbar">
      <div class="toolbar__left">
        <span class="toolbar__label">高亮关键词：</span>

        <el-tag
          size="small"
          :type="activeKeyword === ALL_KEY ? 'danger' : 'info'"
          :effect="activeKeyword === ALL_KEY ? 'dark' : 'plain'"
          class="toolbar__tag"
          @click="setActiveKeyword(ALL_KEY)"
        >
          全部
        </el-tag>

        <el-tag
          v-for="kw in normalizedKeywords"
          :key="kw"
          size="small"
          :type="activeKeyword === kw ? 'danger' : 'warning'"
          :effect="activeKeyword === kw ? 'dark' : 'plain'"
          class="toolbar__tag"
          @click="setActiveKeyword(kw)"
        >
          {{ kw }}
        </el-tag>
      </div>

      <div class="toolbar__right">
        <span class="hit-info">
          共命中 {{ hitCount }} 处
          <template v-if="hitCount > 0">
            （{{ currentHitIndex + 1 }} / {{ hitCount }}）
          </template>
        </span>
        <el-button size="small" :disabled="hitCount === 0" @click="goPrevHit">上一个</el-button>
        <el-button size="small" :disabled="hitCount === 0" @click="goNextHit">下一个</el-button>
      </div>
    </div>

    <div ref="containerRef" class="pages"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const props = defineProps<{
  blob: Blob | null
  keywords: string[]
}>()

const containerRef = ref<HTMLDivElement | null>(null)

const ALL_KEY = '__ALL__'
const activeKeyword = ref<string>(ALL_KEY)

const hitElements = ref<HTMLElement[]>([])
const hitCount = ref(0)
const currentHitIndex = ref(0)

const normalizedKeywords = computed(() =>
  [...props.keywords]
    .map((x) => x.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length),
)

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getWorkingKeywords() {
  if (activeKeyword.value === ALL_KEY) return normalizedKeywords.value
  return activeKeyword.value ? [activeKeyword.value] : []
}

function highlightText(text: string) {
  const workingKeywords = getWorkingKeywords()
  if (!workingKeywords.length) return text

  const reg = new RegExp(`(${workingKeywords.map(escapeRegExp).join('|')})`, 'gi')
  return text.replace(reg, '<mark class="pdf-hl">$1</mark>')
}

function clearHitState() {
  hitElements.value.forEach((el) => el.classList.remove('pdf-hl--active'))
}

function applyCurrentHitState() {
  clearHitState()

  if (!hitElements.value.length) return
  const idx = currentHitIndex.value
  const target = hitElements.value[idx]
  if (!target) return

  target.classList.add('pdf-hl--active')
  target.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest',
  })
}

function collectHitElements() {
  if (!containerRef.value) {
    hitElements.value = []
    hitCount.value = 0
    currentHitIndex.value = 0
    return
  }

  const found = Array.from(
    containerRef.value.querySelectorAll<HTMLElement>('mark.pdf-hl'),
  )

  hitElements.value = found
  hitCount.value = found.length
  currentHitIndex.value = 0

  nextTick(() => {
    applyCurrentHitState()
  })
}

function goPrevHit() {
  if (!hitElements.value.length) return
  currentHitIndex.value =
    (currentHitIndex.value - 1 + hitElements.value.length) % hitElements.value.length
  applyCurrentHitState()
}

function goNextHit() {
  if (!hitElements.value.length) return
  currentHitIndex.value = (currentHitIndex.value + 1) % hitElements.value.length
  applyCurrentHitState()
}

function setActiveKeyword(keyword: string) {
  if (activeKeyword.value === keyword) return
  activeKeyword.value = keyword
}

async function renderPdf() {
  if (!props.blob || !containerRef.value) return

  const container = containerRef.value
  container.innerHTML = ''
  hitElements.value = []
  hitCount.value = 0
  currentHitIndex.value = 0

  const arrayBuffer = await props.blob.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.4 })

    const pageWrap = document.createElement('div')
    pageWrap.className = 'page-wrap'
    pageWrap.style.width = `${viewport.width}px`

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) continue

    canvas.width = viewport.width
    canvas.height = viewport.height
    canvas.className = 'page-canvas'

    await page.render({
      canvas,
      canvasContext: context,
      viewport,
    }).promise

    const textLayer = document.createElement('div')
    textLayer.className = 'text-layer'
    textLayer.style.width = `${viewport.width}px`
    textLayer.style.height = `${viewport.height}px`

    const textContent = await page.getTextContent()

    for (const item of textContent.items) {
      if (!('str' in item)) continue

      const span = document.createElement('span')
      span.className = 'text-item'

      const transform = pdfjsLib.Util.transform(viewport.transform, item.transform)
      const x = transform[4]
      const y = transform[5]
      const fontHeight = Math.hypot(transform[2], transform[3])

      span.style.left = `${x}px`
      span.style.top = `${viewport.height - y}px`
      span.style.fontSize = `${fontHeight}px`
      span.style.transform = 'translateY(-100%)'
      span.style.transformOrigin = 'left top'
      span.innerHTML = highlightText(item.str)

      textLayer.appendChild(span)
    }

    pageWrap.appendChild(canvas)
    pageWrap.appendChild(textLayer)
    container.appendChild(pageWrap)
  }

  collectHitElements()
}

watch(
  () => [props.blob, props.keywords.join('|'), activeKeyword.value],
  async () => {
    await nextTick()
    await renderPdf()
  },
)

watch(
  () => props.keywords.join('|'),
  () => {
    activeKeyword.value = ALL_KEY
  },
)

onMounted(async () => {
  await renderPdf()
})

defineExpose({
  setActiveKeyword,
  goPrevHit,
  goNextHit,
})
</script>

<style scoped>
.viewer {
  width: 100%;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.toolbar__left {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.toolbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar__label {
  color: #666;
  font-size: 13px;
}

.toolbar__tag {
  cursor: pointer;
  user-select: none;
}

.hit-info {
  color: #666;
  font-size: 13px;
}

.pages {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.page-wrap {
  position: relative;
  background: #fff;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.12);
}

.page-canvas {
  display: block;
}

.text-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.text-item {
  position: absolute;
  color: transparent;
  white-space: pre;
}

/* 底部荧光条：只标记文字下半部分，不遮住字形 */
:deep(.pdf-hl) {
  background: linear-gradient(
    to top,
    rgba(255, 235, 59, 0.38) 0%,
    rgba(255, 235, 59, 0.38) 32%,
    transparent 32%,
    transparent 100%
  );
  color: transparent;
  border-radius: 0;
  padding: 0;
}

/* 当前命中：稍微明显一点，但仍不整块盖字 */
:deep(.pdf-hl--active) {
  background: linear-gradient(
    to top,
    rgba(255, 152, 0, 0.52) 0%,
    rgba(255, 152, 0, 0.52) 38%,
    transparent 38%,
    transparent 100%
  ) !important;
  box-shadow: none;
}
</style>
