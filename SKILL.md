---
name: shit-finder
description: >-
  评估 Reddit/小红书 内容的"弱智度"，筛选最脑残/搞笑的帖子并自动分享。
  使用场景：(1) 对帖子列表进行弱智度评分筛选，(2) 配合 reddit-readonly 或 xiaohongshu-skills 使用，
  (3) 自动从配置的 subreddits/小红书关键词 获取、评分并推送到 QQ/Discord 等 channels，
  (4) 通过关键词触发自动执行（如"来点弱智内容"、"找屎"、"难绷"）。
metadata: {"emoji":"","requires":{"bins":["node"]},"version":"2.1.0"}
---

# 找屎 Skill (Shit Finder)

评估 Reddit/小红书 内容的"弱智度"，筛选最脑残/搞笑的帖子。

## 使用场景

- 用户分享了一堆帖子，需要筛选出最弱智的内容
- 配合 reddit-readonly Skill 或 xiaohongshu-skills 使用，对其输出进行评分筛选
- 批量评估内容质量，找出值得分享的"宝藏"
- **自动从多个板块/关键词获取并分享内容（Pipeline 模式）**

## 两种使用模式

### 1. Library 模式 - 评分已有帖子

接收帖子列表（来自 reddit-readonly 或 xiaohongshu-skills 的输出）进行评分：

```typescript
import { skill, formatResults } from 'openclaw-shit-finder';

const posts = [/* 帖子列表 */];
const result = await skill.execute(
  { workspacePath: '/path/to/project' },
  { posts, minScore: 6, limit: 5 }
);
```

### 2. Pipeline 模式 - 自动获取并分享

自动从配置的板块/关键词获取帖子、评分并推送到 channels：

```bash
# 试运行（不发送）
npm run pipeline:dry

# 实际运行并发送
npm run pipeline

# 指定频道发送
SHITPOST_CHANNEL=onebot SHITPOST_TARGET=group:123456 npm run pipeline

# 从小红书获取（需确保 Chrome 已启动并登录）
XIAOHONGSHU_ENABLED=true npm run pipeline
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
    }
  ],
  "xiaohongshu": {
    "enabled": false,
    "keywords": ["下头男", "离谱", "无语", "奇葩"],
    "postsPerKeyword": 10,
    "name": "📕 小红书",
    "weight": 1.0
  },
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

### Reddit 帖子格式

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

### 小红书帖子格式

```typescript
interface XiaohongshuPost {
  id: string;
  title: string;
  author: string;
  likedCount: string;
  collectedCount: string;
  commentCount: string;
  cover?: string;
  noteType: 'normal' | 'video';
  xsecToken: string;
}
```

## 评分标准

对每个帖子进行弱智度评分（0-10分），基于以下维度：

### 1. 基础分（4分）
所有帖子起始4分，确保热门内容有机会通过

### 2. 标题关键词（0-3分）
- 包含弱智关键词 +0.8分/个：
  - 英文：wtf, bruh, yikes, cringe, lmao, omg, what, why, seriously, confused...
  - 中文：绝了, 离谱, 大无语, 无语, cpu烧了, 看不懂, 什么鬼, 懵了, 下头...

### 3. 标点符号特征（0-0.8分）
- 多问号/感叹号（如??? !!!）+0.8分
- Emoji 表情 +0.5分

### 4. 来源加分（1-2分）
- Reddit 弱智板块（shitposting, okbuddyretard）+2分
- Reddit 搞笑板块（comedyheaven, terriblefacebookmemes）+1.5分
- Reddit 其他板块（facepalm, wtf）+1分
- **小红书 +1分**（需手动启用）

### 5. 互动特征（0-0.8分）
- 高点赞（>1000）+0.5分
- 高评论（>50）+0.3分
- 争议性（评论>100 且 点赞<5000）+0.5分

### 黑名单过滤
以下内容直接排除（0分）：
- 包含敏感词：nsfw, gore, death, kill, porn, politic, trump, biden...
- 过于严肃的政治/暴力内容

## 小红书集成说明

### 前置条件

1. **安装 xiaohongshu-skills**：
```bash
cd ~/.openclaw/workspace/skills/
git clone https://github.com/autoclaw-cc/xiaohongshu-skills.git xiaohongshu
cd xiaohongshu
uv sync
```

2. **启动 Chrome 并登录**：
```bash
cd ~/.openclaw/workspace/skills/xiaohongshu
uv run python scripts/chrome_launcher.py
uv run python scripts/cli.py login  # 扫码登录
```

3. **启用小红书源**（在 `config/sources.json` 中设置 `xiaohongshu.enabled: true`）

### 小红书获取命令

```bash
# 检查登录状态
uv run python scripts/cli.py check-login

# 搜索关键词
uv run python scripts/cli.py search-feeds --keyword "下头男"

# 获取笔记详情
uv run python scripts/cli.py get-feed-detail --feed-id FEED_ID --xsec-token XSEC_TOKEN
```

## 依赖技能检查

Pipeline 启动时会自动检查依赖技能是否可用：

### 检查逻辑

1. **reddit-readonly** (必需)
   - 自动检测常见安装路径
   - 测试运行 `--help` 命令确认可用性
   - 如果不可用，Pipeline 会立即失败并提示用户

2. **xiaohongshu-skills** (可选)
   - 仅在 `xiaohongshu.enabled: true` 时检查
   - 检查登录状态（`check-login`）
   - 如果未登录，提示用户执行登录流程

### 跳过检查

```bash
# 跳过技能检查（如果确定技能已安装）
npm run pipeline -- --skip-skill-check

# 跳过获取帖子详情（不生成 TL;DR，加快执行速度）
npm run pipeline -- --skip-content-fetch
```

### 自定义路径

```bash
export REDDIT_READONLY_PATH=/path/to/reddit-readonly.mjs
export XIAOHONGSHU_PATH=/path/to/xiaohongshu-skills
```

## TL;DR 生成

Pipeline 会自动获取选中帖子的详情，生成内容摘要：

### Reddit 帖子
- 获取帖子正文（如果是文本帖）
- 获取前 3 条高赞评论
- 生成摘要: `内容: xxx | 热评: "xxx"`

### 小红书帖子
- 获取笔记完整内容
- 获取前 3 条热门评论
- 生成摘要: `内容: xxx | 热评: "xxx"`

### 跳过 TL;DR 生成

如果不需要摘要（加快执行速度）：

```typescript
const result = await runPipeline({
  skipContentFetch: true,  // 跳过获取详情
});
```

## 输出格式

### Library 模式结果

```typescript
interface ShitFinderResult {
  inputCount: number;      // 输入帖子数量
  passedCount: number;     // 通过黑名单检查的数量
  selectedCount: number;   // 筛选出的弱智内容数量
  results: Array<{
    post: RedditPost | XiaohongshuPost;  // 原始帖子
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
  skillCheckErrors?: string[]; // 依赖技能检查错误（如果有）
}
```

## 格式化消息模板

### Reddit 帖子格式

```
今日弱智内容精选 (3 条)

[1] 评分: 8.6/10
标题: Something tells me this is how he got all his wins
摘要: 内容: A truck carrying wine bottles crashed... | 热评: "Finally, a vintage with some body to it"
来源: r/shitposting | 点赞: 5,897 | 评论: 84 | 作者: u/Stock-Discount7213
推荐理由: 弱智板块: shitposting, 高热度
https://i.redd.it/bf7htsf35og1.png
讨论: https://www.reddit.com/r/shitposting/comments/...

---

[2] 评分: 8.6/10
标题: Dogshit
摘要: 内容: Just a picture of actual dog poop... | 热评: "Why did I click on this?"
来源: r/shitposting | 点赞: 4,591 | 评论: 115 | 作者: u/No_Employer3674
推荐理由: 弱智板块: shitposting, 高热度, 高互动
https://i.redd.it/ybnzccs533og1.jpeg
讨论: https://www.reddit.com/r/shitposting/comments/...

更新时间: 3月11日 00:25
```

### 小红书帖子格式

```
今日弱智内容精选 (2 条)

[1] 评分: 8.2/10
标题: 在杭州地铁上遇到恶心的人了
摘要: 内容: 今天坐地铁遇到一个人... | 热评: "这种人也太离谱了吧"
来源: 小红书 | 点赞: 97 | 收藏: 11 | 评论: 17 | 作者: 菜宰治
推荐理由: 小红书, 关键词, 高互动
http://sns-webpic-qc.xhscdn.com/...
链接: https://www.xiaohongshu.com/explore/...

更新时间: 3月9日 22:20
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

### 小红书评分用法

```typescript
import { skill } from 'openclaw-shit-finder';

// xiaohongshu-skills 获取的帖子
const posts = [
  {
    id: "65ec41e1000000000303435a",
    title: "在杭州地铁上遇到恶心的人了",
    author: "菜宰治",
    likedCount: "97",
    commentCount: "17",
    cover: "http://sns-webpic-qc.xhscdn.com/..."
  }
];

const result = await skill.execute(
  { workspacePath: '/path/to/project' },
  { posts, minScore: 6, limit: 5 }
);
```

### Pipeline 自动获取

```typescript
import { runPipeline } from 'openclaw-shit-finder';

// 自动获取并分享（包含 Reddit 和小红书）
const result = await runPipeline({
  maxResults: 3,
  minScore: 5.5,
  dryRun: false,
  channel: 'onebot',
  target: 'group:123456',
  xiaohongshuEnabled: true,  // 启用小红书
});

console.log(`获取: ${result.fetched}, 选中: ${result.selected}, 发送: ${result.sent || 0}`);
```

### CLI 管道模式

```bash
# 配合 reddit-readonly 使用
reddit-readonly posts shitposting --limit 20 | node dist/index.js

# Pipeline 模式
npm run pipeline:dry    # 试运行
npm run pipeline        # 实际发送

# 带小红书
XIAOHONGSHU_ENABLED=true npm run pipeline:dry
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
| **XIAOHONGSHU_ENABLED** | **启用小红书源** | **false** |
| **XIAOHONGSHU_PATH** | **xiaohongshu-skills 路径** | **~/.openclaw/workspace/skills/xiaohongshu** |
| SKIP_SKILL_CHECK | 跳过依赖技能检查 | false |
| SKIP_CONTENT_FETCH | 跳过获取帖子详情（不生成 TL;DR）| false |

## 相关项目

- [reddit-readonly](https://clawhub.ai/buksan1950/reddit-readonly) - 获取 Reddit 内容
- [xiaohongshu-skills](https://github.com/autoclaw-cc/xiaohongshu-skills) - 小红书自动化
- [NapCat](https://napneko.github.io/guide/napcat) - 基于 NTQQ 的 Bot 框架
- [@kirigaya/openclaw-onebot](https://github.com/LSTM-Kirigaya/openclaw-onebot) - OpenClaw OneBot 协议适配插件

## 版本

2.1.0 - 新增小红书内容获取支持
