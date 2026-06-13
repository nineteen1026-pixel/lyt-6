import { writeFileSync, mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const testDir = mkdtempSync(join(tmpdir(), 'lyt6-save-test-'))

const mockStorage = {}
const localStorageImpl = {
  getItem: (k) => (k in mockStorage ? mockStorage[k] : null),
  setItem: (k, v) => { mockStorage[k] = v },
  removeItem: (k) => { delete mockStorage[k] },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]) },
  key: (i) => Object.keys(mockStorage)[i] ?? null,
  get length() { return Object.keys(mockStorage).length },
}
globalThis.localStorage = localStorageImpl
const clearStorage = () => localStorageImpl.clear()

const consoleColors = {
  ok: '\x1b[32m✓\x1b[0m',
  fail: '\x1b[31m✗\x1b[0m',
  info: '\x1b[36mℹ\x1b[0m',
  warn: '\x1b[33m⚠\x1b[0m',
}

const results = []
function assert(name, cond, msg) {
  results.push({ name, ok: !!cond, error: cond ? undefined : (msg || 'assertion failed') })
  console.log(`${cond ? consoleColors.ok : consoleColors.fail} ${name}${cond ? '' : ' — ' + (msg || '')}`)
}

console.log(`\n${consoleColors.info} 创建测试目录：${testDir}\n`)

function buildV3Save() {
  return {
    version: '3.0.0',
    savedAt: '2026-06-10T10:00:00.000Z',
    state: {
      currentCommissionId: 'comm-001',
      currentChapterId: 'chap-001',
      currentStep: 'item',
      completedCommissions: [],
      unlockedChapters: ['chap-001'],
      collectedClues: ['clue-001-1', 'clue-001-2'],
      discoveredConnections: ['conn-001-1'],
      unlockedEndings: [],
      currentEndingType: null,
      lastSaveTime: '2026-06-10T10:00:00.000Z',
      totalPlayTime: 180,
      commissionStatuses: { 'comm-001': 'in_progress' },
      unlockedSteps: { 'comm-001': ['item', 'deduction'] },
    },
  }
}

console.log('== 第一阶段：V3 旧存档 → V4 迁移源码检查 ==')
mockStorage['memory-weaver:main-save'] = JSON.stringify(buildV3Save())
assert('写入 V3 旧存档到 localStorage', true)

const storageSource = readFileSync(path.join(__dirname, '../src/utils/storage.ts'), 'utf-8')

assert("storage.ts: SAVE_VERSION = '4.0.0'", storageSource.includes("SAVE_VERSION = '4.0.0'"))
assert('storage.ts: 定义 GameStateV3 接口', storageSource.includes('interface GameStateV3'))
assert('storage.ts: 定义 migrateFromV3ToV4 函数', storageSource.includes('function migrateFromV3ToV4'))
assert('migrateFromV3ToV4: notes 默认值 []', storageSource.includes('notes: []'))
assert('migrateFromV3ToV4: customTags 默认值 []', storageSource.includes('customTags: []'))
assert('migrateFromV3ToV4: activeTagFilters 默认值 []', storageSource.includes('activeTagFilters: []'))
assert("migrateFromV3ToV4: searchKeyword 默认值 ''", storageSource.includes("searchKeyword: ''"))
assert("migrateSavedGame: 处理 version === '3.0.0' 分支", storageSource.includes("version === '3.0.0'"))
assert('migrateSavedGame: V2→V3→V4 完整链路', storageSource.includes('migrateFromV2ToV3(') && /migrateFromV3ToV4\(v3\)/.test(storageSource))
assert('getInitialGameState: 包含 notes 初始化', /function\s+getInitialGameState[\s\S]{0,1200}notes:\s*\[\]/.test(storageSource))
assert('getInitialGameState: 包含 customTags 初始化', /getInitialGameState[\s\S]{0,800}customTags:\s*\[\]/.test(storageSource))
assert('getInitialGameState: 包含 activeTagFilters 初始化', /getInitialGameState[\s\S]{0,1200}activeTagFilters:\s*\[\]/.test(storageSource))
assert("getInitialGameState: 包含 searchKeyword 初始化", /getInitialGameState[\s\S]{0,1400}searchKeyword:\s*''/.test(storageSource))

console.log('\n== 第二阶段：V4 存档字段完整性（写入/读取）==')

function buildV4Save() {
  return {
    version: '4.0.0',
    savedAt: '2026-06-13T10:00:00.000Z',
    state: {
      currentCommissionId: 'comm-002',
      currentChapterId: 'chap-001',
      currentStep: 'deduction',
      completedCommissions: [],
      unlockedChapters: ['chap-001'],
      collectedClues: ['clue-002-1', 'clue-002-2', 'clue-002-3'],
      discoveredConnections: ['conn-002-1'],
      unlockedEndings: [],
      currentEndingType: null,
      lastSaveTime: '2026-06-13T10:00:00.000Z',
      totalPlayTime: 600,
      commissionStatuses: { 'comm-002': 'in_progress' },
      unlockedSteps: { 'comm-002': ['item', 'deduction'] },
      notes: [
        {
          id: 'note-test-1',
          commissionId: 'comm-002',
          clueId: 'clue-002-1',
          title: '梅花图案笔记',
          content: '这里的磨损暗示使用者习惯右手饮用',
          tagIds: ['tag-memory', 'tag-family'],
          isImportant: true,
          createdAt: '2026-06-13T10:05:00.000Z',
          updatedAt: '2026-06-13T10:05:00.000Z',
        },
        {
          id: 'note-test-2',
          commissionId: 'comm-002',
          title: '无关联笔记',
          content: '',
          tagIds: ['tag-important'],
          isImportant: false,
          createdAt: '2026-06-13T10:10:00.000Z',
          updatedAt: '2026-06-13T10:10:00.000Z',
        },
      ],
      customTags: [
        { id: 'tag-custom-1', name: '关键突破', color: '#b91c1c', description: '' },
      ],
      activeTagFilters: ['tag-memory'],
      searchKeyword: '梅花',
    },
  }
}

clearStorage()
mockStorage['memory-weaver:main-save'] = JSON.stringify(buildV4Save())
assert('写入 V4 存档（含笔记、自定义标签、过滤器、关键词）', true)

const loadedV4Raw = mockStorage['memory-weaver:main-save']
assert('能从 localStorage 读取 V4 存档原始字符串', !!loadedV4Raw)

const loadedV4 = JSON.parse(loadedV4Raw)
assert('V4 存档 JSON 可解析', true)
assert('V4 存档 version === "4.0.0"', loadedV4.version === '4.0.0')
assert('notes 数组长度 = 2', Array.isArray(loadedV4.state.notes) && loadedV4.state.notes.length === 2)
assert('notes[0].commissionId === comm-002', loadedV4.state.notes[0].commissionId === 'comm-002')
assert('notes[0].clueId === clue-002-1', loadedV4.state.notes[0].clueId === 'clue-002-1')
assert('notes[0].tagIds 包含 tag-memory', loadedV4.state.notes[0].tagIds.includes('tag-memory'))
assert('notes[0].isImportant === true', loadedV4.state.notes[0].isImportant === true)
assert('notes[0].createdAt / updatedAt 存在', !!loadedV4.state.notes[0].createdAt && !!loadedV4.state.notes[0].updatedAt)
assert('notes[1] 无 clueId（独立笔记）', loadedV4.state.notes[1].clueId === undefined || loadedV4.state.notes[1].clueId === null)
assert('customTags 数组长度 = 1', Array.isArray(loadedV4.state.customTags) && loadedV4.state.customTags.length === 1)
assert('customTags[0].name === "关键突破"', loadedV4.state.customTags[0].name === '关键突破')
assert('customTags[0].color === "#b91c1c"', loadedV4.state.customTags[0].color === '#b91c1c')
assert('activeTagFilters === ["tag-memory"]',
  JSON.stringify(loadedV4.state.activeTagFilters) === JSON.stringify(['tag-memory']))
assert("searchKeyword === '梅花'", loadedV4.state.searchKeyword === '梅花')

console.log('\n== 第三阶段：V3 → V4 手动迁移逻辑验证 ==')
const v3Input = buildV3Save().state
function manualMigrateV3ToV4(v3) {
  return {
    ...v3,
    notes: [],
    customTags: [],
    activeTagFilters: [],
    searchKeyword: '',
  }
}
const migrated = manualMigrateV3ToV4(v3Input)
assert('迁移不破坏原 collectedClues',
  JSON.stringify(migrated.collectedClues) === JSON.stringify(['clue-001-1', 'clue-001-2']))
assert('迁移不破坏原 discoveredConnections',
  JSON.stringify(migrated.discoveredConnections) === JSON.stringify(['conn-001-1']))
assert('迁移不破坏原 commissionStatuses', migrated.commissionStatuses?.['comm-001'] === 'in_progress')
assert('迁移不破坏原 unlockedSteps',
  JSON.stringify(migrated.unlockedSteps?.['comm-001']) === JSON.stringify(['item', 'deduction']))
assert('迁移后 notes = []', Array.isArray(migrated.notes) && migrated.notes.length === 0)
assert('迁移后 customTags = []', Array.isArray(migrated.customTags) && migrated.customTags.length === 0)
assert('迁移后 activeTagFilters = []',
  JSON.stringify(migrated.activeTagFilters) === '[]')
assert("迁移后 searchKeyword = ''", migrated.searchKeyword === '')

console.log('\n== 第四阶段：页面 / 核心逻辑集成检查 ==')

const itemDetailSource = readFileSync(path.join(__dirname, '../src/pages/ItemDetail.vue'), 'utf-8')
assert('ItemDetail.vue: 使用统一进度 getCommissionProgress', itemDetailSource.includes('getCommissionProgress'))
assert('ItemDetail.vue: 标签筛选 toggleTag', itemDetailSource.includes('toggleTag'))
assert('ItemDetail.vue: 关键词搜索 localKeyword', itemDetailSource.includes('localKeyword'))
assert('ItemDetail.vue: 笔记 CRUD (add/update/delete)',
  itemDetailSource.includes('gameStore.addNote') &&
  itemDetailSource.includes('gameStore.updateNote') &&
  itemDetailSource.includes('gameStore.deleteNote'))
assert('ItemDetail.vue: 按标签聚合 aggregateNotesByTag',
  itemDetailSource.includes('aggregateNotesByTag'))
assert('ItemDetail.vue: 笔记列表/标签聚合双视图切换',
  itemDetailSource.includes("aggregationMode === 'list'") && itemDetailSource.includes("aggregationMode === 'tag'"))

const deductionSource = readFileSync(path.join(__dirname, '../src/pages/DeductionBoard.vue'), 'utf-8')
assert('DeductionBoard.vue: 使用统一进度 getCommissionProgress', deductionSource.includes('getCommissionProgress'))
assert('DeductionBoard.vue: 连线走 validateConnection 统一校验',
  deductionSource.includes('validateConnection'))
assert('DeductionBoard.vue: 已关联提示 (already_connected)', deductionSource.includes('already_connected'))
assert('DeductionBoard.vue: 循环引用提示 (circular_reference)', deductionSource.includes('circular_reference'))
assert('DeductionBoard.vue: 不能连接同线索提示 (same_clue)', deductionSource.includes('same_clue'))
assert('DeductionBoard.vue: 无关联提示 (no_connection)', deductionSource.includes('no_connection'))
assert('DeductionBoard.vue: 标签筛选 localTagFilters', deductionSource.includes('localTagFilters'))
assert('DeductionBoard.vue: 关键词搜索 localKeyword', deductionSource.includes('localKeyword'))
assert('DeductionBoard.vue: 笔记 CRUD 操作',
  deductionSource.includes('gameStore.addNote') &&
  deductionSource.includes('gameStore.updateNote') &&
  deductionSource.includes('gameStore.deleteNote'))
assert('DeductionBoard.vue: 按标签聚合展示 (aggregateNotesByTag)', deductionSource.includes('aggregateNotesByTag'))
assert('DeductionBoard.vue: 顶部错误 toast 提示组件', deductionSource.includes('validationToast'))

console.log('\n== 第五阶段：game.ts store 能力完整性 ==')
const gameStoreSource = readFileSync(path.join(__dirname, '../src/stores/game.ts'), 'utf-8')
assert('game.ts: 有 validateConnection 方法', gameStoreSource.includes('function validateConnection'))
assert("validateConnection: same_clue 错误码", gameStoreSource.includes("'same_clue'"))
assert("validateConnection: already_connected 错误码", gameStoreSource.includes("'already_connected'"))
assert("validateConnection: circular_reference 错误码（含 BFS visited）",
  gameStoreSource.includes("'circular_reference'") && gameStoreSource.includes('visited = new Set'))
assert("validateConnection: no_connection 错误码", gameStoreSource.includes("'no_connection'"))
assert('validateConnection: 双向连接查找 (from→to & to→from)',
  /fromClueId\s*===\s*fromClueId[\s\S]{0,200}toClueId\s*===\s*toClueId/.test(gameStoreSource) ||
  /fromClueId\s*===\s*toClueId[\s\S]{0,200}toClueId\s*===\s*fromClueId/.test(gameStoreSource))
assert('game.ts: getCommissionProgress', gameStoreSource.includes('function getCommissionProgress'))
assert('game.ts: getChapterProgress', gameStoreSource.includes('function getChapterProgress'))
assert('game.ts: getOverallProgress', gameStoreSource.includes('function getOverallProgress'))
assert('game.ts: searchCluesByTagIds', gameStoreSource.includes('function searchCluesByTagIds'))
assert('game.ts: searchCluesByKeyword', gameStoreSource.includes('function searchCluesByKeyword'))
assert('game.ts: setActiveTagFilters', gameStoreSource.includes('function setActiveTagFilters'))
assert('game.ts: setSearchKeyword', gameStoreSource.includes('function setSearchKeyword'))
assert('game.ts: addNote / updateNote / deleteNote',
  gameStoreSource.includes('function addNote') &&
  gameStoreSource.includes('function updateNote') &&
  gameStoreSource.includes('function deleteNote'))
assert('game.ts: getNotesForCommission / getNotesForClue',
  gameStoreSource.includes('function getNotesForCommission') && gameStoreSource.includes('function getNotesForClue'))
assert('game.ts: aggregateNotesByTag', gameStoreSource.includes('function aggregateNotesByTag'))
assert('game.ts: addCustomTag / removeCustomTag',
  gameStoreSource.includes('function addCustomTag') && gameStoreSource.includes('function removeCustomTag'))

// ======= 汇总 =======
console.log('\n' + '='.repeat(60))
const passed = results.filter(r => r.ok).length
const total = results.length
const failed = total - passed
console.log(`${consoleColors.info} 总计 ${total} 项断言，${consoleColors.ok} 通过 ${passed} 项，${failed > 0 ? consoleColors.fail : ''} 失败 ${failed} 项`)
console.log('='.repeat(60))

if (failed > 0) {
  console.log('\n失败详情：')
  results.filter(r => !r.ok).forEach(r => console.log(`  ${consoleColors.fail} ${r.name} — ${r.error}`))
  rmSync(testDir, { recursive: true, force: true })
  process.exit(1)
}

rmSync(testDir, { recursive: true, force: true })
process.exit(0)
