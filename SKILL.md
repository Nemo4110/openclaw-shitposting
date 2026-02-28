# 找屎 Skill (Shit Finder)

评估 Reddit 内容的"弱智度"，筛选最脑残/搞笑的帖子。

## 使用场景

- 用户分享了一堆 Reddit 帖子，需要筛选出最弱智的内容
- 配合 reddit-readonly Skill 使用，对其输出进行评分筛选
- 批量评估内容质量，找出值得分享的"宝藏"

## 输入格式

接收 Reddit 帖子列表（来自 reddit-readonly Skill 的输出）：

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

### 1. 标题关键词（0-3分）
- 包含弱智关键词 +0.5分/个：
  - 英文：wtf, bruh, yikes, cringe, lmao, omg, what, why, seriously, literally, nobody, confused...
  - 中文：绝了, 离谱, 大无语, 无语, cpu烧了, 看不懂, 什么鬼, 懵了, 迷惑, 窒息, 辣眼睛...
- 多问号/感叹号（如??? !!!）+1分
- 全大写情绪化标题 +0.5分

### 2. 互动特征（0-3分）
- 高评论(>100) + 中等点赞(<5000) = 有争议 +1分
- 评论/点赞比 > 0.1 = 引发讨论 +1分
- 高点赞(>1000) + 多评论(>100) = 热门争议 +0.5分

### 3. 逻辑悖论（0-4分）
- 自相矛盾表达（如"不会...会"、"不是...是"）+0.5分
- 荒谬夸张（200%、永远、每个人、没有人）+0.5分
- 来自弱智版块（shitposting, okbuddyretard, comedyheaven）+1分
- "Nobody: / Me:" 经典格式 +1分

### 黑名单过滤
以下内容直接排除（0分）：
- 包含敏感词：nsfw, gore, death, kill, porn, politic, trump, biden...
- 过于严肃的政治/暴力内容

## 输出格式

返回筛选后的结果：

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

## 工作流程

1. 接收帖子列表和可选参数（minScore, limit）
2. 根据上述评分标准逐个评估
3. 过滤掉黑名单内容
4. 按分数降序排序
5. 取前 N 条（默认 10 条）
6. 生成格式化消息

## 格式化消息模板

每条帖子格式化为：

```
📌 {标题}

🏷️ r/{subreddit} | 👍 {score} | 💬 {num_comments}
🔗 {permalink}
🎯 弱智度: {totalScore}/10
📊 {评分理由}
🖼️ {图片链接（如果有）}
```

## 使用示例

### 基础用法

```typescript
import { skill } from 'openclaw-shit-finder';

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

### CLI 管道模式

```bash
# 配合 reddit-readonly 使用
reddit-readonly posts shitposting --limit 20 | node dist/index.js
```

## 配置

`config/config.json`：

```json
{
  "judge": {
    "min_shitpost_score": 6.0,  // 默认阈值
    "max_results": 10           // 默认返回数量
  },
  "filters": {
    "shitpost_keywords": {
      "en": ["wtf", "bruh", "lol", "omg"],
      "zh": ["绝了", "离谱", "无语"]
    },
    "blacklist_keywords": ["nsfw", "gore", "porn"],
    "shitpost_sources": ["shitposting", "okbuddyretard"]
  }
}
```

## 相关 Skill

- [reddit-readonly](https://clawhub.ai/buksan1950/reddit-readonly) - 获取 Reddit 内容
- [qqbot](https://clawhub.ai/byzgpc/qqbot) - 推送消息到 QQ

## 版本

2.0.0 - 基于提示词的轻量实现
