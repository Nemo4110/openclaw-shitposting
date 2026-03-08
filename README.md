# 找屎 Skill (Shit Finder)

OpenClaw Skill - 专注于 Reddit 内容的"弱智度"评分，帮你找到最脑残/搞笑的帖子。

## 两种使用模式

### 1. Library 模式 - 评分已有帖子
分析已有的 Reddit 帖子列表，评分并筛选。

### 2. Pipeline 模式 - 自动获取并分享 ⭐ 新功能
自动从多个板块获取帖子、评分，并推送到配置的 channels。

## 快速开始

```bash
# 安装依赖
npm install

# 构建
npm run build

# 测试运行（不发送消息）
npm run pipeline:dry

# 实际运行并发送
npm run pipeline
```

## Pipeline 工作流

```
┌──────────────────┐
│  配置板块列表     │ config/sources.json
└────────┬─────────┘
         ↓
┌──────────────────┐
│  reddit-readonly │ 获取 r/shitposting, r/okbuddyretard 等
│   (获取数据)      │
└────────┬─────────┘
         ↓
┌──────────────────┐
│     评分引擎      │ 启发式评分 (0-10分)
│                  │ 黑名单过滤
└────────┬─────────┘
         ↓
┌──────────────────┐
│    Top N 排序     │ 选出最值得分享的 3 条
└────────┬─────────┘
         ↓
┌──────────────────┐
│    消息发送器     │ 推送到配置的 channels
└──────────────────┘
```

## 配置

编辑 `config/sources.json`：

```json
{
  "sources": [
    { "subreddit": "shitposting", "name": "弱智", "weight": 1.2 },
    { "subreddit": "okbuddyretard", "name": "难绷", "weight": 1.1 },
    { "subreddit": "comedyheaven", "name": "有趣", "weight": 1.0 },
    { "subreddit": "facepalm", "name": "无语", "weight": 0.9 },
    { "subreddit": "terriblefacebookmemes", "name": "老梗", "weight": 0.8 },
    { "subreddit": "wtf", "name": "震惊", "weight": 1.0 }
  ],
  "fetch": {
    "timeRange": "week",
    "postsPerSource": 15,
    "maxAgeDays": 7
  },
  "judge": {
    "minScore": 5.5,
    "maxResults": 3,
    "autoShare": true
  }
}
```

## 环境变量

```bash
# 评分参数
export SHITPOST_MAX_RESULTS=3
export SHITPOST_MIN_SCORE=5.5

# 发送目标（可选）
export SHITPOST_CHANNEL=onebot
export SHITPOST_TARGET=group:123456

# reddit-readonly 路径（可选）
export REDDIT_READONLY_PATH=/path/to/reddit-readonly.mjs
```

## 触发器

支持通过关键词触发：

```bash
# 测试触发
npm run trigger "来点弱智内容"

# 触发词包括：弱智、难绷、找屎、shitpost、meme、来点...
```

在 OpenClaw 中配置意图处理：

```typescript
import { shouldTrigger, handleTrigger } from 'openclaw-shit-finder';

// 在消息处理器中
if (shouldTrigger(userMessage)) {
  const result = await handleTrigger(userMessage);
  return result.message;
}
```

## 评分标准

| 维度 | 说明 | 分值 |
|-----|------|-----|
| 基础分 | 所有帖子起始分 | 4分 |
| 关键词 | wtf, bruh, 绝了, 离谱... | +0.8/个 |
| 标点 | ??? !!! Emoji | +0.5~0.8 |
| 来源 | 不同板块权重不同 | +1~2 |
| 互动 | 高点赞、高评论 | +0.3~0.5 |

**阈值**: 5.5分（可配置）

## 输出示例

```
🎉 今日弱智内容精选 (3 条)

🥇 [8.6分] 🗿🗿🗿
    r/shitposting | 👍 20819 | 💬 97
    🔗 https://www.reddit.com/r/shitposting/comments/1rmhlk9/_/
    🖼️ https://i.redd.it/pscau5nx4gng1.jpeg

🥈 [8.6分] 📡📡📡
    r/shitposting | 👍 13620 | 💬 70
    🔗 https://www.reddit.com/r/shitposting/comments/1rmsl7u/_/
    🖼️ https://i.redd.it/a92zsutz5ing1.jpeg

🥉 [8.4分] how does this hapan chat?
    r/okbuddyretard | 👍 2551 | 💬 35
    🔗 https://www.reddit.com/r/okbuddyretard/comments/1rm3it1/...
    🖼️ https://i.redd.it/ntr8ez8hlcng1.jpeg
```

## 项目结构

```
openclaw-shitposting/
├── config/
│   └── sources.json          # 板块配置
├── scripts/
│   ├── pipeline.mjs          # Pipeline CLI
│   └── trigger.mjs           # 触发器 CLI
├── src/
│   ├── index.ts              # Skill 入口
│   ├── types/                # 类型定义
│   ├── judge/                # 评分逻辑
│   └── pipeline/             # Pipeline 模块
│       ├── fetcher.ts        # 帖子获取
│       ├── runner.ts         # 流程编排
│       └── sender.ts         # 消息发送
├── tests/
├── SKILL.md                  # 详细文档
└── README.md
```

## API 使用

### 完整 Pipeline

```typescript
import { runPipeline } from 'openclaw-shit-finder';

const result = await runPipeline({
  maxResults: 3,        // 最多分享几条
  minScore: 5.5,        // 最低评分阈值
  dryRun: false,        // 是否试运行
  channel: 'onebot',    // 频道类型
  target: 'group:123',  // 目标群组
});

console.log(result.message);  // 格式化后的分享内容
```

### 单独获取帖子

```typescript
import { fetchAllPosts, mergePosts } from 'openclaw-shit-finder';

const results = await fetchAllPosts();
const posts = mergePosts(results);
```

### 评分帖子

```typescript
import { scorePosts } from 'openclaw-shit-finder';

const scored = scorePosts(posts, [
  { subreddit: 'shitposting', weight: 1.2 },
  { subreddit: 'okbuddyretard', weight: 1.1 },
]);
```

## 设计理念

本 Skill **不写死评分算法**，而是通过启发式规则 + 可配置权重，让系统自动判断什么是弱智内容。

优势：
- **灵活性**: 权重可配置，适应不同口味
- **可进化**: 修改配置即可调整评分标准
- **自动化**: 定时或触发执行，无需人工干预

## 相关 Skill

- [reddit-readonly](https://clawhub.ai/buksan1950/reddit-readonly) - Reddit 只读浏览
- [qqbot](https://clawhub.ai/byzgpc/qqbot) - QQ 官方机器人

## 测试

```bash
npm test
```

## 许可

MIT - 仅供学习娱乐。
