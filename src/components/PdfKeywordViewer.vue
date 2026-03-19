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
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const props = defineProps<{
  blob: Blob | null
  keywords: string[]
}>()

const containerRef = ref<HTMLDivElement | null>(null)

const ALL_KEY = '__ALL__'
const activeKeyword = ref<string>(ALL_KEY)

type HitBox = {
  el: HTMLDivElement
  page: number
  keyword: string
}

const hitBoxes = ref<HitBox[]>([])
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

function clearHitState() {
  hitBoxes.value.forEach((hit) => hit.el.classList.remove('hl-box--active'))
}

function applyCurrentHitState() {
  clearHitState()

  if (!hitBoxes.value.length) return
  const idx = currentHitIndex.value
  const target = hitBoxes.value[idx]
  if (!target) return

  target.el.classList.add('hl-box--active')
  target.el.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest',
  })
}

function collectHitsFromDom() {
  if (!containerRef.value) {
    hitBoxes.value = []
    hitCount.value = 0
    currentHitIndex.value = 0
    return
  }

  const found = Array.from(
    containerRef.value.querySelectorAll<HTMLDivElement>('.hl-box'),
  ).map((el) => ({
    el,
    page: Number(el.dataset.page || 0),
    keyword: String(el.dataset.keyword || ''),
  }))

  hitBoxes.value = found
  hitCount.value = found.length
  currentHitIndex.value = 0

  nextTick(() => {
    applyCurrentHitState()
  })
}

function goPrevHit() {
  if (!hitBoxes.value.length) return
  currentHitIndex.value =
    (currentHitIndex.value - 1 + hitBoxes.value.length) % hitBoxes.value.length
  applyCurrentHitState()
}

function goNextHit() {
  if (!hitBoxes.value.length) return
  currentHitIndex.value = (currentHitIndex.value + 1) % hitBoxes.value.length
  applyCurrentHitState()
}

function setActiveKeyword(keyword: string) {
  if (activeKeyword.value === keyword) return
  activeKeyword.value = keyword
}

function findMatchedKeyword(text: string, keywords: string[]): string | null {
  const source = String(text || '')
  if (!source) return null

  for (const kw of keywords) {
    if (!kw) continue
    const reg = new RegExp(escapeRegExp(kw), 'i')
    if (reg.test(source)) return kw
  }
  return null
}

async function renderPdf() {
  if (!props.blob || !containerRef.value) return

  const container = containerRef.value
  container.innerHTML = ''
  hitBoxes.value = []
  hitCount.value = 0
  currentHitIndex.value = 0

  const workingKeywords = getWorkingKeywords()
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
      canvasContext: context,
      viewport,
    }).promise

    const overlay = document.createElement('div')
    overlay.className = 'highlight-layer'
    overlay.style.width = `${viewport.width}px`
    overlay.style.height = `${viewport.height}px`

    const textContent = await page.getTextContent()

    if (workingKeywords.length) {
      for (const item of textContent.items) {
        if (!('str' in item)) continue

        const text = String(item.str || '').trim()
        if (!text) continue

        const matchedKeyword = findMatchedKeyword(text, workingKeywords)
        if (!matchedKeyword) continue

        const transform = pdfjsLib.Util.transform(viewport.transform, item.transform)
        const x = transform[4]
        const y = transform[5]
        const fontHeight = Math.hypot(transform[2], transform[3])
        const width = Math.max(item.width * viewport.scale, 12)
        const height = Math.max(fontHeight, 10)

        const box = document.createElement('div')
        box.className = 'hl-box'
        box.dataset.page = String(pageNum)
        box.dataset.keyword = matchedKeyword
        box.style.left = `${x}px`
        box.style.top = `${viewport.height - y - height}px`
        box.style.width = `${width}px`
        box.style.height = `${height}px`

        overlay.appendChild(box)
      }
    }

    pageWrap.appendChild(canvas)
    pageWrap.appendChild(overlay)
    container.appendChild(pageWrap)
  }

  collectHitsFromDom()
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
  position: relative;
}

.toolbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #fff;
  padding: 10px 0 12px;
  border-bottom: 1px solid #ebeef5;
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

.highlight-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hl-box {
  position: absolute;
  background: rgba(255, 235, 59, 0.28);
  border-radius: 2px;
}

.hl-box--active {
  background: rgba(255, 152, 0, 0.34) !important;
  box-shadow: 0 0 0 1px rgba(255, 152, 0, 0.6);
}
</style>
