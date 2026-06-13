# 记忆修复店

一款基于 Vue3 + Vite + Pinia + Vue Router 的叙事轻解谜网页游戏。

## 游戏介绍

你将扮演一名记忆修复师，通过修复客户带来的旧物来还原失落的记忆。每一件旧物都承载着一段被遗忘的故事，等待你去发现和修复。

### 核心玩法
- 接受委托 → 检视旧物 → 收集线索 → 推理关联 → 执行修复 → 达成结局

### 功能模块
- **委托列表**：浏览待接取和进行中的委托
- **旧物详情**：点击热点区域发现线索
- **线索推理板**：关联线索推导修复方案
- **修复流程**：选择修复方式，触发不同结局
- **分支结局**：每个委托都有完美、温暖、遗憾三种结局
- **历史陈列室**：回顾已完成的委托和解锁的结局
- **继续游戏**：自动保存进度，支持随时继续

## 技术栈
- Vue 3.4 + TypeScript
- Vite 5
- Pinia 2 (状态管理)
- Vue Router 4 (路由)
- TailwindCSS 3 (样式)
- Lucide Vue Next (图标)

## 快速开始

### 一键运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

然后在浏览器中打开显示的地址（通常是 `http://localhost:5173`）即可开始游戏。

### 其他命令

```bash
# 类型检查
npm run check

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 项目结构

```
src/
├── assets/          # 静态资源
├── components/      # 通用组件
├── composables/     # 组合式函数
├── data/            # 游戏数据（委托、线索、结局）
├── lib/             # 工具函数
├── pages/           # 页面组件
│   ├── HomePage.vue        # 首页
│   ├── CommissionList.vue  # 委托列表
│   ├── ItemDetail.vue      # 旧物详情
│   ├── DeductionBoard.vue  # 线索推理板
│   ├── RepairProcess.vue   # 修复流程
│   ├── EndingPage.vue      # 结局展示
│   └── GalleryPage.vue     # 历史陈列室
├── router/          # 路由配置
├── stores/          # Pinia 状态管理
├── types/           # TypeScript 类型定义
├── utils/           # 工具函数（存档等）
├── App.vue
├── main.ts
└── style.css        # 全局样式
```

## 游戏提示

1. 💡 仔细检视旧物，点击发光区域发现线索
2. 🔗 尝试将相关的线索连接起来，发现隐藏的真相
3. ✨ 收集更多线索有助于达成更好的结局
4. 🎯 你的修复选择将决定最终的结局
5. 💾 游戏会自动保存进度，随时可以继续

## 存档说明

游戏进度自动保存在浏览器的 localStorage 中，包含：
- 当前进行中的委托
- 已收集的线索
- 已发现的关联
- 已解锁的结局
- 已完成的委托

可以在首页清除所有存档数据重新开始。
