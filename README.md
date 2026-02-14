# 🚽 搬屎机器人 (Shitpost Curator)

基于 OpenClaw 的 Reddit 弱智内容自动采集与 Telegram 推送 Skill。

## 功能特性

- 🤖 自动从 Reddit 热门弱智版块抓取内容
- 🧠 智能"弱智度"评分算法（关键词 + 互动特征 + 逻辑悖论检测）
- 🚫 自动去重（基于 URL + 内容 hash）
- 📤 Telegram Bot 推送（支持图文）
- ⏰ 支持定时任务和手动触发

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
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

**测试模式**（不推送，仅查看结果）：
```bash
python scripts/main.py --dry-run --limit 5
```

**正式运行**：
```bash
python scripts/main.py --limit 15 --min-score 7
```

## 使用说明

### 命令行参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--limit N` | 每个 subreddit 抓取的最大帖子数 | 10 |
| `--min-score N` | 弱智度最低阈值 (0-10) | 6.0 |
| `--dry-run` | 测试模式，只显示结果不推送 | False |

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
   - 荒谬的夸张表达

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
    command: "python scripts/main.py --limit 15 --min-score 7"
```

## 目录结构

```
openclaw-shitposting/
├── SKILL.md                    # Skill 定义
├── README.md                   # 本文件
├── requirements.txt            # Python 依赖
├── config/
│   ├── config.json            # 主配置（需填写凭证）
│   └── filters.json           # 过滤规则（关键词等）
├── scripts/
│   ├── main.py                # 主入口
│   ├── reddit_fetcher.py      # Reddit 抓取
│   ├── content_judge.py       # 弱智度评分
│   └── telegram_push.py       # Telegram 推送
└── data/
    └── history.json           # 已推送记录（自动生成）
```

## 注意事项

1. **Reddit API 限制**：100 请求/分钟，日常使用足够
2. **代理设置**：如果在国内访问 Reddit，可能需要配置代理：
   ```python
   # 在 reddit_fetcher.py 中添加
   import os
   os.environ['HTTP_PROXY'] = 'http://127.0.0.1:7890'
   os.environ['HTTPS_PROXY'] = 'http://127.0.0.1:7890'
   ```
3. **内容安全**：已内置黑名单过滤，但仍建议人工抽查

## 许可

MIT - 仅供学习娱乐，请遵守各平台 ToS。
