# 找屎 Skill (Shit Finder)

OpenClaw Skill - 专注于 Reddit 内容的"弱智度"评分，帮你找到最脑残/搞笑的帖子。

## 设计理念

本 Skill **不写死评分算法**，而是通过 `SKILL.md` 中的提示词，**让大模型自己判断**什么是弱智内容。

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│ reddit-readonly │────▶│   大模型（OpenClaw）  │────▶│   qqbot     │
│   (获取数据)     │     │  根据 SKILL.md 评分   │     │ (推送消息)   │
└─────────────────┘     └──────────────────────┘     └─────────────┘
                              ↓
                    本 Skill 提供：
                    - 类型定义
                    - 格式化工具
                    - 黑名单过滤
```

## 优势

- **灵活性**: 大模型比硬编码规则更懂"弱智"
- **可进化**: 修改 SKILL.md 即可调整评分标准
- **轻量级**: 代码量极少，主要靠提示词

## 使用方式

### 作为 OpenClaw Skill

```typescript
import { skill, formatResults } from 'openclaw-shit-finder';

// 1. 获取 Reddit 数据
const redditOutput = await exec('reddit-readonly posts shitposting --limit 20');
const posts = JSON.parse(redditOutput).data.posts;

// 2. 获取基础数据结构
const baseResult = await skill.execute(
  { workspacePath: '/path/to/project' },
  { posts, minScore: 6, limit: 5 }
);

// 3. 让大模型根据 SKILL.md 评分
const scoredPosts = baseResult.results.map(item => ({
  post: item.post,
  score: /* 大模型根据 SKILL.md 评分 */
}));

// 4. 格式化输出
const finalResult = formatResults(scoredPosts, 6);

// 5. 发送给 qqbot
console.log(finalResult.summaryText);
finalResult.results.forEach(item => {
  console.log(item.formattedMessage);
});
```

### 直接使用工具函数

```typescript
import { isBlacklisted, formatPostMessage, parseRedditReadonlyOutput } from 'openclaw-shit-finder';

// 解析 reddit-readonly 输出
const posts = parseRedditReadonlyOutput(jsonString);

// 过滤黑名单
const cleanPosts = posts.filter(p => !isBlacklisted(p));

// 格式化消息
const message = formatPostMessage(post, { totalScore: 8.5, isShitpost: true, reasons: [] });
```

## 评分标准

评分逻辑定义在 `SKILL.md` 中，包括：

### 1. 标题关键词（0-3分）
- 弱智关键词匹配
- 标点符号特征（多问号/感叹号）
- 情绪化表达（全大写）

### 2. 互动特征（0-3分）
- 高评论 + 中等点赞
- 评论/点赞比
- 热门争议

### 3. 逻辑悖论（0-4分）
- 自相矛盾表达
- 荒谬夸张
- 经典 meme 格式

### 黑名单
自动过滤敏感内容。

## 项目结构

```
openclaw-shit-finder/
├── SKILL.md               # 评分提示词（核心）
├── README.md              # 使用说明
├── src/
│   ├── index.ts           # Skill 入口
│   ├── types/             # 类型定义
│   └── judge/
│       └── scorer.ts      # 工具函数（非核心逻辑）
├── tests/                 # 单元测试
└── package.json
```

## 关键文件

### SKILL.md
包含完整的评分提示词，大模型根据此文件评估内容。

### src/types/index.ts
类型定义，确保数据格式一致。

### src/index.ts
- `skill.execute()` - Skill 入口
- `formatResults()` - 格式化评分结果
- `parseRedditReadonlyOutput()` - 解析输入

## 运行测试

```bash
npm test
```

## 相关 Skill

- [reddit-readonly](https://clawhub.ai/buksan1950/reddit-readonly) - Reddit 只读浏览
- [qqbot](https://clawhub.ai/byzgpc/qqbot) - QQ 官方机器人

## 为什么不用硬编码算法？

1. **大模型更懂幽默**: "弱智"是主观概念，规则很难覆盖所有情况
2. **上下文理解**: 大模型能理解梗、双关、反讽
3. **易于调整**: 修改提示词比改代码快得多
4. **语言无关**: 中英文弱智内容都能评估

## 技术栈

- **运行时**: Node.js 18+
- **语言**: TypeScript 5.5+
- **测试**: vitest

## 许可

MIT - 仅供学习娱乐。
