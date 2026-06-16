import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cpus } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))

const consoleColors = {
  ok: '\x1b[32m✓\x1b[0m',
  fail: '\x1b[31m✗\x1b[0m',
  info: '\x1b[36mℹ\x1b[0m',
  warn: '\x1b[33m⚠\x1b[0m',
  section: '\x1b[35m━\x1b[0m',
}

function section(title) {
  console.log(`\n${consoleColors.section}${'━'.repeat(58)}\n${consoleColors.info} ${title}\n${consoleColors.section}${'━'.repeat(58)}`)
}

const results = []
function assert(name, cond, msg) {
  results.push({ name, ok: !!cond, error: cond ? undefined : (msg || 'assertion failed') })
  console.log(`${cond ? consoleColors.ok : consoleColors.fail} ${name}${cond ? '' : ' — ' + (msg || '')}`)
}

const CONFIG_DIR = join(__dirname, '../src/data/config')
const OUTPUT_DIR = join(__dirname, '../migrated-archives')

const CONFIG_VERSION = '10.0.0'

const configFiles = {
  tags: 'tags.json',
  chapters: 'chapters.json',
  commissions: 'commissions.json',
  clues: 'clues.json',
  connections: 'connections.json',
  endings: 'endings.json',
  repairSteps: 'repairSteps.json',
  achievements: 'achievements.json',
}

section('第一阶段：加载并校验现有配置文件')

const loadedConfigs = {}
for (const [key, filename] of Object.entries(configFiles)) {
  const filePath = join(CONFIG_DIR, filename)
  assert(`配置文件存在: ${filename}`, existsSync(filePath))
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    loadedConfigs[key] = parsed
    assert(`JSON 格式正确: ${filename}`, true)
  } catch (e) {
    assert(`JSON 格式正确: ${filename}`, false, e.message)
  }
}

section('第二阶段：迁移配置版本号')

const migratedConfigs = {}
let migrationCount = 0
let skippedCount = 0

for (const [key, config] of Object.entries(loadedConfigs)) {
  const originalVersion = config.version
  if (originalVersion === CONFIG_VERSION) {
    migratedConfigs[key] = config
    skippedCount++
    assert(`${key}: 版本已是 ${CONFIG_VERSION}，无需迁移`, true)
    continue
  }

  const migrated = {
    ...config,
    version: CONFIG_VERSION,
    meta: {
      ...(config.meta || {}),
      lastUpdated: new Date().toISOString().split('T')[0],
      migratedFrom: originalVersion,
    },
    data: config.data
  }

  if (key === 'commissions' && Array.isArray(migrated.data)) {
    migrated.data = migrated.data.map(comm => ({
      ...comm,
      stepDependencies: comm.stepDependencies || [
        { step: 'item', dependencyType: 'always' },
        { step: 'deduction', dependencyType: 'clue_count', minCount: 3 },
        { step: 'repair', dependencyType: 'connection_count', minCount: 1 }
      ],
      unlockRules: comm.unlockRules || [],
      prerequisiteCommissionIds: comm.prerequisiteCommissionIds || []
    }))
  }

  if (key === 'clues' && Array.isArray(migrated.data)) {
    migrated.data = migrated.data.map(clue => ({
      ...clue,
      tagIds: clue.tagIds || [],
      category: clue.category || 'object'
    }))
  }

  if (key === 'endings' && Array.isArray(migrated.data)) {
    migrated.data = migrated.data.map(ending => ({
      ...ending,
      image: ending.image || '📋'
    }))
  }

  migratedConfigs[key] = migrated
  migrationCount++
  assert(`${key}: ${originalVersion} → ${CONFIG_VERSION}`, true)
}

const dialoguesDir = join(CONFIG_DIR, 'dialogues')
const dialogueFiles = []

if (existsSync(dialoguesDir)) {
  const { readdirSync } = await import('node:fs')
  const files = readdirSync(dialoguesDir).filter(f => f.endsWith('.json'))
  const migratedDialogues = {}

  for (const filename of files) {
    const filePath = join(dialoguesDir, filename)
    try {
      const raw = readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      const migrated = {
        ...parsed,
        version: CONFIG_VERSION,
        meta: {
          ...(parsed.meta || {}),
          lastUpdated: new Date().toISOString().split('T')[0],
          migratedFrom: parsed.version,
        },
        data: parsed.data
      }
      migratedDialogues[filename] = migrated
      dialogueFiles.push(filename)
      migrationCount++
      assert(`对话 ${filename}: ${parsed.version} → ${CONFIG_VERSION}`, true)
    } catch (e) {
      assert(`对话 ${filename} 加载失败`, false, e.message)
    }
  }

  migratedConfigs._dialogues = migratedDialogues
}

section('第三阶段：写入迁移后的配置文件')

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true })
}

for (const [key, config] of Object.entries(migratedConfigs)) {
  if (key === '_dialogues') {
    const dialogueOutputDir = join(OUTPUT_DIR, 'dialogues')
    if (!existsSync(dialogueOutputDir)) {
      mkdirSync(dialogueOutputDir, { recursive: true })
    }
    for (const [filename, dialogueConfig] of Object.entries(config)) {
      const outputPath = join(dialogueOutputDir, filename)
      writeFileSync(outputPath, JSON.stringify(dialogueConfig, null, 2), 'utf-8')
      assert(`写入迁移对话: ${filename}`, true)
    }
    continue
  }

  const filename = configFiles[key]
  if (filename) {
    const outputPath = join(OUTPUT_DIR, filename)
    writeFileSync(outputPath, JSON.stringify(config, null, 2), 'utf-8')
    assert(`写入迁移配置: ${filename}`, true)
  }
}

const indexConfig = {
  version: CONFIG_VERSION,
  meta: {
    description: '游戏配置索引（迁移后）',
    lastUpdated: new Date().toISOString().split('T')[0],
    migratedFrom: loadedConfigs.index?.version || '9.0.0',
  },
  files: {
    tags: 'tags.json',
    chapters: 'chapters.json',
    commissions: 'commissions.json',
    clues: 'clues.json',
    connections: 'connections.json',
    endings: 'endings.json',
    repairSteps: 'repairSteps.json',
    dialogueNodes: {
      pattern: 'dialogues/comm-{commissionId}.json',
      commissions: loadedConfigs.commissions?.data?.map(c => c.id) || []
    },
    achievements: 'achievements.json'
  },
  validation: {
    idPrefixes: {
      tag: 'tag-',
      chapter: 'chap-',
      commission: 'comm-',
      clue: 'clue-',
      connection: 'conn-',
      ending: 'end-',
      repairStep: 'step-',
      hotspot: 'hot-',
      item: 'item-',
      dialogue: 'dlg-',
      choice: 'choice-'
    },
    requiredReferences: {
      commission: ['chapterId'],
      clue: ['commissionId'],
      connection: ['fromClueId', 'toClueId'],
      ending: ['commissionId'],
      hotspot: ['clueId'],
      chapter: ['commissionIds']
    }
  }
}

writeFileSync(join(OUTPUT_DIR, 'index.json'), JSON.stringify(indexConfig, null, 2), 'utf-8')
assert('写入迁移索引: index.json', true)

section('第四阶段：迁移摘要')

const allIds = {
  tag: new Set(loadedConfigs.tags?.data?.map(t => t.id) || []),
  chapter: new Set(loadedConfigs.chapters?.data?.map(c => c.id) || []),
  commission: new Set(loadedConfigs.commissions?.data?.map(c => c.id) || []),
  clue: new Set(loadedConfigs.clues?.data?.map(c => c.id) || []),
  connection: new Set(loadedConfigs.connections?.data?.map(c => c.id) || []),
  ending: new Set(loadedConfigs.endings?.data?.map(e => e.id) || []),
  repairStep: new Set(),
}

if (loadedConfigs.repairSteps?.data) {
  for (const steps of Object.values(loadedConfigs.repairSteps.data)) {
    for (const step of steps) {
      allIds.repairStep.add(step.id)
    }
  }
}

console.log(`\n${consoleColors.info} 配置类型统计:`)
for (const [type, ids] of Object.entries(allIds)) {
  console.log(`  ${type}: ${ids.size} 条`)
}

console.log(`\n${consoleColors.info} 迁移统计:`)
console.log(`  已迁移: ${migrationCount} 个配置文件`)
console.log(`  已跳过: ${skippedCount} 个配置文件（版本一致）`)
console.log(`  对话文件: ${dialogueFiles.length} 个`)
console.log(`  输出目录: ${OUTPUT_DIR}`)
console.log(`  目标版本: ${CONFIG_VERSION}`)

section('汇总结果')

const passed = results.filter(r => r.ok).length
const total = results.length
const failed = total - passed
console.log('\n' + '━'.repeat(60))
console.log(`${consoleColors.info} 总计 ${total} 项断言`)
console.log(`${consoleColors.ok} 通过 ${passed} 项`)
if (failed > 0) {
  console.log(`${consoleColors.fail} 失败 ${failed} 项`)
  console.log('\n失败详情：')
  results.filter(r => !r.ok).forEach(r => console.log(`  ${consoleColors.fail} ${r.name} — ${r.error}`))
  process.exit(1)
} else {
  console.log(`${consoleColors.ok} 全部通过 🎉`)
}

console.log(`\n${consoleColors.info} 存档迁移脚本执行完成！`)
console.log(`${consoleColors.info} 迁移后配置已输出至: ${OUTPUT_DIR}`)
console.log(`${consoleColors.info} 可将迁移后文件复制到 src/data/config/ 替换原文件`)

process.exit(0)
