import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

function loadTypes() {
  const typesPath = join(projectRoot, 'src', 'types', 'index.ts')
  const content = readFileSync(typesPath, 'utf-8')
  
  const tutorialStepsMatch = content.match(/export const TUTORIAL_STEPS: TutorialStepConfig\[\] = (\[[\s\S]*?\n\])/)
  if (!tutorialStepsMatch) {
    throw new Error('Could not find TUTORIAL_STEPS in types')
  }
  
  const stepsCode = tutorialStepsMatch[1]
  
  const routeNameMatches = [...stepsCode.matchAll(/routeName:\s*'([^']+)'/g)]
  const steps = routeNameMatches.map(match => match[1])
  
  return [...new Set(steps)]
}

function loadRoutes() {
  const routerPath = join(projectRoot, 'src', 'router', 'index.ts')
  const content = readFileSync(routerPath, 'utf-8')
  
  const routesMatch = content.match(/const routes = (\[[\s\S]*?\n\])/)
  if (!routesMatch) {
    throw new Error('Could not find routes in router')
  }
  
  const routesCode = routesMatch[1]
  
  const nameMatches = [...routesCode.matchAll(/name:\s*'([^']+)'/g)]
  const routes = nameMatches.map(match => match[1])
  
  return routes
}

function loadTutorialConfig() {
  const typesPath = join(projectRoot, 'src', 'types', 'index.ts')
  const content = readFileSync(typesPath, 'utf-8')
  
  const tutorialStepsMatch = content.match(/export const TUTORIAL_STEPS: TutorialStepConfig\[\] = (\[[\s\S]*?\n\])/)
  if (!tutorialStepsMatch) {
    throw new Error('Could not find TUTORIAL_STEPS in types')
  }
  
  const stepsCode = tutorialStepsMatch[1]
  
  const stepMatches = [...stepsCode.matchAll(/key:\s*'([^']+)'[\s\S]*?routeName:\s*'([^']+)'/g)]
  const stepConfigs = stepMatches.map(match => ({
    key: match[1],
    routeName: match[2]
  }))
  
  return stepConfigs
}

console.log('=== 新手引导链路覆盖验证 ===\n')

const routes = loadRoutes()
console.log(`1. 发现 ${routes.length} 个路由:`)
routes.forEach(route => console.log(`   - ${route}`))
console.log()

const tutorialRoutes = loadTypes()
console.log(`2. 新手引导覆盖的路由 (${tutorialRoutes.length} 个):`)
tutorialRoutes.forEach(route => console.log(`   - ${route}`))
console.log()

const stepConfigs = loadTutorialConfig()
console.log(`3. 引导步骤与路由映射 (${stepConfigs.length} 个步骤):`)
stepConfigs.forEach(step => console.log(`   ${step.key} → ${step.routeName}`))
console.log()

const expectedPath = ['home', 'roadmap', 'commissions', 'commission', 'deduction', 'repair', 'ending', 'gallery']
console.log(`4. 预期完整链路: ${expectedPath.join(' → ')}`)
console.log()

const coverage = expectedPath.map(route => ({
  route,
  hasRoute: routes.includes(route),
  hasTutorial: tutorialRoutes.includes(route)
}))

console.log('5. 链路覆盖检查:')
let allCovered = true
coverage.forEach(item => {
  const status = item.hasRoute && item.hasTutorial ? '✓' : '✗'
  if (!item.hasRoute || !item.hasTutorial) {
    allCovered = false
  }
  const details = []
  if (!item.hasRoute) details.push('路由缺失')
  if (!item.hasTutorial) details.push('引导缺失')
  console.log(`   ${status} ${item.route}${details.length > 0 ? ` (${details.join(', ')})` : ''}`)
})
console.log()

console.log('6. 结论:')
if (allCovered) {
  console.log('   ✓ 完整链路覆盖验证通过！首页到结局的所有页面都有对应的新手引导。')
} else {
  console.log('   ✗ 存在缺失的引导步骤，请检查上述列表。')
  process.exit(1)
}

console.log()
console.log('7. 渐进式改造特性验证:')

const gameStorePath = join(projectRoot, 'src', 'stores', 'game.ts')
const gameStoreContent = readFileSync(gameStorePath, 'utf-8')

const tutorialMethods = [
  'markTutorialInterruption',
  'clearTutorialInterruption',
  'canResumeTutorial',
  'updateTutorialRoute',
  'getTutorialResumeInfo',
  'setTutorialCurrentStep',
  'getNextTutorialStep',
  'isTutorialStepEligible',
  'getTutorialProgress'
]

console.log('   断点续引方法检查:')
let allMethodsPresent = true
tutorialMethods.forEach(method => {
  const present = gameStoreContent.includes(`function ${method}`)
  if (!present) allMethodsPresent = false
  console.log(`   ${present ? '✓' : '✗'} ${method}`)
})

const routerPath = join(projectRoot, 'src', 'router', 'index.ts')
const routerContent = readFileSync(routerPath, 'utf-8')

const routerFeatures = [
  'evaluateTutorialRouteGuard',
  'beforeEach',
  'afterEach',
  'tutorialKey'
]

console.log()
console.log('   路由守卫特性检查:')
let allRouterFeaturesPresent = true
routerFeatures.forEach(feature => {
  const present = routerContent.includes(feature)
  if (!present) allRouterFeaturesPresent = false
  console.log(`   ${present ? '✓' : '✗'} ${feature}`)
})

const useTutorialPath = join(projectRoot, 'src', 'composables', 'useTutorial.ts')
const useTutorialContent = readFileSync(useTutorialPath, 'utf-8')

const tutorialFeatures = [
  'resumeTutorial',
  'pauseTutorial',
  'wasInterrupted',
  'interruptionReason',
  'showResumePrompt',
  'useRouterState'
]

console.log()
console.log('   useTutorial 增强特性检查:')
let allTutorialFeaturesPresent = true
tutorialFeatures.forEach(feature => {
  const present = useTutorialContent.includes(feature)
  if (!present) allTutorialFeaturesPresent = false
  console.log(`   ${present ? '✓' : '✗'} ${feature}`)
})

const useRouterStatePath = join(projectRoot, 'src', 'composables', 'useRouterState.ts')
const useRouterStateContent = readFileSync(useRouterStatePath, 'utf-8')

const routerStateFeatures = [
  'markInterruption',
  'resumeFromInterruption',
  'saveRouterState',
  'loadRouterState',
  'navigateToGameStep'
]

console.log()
console.log('   useRouterState 特性检查:')
let allRouterStateFeaturesPresent = true
routerStateFeatures.forEach(feature => {
  const present = useRouterStateContent.includes(feature)
  if (!present) allRouterStateFeaturesPresent = false
  console.log(`   ${present ? '✓' : '✗'} ${feature}`)
})

console.log()
console.log('8. 最终结论:')
const allFeaturesPresent = allMethodsPresent && allRouterFeaturesPresent && 
  allTutorialFeaturesPresent && allRouterStateFeaturesPresent && allCovered

if (allFeaturesPresent) {
  console.log('   ✓ 所有渐进式改造特性验证通过！')
  console.log()
  console.log('   改造总结:')
  console.log('   • 路由层: 添加了路由守卫集成引导状态检查')
  console.log('   • 状态层: 扩展了 TutorialState 支持断点续引')
  console.log('   • 引导核心: 增强了 useTutorial 支持中断检测和恢复')
  console.log('   • 新增能力: useRouterState 管理路由持久化和恢复')
  console.log('   • 完整链路: 首页 → 路线图 → 委托列表 → 委托详情 → 推理板 → 修复 → 结局 → 陈列室')
} else {
  console.log('   ✗ 部分特性缺失，请检查上述列表。')
  process.exit(1)
}
