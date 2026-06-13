import type { Commission, Clue, ClueConnection, Ending, RepairStep } from '../types'

export const commissions: Commission[] = [
  {
    id: 'comm-001',
    title: '褪色的音乐盒',
    clientName: '林奶奶',
    clientAvatar: '👵',
    description: '这是我老伴生前送给我的定情信物，音乐盒还能转动，但上面的漆都掉了，照片也模糊了……能不能帮我找回那些年轻时的记忆？',
    difficulty: 'simple',
    status: 'pending',
    item: {
      id: 'item-001',
      name: '老式音乐盒',
      description: '一个木制的老式音乐盒，表面的红漆已经褪色，盖子上嵌着一张模糊的老照片。打开时会播放一段走调的旋律。',
      image: '🎵',
      hotspots: [
        {
          id: 'hot-001-1',
          name: '表面的划痕',
          x: 25,
          y: 30,
          width: 15,
          height: 20,
          description: '盒盖上有几道深浅不一的划痕，像是被什么东西反复摩擦过。',
          clueId: 'clue-001-1',
          isDiscovered: false
        },
        {
          id: 'hot-001-2',
          name: '模糊的照片',
          x: 50,
          y: 45,
          width: 30,
          height: 25,
          description: '照片里是一对年轻的情侣，女孩穿着白裙子，男孩抱着吉他。但画面已经泛黄模糊。',
          clueId: 'clue-001-2',
          isDiscovered: false
        },
        {
          id: 'hot-001-3',
          name: '发条旋钮',
          x: 80,
          y: 60,
          width: 12,
          height: 15,
          description: '铜制的发条旋钮已经氧化发黑，但还能转动。旋钮底部刻着一个小小的「L」字母。',
          clueId: 'clue-001-3',
          isDiscovered: false
        },
        {
          id: 'hot-001-4',
          name: '底部的纸条',
          x: 35,
          y: 75,
          width: 25,
          height: 10,
          description: '音乐盒底部粘着一张小纸条，上面的字迹被胶水晕开了，只能隐约看到「永远」两个字。',
          clueId: 'clue-001-4',
          isDiscovered: false
        }
      ]
    }
  },
  {
    id: 'comm-002',
    title: '破碎的陶瓷碗',
    clientName: '小陈',
    clientAvatar: '👨',
    description: '这是我外婆生前用的碗，小时候她总用这个碗给我盛糖水。搬家时不小心打碎了，我粘回去过，但怎么看都不对……',
    difficulty: 'medium',
    status: 'pending',
    item: {
      id: 'item-002',
      name: '青瓷碗',
      description: '一只青瓷小碗，碗身有几道裂痕，是用胶水笨拙地粘起来的。碗底有一个小小的印章。',
      image: '🍜',
      hotspots: [
        {
          id: 'hot-002-1',
          name: '碗口的缺口',
          x: 45,
          y: 15,
          width: 25,
          height: 10,
          description: '碗口边缘缺了一小块，断面很整齐，不像是自然碎裂的。',
          clueId: 'clue-002-1',
          isDiscovered: false
        },
        {
          id: 'hot-002-2',
          name: '碗壁的裂纹',
          x: 30,
          y: 40,
          width: 35,
          height: 30,
          description: '碗壁上有一道长长的裂纹，从碗口一直延伸到底部。裂纹里还残留着一些黄褐色的痕迹。',
          clueId: 'clue-002-2',
          isDiscovered: false
        },
        {
          id: 'hot-002-3',
          name: '碗底的印章',
          x: 55,
          y: 70,
          width: 15,
          height: 15,
          description: '碗底有一个小小的方形印章，上面刻着「陈」字，旁边还有一行小字。',
          clueId: 'clue-002-3',
          isDiscovered: false
        },
        {
          id: 'hot-002-4',
          name: '内壁的图案',
          x: 40,
          y: 35,
          width: 20,
          height: 20,
          description: '碗的内壁有一圈淡淡的花纹，是一朵小小的梅花。花瓣有些磨损，但还能辨认出形状。',
          clueId: 'clue-002-4',
          isDiscovered: false
        },
        {
          id: 'hot-002-5',
          name: '胶水的痕迹',
          x: 20,
          y: 50,
          width: 10,
          height: 25,
          description: '裂缝上涂着厚厚的透明胶水，涂抹得很不均匀，看得出来是个生手粘的。',
          clueId: 'clue-002-5',
          isDiscovered: false
        }
      ]
    }
  },
  {
    id: 'comm-003',
    title: '沉默的怀表',
    clientName: '周先生',
    clientAvatar: '🧔',
    description: '这块怀表是我父亲留给我的，他走得突然，什么都没来得及说。表停了，我想知道……它停在了什么时候。',
    difficulty: 'complex',
    status: 'pending',
    item: {
      id: 'item-003',
      name: '银质怀表',
      description: '一块银色的老怀表，表盖上面刻着精致的花纹。表已经停走了，表蒙子上有一道裂痕。',
      image: '⌚',
      hotspots: [
        {
          id: 'hot-003-1',
          name: '表盖的刻字',
          x: 50,
          y: 25,
          width: 30,
          height: 20,
          description: '表盖内侧刻着一行小字：「给我的儿子，愿你的每一秒都有意义。——父亲」',
          clueId: 'clue-003-1',
          isDiscovered: false
        },
        {
          id: 'hot-003-2',
          name: '停止的指针',
          x: 45,
          y: 50,
          width: 25,
          height: 25,
          description: '指针停在了三点十七分。秒针停在第十二格的位置，很整齐。',
          clueId: 'clue-003-2',
          isDiscovered: false
        },
        {
          id: 'hot-003-3',
          name: '表蒙的裂痕',
          x: 30,
          y: 35,
          width: 40,
          height: 30,
          description: '表蒙子上有一道蛛网状的裂痕，从右上角延伸到中心。像是被什么东西撞击过。',
          clueId: 'clue-003-3',
          isDiscovered: false
        },
        {
          id: 'hot-003-4',
          name: '表链的磨损',
          x: 15,
          y: 55,
          width: 15,
          height: 30,
          description: '表链的扣环处磨损得很厉害，棱角都磨圆了。看来这块表经常被拿在手里摩挲。',
          clueId: 'clue-003-4',
          isDiscovered: false
        },
        {
          id: 'hot-003-5',
          name: '背面的照片',
          x: 55,
          y: 60,
          width: 20,
          height: 20,
          description: '表的后盖可以打开，里面藏着一张小小的照片，是一个婴儿的笑脸。照片背面写着出生日期。',
          clueId: 'clue-003-5',
          isDiscovered: false
        },
        {
          id: 'hot-003-6',
          name: '机芯的锈迹',
          x: 40,
          y: 65,
          width: 25,
          height: 15,
          description: '透过裂缝能看到一点机芯，上面有些褐色的锈迹。但齿轮看起来还完好。',
          clueId: 'clue-003-6',
          isDiscovered: false
        }
      ]
    }
  }
]

export const clues: Clue[] = [
  {
    id: 'clue-001-1',
    commissionId: 'comm-001',
    title: '反复的划痕',
    content: '音乐盒盖上的划痕是反复摩擦形成的，像是有人经常用手指沿着同一个方向摩挲。也许是因为思念？',
    icon: '〰️',
    category: 'object',
    isCollected: false,
    hotspotId: 'hot-001-1'
  },
  {
    id: 'clue-001-2',
    commissionId: 'comm-001',
    title: '年轻的情侣',
    content: '照片上的女孩穿着白色连衣裙，男孩抱着一把吉他。他们站在一片草地上，笑得很灿烂。这一定是他们年轻时的样子。',
    icon: '📸',
    category: 'memory',
    isCollected: false,
    hotspotId: 'hot-001-2'
  },
  {
    id: 'clue-001-3',
    commissionId: 'comm-001',
    title: 'L 字母',
    content: '发条旋钮底部刻着一个「L」。林奶奶的姓氏是林，那这个 L 是她的名字？还是……另一个人的？',
    icon: '🔤',
    category: 'object',
    isCollected: false,
    hotspotId: 'hot-001-3'
  },
  {
    id: 'clue-001-4',
    commissionId: 'comm-001',
    title: '永远的约定',
    content: '纸条上的字虽然被胶水晕开了，但能看出是「永远爱你」四个字。字迹很清秀，应该是男孩子写的。',
    icon: '📝',
    category: 'emotion',
    isCollected: false,
    hotspotId: 'hot-001-4'
  },
  {
    id: 'clue-002-1',
    commissionId: 'comm-002',
    title: '整齐的断面',
    content: '碗口的缺口断面很整齐，不像摔碎的，倒像是被什么东西咬掉的……或者是被什么坚硬的东西磕碰的？',
    icon: '⚡',
    category: 'object',
    isCollected: false,
    hotspotId: 'hot-002-1'
  },
  {
    id: 'clue-002-2',
    commissionId: 'comm-002',
    title: '黄褐色痕迹',
    content: '裂纹里的黄褐色痕迹……闻起来有一股淡淡的焦糖味。难道是小时候装过的糖水渗进去了？',
    icon: '🍯',
    category: 'object',
    isCollected: false,
    hotspotId: 'hot-002-2'
  },
  {
    id: 'clue-002-3',
    commissionId: 'comm-002',
    title: '家传的印章',
    content: '碗底的「陈」字印章旁边还有一行小字：「民国三十年制」。这碗的年纪比外婆还大呢。',
    icon: '🔲',
    category: 'time',
    isCollected: false,
    hotspotId: 'hot-002-3'
  },
  {
    id: 'clue-002-4',
    commissionId: 'comm-002',
    title: '梅花图案',
    content: '碗内壁的梅花图案磨损得很厉害，特别是正对着碗口的那一朵。看来经常有人从这个方向喝东西。',
    icon: '🌸',
    category: 'object',
    isCollected: false,
    hotspotId: 'hot-002-4'
  },
  {
    id: 'clue-002-5',
    commissionId: 'comm-002',
    title: '笨拙的修补',
    content: '胶水涂得歪歪扭扭的，还有些溢出来的痕迹。能看出来修补的人很用心，但手很笨。是小陈自己粘的吗？',
    icon: '🔧',
    category: 'emotion',
    isCollected: false,
    hotspotId: 'hot-002-5'
  },
  {
    id: 'clue-003-1',
    commissionId: 'comm-003',
    title: '父亲的赠言',
    content: '「给我的儿子，愿你的每一秒都有意义。——父亲」 这块表是父亲送给儿子的礼物，承载着父亲的期望。',
    icon: '💌',
    category: 'emotion',
    isCollected: false,
    hotspotId: 'hot-003-1'
  },
  {
    id: 'clue-003-2',
    commissionId: 'comm-003',
    title: '三点十七分',
    content: '指针停在三点十七分。这个时间有什么特殊的意义吗？是一个人的出生时间？还是……什么重要的时刻？',
    icon: '🕒',
    category: 'time',
    isCollected: false,
    hotspotId: 'hot-003-2'
  },
  {
    id: 'clue-003-3',
    commissionId: 'comm-003',
    title: '撞击的裂痕',
    content: '表蒙上的裂痕是撞击造成的，而且力度不小。怀表是怎么被撞击的？掉在地上了？还是……遇到了什么意外？',
    icon: '💥',
    category: 'object',
    isCollected: false,
    hotspotId: 'hot-003-3'
  },
  {
    id: 'clue-003-4',
    commissionId: 'comm-003',
    title: '摩挲的痕迹',
    content: '表链扣环磨损得很厉害，说明这块表经常被人拿在手里把玩、摩挲。是父亲？还是儿子？',
    icon: '✋',
    category: 'emotion',
    isCollected: false,
    hotspotId: 'hot-003-4'
  },
  {
    id: 'clue-003-5',
    commissionId: 'comm-003',
    title: '婴儿的照片',
    content: '后盖上藏着一张婴儿照片，背面写着出生日期：1985年3月17日，凌晨3点17分。哦……原来如此。',
    icon: '👶',
    category: 'memory',
    isCollected: false,
    hotspotId: 'hot-003-5'
  },
  {
    id: 'clue-003-6',
    commissionId: 'comm-003',
    title: '完好的机芯',
    content: '虽然表蒙裂了，也生了点锈，但机芯的齿轮看起来还完好。也许……这块表还能修好，重新走起来？',
    icon: '⚙️',
    category: 'object',
    isCollected: false,
    hotspotId: 'hot-003-6'
  }
]

export const connections: ClueConnection[] = [
  {
    id: 'conn-001-1',
    fromClueId: 'clue-001-2',
    toClueId: 'clue-001-4',
    conclusion: '照片上的情侣就是林奶奶和她的老伴，他们年轻时相爱并许下了永远的约定。',
    isDiscovered: false,
    repairHint: '修复照片，还原他们年轻时的模样'
  },
  {
    id: 'conn-001-2',
    fromClueId: 'clue-001-1',
    toClueId: 'clue-001-3',
    conclusion: '划痕的位置正好对应着旋钮上的 L 字母，林奶奶一定是无数次摸着这个字母思念老伴。',
    isDiscovered: false,
    repairHint: '重新镀金旋钮，让 L 字母重新闪耀'
  },
  {
    id: 'conn-002-1',
    fromClueId: 'clue-002-2',
    toClueId: 'clue-002-4',
    conclusion: '糖水从梅花图案的位置渗进去，说明每次喝糖水都是从这个方向。外婆一定是看着小陈喝糖水的。',
    isDiscovered: false,
    repairHint: '清理裂纹中的糖渍，保留岁月的痕迹'
  },
  {
    id: 'conn-002-2',
    fromClueId: 'clue-002-1',
    toClueId: 'clue-002-5',
    conclusion: '缺口是小时候小陈不小心咬的，长大后他笨拙地想把碗粘好，却越弄越糟。',
    isDiscovered: false,
    repairHint: '用金缮工艺修补缺口，让残缺也成为美'
  },
  {
    id: 'conn-002-3',
    fromClueId: 'clue-002-3',
    toClueId: 'clue-002-4',
    conclusion: '这只梅花碗是陈家的传家宝，从民国传到现在，每一代都用它喝过糖水。',
    isDiscovered: false,
    repairHint: '修复碗底的印章，让家族的印记清晰可见'
  },
  {
    id: 'conn-003-1',
    fromClueId: 'clue-003-2',
    toClueId: 'clue-003-5',
    conclusion: '怀表停在3点17分，而周先生正好是3月17日凌晨3点17分出生的。这块表记录了他生命开始的时刻。',
    isDiscovered: false,
    repairHint: '让怀表重新走动，但永远保留3点17分的记忆'
  },
  {
    id: 'conn-003-2',
    fromClueId: 'clue-003-1',
    toClueId: 'clue-003-4',
    conclusion: '父亲无数次摩挲着这块表，想象着儿子的未来。他把所有的爱和期望都寄托在了这块怀表里。',
    isDiscovered: false,
    repairHint: '修复表链的磨损，保留那些爱的痕迹'
  },
  {
    id: 'conn-003-3',
    fromClueId: 'clue-003-3',
    toClueId: 'clue-003-6',
    conclusion: '表虽然被撞裂了，但机芯完好。就像父亲虽然走了，但他的爱一直完好无损。',
    isDiscovered: false,
    repairHint: '修复表蒙，但保留一道细微的裂纹作为纪念'
  }
]

export const endings: Ending[] = [
  {
    id: 'end-001-good',
    commissionId: 'comm-001',
    type: 'good',
    title: '永恒的旋律',
    story: '音乐盒修好了。当熟悉的旋律再次响起，林奶奶的眼眶湿润了。\n\n「和当年一模一样……他就是用这首曲子向我表白的。」\n\n她轻轻抚摸着重新变得清晰的照片，照片上的年轻人笑得那样灿烂。\n\n「谢谢你，让我又想起了那些日子。原来有些记忆，从来都没有褪色。」\n\n林奶奶抱着音乐盒，嘴角带着微笑，像是回到了十八岁的那个夏天。',
    choiceCondition: '选择完整修复音乐盒和照片',
    image: '🎶',
    isUnlocked: false
  },
  {
    id: 'end-001-neutral',
    commissionId: 'comm-001',
    type: 'neutral',
    title: '时光的印记',
    story: '音乐盒能发出声音了，但你选择保留了一些岁月的痕迹。\n\n林奶奶接过音乐盒，轻轻笑了：「这样也好，旧旧的，才像我们一起走过的日子。」\n\n她打开盖子，旋律有些走调，却别有一番风味。\n\n「人老了，声音也会变嘛。这音乐盒跟我一样，都老了。」\n\n她轻轻哼着走调的旋律，脸上满是温柔。',
    choiceCondition: '选择只修复功能，保留外观的岁月痕迹',
    image: '🎼',
    isUnlocked: false
  },
  {
    id: 'end-001-bad',
    commissionId: 'comm-001',
    type: 'bad',
    title: '遗失的音符',
    story: '你尝试修复音乐盒，但照片损坏得太严重了，怎么也恢复不了原来的样子。\n\n林奶奶看着模糊的照片，沉默了很久。\n\n「没关系……」她轻声说，「我记不清他年轻时的样子了，但我记得……他对我很好。」\n\n她把音乐盒抱在怀里，像是抱着一个珍贵的秘密。\n\n有些记忆，也许注定要随着时间慢慢模糊。',
    choiceCondition: '没有收集到足够的线索就进行修复',
    image: '📻',
    isUnlocked: false
  },
  {
    id: 'end-002-good',
    commissionId: 'comm-002',
    type: 'good',
    title: '金缮之碗',
    story: '你用金缮工艺修补了瓷碗，金色的纹路像河流一样在青瓷上流淌。\n\n小陈接过碗，眼睛亮了：「好美啊……原来碎了的东西，也能变得这么美。」\n\n他用手指轻轻摸着金色的纹路，想起了小时候外婆喂他喝糖水的样子。\n\n「外婆常说，人就像这碗一样，就算碎了，也能好好地拼回去。」\n\n他笑了，眼眶红红的。「我现在懂了。」\n\n金色的纹路在阳光下闪闪发光，像是外婆的微笑。',
    choiceCondition: '选择金缮工艺修补，保留残缺的美',
    image: '✨',
    isUnlocked: false
  },
  {
    id: 'end-002-neutral',
    commissionId: 'comm-002',
    type: 'neutral',
    title: '糖水的记忆',
    story: '碗修好了，虽然还能看出裂痕，但已经不漏水了。\n\n小陈当天就用这个碗冲了一碗糖水。\n\n「就是这个味道！」他惊喜地说，「和外婆冲的一模一样！」\n\n他喝了一口，甜丝丝的暖流从嘴里流进心里。\n\n「原来味道是有记忆的。就算碗碎了，味道还记得。」\n\n他抱着碗，像是抱着整个童年。',
    choiceCondition: '选择实用修复，确保碗能正常使用',
    image: '🥣',
    isUnlocked: false
  },
  {
    id: 'end-002-bad',
    commissionId: 'comm-002',
    type: 'bad',
    title: '拼不回的碎片',
    story: '你尽力了，但碗碎得太厉害，怎么拼都拼不回原来的样子。\n\n小陈看着拼得歪歪扭扭的碗，沉默了很久。\n\n「也许……我不该勉强的。」他轻声说，「外婆走了，碗也碎了……有些东西，就是留不住的。」\n\n他把碎片小心地收进盒子里。\n\n「谢谢你至少让我知道，我曾经努力过。」\n\n盒子盖上的那一刻，像是一个时代结束了。',
    choiceCondition: '没有收集到足够的线索就进行修复',
    image: '💔',
    isUnlocked: false
  },
  {
    id: 'end-003-good',
    commissionId: 'comm-003',
    type: 'good',
    title: '重新开始的时间',
    story: '怀表修好了。你让它在3点17分重新开始走动——那是周先生出生的时刻。\n\n「滴答、滴答……」\n\n秒针移动的声音，像是心脏在跳动。\n\n周先生把怀表贴在胸口，泪水无声地滑落。\n\n「爸，我听到了。」他轻声说，「你的爱，一直在走。」\n\n怀表的滴答声和心跳声重合在一起，像是父亲的脉搏，继续在儿子的身体里跳动。\n\n「我会带着你的时间，好好走下去的。」',
    choiceCondition: '选择让怀表重新走动，延续父亲的爱',
    image: '⏰',
    isUnlocked: false
  },
  {
    id: 'end-003-neutral',
    commissionId: 'comm-003',
    type: 'neutral',
    title: '永恒的瞬间',
    story: '你没有让怀表重新走动，而是让它永远停在3点17分——那是他出生的时刻，也是父亲的爱定格的瞬间。\n\n「这样也好。」周先生说，「爸爸的时间，就停在我出生的那一刻吧。」\n\n他把怀表放在床头，每天醒来都能看到。\n\n「他的爱，从那一秒开始，就再也没有停过。」\n\n静止的指针，却讲述着一个从未停止的爱的故事。',
    choiceCondition: '选择保留停止的状态，纪念那个特殊的时刻',
    image: '🕐',
    isUnlocked: false
  },
  {
    id: 'end-003-bad',
    commissionId: 'comm-003',
    type: 'bad',
    title: '走散的时间',
    story: '怀表没能修好，机芯损坏得比想象中严重。\n\n周先生接过怀表，轻轻叹了口气。\n\n「也许……这就是命运吧。」他说，「爸爸走得突然，这块表也走得突然。」\n\n他把怀表放进抽屉最里面。\n\n「有些时间，就是会忽然停下来。」\n\n抽屉关上了，把所有关于父亲的记忆，都关在了黑暗里。',
    choiceCondition: '没有收集到足够的线索就进行修复',
    image: '⌛',
    isUnlocked: false
  }
]

export const repairSteps: Record<string, RepairStep[]> = {
  'comm-001': [
    {
      id: 'step-001-1',
      title: '清洁表面',
      description: '首先需要清洁音乐盒的表面，去除岁月积累的灰尘和污渍。',
      choices: [
        {
          id: 'choice-001-1a',
          label: '用湿布仔细擦拭',
          description: '温柔地清洁，保留包浆和岁月感',
          endingType: 'neutral'
        },
        {
          id: 'choice-001-1b',
          label: '用专业清洁剂彻底清洁',
          description: '深度清洁，让音乐盒焕然一新',
          endingType: 'good'
        }
      ],
      isCompleted: false
    },
    {
      id: 'step-001-2',
      title: '修复照片',
      description: '盖子上的照片已经模糊泛黄，需要想办法恢复。',
      choices: [
        {
          id: 'choice-001-2a',
          label: '用修复技术还原照片',
          description: '尽可能还原照片原本的清晰度',
          endingType: 'good'
        },
        {
          id: 'choice-001-2b',
          label: '保留朦胧感，只做基础修复',
          description: '让照片保留岁月的朦胧美感',
          endingType: 'neutral'
        }
      ],
      isCompleted: false
    },
    {
      id: 'step-001-3',
      title: '调试机芯',
      description: '音乐盒的机芯需要调试，让旋律重新变得动听。',
      choices: [
        {
          id: 'choice-001-3a',
          label: '精确调音，还原原曲',
          description: '让音乐盒发出最完美的旋律',
          endingType: 'good'
        },
        {
          id: 'choice-001-3b',
          label: '保留一点走调的味道',
          description: '让音乐带有一点复古的质感',
          endingType: 'neutral'
        }
      ],
      isCompleted: false
    }
  ],
  'comm-002': [
    {
      id: 'step-002-1',
      title: '清理碎片',
      description: '需要先把所有碎片清理干净，才能开始修补。',
      choices: [
        {
          id: 'choice-002-1a',
          label: '仔细清洗每一块碎片',
          description: '确保每一片都干净，为修复做准备',
          endingType: 'good'
        },
        {
          id: 'choice-002-1b',
          label: '简单擦拭即可',
          description: '保留一些旧痕迹，增加年代感',
          endingType: 'neutral'
        }
      ],
      isCompleted: false
    },
    {
      id: 'step-002-2',
      title: '选择修补方式',
      description: '这是最重要的一步，决定了碗最终的样子。',
      choices: [
        {
          id: 'choice-002-2a',
          label: '金缮工艺',
          description: '用金粉填补裂缝，让残缺成为一种美',
          endingType: 'good'
        },
        {
          id: 'choice-002-2b',
          label: '传统修补',
          description: '用瓷粉和胶水修补，尽量看不出痕迹',
          endingType: 'neutral'
        }
      ],
      isCompleted: false
    },
    {
      id: 'step-002-3',
      title: '最终打磨',
      description: '修补完成后，需要进行最后的打磨处理。',
      choices: [
        {
          id: 'choice-002-3a',
          label: '精细打磨，确保完美',
          description: '让每一处都光滑圆润',
          endingType: 'good'
        },
        {
          id: 'choice-002-3b',
          label: '轻微打磨，保留手感',
          description: '保留一些手工的质感',
          endingType: 'neutral'
        }
      ],
      isCompleted: false
    }
  ],
  'comm-003': [
    {
      id: 'step-003-1',
      title: '拆卸检查',
      description: '需要先拆开怀表，检查机芯的损坏程度。',
      choices: [
        {
          id: 'choice-003-1a',
          label: '完全拆卸，彻底检查',
          description: '仔细检查每一个零件',
          endingType: 'good'
        },
        {
          id: 'choice-003-1b',
          label: '简单拆开看看',
          description: '粗略检查，保留原表的完整性',
          endingType: 'neutral'
        }
      ],
      isCompleted: false
    },
    {
      id: 'step-003-2',
      title: '修复表蒙',
      description: '表蒙上的裂痕需要处理。',
      choices: [
        {
          id: 'choice-003-2a',
          label: '更换新的表蒙',
          description: '换一块全新的，完美无瑕',
          endingType: 'good'
        },
        {
          id: 'choice-003-2b',
          label: '修复但保留一道细纹',
          description: '保留一点岁月的痕迹',
          endingType: 'neutral'
        }
      ],
      isCompleted: false
    },
    {
      id: 'step-003-3',
      title: '决定走留',
      description: '最关键的一步：这块怀表，应该让它重新走起来吗？',
      choices: [
        {
          id: 'choice-003-3a',
          label: '修好它，让时间继续',
          description: '让怀表重新滴答作响',
          endingType: 'good'
        },
        {
          id: 'choice-003-3b',
          label: '就让它停在那一刻',
          description: '3点17分，是最好的纪念',
          endingType: 'neutral'
        }
      ],
      isCompleted: false
    }
  ]
}
