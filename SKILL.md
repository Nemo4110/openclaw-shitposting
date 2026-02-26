# Shitpost Curator Skill

## Description

自动从 Reddit 采集弱智/脑残/搞笑内容，经 AI 筛选后推送到 Telegram 群的 OpenClaw Skill。

## Features

- 从 Reddit 热门弱智版块抓取内容（r/shitposting, r/okbuddyretard 等）
- 智能"弱智度"评分算法（关键词匹配 + 互动特征 + 逻辑悖论检测）
- 自动去重（基于 URL + 内容 hash）
- Telegram Bot 推送
- 支持定时任务和手动触发

## Tools

- `node` >= 18.0.0
- `npm`

## Setup

### 1. 安装依赖

```bash
npm install
```

或从 npm 安装：

```bash
npm install -g shitpost-curator
```

### 2. 配置 Reddit API

访问 https://www.reddit.com/prefs/apps 创建应用，获取：
- `client_id`
- `client_secret`

### 3. 配置 Telegram Bot

- 在 Telegram 中找 @BotFather 创建 Bot，获取 `bot_token`
- 获取目标群的 `chat_id`

### 4. 填写配置

编辑 `config/config.json`，填入上述凭证。

## Usage

### 手动执行

```bash
npm start -- --limit 10 --min-score 7
```

或使用安装后的命令：

```bash
shitpost-curator --limit 10 --min-score 7
```

### 参数说明

- `--limit`: 每个 subreddit 抓取的最大帖子数（默认 10）
- `--min-score`: 弱智度最低阈值（0-10，默认 7）
- `--dry-run`: 测试模式，只显示结果不推送

### 定时任务（OpenClaw Schedule）

```yaml
triggers:
  - schedule: "0 */3 * * *"  # 每 3 小时执行一次
    command: "npx shitpost-curator --limit 15 --min-score 7"
```

### 运行测试

```bash
npm test
```

## Directory Structure

```
openclaw-shitposting/
├── src/                         # 源代码目录
│   ├── index.ts                 # OpenClaw Skill 入口
│   ├── cli.ts                   # CLI 入口
│   ├── curator.ts               # 核心业务流程
│   ├── types/                   # TypeScript 类型定义
│   ├── reddit/                  # Reddit 模块
│   ├── judge/                   # 评分模块
│   ├── telegram/                # Telegram 模块
│   └── utils/                   # 工具模块
├── tests/                       # 单元测试
├── config/
│   ├── config.json             # 主配置
│   └── filters.json            # 过滤规则
├── data/                        # 数据目录
├── package.json                # Node.js 配置
├── tsconfig.json               # TypeScript 配置
└── README.md                   # 使用说明
```

## Target Subreddits

默认监控以下版块：

| Subreddit | 描述 |
|-----------|------|
| r/shitposting | 经典弱智meme |
| r/okbuddyretard | 故意装傻的搞笑内容 |
| r/terriblefacebookmemes | 糟糕的Facebook梗图 |
| r/comedyheaven | 烂到极致就是好 |
| r/wtf | 令人无语的内容 |

可在 `config.json` 中自定义。

## Scoring Algorithm

弱智度评分（0-10分）基于以下维度：

1. **关键词匹配**（权重 30%）
   - 中文："绝了", "离谱", "大无语", "cpu烧了"
   - 英文："wtf", "bruh", "yikes", "cringe"

2. **社区互动特征**（权重 30%）
   - 高评论数 + 中等点赞 = +3分
   - 低赞踩比（<0.7）+ 高互动 = +2分

3. **逻辑悖论检测**（权重 40%）
   - 特定弱智版块加分
   - "Nobody: / Me:" 经典格式
   - 自相矛盾的表达

## Logging

使用带文件路径和行号的日志格式：

```
2024-01-15 10:30:45 INFO  [reddit] Fetched 10 posts from r/shitposting
2024-01-15 10:30:46 INFO  [judge] Filtered new posts: 8/10
```

## License

MIT - 仅供学习娱乐，请遵守各平台 ToS。
