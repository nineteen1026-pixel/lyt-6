import type {
  ConfigTypeSchema,
  ConfigFieldSchema,
  ConfigValidationResult,
  ConfigValidationError,
  ConfigValidationWarning,
  ConfigRegistryEntry,
  ConfigEvent,
  ConfigEventListener,
  ConfigEventType,
  ConfigTypeName,
  ConfigMigrationStep,
  ConfigMigrationResult,
  Tag,
  ChapterConfig,
  CommissionConfig,
  ClueConfig,
  ClueConnectionConfig,
  EndingConfig,
  RepairStepConfig,
  DialogueNode,
  AchievementConfig
} from '../types'

export const CONFIG_CENTER_VERSION = '10.0.0'

const listeners: ConfigEventListener[] = []
const registries: Map<string, ConfigRegistryEntry> = new Map()
const eventLog: ConfigEvent[] = []
let hotReloadEnabled = false
let lastHotReloadAt: string | null = null

function emitEvent(type: ConfigEventType, typeName: string, version: string, details?: string, errorCount?: number, warningCount?: number): void {
  const event: ConfigEvent = {
    type,
    typeName,
    timestamp: new Date().toISOString(),
    version,
    details,
    errorCount,
    warningCount
  }
  eventLog.push(event)
  if (eventLog.length > 200) {
    eventLog.splice(0, eventLog.length - 200)
  }
  for (const listener of listeners) {
    try {
      listener(event)
    } catch (e) {
      console.error('ConfigCenter event listener error:', e)
    }
  }
}

export function onConfigEvent(listener: ConfigEventListener): () => void {
  listeners.push(listener)
  return () => {
    const idx = listeners.indexOf(listener)
    if (idx !== -1) listeners.splice(idx, 1)
  }
}

export function getEventLog(): ConfigEvent[] {
  return [...eventLog]
}

const SCHEMAS: Record<ConfigTypeName, ConfigTypeSchema> = {
  tags: {
    typeName: 'tags',
    idPrefix: 'tag-',
    version: CONFIG_CENTER_VERSION,
    fields: {
      id: { type: 'string', required: true, idPrefix: 'tag-' },
      name: { type: 'string', required: true, minLength: 1 },
      color: { type: 'string', required: true, pattern: '^#[0-9a-fA-F]{6}$' },
      description: { type: 'string' }
    },
    foreignKeys: [],
    uniqueFields: ['id']
  },
  chapters: {
    typeName: 'chapters',
    idPrefix: 'chap-',
    version: CONFIG_CENTER_VERSION,
    fields: {
      id: { type: 'string', required: true, idPrefix: 'chap-' },
      number: { type: 'number', required: true, minValue: 1 },
      title: { type: 'string', required: true, minLength: 1 },
      subtitle: { type: 'string', required: true },
      description: { type: 'string', required: true },
      theme: { type: 'string', required: true },
      icon: { type: 'string', required: true },
      unlockRule: { type: 'object', required: true },
      commissionIds: { type: 'array', required: true, items: { type: 'string', idPrefix: 'comm-' } }
    },
    foreignKeys: [
      { field: 'commissionIds', targetTypeName: 'commissions' }
    ],
    uniqueFields: ['id']
  },
  commissions: {
    typeName: 'commissions',
    idPrefix: 'comm-',
    version: CONFIG_CENTER_VERSION,
    fields: {
      id: { type: 'string', required: true, idPrefix: 'comm-' },
      chapterId: { type: 'string', required: true, idPrefix: 'chap-' },
      title: { type: 'string', required: true, minLength: 1 },
      clientName: { type: 'string', required: true },
      clientAvatar: { type: 'string', required: true },
      description: { type: 'string', required: true },
      difficulty: { type: 'enum', required: true, enumValues: ['simple', 'medium', 'complex'] },
      item: { type: 'object', required: true },
      unlockRules: { type: 'array', required: true },
      prerequisiteCommissionIds: { type: 'array', required: true, items: { type: 'string', idPrefix: 'comm-' } },
      stepDependencies: { type: 'array', required: true },
      orderInChapter: { type: 'number', required: true, minValue: 1 }
    },
    foreignKeys: [
      { field: 'chapterId', targetTypeName: 'chapters' },
      { field: 'prerequisiteCommissionIds', targetTypeName: 'commissions' }
    ],
    uniqueFields: ['id']
  },
  clues: {
    typeName: 'clues',
    idPrefix: 'clue-',
    version: CONFIG_CENTER_VERSION,
    fields: {
      id: { type: 'string', required: true, idPrefix: 'clue-' },
      commissionId: { type: 'string', required: true, idPrefix: 'comm-' },
      title: { type: 'string', required: true, minLength: 1 },
      content: { type: 'string', required: true, minLength: 1 },
      icon: { type: 'string', required: true },
      category: { type: 'enum', required: true, enumValues: ['object', 'memory', 'emotion', 'time'] },
      hotspotId: { type: 'string', idPrefix: 'hot-' },
      tagIds: { type: 'array', required: true, items: { type: 'string', idPrefix: 'tag-' } }
    },
    foreignKeys: [
      { field: 'commissionId', targetTypeName: 'commissions' },
      { field: 'tagIds', targetTypeName: 'tags' }
    ],
    uniqueFields: ['id']
  },
  connections: {
    typeName: 'connections',
    idPrefix: 'conn-',
    version: CONFIG_CENTER_VERSION,
    fields: {
      id: { type: 'string', required: true, idPrefix: 'conn-' },
      fromClueId: { type: 'string', required: true, idPrefix: 'clue-' },
      toClueId: { type: 'string', required: true, idPrefix: 'clue-' },
      conclusion: { type: 'string', required: true, minLength: 1 },
      repairHint: { type: 'string', required: true, minLength: 1 }
    },
    foreignKeys: [
      { field: 'fromClueId', targetTypeName: 'clues' },
      { field: 'toClueId', targetTypeName: 'clues' }
    ],
    uniqueFields: ['id']
  },
  endings: {
    typeName: 'endings',
    idPrefix: 'end-',
    version: CONFIG_CENTER_VERSION,
    fields: {
      id: { type: 'string', required: true, idPrefix: 'end-' },
      commissionId: { type: 'string', required: true, idPrefix: 'comm-' },
      type: { type: 'enum', required: true, enumValues: ['good', 'neutral', 'bad'] },
      title: { type: 'string', required: true, minLength: 1 },
      story: { type: 'string', required: true, minLength: 1 },
      choiceCondition: { type: 'string', required: true },
      image: { type: 'string', required: true }
    },
    foreignKeys: [
      { field: 'commissionId', targetTypeName: 'commissions' }
    ],
    uniqueFields: ['id']
  },
  repairSteps: {
    typeName: 'repairSteps',
    idPrefix: 'step-',
    version: CONFIG_CENTER_VERSION,
    fields: {
      id: { type: 'string', required: true, idPrefix: 'step-' },
      title: { type: 'string', required: true, minLength: 1 },
      description: { type: 'string', required: true },
      choices: { type: 'array', required: true }
    },
    foreignKeys: [],
    uniqueFields: ['id']
  },
  dialogueNodes: {
    typeName: 'dialogueNodes',
    idPrefix: 'dlg-',
    version: CONFIG_CENTER_VERSION,
    fields: {
      id: { type: 'string', required: true, idPrefix: 'dlg-' },
      commissionId: { type: 'string', required: true, idPrefix: 'comm-' },
      nodeType: { type: 'enum', required: true, enumValues: ['commission_accept', 'commission_intro', 'repair_pre', 'repair_post', 'story_interlude', 'branch', 'narration'] },
      order: { type: 'number', required: true, minValue: 1 },
      speaker: { type: 'enum', required: true, enumValues: ['shopkeeper', 'client', 'narrator', 'player', 'inner_thought'] },
      content: { type: 'string', required: true, minLength: 1 }
    },
    foreignKeys: [
      { field: 'commissionId', targetTypeName: 'commissions' }
    ],
    uniqueFields: ['id']
  },
  achievements: {
    typeName: 'achievements',
    idPrefix: 'ach-',
    version: CONFIG_CENTER_VERSION,
    fields: {
      id: { type: 'string', required: true, idPrefix: 'ach-' },
      name: { type: 'string', required: true, minLength: 1 },
      description: { type: 'string', required: true },
      icon: { type: 'string', required: true },
      category: { type: 'enum', required: true, enumValues: ['score', 'ending', 'collection', 'special'] },
      rarity: { type: 'enum', required: true, enumValues: ['common', 'rare', 'epic', 'legendary'] }
    },
    foreignKeys: [],
    uniqueFields: ['id']
  }
}

export function getSchema(typeName: ConfigTypeName): ConfigTypeSchema {
  return SCHEMAS[typeName]
}

export function getAllSchemas(): Record<ConfigTypeName, ConfigTypeSchema> {
  return { ...SCHEMAS }
}

function validateField(
  value: unknown,
  fieldSchema: ConfigFieldSchema,
  fieldName: string,
  typeName: string,
  itemId: string | undefined,
  errors: ConfigValidationError[],
  warnings: ConfigValidationWarning[]
): void {
  if (value === undefined || value === null) {
    if (fieldSchema.required) {
      errors.push({
        typeName,
        itemId,
        field: fieldName,
        message: `必填字段 ${fieldName} 缺失`,
        value
      })
    }
    return
  }

  switch (fieldSchema.type) {
    case 'string': {
      if (typeof value !== 'string') {
        errors.push({ typeName, itemId, field: fieldName, message: `${fieldName} 应为字符串类型`, value })
        return
      }
      if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
        errors.push({ typeName, itemId, field: fieldName, message: `${fieldName} 最小长度为 ${fieldSchema.minLength}`, value })
      }
      if (fieldSchema.pattern && !new RegExp(fieldSchema.pattern).test(value)) {
        errors.push({ typeName, itemId, field: fieldName, message: `${fieldName} 格式不正确，需匹配 ${fieldSchema.pattern}`, value })
      }
      if (fieldSchema.idPrefix && !value.startsWith(fieldSchema.idPrefix)) {
        warnings.push({ typeName, itemId, field: fieldName, message: `${fieldName} 应以 ${fieldSchema.idPrefix} 开头`, value })
      }
      break
    }
    case 'number': {
      if (typeof value !== 'number') {
        errors.push({ typeName, itemId, field: fieldName, message: `${fieldName} 应为数字类型`, value })
        return
      }
      if (fieldSchema.minValue !== undefined && value < fieldSchema.minValue) {
        errors.push({ typeName, itemId, field: fieldName, message: `${fieldName} 最小值为 ${fieldSchema.minValue}`, value })
      }
      if (fieldSchema.maxValue !== undefined && value > fieldSchema.maxValue) {
        errors.push({ typeName, itemId, field: fieldName, message: `${fieldName} 最大值为 ${fieldSchema.maxValue}`, value })
      }
      break
    }
    case 'boolean': {
      if (typeof value !== 'boolean') {
        errors.push({ typeName, itemId, field: fieldName, message: `${fieldName} 应为布尔类型`, value })
      }
      break
    }
    case 'enum': {
      if (fieldSchema.enumValues && !fieldSchema.enumValues.includes(value as string)) {
        errors.push({
          typeName,
          itemId,
          field: fieldName,
          message: `${fieldName} 值 ${(value as string)} 不在枚举范围内: ${fieldSchema.enumValues.join(', ')}`,
          value
        })
      }
      break
    }
    case 'array': {
      if (!Array.isArray(value)) {
        errors.push({ typeName, itemId, field: fieldName, message: `${fieldName} 应为数组类型`, value })
        return
      }
      if (fieldSchema.items) {
        for (let i = 0; i < value.length; i++) {
          validateField(value[i], fieldSchema.items, `${fieldName}[${i}]`, typeName, itemId, errors, warnings)
        }
      }
      break
    }
    case 'object': {
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        errors.push({ typeName, itemId, field: fieldName, message: `${fieldName} 应为对象类型`, value })
      }
      break
    }
    case 'record': {
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        errors.push({ typeName, itemId, field: fieldName, message: `${fieldName} 应为记录类型`, value })
      }
      break
    }
  }
}

function validateForeignKeys(
  item: Record<string, unknown>,
  schema: ConfigTypeSchema,
  typeName: string,
  itemId: string | undefined,
  allData: Map<string, Set<string>>,
  errors: ConfigValidationError[]
): void {
  for (const fk of schema.foreignKeys) {
    const fields = Array.isArray(fk.field) ? fk.field : [fk.field]
    const targetIds = allData.get(fk.targetTypeName)
    if (!targetIds) continue

    for (const field of fields) {
      const value = item[field]
      if (value === undefined || value === null) continue

      if (Array.isArray(value)) {
        for (const refId of value) {
          if (typeof refId === 'string' && !targetIds.has(refId)) {
            errors.push({
              typeName,
              itemId,
              field,
              message: `${field} 引用了不存在的 ${fk.targetTypeName}: ${refId}`,
              value: refId
            })
          }
        }
      } else if (typeof value === 'string') {
        if (!targetIds.has(value)) {
          errors.push({
            typeName,
            itemId,
            field,
            message: `${field} 引用了不存在的 ${fk.targetTypeName}: ${value}`,
            value
          })
        }
      }
    }
  }
}

function validateUniqueness(
  items: Record<string, unknown>[],
  schema: ConfigTypeSchema,
  typeName: string,
  errors: ConfigValidationError[]
): void {
  for (const field of schema.uniqueFields) {
    const seen = new Map<unknown, string>()
    for (const item of items) {
      const value = item[field]
      if (value === undefined) continue
      const prevId = seen.get(value)
      if (prevId !== undefined) {
        errors.push({
          typeName,
          itemId: String(item.id ?? prevId),
          field,
          message: `${field} 值 ${String(value)} 重复（与 ${prevId} 冲突）`,
          value
        })
      } else {
        seen.set(value, String(item.id ?? 'unknown'))
      }
    }
  }
}

export function validateConfig<T extends Record<string, unknown>>(
  typeName: ConfigTypeName,
  data: T[]
): ConfigValidationResult {
  const schema = SCHEMAS[typeName]
  if (!schema) {
    return {
      valid: false,
      errors: [{ typeName, field: 'schema', message: `未知的配置类型: ${typeName}` }],
      warnings: []
    }
  }

  const errors: ConfigValidationError[] = []
  const warnings: ConfigValidationWarning[] = []
  const allIds = new Map<string, Set<string>>()

  for (const [name, entry] of registries) {
    allIds.set(name, new Set(entry.data.map((d: Record<string, unknown>) => String(d.id))))
  }

  for (const item of data) {
    const itemId = String(item.id ?? 'unknown')

    for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
      validateField(item[fieldName], fieldSchema, fieldName, typeName, itemId, errors, warnings)
    }

    validateForeignKeys(item, schema, typeName, itemId, allIds, errors)
  }

  validateUniqueness(data, schema, typeName, errors)

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

export function registerConfig<T>(typeName: ConfigTypeName, data: T[], version: string): ConfigValidationResult {
  const schema = SCHEMAS[typeName]
  const dataArray = data as unknown as Record<string, unknown>[]
  const result = validateConfig(typeName, dataArray)

  const entry: ConfigRegistryEntry<T> = {
    typeName,
    schema,
    data: [...data],
    version,
    loadedAt: new Date().toISOString(),
    lastValidatedAt: new Date().toISOString(),
    lastValidationResult: result
  }

  registries.set(typeName, entry)

  if (result.valid) {
    emitEvent('validated', typeName, version, undefined, 0, result.warnings.length)
  } else {
    emitEvent('validation_failed', typeName, version, `${result.errors.length} 个错误`, result.errors.length, result.warnings.length)
  }

  emitEvent('loaded', typeName, version, `注册 ${data.length} 条记录`)

  return result
}

export function getConfig<T>(typeName: ConfigTypeName): T[] | null {
  const entry = registries.get(typeName)
  if (!entry) return null
  return entry.data as T[]
}

export function getRegistryEntry(typeName: ConfigTypeName): ConfigRegistryEntry | undefined {
  return registries.get(typeName)
}

export function getAllRegistryEntries(): Map<string, ConfigRegistryEntry> {
  return new Map(registries)
}

export function hotReloadConfig<T>(typeName: ConfigTypeName, newData: T[], version: string): ConfigValidationResult {
  if (!hotReloadEnabled) {
    console.warn(`ConfigCenter: 热更新未启用，忽略 ${typeName} 的更新请求`)
    return { valid: false, errors: [{ typeName, field: 'hotReload', message: '热更新未启用' }], warnings: [] }
  }

  const dataArray = newData as unknown as Record<string, unknown>[]
  const result = validateConfig(typeName, dataArray)

  if (!result.valid) {
    emitEvent('validation_failed', typeName, version, `热更新校验失败: ${result.errors.length} 个错误`, result.errors.length, result.warnings.length)
    return result
  }

  const existing = registries.get(typeName)
  const schema = SCHEMAS[typeName]

  const entry: ConfigRegistryEntry<T> = {
    typeName,
    schema,
    data: [...newData],
    version,
    loadedAt: existing?.loadedAt ?? new Date().toISOString(),
    lastValidatedAt: new Date().toISOString(),
    lastValidationResult: result
  }

  registries.set(typeName, entry)
  lastHotReloadAt = new Date().toISOString()

  emitEvent('hot_reloaded', typeName, version, `热更新 ${newData.length} 条记录`)

  return result
}

export function enableHotReload(enabled: boolean = true): void {
  hotReloadEnabled = enabled
}

export function isHotReloadEnabled(): boolean {
  return hotReloadEnabled
}

export function getLastHotReloadAt(): string | null {
  return lastHotReloadAt
}

export function getConfigIds(typeName: ConfigTypeName): Set<string> {
  const entry = registries.get(typeName)
  if (!entry) return new Set()
  return new Set(entry.data.map((d: Record<string, unknown>) => String(d.id)))
}

export function validateAllConfigs(): { valid: boolean; results: Record<string, ConfigValidationResult> } {
  const results: Record<string, ConfigValidationResult> = {}
  let allValid = true

  for (const [typeName, entry] of registries) {
    const dataArray = entry.data as Record<string, unknown>[]
    const result = validateConfig(typeName as ConfigTypeName, dataArray)
    results[typeName] = result
    entry.lastValidationResult = result
    entry.lastValidatedAt = new Date().toISOString()
    if (!result.valid) allValid = false
  }

  return { valid: allValid, results }
}

export function validateCrossReferences(): { valid: boolean; errors: ConfigValidationError[]; warnings: ConfigValidationWarning[] } {
  const errors: ConfigValidationError[] = []
  const warnings: ConfigValidationWarning[] = []

  const tagIds = getConfigIds('tags')
  const chapterIds = getConfigIds('chapters')
  const commissionIds = getConfigIds('commissions')
  const clueIds = getConfigIds('clues')
  const hotspotIds = new Set<string>()

  const commissionsData = getConfig<CommissionConfig>('commissions') || []
  for (const comm of commissionsData) {
    for (const h of comm.item.hotspots) {
      if (hotspotIds.has(h.id)) {
        errors.push({ typeName: 'commissions', itemId: comm.id, field: 'item.hotspots', message: `重复的 hotspot ID: ${h.id}` })
      }
      hotspotIds.add(h.id)
    }
  }

  const chaptersData = getConfig<ChapterConfig>('chapters') || []
  for (const chapter of chaptersData) {
    for (const commId of chapter.commissionIds) {
      if (!commissionIds.has(commId)) {
        errors.push({ typeName: 'chapters', itemId: chapter.id, field: 'commissionIds', message: `引用不存在的委托: ${commId}`, value: commId })
      }
    }
  }

  for (const comm of commissionsData) {
    if (!chapterIds.has(comm.chapterId)) {
      errors.push({ typeName: 'commissions', itemId: comm.id, field: 'chapterId', message: `引用不存在的章节: ${comm.chapterId}`, value: comm.chapterId })
    }
    for (const prereqId of comm.prerequisiteCommissionIds) {
      if (!commissionIds.has(prereqId)) {
        errors.push({ typeName: 'commissions', itemId: comm.id, field: 'prerequisiteCommissionIds', message: `引用不存在的前置委托: ${prereqId}`, value: prereqId })
      }
    }
    for (const h of comm.item.hotspots) {
      if (h.clueId && !clueIds.has(h.clueId)) {
        errors.push({ typeName: 'commissions', itemId: h.id, field: 'clueId', message: `热点引用不存在的线索: ${h.clueId}`, value: h.clueId })
      }
    }
  }

  const cluesData = getConfig<ClueConfig>('clues') || []
  for (const clue of cluesData) {
    if (!commissionIds.has(clue.commissionId)) {
      errors.push({ typeName: 'clues', itemId: clue.id, field: 'commissionId', message: `引用不存在的委托: ${clue.commissionId}`, value: clue.commissionId })
    }
    if (clue.hotspotId && !hotspotIds.has(clue.hotspotId)) {
      warnings.push({ typeName: 'clues', itemId: clue.id, field: 'hotspotId', message: `引用不存在的热点: ${clue.hotspotId}`, value: clue.hotspotId })
    }
    for (const tagId of clue.tagIds) {
      if (!tagIds.has(tagId)) {
        warnings.push({ typeName: 'clues', itemId: clue.id, field: 'tagIds', message: `引用不存在的标签: ${tagId}`, value: tagId })
      }
    }
  }

  const connectionsData = getConfig<ClueConnectionConfig>('connections') || []
  for (const conn of connectionsData) {
    if (!clueIds.has(conn.fromClueId)) {
      errors.push({ typeName: 'connections', itemId: conn.id, field: 'fromClueId', message: `引用不存在的线索: ${conn.fromClueId}`, value: conn.fromClueId })
    }
    if (!clueIds.has(conn.toClueId)) {
      errors.push({ typeName: 'connections', itemId: conn.id, field: 'toClueId', message: `引用不存在的线索: ${conn.toClueId}`, value: conn.toClueId })
    }
  }

  const endingsData = getConfig<EndingConfig>('endings') || []
  for (const ending of endingsData) {
    if (!commissionIds.has(ending.commissionId)) {
      errors.push({ typeName: 'endings', itemId: ending.id, field: 'commissionId', message: `引用不存在的委托: ${ending.commissionId}`, value: ending.commissionId })
    }
  }

  const dialogueData = getConfig<DialogueNode>('dialogueNodes') || []
  for (const node of dialogueData) {
    if (!commissionIds.has(node.commissionId)) {
      warnings.push({ typeName: 'dialogueNodes', itemId: node.id, field: 'commissionId', message: `引用不存在的委托: ${node.commissionId}`, value: node.commissionId })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

const CONFIG_MIGRATIONS: ConfigMigrationStep[] = [
  {
    fromVersion: '9.0.0',
    toVersion: '10.0.0',
    description: '统一配置中心迁移：补全缺失字段、清理无效引用、增加 configCenter 元信息',
    migrate: (data: unknown): unknown => {
      const raw = data as Record<string, unknown>
      if (!raw || typeof raw !== 'object') return data

      const result = { ...raw }

      if (Array.isArray(result.commissions)) {
        result.commissions = (result.commissions as CommissionConfig[]).map(comm => ({
          ...comm,
          stepDependencies: comm.stepDependencies ?? [
            { step: 'item', dependencyType: 'always' },
            { step: 'deduction', dependencyType: 'clue_count', minCount: 3 },
            { step: 'repair', dependencyType: 'connection_count', minCount: 1 }
          ],
          unlockRules: comm.unlockRules ?? [],
          prerequisiteCommissionIds: comm.prerequisiteCommissionIds ?? []
        }))
      }

      if (Array.isArray(result.clues)) {
        result.clues = (result.clues as ClueConfig[]).map(clue => ({
          ...clue,
          tagIds: clue.tagIds ?? [],
          category: clue.category ?? 'object'
        }))
      }

      if (result.repairSteps && typeof result.repairSteps === 'object') {
        const steps = result.repairSteps as Record<string, RepairStepConfig[]>
        for (const [commId, stepList] of Object.entries(steps)) {
          steps[commId] = stepList.map(step => ({
            ...step,
            choices: step.choices ?? [],
            difficultyVariants: step.difficultyVariants ?? { assisted: {}, standard: {}, challenging: {} }
          }))
        }
      }

      if (Array.isArray(result.endings)) {
        result.endings = (result.endings as EndingConfig[]).map(ending => ({
          ...ending,
          image: ending.image ?? '📋'
        }))
      }

      return result
    }
  }
]

export function migrateConfig(fromVersion: string, toVersion: string, data: unknown): ConfigMigrationResult {
  const errors: string[] = []
  let migratedCount = 0
  let skippedCount = 0
  let current = data
  let currentVersion = fromVersion

  const migrationPath = findMigrationPath(fromVersion, toVersion)

  if (migrationPath.length === 0 && fromVersion !== toVersion) {
    return {
      success: false,
      fromVersion,
      toVersion,
      migratedCount: 0,
      skippedCount: 0,
      errors: [`找不到从 ${fromVersion} 到 ${toVersion} 的迁移路径`]
    }
  }

  for (const step of migrationPath) {
    try {
      current = step.migrate(current)
      currentVersion = step.toVersion
      migratedCount++
    } catch (e) {
      errors.push(`迁移步骤 ${step.fromVersion} → ${step.toVersion} 失败: ${(e as Error).message}`)
      skippedCount++
    }
  }

  return {
    success: errors.length === 0,
    fromVersion,
    toVersion: currentVersion,
    migratedCount,
    skippedCount,
    errors
  }
}

function findMigrationPath(fromVersion: string, toVersion: string): ConfigMigrationStep[] {
  if (fromVersion === toVersion) return []

  const path: ConfigMigrationStep[] = []
  let current = fromVersion
  const visited = new Set<string>()

  while (current !== toVersion) {
    if (visited.has(current)) break
    visited.add(current)

    const step = CONFIG_MIGRATIONS.find(m => m.fromVersion === current)
    if (!step) break

    path.push(step)
    current = step.toVersion
  }

  return path
}

export function getAvailableMigrations(): ConfigMigrationStep[] {
  return [...CONFIG_MIGRATIONS]
}

export function initConfigCenter(configs: {
  tags: Tag[]
  chapters: ChapterConfig[]
  commissions: CommissionConfig[]
  clues: ClueConfig[]
  connections: ClueConnectionConfig[]
  endings: EndingConfig[]
  repairSteps: Record<string, RepairStepConfig[]>
  dialogueNodes: DialogueNode[]
  achievements: AchievementConfig[]
}): {
  valid: boolean
  schemaResults: Record<string, ConfigValidationResult>
  crossRefResult: { valid: boolean; errors: ConfigValidationError[]; warnings: ConfigValidationWarning[] }
} {
  registerConfig('tags', configs.tags, CONFIG_CENTER_VERSION)
  registerConfig('chapters', configs.chapters, CONFIG_CENTER_VERSION)
  registerConfig('commissions', configs.commissions, CONFIG_CENTER_VERSION)
  registerConfig('clues', configs.clues, CONFIG_CENTER_VERSION)
  registerConfig('connections', configs.connections, CONFIG_CENTER_VERSION)
  registerConfig('endings', configs.endings, CONFIG_CENTER_VERSION)

  const allRepairSteps: RepairStepConfig[] = []
  for (const steps of Object.values(configs.repairSteps)) {
    allRepairSteps.push(...steps)
  }
  registerConfig('repairSteps', allRepairSteps, CONFIG_CENTER_VERSION)

  registerConfig('dialogueNodes', configs.dialogueNodes, CONFIG_CENTER_VERSION)
  registerConfig('achievements', configs.achievements, CONFIG_CENTER_VERSION)

  const schemaResults = validateAllConfigs()
  const crossRefResult = validateCrossReferences()

  if (import.meta.env.DEV) {
    if (!schemaResults.valid) {
      const allErrors: ConfigValidationError[] = []
      for (const [name, result] of Object.entries(schemaResults.results)) {
        if (!result.valid) {
          allErrors.push(...result.errors)
        }
      }
      console.error('ConfigCenter 校验错误:', allErrors)
    }
    if (!crossRefResult.valid) {
      console.error('ConfigCenter 交叉引用错误:', crossRefResult.errors)
    }
    if (crossRefResult.warnings.length > 0) {
      console.warn('ConfigCenter 交叉引用警告:', crossRefResult.warnings)
    }
  }

  return {
    valid: schemaResults.valid && crossRefResult.valid,
    schemaResults: schemaResults.results,
    crossRefResult
  }
}
