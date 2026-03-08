# 找屎 Skill (Shit Finder)

评估 Reddit 内容的"弱智度"，筛选最脑残/搞笑的帖子。

## 使用场景

- 用户分享了一堆 Reddit 帖子，需要筛选出最弱智的内容
- 配合 reddit-readonly Skill 使用，对其输出进行评分筛选
- 批量评估内容质量，找出值得分享的"宝藏"
- **自动从多个板块获取并分享内容（Pipeline 模式）**

## 两种使用模式

### 1. Library 模式 - 评分已有帖子

接收 Reddit 帖子列表（来自 reddit-readonly Skill 的输出）进行评分：

```typescript
import { skill, formatResults } from 'openclaw-shit-finder';

const posts = [/* Reddit 帖子列表 */];
const result = await skill.execute(
  { workspacePath: '/path/to/project' },
  { posts, minScore: 6, limit: 5 }
);
```

### 2. Pipeline 模式 - 自动获取并分享

自动从配置的板块获取帖子、评分并推送到 channels：

```bash
# 试运行（不发送）
npm run pipeline:dry

# 实际运行并发送
npm run pipeline

# 指定频道发送
SHITPOST_CHANNEL=onebot SHITPOST_TARGET=group:123456 npm run pipeline
```

## Pipeline 配置

`config/sources.json`：

```json
{
  "sources": [
    {
      "subreddit": "shitposting",
      "name": "弱智",
      "weight": 1.2,
      "enabled": true
    },
    {
      "subreddit": "okbuddyretard", 
      "name": "难绷",
      "weight": 1.1,
      "enabled": true
    },
    {
      "subreddit": "comedyheaven",
      "name": "有趣", 
      "weight": 1.0,
      "enabled": true
    }
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

## 输入格式

```typescript
interface RedditPost {
  id: string;
  subreddit: string;
  title: string;
  score: number;           // 点赞数
  num_comments: number;    // 评论数
  permalink: string;       // Reddit 链接
  url?: string;            // 图片/视频链接
  selftext_snippet?: string;  // 文本摘要
}
```

## 评分标准

对每个帖子进行弱智度评分（0-10分），基于以下维度：

### 1. 基础分（4分）
所有帖子起始4分，确保热门内容有机会通过

### 2. 标题关键词（0-3分）
- 包含弱智关键词 +0.8分/个：
  - 英文：wtf, bruh, yikes, cringe, lmao, omg, what, why, seriously, confused...
  - 中文：绝了, 离谱, 大无语, 无语, cpu烧了, 看不懂, 什么鬼, 懵了...

### 3. 标点符号特征（0-0.8分）
- 多问号/感叹号（如??? !!!）+0.8分
- Emoji 表情 +0.5分

### 4. 来源加分（1-2分）
- 弱智板块（shitposting, okbuddyretard）+2分
- 搞笑板块（comedyheaven, terriblefacebookmemes）+1.5分
- 其他板块（facepalm, wtf）+1分

### 5. 互动特征（0-0.8分）
- 高点赞（>1000）+0.5分
- 高评论（>50）+0.3分
- 争议性（评论>100 且 点赞<5000）+0.5分

### 黑名单过滤
以下内容直接排除（0分）：
- 包含敏感词：nsfw, gore, death, kill, porn, politic, trump, biden...
- 过于严肃的政治/暴力内容

## 输出格式

### Library 模式结果

```typescript
interface ShitFinderResult {
  inputCount: number;      // 输入帖子数量
  passedCount: number;     // 通过黑名单检查的数量
  selectedCount: number;   // 筛选出的弱智内容数量
  results: Array<{
    post: RedditPost;      // 原始帖子
    score: {
      totalScore: number;  // 总分 (0-10)
      isShitpost: boolean; // 是否 >= 阈值
      reasons: string[];   // 评分理由
    };
    formattedMessage: string;  // 格式化消息
  }>;
  summaryText: string;     // 摘要文本
}
```

### Pipeline 模式结果

```typescript
interface PipelineResult {
  success: boolean;
  fetched: number;         // 获取帖子数
  scored: number;          // 评分数
  selected: number;        // 选中数
  posts: ScoredPost[];     // 帖子详情
  message: string;         // 格式化消息
  dryRun: boolean;         // 是否试运行
  sent?: number;           // 发送成功数
  sendError?: string;      // 发送错误
}
```

## 格式化消息模板

每条帖子格式化为：

```
🎉 今日弱智内容精选 (3 条)

🥇 [8.6分] 🗿🗿🗿
    r/shitposting | 👍 20819 | 💬 97
    🔗 https://www.reddit.com/r/shitposting/comments/...
    🖼️ https://i.redd.it/...

🥈 [8.6分] 📡📡📡
    r/shitposting | 👍 13620 | 💬 70
    🔗 https://www.reddit.com/r/shitposting/comments/...
    🖼️ https://i.redd.it/...

🥉 [8.4分] how does this hapan chat?
    r/okbuddyretard | 👍 2551 | 💬 35
    🔗 https://www.reddit.com/r/okbuddyretard/comments/...
    🖼️ https://i.redd.it/...
```

## 使用示例

### 基础评分用法

```typescript
import { skill, formatResults } from 'openclaw-shit-finder';

// reddit-readonly 获取的帖子
const posts = [
  {
    id: "abc123",
    subreddit: "shitposting",
    title: "wtf is this!!!",
    score: 1500,
    num_comments: 200,
    permalink: "https://reddit.com/r/...",
    url: "https://i.redd.it/..."
  }
];

const result = await skill.execute(
  { workspacePath: '/path/to/project' },
  { posts, minScore: 6, limit: 5 }
);

// 输出格式化消息
console.log(result.summaryText);
result.results.forEach(item => {
  console.log(item.formattedMessage);
});
```

### Pipeline 自动获取

```typescript
import { runPipeline } from 'openclaw-shit-finder';

// 自动获取并分享
const result = await runPipeline({
  maxResults: 3,
  minScore: 5.5,
  dryRun: false,
  channel: 'onebot',
  target: 'group:123456',
});

console.log(`获取: ${result.fetched}, 选中: ${result.selected}, 发送: ${result.sent}`);
```

### CLI 管道模式

```bash
# 配合 reddit-readonly 使用
reddit-readonly posts shitposting --limit 20 | node dist/index.js

# Pipeline 模式
npm run pipeline:dry    # 试运行
npm run pipeline        # 实际发送
```

## 触发器配置

在 OpenClaw 中使用意图触发：

```typescript
// 当用户发送 "来点弱智内容" 等关键词时触发
if (message.includes('弱智') || message.includes('难绷') || message.includes('找屎')) {
  const result = await runPipeline({ maxResults: 3, dryRun: false });
  return result.message;
}
```

## 环境变量

| 变量 | 说明 | 默认值 |
|-----|------|--------|
| SHITPOST_MAX_RESULTS | 最大分享数量 | 3 |
| SHITPOST_MIN_SCORE | 最低评分阈值 | 5.5 |
| SHITPOST_CHANNEL | 目标频道类型 | - |
| SHITPOST_TARGET | 目标用户/群组 | - |
| REDDIT_READONLY_PATH | reddit-readonly 脚本路径 | - |

## 相关 Skill

- [reddit-readonly](https://clawhub.ai/buksan1950/reddit-readonly) - 获取 Reddit 内容
- [qqbot](https://clawhub.ai/byzgpc/qqbot) - 推送消息到 QQ

## 版本

2.1.0 - 新增 Pipeline 自动获取与分享功能
