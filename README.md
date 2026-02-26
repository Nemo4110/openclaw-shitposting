# Shitpost Curator

基于 OpenClaw 的 Reddit 弱智内容自动采集与 Telegram 推送 Skill。

## 功能特性

- 自动从 Reddit 热门弱智版块抓取内容
- 智能"弱智度"评分算法（关键词 + 互动特征 + 逻辑悖论检测）
- 自动去重（基于 URL + 内容 hash）
- Telegram Bot 推送（支持图文）
- 支持定时任务和手动触发
- **纯 TypeScript/Node.js 实现**，无需 Python 环境

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 Reddit API

1. 访问 https://www.reddit.com/prefs/apps
2. 点击 "create another app..."
3. 选择 "script" 类型
4. 填写名称和描述
5. 获取 `client_id` 和 `client_secret`

### 3. 配置 Telegram Bot

1. 在 Telegram 中找 @BotFather，发送 `/newbot` 创建 Bot
2. 获取 `bot_token`
3. 将 Bot 加入目标群，发送一条消息
4. 访问 `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` 获取 `chat_id`

### 4. 填写配置

编辑 `config/config.json`：

```json
{
  "reddit": {
    "client_id": "你的_client_id",
    "client_secret": "你的_client_secret",
    "user_agent": "ShitpostCuratorBot/1.0 by 你的用户名"
  },
  "telegram": {
    "bot_token": "你的_bot_token",
    "chat_id": "你的_chat_id"
  }
}
```

### 5. 运行

**开发模式**（使用 tsx）：

```bash
npm run dev -- --dry-run --limit 5
```

**测试模式**（不推送，仅查看结果）：

```bash
npm run build
npm start -- --dry-run --limit 5
```

**正式运行**：

```bash
npm start -- --limit 15 --min-score 7
```

或使用全局命令（如果已发布到 npm）：

```bash
npx shitpost-curator --limit 15 --min-score 7
```

## 使用说明

### 命令行参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--limit N` | 每个 subreddit 抓取的最大帖子数 | 10 |
| `--min-score N` | 弱智度最低阈值 (0-10) | 6.0 |
| `--dry-run` | 测试模式，只显示结果不推送 | false |

### 目标 Subreddits

默认监控以下版块（可在 `config.json` 中修改）：

- `r/shitposting` - 经典弱智 meme
- `r/okbuddyretard` - 故意装傻的搞笑内容
- `r/terriblefacebookmemes` - 糟糕的 Facebook 梗图
- `r/comedyheaven` - 烂到极致就是好
- `r/wtf` - 令人无语的内容
- `r/facepalm` - 让人扶额的内容
- `r/cringetopia` - 尴尬/脑残内容

### 弱智度评分算法

总分 10 分，基于以下维度：

1. **标题关键词** (0-3分)
   - 匹配 "wtf", "bruh", "绝了", "离谱", "cpu烧了" 等关键词
   - 多个问号/感叹号加分
   - 全大写情绪化标题加分

2. **互动特征** (0-3分)
   - 高评论 + 中等点赞 = 有争议
   - 低赞踩比 + 高互动 = 有争议
   - 评论/点赞比高 = 引发讨论

3. **逻辑悖论** (0-4分)
   - 特定弱智版块加分
   - "Nobody: / Me:" 经典 meme 格式
   - 自相矛盾的表达

## 运行测试

项目包含完整的单元测试：

```bash
# 运行所有测试
npm test

# 运行一次（非 watch 模式）
npm run test:run
```

## OpenClaw 集成

作为 OpenClaw Skill，可以通过以下方式触发：

### 手动触发

```bash
kimi "/curate-shitpost"
```

### 定时任务

在 OpenClaw 配置中添加：

```yaml
triggers:
  - schedule: "0 */3 * * *"  # 每 3 小时执行一次
    command: "npx shitpost-curator --limit 15 --min-score 7"
```

### 作为 Skill 调用

```typescript
import { skill } from 'openclaw-shitposting';

const result = await skill.execute(
  { workspacePath: '/path/to/project' },
  { limit: 10, minScore: 7, dryRun: false }
);

console.log(`Pushed ${result.pushed} posts`);
```

## 项目结构

```text
openclaw-shitposting/
├── src/                         # 源代码目录
│   ├── index.ts                 # 主入口 & OpenClaw Skill 导出
│   ├── cli.ts                   # CLI 入口
│   ├── curator.ts               # 核心业务流程
│   ├── types/                   # TypeScript 类型定义
│   │   └── index.ts
│   ├── reddit/                  # Reddit 模块
│   │   ├── client.ts            # Reddit API 客户端
│   │   └── fetcher.ts           # 内容抓取逻辑
│   ├── judge/                   # 评分模块
│   │   ├── scorer.ts            # 弱智度评分算法
│   │   └── history.ts           # 去重管理
│   ├── telegram/                # Telegram 模块
│   │   └── client.ts            # Telegram Bot API
│   └── utils/                   # 工具模块
│       ├── logger.ts            # 日志工具
│       └── config.ts            # 配置加载 & 校验
├── tests/                       # 单元测试
│   ├── judge.test.ts
│   ├── history.test.ts
│   └── config.test.ts
├── config/                      # 配置文件
│   ├── config.json             # 主配置（需填写凭证）
│   └── filters.json            # 过滤规则（关键词等）
├── data/                        # 数据目录
│   └── history.json            # 已推送记录（自动生成）
├── package.json                # Node.js 项目配置
├── tsconfig.json               # TypeScript 配置
└── vitest.config.ts            # 测试配置
```

## 技术栈

- **运行时**: Node.js 18+
- **语言**: TypeScript 5.5+
- **Reddit API**: 原生 `fetch` + OAuth2
- **Telegram Bot**: `node-telegram-bot-api`
- **配置校验**: `zod`
- **测试**: `vitest`

## 开发

### 安装开发依赖

```bash
npm install
```

### 开发模式（热重载）

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 代码检查

```bash
npm run lint
```

### 运行测试

```bash
npm test
```

## 注意事项

1. **Reddit API 限制**：100 请求/分钟，日常使用足够
2. **代理设置**：如果在国内访问 Reddit，可能需要配置代理：
   ```bash
   set HTTP_PROXY=http://127.0.0.1:7890
   set HTTPS_PROXY=http://127.0.0.1:7890
   npm start
   ```
3. **内容安全**：已内置黑名单过滤，但仍建议人工抽查

## 许可

MIT - 仅供学习娱乐，请遵守各平台 ToS。
