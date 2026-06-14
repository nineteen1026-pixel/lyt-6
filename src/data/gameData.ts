import type {
  CommissionConfig,
  ClueConfig,
  ClueConnectionConfig,
  EndingConfig,
  RepairStepConfig,
  ChapterConfig,
  Tag,
  DialogueNode,
  GameDataConfig,
  Commission,
  Clue,
  ClueConnection,
  Ending,
  RepairStep,
  Chapter,
  Item,
  Hotspot,
  ItemConfig,
  HotspotConfig
} from '../types'

import tagsConfig from './config/tags.json'
import chaptersConfig from './config/chapters.json'
import commissionsConfig from './config/commissions.json'
import cluesConfig from './config/clues.json'
import connectionsConfig from './config/connections.json'
import endingsConfig from './config/endings.json'
import repairStepsConfig from './config/repairSteps.json'
import dialogueComm001 from './config/dialogues/comm-001.json'
import dialogueComm002 from './config/dialogues/comm-002.json'
import dialogueComm003 from './config/dialogues/comm-003.json'

export const CONFIG_VERSION = '9.0.0'

function loadConfig<T>(config: unknown): T {
  const cfg = config as { version: string; data: T }
  if (cfg.version !== CONFIG_VERSION) {
    console.warn(
      `Config version mismatch: expected ${CONFIG_VERSION}, got ${cfg.version}. ` +
      `This may cause compatibility issues.`
    )
  }
  return cfg.data
}

export const tags: Tag[] = loadConfig<Tag[]>(tagsConfig)

export const chaptersConfigData: ChapterConfig[] = loadConfig<ChapterConfig[]>(chaptersConfig)

export const commissionsConfigData: CommissionConfig[] = loadConfig<CommissionConfig[]>(commissionsConfig)

export const cluesConfigData: ClueConfig[] = loadConfig<ClueConfig[]>(cluesConfig)

export const connectionsConfigData: ClueConnectionConfig[] = loadConfig<ClueConnectionConfig[]>(connectionsConfig)

export const endingsConfigData: EndingConfig[] = loadConfig<EndingConfig[]>(endingsConfig)

export const repairStepsConfigData: Record<string, RepairStepConfig[]> =
  loadConfig<Record<string, RepairStepConfig[]>>(repairStepsConfig)

export const dialogueNodesConfigData: DialogueNode[] = [
  ...loadConfig<DialogueNode[]>(dialogueComm001),
  ...loadConfig<DialogueNode[]>(dialogueComm002),
  ...loadConfig<DialogueNode[]>(dialogueComm003)
]

function createItemWithRuntimeState(config: ItemConfig): Item {
  return {
    ...config,
    hotspots: config.hotspots.map(createHotspotWithRuntimeState)
  }
}

function createHotspotWithRuntimeState(config: HotspotConfig): Hotspot {
  return {
    ...config,
    isDiscovered: false
  }
}

function createCommissionWithRuntimeState(config: CommissionConfig): Commission {
  return {
    ...config,
    status: 'pending' as const,
    item: createItemWithRuntimeState(config.item)
  }
}

function createChapterWithRuntimeState(config: ChapterConfig): Chapter {
  return {
    ...config,
    isUnlocked: config.id === 'chap-001',
    unlockedAt: undefined
  }
}

function createClueWithRuntimeState(config: ClueConfig): Clue {
  return {
    ...config,
    isCollected: false
  }
}

function createConnectionWithRuntimeState(config: ClueConnectionConfig): ClueConnection {
  return {
    ...config,
    isDiscovered: false
  }
}

function createEndingWithRuntimeState(config: EndingConfig): Ending {
  return {
    ...config,
    isUnlocked: false
  }
}

function createRepairStepWithRuntimeState(config: RepairStepConfig): RepairStep {
  return {
    ...config,
    isCompleted: false,
    selectedChoice: undefined
  }
}

export const chapters: Chapter[] = chaptersConfigData.map(createChapterWithRuntimeState)

export const commissions: Commission[] = commissionsConfigData.map(createCommissionWithRuntimeState)

export const clues: Clue[] = cluesConfigData.map(createClueWithRuntimeState)

export const connections: ClueConnection[] = connectionsConfigData.map(createConnectionWithRuntimeState)

export const endings: Ending[] = endingsConfigData.map(createEndingWithRuntimeState)

export const repairSteps: Record<string, RepairStep[]> = Object.fromEntries(
  Object.entries(repairStepsConfigData).map(([commissionId, steps]) => [
    commissionId,
    steps.map(createRepairStepWithRuntimeState)
  ])
)

export const dialogueNodes: DialogueNode[] = [...dialogueNodesConfigData]

export const gameDataConfig: GameDataConfig = {
  tags,
  chapters: chaptersConfigData,
  commissions: commissionsConfigData,
  clues: cluesConfigData,
  connections: connectionsConfigData,
  endings: endingsConfigData,
  repairSteps: repairStepsConfigData,
  dialogueNodes: dialogueNodesConfigData
}

export function getGameConfig(): GameDataConfig {
  return {
    tags: [...tags],
    chapters: [...chaptersConfigData],
    commissions: [...commissionsConfigData],
    clues: [...cluesConfigData],
    connections: [...connectionsConfigData],
    endings: [...endingsConfigData],
    repairSteps: { ...repairStepsConfigData },
    dialogueNodes: [...dialogueNodesConfigData]
  }
}

export function validateConfigIntegrity(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  const tagIds = new Set(tags.map(t => t.id))
  const chapterIds = new Set(chaptersConfigData.map(c => c.id))
  const commissionIds = new Set(commissionsConfigData.map(c => c.id))
  const clueIds = new Set(cluesConfigData.map(c => c.id))
  const endingIds = new Set(endingsConfigData.map(e => e.id))
  const hotspotIds = new Set<string>()

  commissionsConfigData.forEach(comm => {
    comm.item.hotspots.forEach(h => {
      if (hotspotIds.has(h.id)) {
        errors.push(`Duplicate hotspot ID: ${h.id}`)
      }
      hotspotIds.add(h.id)
    })
  })

  chaptersConfigData.forEach(chapter => {
    chapter.commissionIds.forEach(commId => {
      if (!commissionIds.has(commId)) {
        errors.push(`Chapter ${chapter.id} references non-existent commission: ${commId}`)
      }
    })
  })

  commissionsConfigData.forEach(comm => {
    if (!chapterIds.has(comm.chapterId)) {
      errors.push(`Commission ${comm.id} references non-existent chapter: ${comm.chapterId}`)
    }

    comm.prerequisiteCommissionIds.forEach(prereqId => {
      if (!commissionIds.has(prereqId)) {
        errors.push(`Commission ${comm.id} references non-existent prerequisite: ${prereqId}`)
      }
    })

    comm.item.hotspots.forEach(h => {
      if (h.clueId && !clueIds.has(h.clueId)) {
        errors.push(`Hotspot ${h.id} references non-existent clue: ${h.clueId}`)
      }
    })
  })

  cluesConfigData.forEach(clue => {
    if (!commissionIds.has(clue.commissionId)) {
      errors.push(`Clue ${clue.id} references non-existent commission: ${clue.commissionId}`)
    }

    if (clue.hotspotId && !hotspotIds.has(clue.hotspotId)) {
      warnings.push(`Clue ${clue.id} references non-existent hotspot: ${clue.hotspotId}`)
    }

    clue.tagIds.forEach(tagId => {
      if (!tagIds.has(tagId)) {
        warnings.push(`Clue ${clue.id} references non-existent tag: ${tagId}`)
      }
    })
  })

  connectionsConfigData.forEach(conn => {
    if (!clueIds.has(conn.fromClueId)) {
      errors.push(`Connection ${conn.id} references non-existent fromClue: ${conn.fromClueId}`)
    }
    if (!clueIds.has(conn.toClueId)) {
      errors.push(`Connection ${conn.id} references non-existent toClue: ${conn.toClueId}`)
    }
  })

  endingsConfigData.forEach(ending => {
    if (!commissionIds.has(ending.commissionId)) {
      errors.push(`Ending ${ending.id} references non-existent commission: ${ending.commissionId}`)
    }
  })

  Object.entries(repairStepsConfigData).forEach(([commId, steps]) => {
    if (!commissionIds.has(commId)) {
      warnings.push(`Repair steps exist for non-existent commission: ${commId}`)
    }
  })

  dialogueNodesConfigData.forEach(node => {
    if (!commissionIds.has(node.commissionId)) {
      warnings.push(`Dialogue node ${node.id} references non-existent commission: ${node.commissionId}`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

if (import.meta.env.DEV) {
  const validation = validateConfigIntegrity()
  if (!validation.valid) {
    console.error('Config validation errors:', validation.errors)
  }
  if (validation.warnings.length > 0) {
    console.warn('Config validation warnings:', validation.warnings)
  }
}
