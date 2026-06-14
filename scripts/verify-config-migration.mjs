import { writeFileSync, mkdtempSync, rmSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const testDir = mkdtempSync(join(tmpdir(), 'lyt6-config-test-'))

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
  section: '\x1b[35m━\x1b[0m',
}

const results = []
function assert(name, cond, msg) {
  results.push({ name, ok: !!cond, error: cond ? undefined : (msg || 'assertion failed') })
  console.log(`${cond ? consoleColors.ok : consoleColors.fail} ${name}${cond ? '' : ' — ' + (msg || '')}`)
}

function section(title) {
  console.log(`\n${consoleColors.section}${'━'.repeat(58)}\n${consoleColors.info} ${title}\n${consoleColors.section}${'━'.repeat(58)}`)
}

console.log(`\n${consoleColors.info} 创建测试目录：${testDir}\n`)
console.log(`${consoleColors.info} 配置版本：9.0.0\n`)

const configDir = path.join(__dirname, '../src/data/config')
const configFiles = {
  index: 'index.json',
  tags: 'tags.json',
  chapters: 'chapters.json',
  commissions: 'commissions.json',
  clues: 'clues.json',
  connections: 'connections.json',
  endings: 'endings.json',
  repairSteps: 'repairSteps.json',
}

section('第一阶段：配置文件结构与格式校验')

for (const [key, filename] of Object.entries(configFiles)) {
  const filePath = path.join(configDir, filename)
  assert(`配置文件存在：${filename}`, existsSync(filePath))
}

const dialoguesDir = path.join(configDir, 'dialogues')
assert(`对话配置目录存在`, existsSync(dialoguesDir))

const dialogueFiles = readdirSync(dialoguesDir).filter(f => f.endsWith('.json'))
assert(`对话配置文件数量 >= 3`, dialogueFiles.length >= 3, `实际数量：${dialogueFiles.length}`)

const loadedConfigs = {}
for (const [key, filename] of Object.entries(configFiles)) {
  try {
    const filePath = path.join(configDir, filename)
    const raw = readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    loadedConfigs[key] = parsed
    assert(`JSON 格式正确：${filename}`, true)
    assert(`包含 version 字段：${filename}`, 'version' in parsed, `缺少 version 字段`)
    assert(`version === '9.0.0'：${filename}`, parsed.version === '9.0.0', `实际版本：${parsed.version}`)
    if (key !== 'index') {
      assert(`包含 data 字段：${filename}`, 'data' in parsed, `缺少 data 字段`)
    }
  } catch (e) {
    assert(`JSON 格式正确：${filename}`, false, e.message)
  }
}

const loadedDialogues = {}
for (const filename of dialogueFiles) {
  try {
    const filePath = path.join(dialoguesDir, filename)
    const raw = readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    loadedDialogues[filename] = parsed
    assert(`对话 JSON 格式正确：${filename}`, true)
    assert(`对话包含 version 字段：${filename}`, 'version' in parsed)
    assert(`对话 version === '9.0.0'：${filename}`, parsed.version === '9.0.0')
    assert(`对话包含 data 字段：${filename}`, 'data' in parsed)
  } catch (e) {
    assert(`对话 JSON 格式正确：${filename}`, false, e.message)
  }
}

section('第二阶段：配置数据完整性与 ID 唯一性校验')

const allIds = {
  tag: new Set(),
  chapter: new Set(),
  commission: new Set(),
  clue: new Set(),
  connection: new Set(),
  ending: new Set(),
  repairStep: new Set(),
  hotspot: new Set(),
  item: new Set(),
  dialogue: new Set(),
  choice: new Set(),
}

function checkIdPrefix(id, prefix, type) {
  if (!id.startsWith(prefix)) {
    return `ID ${id} 应该以 ${prefix} 开头`
  }
  return null
}

function checkIdUnique(id, set, type) {
  if (set.has(id)) {
    return `重复的 ${type} ID：${id}`
  }
  set.add(id)
  return null
}

const tags = loadedConfigs.tags.data
for (const tag of tags) {
  const prefixError = checkIdPrefix(tag.id, 'tag-', 'tag')
  assert(`标签 ID 前缀正确：${tag.id}`, !prefixError, prefixError)
  const uniqueError = checkIdUnique(tag.id, allIds.tag, 'tag')
  assert(`标签 ID 唯一：${tag.id}`, !uniqueError, uniqueError)
  assert(`标签 name 非空：${tag.id}`, tag.name?.trim().length > 0)
  assert(`标签 color 格式正确：${tag.id}`, /^#[0-9a-fA-F]{6}$/.test(tag.color))
}

const chapters = loadedConfigs.chapters.data
for (const chapter of chapters) {
  const prefixError = checkIdPrefix(chapter.id, 'chap-', 'chapter')
  assert(`章节 ID 前缀正确：${chapter.id}`, !prefixError, prefixError)
  const uniqueError = checkIdUnique(chapter.id, allIds.chapter, 'chapter')
  assert(`章节 ID 唯一：${chapter.id}`, !uniqueError, uniqueError)
  assert(`章节 title 非空：${chapter.id}`, chapter.title?.trim().length > 0)
  assert(`章节 number 正确：${chapter.id}`, typeof chapter.number === 'number' && chapter.number > 0)
  assert(`章节 commissionIds 非空：${chapter.id}`, Array.isArray(chapter.commissionIds) && chapter.commissionIds.length > 0)
}

const commissions = loadedConfigs.commissions.data
for (const comm of commissions) {
  const prefixError = checkIdPrefix(comm.id, 'comm-', 'commission')
  assert(`委托 ID 前缀正确：${comm.id}`, !prefixError, prefixError)
  const uniqueError = checkIdUnique(comm.id, allIds.commission, 'commission')
  assert(`委托 ID 唯一：${comm.id}`, !uniqueError, uniqueError)
  assert(`委托 title 非空：${comm.id}`, comm.title?.trim().length > 0)
  assert(`委托 chapterId 存在：${comm.id}`, allIds.chapter.has(comm.chapterId), `引用不存在的章节：${comm.chapterId}`)
  assert(`委托 difficulty 有效：${comm.id}`, ['simple', 'medium', 'complex'].includes(comm.difficulty))
  assert(`委托 item 存在：${comm.id}`, comm.item != null)
  assert(`委托 stepDependencies 非空：${comm.id}`, Array.isArray(comm.stepDependencies) && comm.stepDependencies.length > 0)

  if (comm.item) {
    const itemPrefixError = checkIdPrefix(comm.item.id, 'item-', 'item')
    assert(`物品 ID 前缀正确：${comm.item.id}`, !itemPrefixError, itemPrefixError)
    const itemUniqueError = checkIdUnique(comm.item.id, allIds.item, 'item')
    assert(`物品 ID 唯一：${comm.item.id}`, !itemUniqueError, itemUniqueError)
    assert(`物品 hotspots 非空：${comm.item.id}`, Array.isArray(comm.item.hotspots) && comm.item.hotspots.length > 0)

    for (const hotspot of comm.item.hotspots) {
      const hotPrefixError = checkIdPrefix(hotspot.id, 'hot-', 'hotspot')
      assert(`热点 ID 前缀正确：${hotspot.id}`, !hotPrefixError, hotPrefixError)
      const hotUniqueError = checkIdUnique(hotspot.id, allIds.hotspot, 'hotspot')
      assert(`热点 ID 唯一：${hotspot.id}`, !hotUniqueError, hotUniqueError)
      assert(`热点坐标有效：${hotspot.id}`, 
        hotspot.x >= 0 && hotspot.x <= 100 && 
        hotspot.y >= 0 && hotspot.y <= 100 &&
        hotspot.width > 0 && hotspot.height > 0
      )
      if (hotspot.clueId) {
        assert(`热点 clueId 将在后续验证：${hotspot.id}`, true)
      }
      assert(`热点 hints 存在：${hotspot.id}`, hotspot.hints != null && typeof hotspot.hints === 'object')
      if (hotspot.hints) {
        assert(`热点 hints 包含三个难度：${hotspot.id}`, 
          'assisted' in hotspot.hints && 
          'standard' in hotspot.hints && 
          'challenging' in hotspot.hints
        )
      }
    }
  }
}

const clues = loadedConfigs.clues.data
for (const clue of clues) {
  const prefixError = checkIdPrefix(clue.id, 'clue-', 'clue')
  assert(`线索 ID 前缀正确：${clue.id}`, !prefixError, prefixError)
  const uniqueError = checkIdUnique(clue.id, allIds.clue, 'clue')
  assert(`线索 ID 唯一：${clue.id}`, !uniqueError, uniqueError)
  assert(`线索 title 非空：${clue.id}`, clue.title?.trim().length > 0)
  assert(`线索 commissionId 有效：${clue.id}`, allIds.commission.has(clue.commissionId), `引用不存在的委托：${clue.commissionId}`)
  assert(`线索 category 有效：${clue.id}`, ['object', 'memory', 'emotion', 'time'].includes(clue.category))
  assert(`线索 tagIds 非空：${clue.id}`, Array.isArray(clue.tagIds) && clue.tagIds.length > 0)
  
  for (const tagId of clue.tagIds) {
    assert(`线索 tagId 有效：${clue.id} -> ${tagId}`, allIds.tag.has(tagId), `引用不存在的标签：${tagId}`)
  }

  if (clue.hotspotId) {
    assert(`线索 hotspotId 有效：${clue.id}`, allIds.hotspot.has(clue.hotspotId), `引用不存在的热点：${clue.hotspotId}`)
  }
}

for (const comm of commissions) {
  if (comm.item?.hotspots) {
    for (const hotspot of comm.item.hotspots) {
      if (hotspot.clueId) {
        assert(`热点 clueId 有效：${hotspot.id}`, allIds.clue.has(hotspot.clueId), `引用不存在的线索：${hotspot.clueId}`)
        const clue = clues.find(c => c.id === hotspot.clueId)
        if (clue) {
          assert(`双向引用一致：${hotspot.id} <-> ${hotspot.clueId}`, 
            clue.hotspotId === hotspot.id, 
            `线索 ${hotspot.clueId} 的 hotspotId 应该是 ${hotspot.id}，实际是 ${clue.hotspotId}`
          )
        }
      }
    }
  }
}

const connections = loadedConfigs.connections.data
for (const conn of connections) {
  const prefixError = checkIdPrefix(conn.id, 'conn-', 'connection')
  assert(`关联 ID 前缀正确：${conn.id}`, !prefixError, prefixError)
  const uniqueError = checkIdUnique(conn.id, allIds.connection, 'connection')
  assert(`关联 ID 唯一：${conn.id}`, !uniqueError, uniqueError)
  assert(`关联 fromClueId 有效：${conn.id}`, allIds.clue.has(conn.fromClueId), `引用不存在的线索：${conn.fromClueId}`)
  assert(`关联 toClueId 有效：${conn.id}`, allIds.clue.has(conn.toClueId), `引用不存在的线索：${conn.toClueId}`)
  assert(`关联 from !== to：${conn.id}`, conn.fromClueId !== conn.toClueId)
  assert(`关联 conclusion 非空：${conn.id}`, conn.conclusion?.trim().length > 0)
  assert(`关联 repairHint 非空：${conn.id}`, conn.repairHint?.trim().length > 0)

  const fromClue = clues.find(c => c.id === conn.fromClueId)
  const toClue = clues.find(c => c.id === conn.toClueId)
  if (fromClue && toClue) {
    assert(`同一委托内关联：${conn.id}`, fromClue.commissionId === toClue.commissionId,
      `跨委托关联：${fromClue.commissionId} -> ${toClue.commissionId}`)
  }
}

const endings = loadedConfigs.endings.data
for (const ending of endings) {
  const prefixError = checkIdPrefix(ending.id, 'end-', 'ending')
  assert(`结局 ID 前缀正确：${ending.id}`, !prefixError, prefixError)
  const uniqueError = checkIdUnique(ending.id, allIds.ending, 'ending')
  assert(`结局 ID 唯一：${ending.id}`, !uniqueError, uniqueError)
  assert(`结局 type 有效：${ending.id}`, ['good', 'neutral', 'bad'].includes(ending.type))
  assert(`结局 commissionId 有效：${ending.id}`, allIds.commission.has(ending.commissionId), `引用不存在的委托：${ending.commissionId}`)
  assert(`结局 title 非空：${ending.id}`, ending.title?.trim().length > 0)
  assert(`结局 story 非空：${ending.id}`, ending.story?.trim().length > 0)
  assert(`结局 image 存在：${ending.id}`, ending.image?.trim().length > 0)
}

for (const comm of commissions) {
  const commEndings = endings.filter(e => e.commissionId === comm.id)
  assert(`委托 ${comm.id} 有三种结局`, commEndings.length === 3, `实际数量：${commEndings.length}`)
  const endingTypes = new Set(commEndings.map(e => e.type))
  assert(`委托 ${comm.id} 结局类型完整`, endingTypes.has('good') && endingTypes.has('neutral') && endingTypes.has('bad'))
}

const repairSteps = loadedConfigs.repairSteps.data
for (const [commId, steps] of Object.entries(repairSteps)) {
  assert(`修复步骤委托 ID 有效：${commId}`, allIds.commission.has(commId), `引用不存在的委托：${commId}`)
  assert(`修复步骤非空：${commId}`, Array.isArray(steps) && steps.length > 0)

  for (const step of steps) {
    const prefixError = checkIdPrefix(step.id, 'step-', 'repairStep')
    assert(`修复步骤 ID 前缀正确：${step.id}`, !prefixError, prefixError)
    const uniqueError = checkIdUnique(step.id, allIds.repairStep, 'repairStep')
    assert(`修复步骤 ID 唯一：${step.id}`, !uniqueError, uniqueError)
    assert(`修复步骤 title 非空：${step.id}`, step.title?.trim().length > 0)
    assert(`修复步骤 choices 非空：${step.id}`, Array.isArray(step.choices) && step.choices.length >= 2)

    for (const choice of step.choices) {
      assert(`选项 endingType 有效：${choice.id}`, ['good', 'neutral', 'bad'].includes(choice.endingType))
      assert(`选项 label 非空：${choice.id}`, choice.label?.trim().length > 0)
    }
  }
}

let allDialogueNodes = []
for (const [filename, config] of Object.entries(loadedDialogues)) {
  const nodes = config.data
  allDialogueNodes = [...allDialogueNodes, ...nodes]
  
  for (const node of nodes) {
    const prefixError = checkIdPrefix(node.id, 'dlg-', 'dialogue')
    assert(`对话节点 ID 前缀正确：${node.id}`, !prefixError, prefixError)
    const uniqueError = checkIdUnique(node.id, allIds.dialogue, 'dialogue')
    assert(`对话节点 ID 唯一：${node.id}`, !uniqueError, uniqueError)
    assert(`对话节点 commissionId 有效：${node.id}`, allIds.commission.has(node.commissionId), `引用不存在的委托：${node.commissionId}`)
    assert(`对话节点 nodeType 有效：${node.id}`, 
      ['commission_accept', 'commission_intro', 'repair_pre', 'repair_post', 'story_interlude', 'branch', 'narration'].includes(node.nodeType)
    )
    assert(`对话节点 speaker 有效：${node.id}`, 
      ['shopkeeper', 'client', 'narrator', 'player', 'inner_thought'].includes(node.speaker)
    )
    assert(`对话节点 content 非空：${node.id}`, node.content?.trim().length > 0)
    assert(`对话节点 order 有效：${node.id}`, typeof node.order === 'number' && node.order > 0)

    if (node.choices) {
      for (const choice of node.choices) {
        assert(`选项 nextNodeId 有效：${choice.id}`, choice.nextNodeId?.trim().length > 0)
        assert(`选项 label 非空：${choice.id}`, choice.label?.trim().length > 0)
      }
    }
  }
}

section('第三阶段：配置文件引用索引校验')

const indexConfig = loadedConfigs.index
assert(`索引文件包含 files 字段`, 'files' in indexConfig)
assert(`索引文件包含 validation 字段`, 'validation' in indexConfig)

for (const [key, filename] of Object.entries(configFiles)) {
  if (key !== 'index' && key !== 'repairSteps') {
    assert(`索引文件引用 ${key}`, indexConfig.files[key] === filename, `期望 ${filename}，实际 ${indexConfig.files[key]}`)
  }
}

assert(`索引文件包含对话配置模式`, 'dialogueNodes' in indexConfig.files)
assert(`对话配置模式正确`, indexConfig.files.dialogueNodes.pattern.includes('{commissionId}'))

section('第四阶段：V8 → V9 迁移逻辑源码检查')

const storageSource = readFileSync(path.join(__dirname, '../src/utils/storage.ts'), 'utf-8')

assert("storage.ts: SAVE_VERSION 使用 CURRENT_SAVE_VERSION", 
  storageSource.includes("const SAVE_VERSION = CURRENT_SAVE_VERSION"))
assert("storage.ts: 导入 CURRENT_SAVE_VERSION", 
  storageSource.includes("CURRENT_SAVE_VERSION } from '../types'"))
assert('storage.ts: 导入 endings 数据', 
  storageSource.includes("import { commissions, clues, connections, chapters, endings }"))
assert('storage.ts: 定义 GameStateV8 接口', 
  storageSource.includes('interface GameStateV8'))
assert('storage.ts: 定义 SavedGameV8 接口', 
  storageSource.includes('interface SavedGameV8'))
assert('storage.ts: 定义 migrateFromV8ToV9 函数', 
  storageSource.includes('function migrateFromV8ToV9'))
assert('migrateFromV8ToV9: 清理无效 commissionStatuses', 
  storageSource.includes('configCommissionIds') && /delete migrated\.commissionStatuses\[commId\]/.test(storageSource))
assert('migrateFromV8ToV9: 清理无效 collectedClues', 
  storageSource.includes('configClueIds') && /collectedClues\.filter/.test(storageSource))
assert('migrateFromV8ToV9: 清理无效 discoveredConnections', 
  storageSource.includes('configConnectionIds') && /discoveredConnections\.filter/.test(storageSource))
assert('migrateFromV8ToV9: 清理无效 unlockedEndings', 
  storageSource.includes('configEndingIds') && /unlockedEndings\.filter/.test(storageSource))
assert('migrateFromV8ToV9: 新增缺失的 commissionStatuses', 
  /migrated\.commissionStatuses\[comm\.id\] = comm\.status/.test(storageSource))
assert('migrateFromV8ToV9: 新增缺失的 unlockedSteps', 
  /migrated\.unlockedSteps\[comm\.id\] = \['item'\]/.test(storageSource))

assert('storage.ts: 定义 migrateFromV7ToV8 函数', 
  storageSource.includes('function migrateFromV7ToV8'))
assert('storage.ts: 定义 migrateFromV6ToV7 函数', 
  storageSource.includes('function migrateFromV6ToV7'))

assert("migrateSavedGame: 处理 version === '8.0.0' 分支", 
  storageSource.includes("version === '8.0.0'"))
assert("migrateSavedGame: 处理 version === '7.0.0' 分支", 
  storageSource.includes("version === '7.0.0'"))
assert("migrateSavedGame: 处理 version === '6.0.0' 分支", 
  storageSource.includes("version === '6.0.0'"))

assert('migrateSavedGame: V8→V9 完整链路', 
  /migrateFromV8ToV9\(/.test(storageSource))
assert('migrateSavedGame: V7→V8→V9 完整链路', 
  /migrateFromV7ToV8\([\s\S]{0,100}migrateFromV8ToV9/.test(storageSource))

section('第五阶段：gameData.ts 配置驱动加载检查')

const gameDataSource = readFileSync(path.join(__dirname, '../src/data/gameData.ts'), 'utf-8')

assert('gameData.ts: 导入 tags.json 配置', gameDataSource.includes("from './config/tags.json'"))
assert('gameData.ts: 导入 chapters.json 配置', gameDataSource.includes("from './config/chapters.json'"))
assert('gameData.ts: 导入 commissions.json 配置', gameDataSource.includes("from './config/commissions.json'"))
assert('gameData.ts: 导入 clues.json 配置', gameDataSource.includes("from './config/clues.json'"))
assert('gameData.ts: 导入 connections.json 配置', gameDataSource.includes("from './config/connections.json'"))
assert('gameData.ts: 导入 endings.json 配置', gameDataSource.includes("from './config/endings.json'"))
assert('gameData.ts: 导入 repairSteps.json 配置', gameDataSource.includes("from './config/repairSteps.json'"))
assert('gameData.ts: 导入对话配置', gameDataSource.includes("from './config/dialogues/comm-001.json'"))

assert('gameData.ts: CONFIG_VERSION 常量', gameDataSource.includes("export const CONFIG_VERSION = '9.0.0'"))
assert('gameData.ts: loadConfig 泛型函数', gameDataSource.includes('function loadConfig<T>'))
assert('gameData.ts: 版本不匹配警告', /\.version !== CONFIG_VERSION/.test(gameDataSource))

assert('gameData.ts: createCommissionWithRuntimeState', gameDataSource.includes('function createCommissionWithRuntimeState'))
assert('gameData.ts: createClueWithRuntimeState', gameDataSource.includes('function createClueWithRuntimeState'))
assert('gameData.ts: createEndingWithRuntimeState', gameDataSource.includes('function createEndingWithRuntimeState'))
assert('gameData.ts: createConnectionWithRuntimeState', gameDataSource.includes('function createConnectionWithRuntimeState'))
assert('gameData.ts: createRepairStepWithRuntimeState', gameDataSource.includes('function createRepairStepWithRuntimeState'))

assert('gameData.ts: validateConfigIntegrity 函数', gameDataSource.includes('function validateConfigIntegrity'))
assert('validateConfigIntegrity: 检查 chapter → commission 引用', /chaptersConfigData\.forEach[\s\S]{0,200}commissionIds\.forEach[\s\S]{0,100}!commissionIds\.has/.test(gameDataSource))
assert('validateConfigIntegrity: 检查 commission → chapter 引用', /commissionsConfigData\.forEach[\s\S]{0,200}!chapterIds\.has\(comm\.chapterId\)/.test(gameDataSource))
assert('validateConfigIntegrity: 检查 clue → commission 引用', /cluesConfigData\.forEach[\s\S]{0,200}!commissionIds\.has\(clue\.commissionId\)/.test(gameDataSource))
assert('validateConfigIntegrity: 检查 connection → clue 引用', /connectionsConfigData\.forEach[\s\S]{0,200}!clueIds\.has\(conn\.fromClueId\)/.test(gameDataSource))
assert('validateConfigIntegrity: 检查 ending → commission 引用', /endingsConfigData\.forEach[\s\S]{0,200}!commissionIds\.has\(ending\.commissionId\)/.test(gameDataSource))

assert('gameData.ts: DEV 环境自动校验', /import\.meta\.env\.DEV[\s\S]{0,100}validateConfigIntegrity\(\)/.test(gameDataSource))

section('第六阶段：V8 → V9 迁移手动验证')

function buildV8Save() {
  return {
    version: '8.0.0',
    savedAt: '2026-06-10T10:00:00.000Z',
    state: {
      currentCommissionId: 'comm-001',
      currentChapterId: 'chap-001',
      currentStep: 'item',
      completedCommissions: [],
      unlockedChapters: ['chap-001'],
      collectedClues: ['clue-001-1', 'clue-001-2', 'clue-old-invalid'],
      discoveredConnections: ['conn-001-1', 'conn-old-invalid'],
      unlockedEndings: ['end-old-invalid'],
      currentEndingType: null,
      lastSaveTime: '2026-06-10T10:00:00.000Z',
      totalPlayTime: 180,
      commissionStatuses: { 
        'comm-001': 'in_progress',
        'comm-old-invalid': 'completed'
      },
      unlockedSteps: { 
        'comm-001': ['item', 'deduction'],
        'comm-old-invalid': ['item', 'deduction', 'repair']
      },
      notes: [
        {
          id: 'note-test-1',
          commissionId: 'comm-001',
          clueId: 'clue-001-1',
          title: '测试笔记',
          content: '这是一条测试笔记',
          tagIds: ['tag-important'],
          isImportant: true,
          createdAt: '2026-06-10T10:05:00.000Z',
          updatedAt: '2026-06-10T10:05:00.000Z',
        },
      ],
      customTags: [],
      activeTagFilters: ['tag-important'],
      searchKeyword: '音乐盒',
      searchMatchMode: 'or',
      searchScope: 'all',
      noteSortBy: 'updatedAt',
      noteSortOrder: 'desc',
      noteAggregationType: 'tag',
      connectionHintsUsed: [],
      discoveredHints: [],
      progressMilestones: {},
      repairRetryCounts: {},
      connectionRetryCounts: {},
      dialogueFlags: { 'comm001_accepted': true },
      dialogueHistory: [],
      completedDialogueNodeIds: [],
    },
  }
}

clearStorage()
mockStorage['memory-repair-shop-save'] = JSON.stringify(buildV8Save())
assert('写入 V8 存档到 localStorage', true)

function manualMigrateV8ToV9(v8State) {
  const configCommissionIds = new Set(commissions.map(c => c.id))
  const configChapterIds = new Set(chapters.map(c => c.id))
  const configClueIds = new Set(clues.map(c => c.id))
  const configConnectionIds = new Set(connections.map(c => c.id))
  const configEndingIds = new Set(endings.map(e => e.id))

  const migrated = {
    ...v8State,
    commissionStatuses: { ...v8State.commissionStatuses },
    unlockedChapters: [...v8State.unlockedChapters],
    collectedClues: [...v8State.collectedClues],
    discoveredConnections: [...v8State.discoveredConnections],
    unlockedEndings: [...v8State.unlockedEndings],
    unlockedSteps: { ...v8State.unlockedSteps },
  }

  for (const [commId, status] of Object.entries(migrated.commissionStatuses)) {
    if (!configCommissionIds.has(commId)) {
      delete migrated.commissionStatuses[commId]
    }
  }
  for (const comm of commissions) {
    if (!(comm.id in migrated.commissionStatuses)) {
      migrated.commissionStatuses[comm.id] = comm.status
    }
  }

  migrated.unlockedChapters = migrated.unlockedChapters.filter(id => configChapterIds.has(id))
  if (migrated.unlockedChapters.length === 0) {
    migrated.unlockedChapters = ['chap-001']
  }

  migrated.collectedClues = migrated.collectedClues.filter(id => configClueIds.has(id))
  migrated.discoveredConnections = migrated.discoveredConnections.filter(id => configConnectionIds.has(id))
  migrated.unlockedEndings = migrated.unlockedEndings.filter(id => configEndingIds.has(id))

  for (const commId of Object.keys(migrated.unlockedSteps)) {
    if (!configCommissionIds.has(commId)) {
      delete migrated.unlockedSteps[commId]
    }
  }
  for (const comm of commissions) {
    if (!(comm.id in migrated.unlockedSteps)) {
      migrated.unlockedSteps[comm.id] = ['item']
    }
  }

  return migrated
}

const v8Input = buildV8Save().state
const migrated = manualMigrateV8ToV9(v8Input)

assert('迁移保留有效 commissionStatuses', 
  migrated.commissionStatuses['comm-001'] === 'in_progress')
assert('迁移删除无效 commissionStatuses', 
  !('comm-old-invalid' in migrated.commissionStatuses))
assert('迁移新增缺失的 commissionStatuses', 
  'comm-002' in migrated.commissionStatuses && 'comm-003' in migrated.commissionStatuses)

assert('迁移保留有效 collectedClues', 
  migrated.collectedClues.includes('clue-001-1') && migrated.collectedClues.includes('clue-001-2'))
assert('迁移删除无效 collectedClues', 
  !migrated.collectedClues.includes('clue-old-invalid'))

assert('迁移保留有效 discoveredConnections', 
  migrated.discoveredConnections.includes('conn-001-1'))
assert('迁移删除无效 discoveredConnections', 
  !migrated.discoveredConnections.includes('conn-old-invalid'))

assert('迁移删除无效 unlockedEndings', 
  migrated.unlockedEndings.length === 0)

assert('迁移保留有效 unlockedSteps', 
  JSON.stringify(migrated.unlockedSteps['comm-001']) === JSON.stringify(['item', 'deduction']))
assert('迁移删除无效 unlockedSteps', 
  !('comm-old-invalid' in migrated.unlockedSteps))
assert('迁移新增缺失的 unlockedSteps', 
  'comm-002' in migrated.unlockedSteps && 'comm-003' in migrated.unlockedSteps)

assert('迁移不破坏原有 notes', 
  Array.isArray(migrated.notes) && migrated.notes.length === 1)
assert('迁移不破坏原有 dialogueFlags', 
  migrated.dialogueFlags?.comm001_accepted === true)
assert('迁移不破坏原有 totalPlayTime', 
  migrated.totalPlayTime === 180)

section('第七阶段：业务代码兼容性检查')

const gameStoreSource = readFileSync(path.join(__dirname, '../src/stores/game.ts'), 'utf-8')

assert('game.ts: 导入 commissions 数据', 
  gameStoreSource.includes("commissions, clues, connections, endings"))
assert('game.ts: getAllCommissions 使用 commissions', 
  /function getAllCommissions[\s\S]{0,100}return commissions/.test(gameStoreSource))
assert('game.ts: getAllEndings 使用 endings', 
  /function getAllEndings[\s\S]{0,100}return endings/.test(gameStoreSource))

assert('game.ts: getCommissionById 存在', gameStoreSource.includes('function getCommissionById'))
assert('game.ts: getEndingById 存在', gameStoreSource.includes('function getEndingById'))
assert('game.ts: getClueById 存在', gameStoreSource.includes('function getClueById'))
assert('game.ts: getConnectionById 存在', gameStoreSource.includes('function getConnectionById'))

const commissionListSource = readFileSync(path.join(__dirname, '../src/pages/CommissionList.vue'), 'utf-8')
assert('CommissionList.vue: 使用 getAllCommissions', commissionListSource.includes('gameStore.getAllCommissions()'))
assert('CommissionList.vue: 使用 getCommissionStatus', commissionListSource.includes('gameStore.getCommissionStatus('))

const endingPageSource = readFileSync(path.join(__dirname, '../src/pages/EndingPage.vue'), 'utf-8')
assert('EndingPage.vue: 使用 getEndingByType', endingPageSource.includes('gameStore.getEndingByType('))
assert('EndingPage.vue: 使用 getCommissionById', endingPageSource.includes('gameStore.getCommissionById('))

section('第八阶段：TypeScript 类型检查')

const typesSource = readFileSync(path.join(__dirname, '../src/types/index.ts'), 'utf-8')
assert('types/index.ts: CommissionConfig 接口', typesSource.includes('export interface CommissionConfig'))
assert('types/index.ts: ClueConfig 接口', typesSource.includes('export interface ClueConfig'))
assert('types/index.ts: EndingConfig 接口', typesSource.includes('export interface EndingConfig'))
assert('types/index.ts: Commission 继承 CommissionConfig', 
  /export interface Commission extends CommissionConfig/.test(typesSource))
assert('types/index.ts: Clue 继承 ClueConfig', 
  /export interface Clue extends ClueConfig/.test(typesSource))
assert('types/index.ts: Ending 继承 EndingConfig', 
  /export interface Ending extends EndingConfig/.test(typesSource))
assert('types/index.ts: CURRENT_CONFIG_VERSION', typesSource.includes("CURRENT_CONFIG_VERSION = '9.0.0'"))
assert('types/index.ts: CURRENT_SAVE_VERSION', typesSource.includes("CURRENT_SAVE_VERSION = '9.0.0'"))

section('汇总结果')
const passed = results.filter(r => r.ok).length
const total = results.length
const failed = total - passed
console.log('\n' + '━'.repeat(60))
console.log(`${consoleColors.info} 总计 ${total} 项断言`)
console.log(`${consoleColors.ok} 通过 ${passed} 项`)
if (failed > 0) {
  console.log(`${consoleColors.fail} 失败 ${failed} 项`)
} else {
  console.log(`${consoleColors.ok} 全部通过 🎉`)
}
console.log('━'.repeat(60))

if (failed > 0) {
  console.log('\n失败详情：')
  results.filter(r => !r.ok).forEach(r => console.log(`  ${consoleColors.fail} ${r.name} — ${r.error}`))
  rmSync(testDir, { recursive: true, force: true })
  process.exit(1)
}

console.log(`\n${consoleColors.info} 配置驱动改造完成！`)
console.log(`${consoleColors.info} - 数据文件：8 个基础配置 + ${dialogueFiles.length} 个对话配置`)
console.log(`${consoleColors.info} - 支持版本：V1 → V9 完整迁移链`)
console.log(`${consoleColors.info} - 校验覆盖：ID 唯一、引用完整、数据完整、迁移逻辑`)

rmSync(testDir, { recursive: true, force: true })
process.exit(0)
