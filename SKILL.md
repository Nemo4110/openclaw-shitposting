# Shitpost Curator Skill

## Description

自动从 Reddit 采集弱智/脑残/搞笑内容，经 AI 筛选后推送到 Telegram 群的 OpenClaw Skill。

## Features

- 从 Reddit 热门弱智版块抓取内容（r/shitposting, r/okbuddyretard 等）
- 智能"弱智度"评分算法（关键词匹配 + LLM 评估）
- 自动去重（基于 URL + 内容 hash）
- Telegram Bot 推送
- 支持定时任务和手动触发

## Tools

- `python3`
- `pip`

## Setup

### 1. 安装依赖

```bash
pip install -r requirements.txt
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
python scripts/main.py --limit 10 --min-score 7
```

### 参数说明

- `--limit`: 每个 subreddit 抓取的最大帖子数（默认 10）
- `--min-score`: 弱智度最低阈值（0-10，默认 7）
- `--dry-run`: 测试模式，只显示结果不推送

### 定时任务（OpenClaw Schedule）

```yaml
triggers:
  - schedule: "0 */3 * * *"  # 每 3 小时执行一次
    command: "python scripts/main.py --limit 15 --min-score 7"
```

## Directory Structure

```
openclaw-shitposting/
├── SKILL.md                    # 本文件
├── README.md                   # 使用说明
├── requirements.txt            # Python 依赖
├── config/
│   ├── config.json            # 主配置（需手动填写）
│   └── filters.json           # 过滤规则
├── scripts/
│   ├── __init__.py
│   ├── main.py                # 主入口
│   ├── reddit_fetcher.py      # Reddit 抓取
│   ├── content_judge.py       # 弱智度评分
│   └── telegram_push.py       # Telegram 推送
└── data/
    └── history.json           # 已推送记录（自动生成）
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

1. **关键词匹配**（权重 20%）
   - 中文："绝了", "离谱", "大无语", "cpu烧了"
   - 英文："wtf", "bruh", "yikes", "cringe"

2. **社区互动特征**（权重 30%）
   - 高评论数 + 中等点赞 = +3分
   - 低赞踩比（<0.7）+ 高互动 = +2分

3. **LLM 逻辑悖论检测**（权重 50%）
   - 使用本地/远程 LLM 评估内容的逻辑一致性
   - 逻辑漏洞越大，分数越高

## License

MIT - 仅供学习娱乐，请遵守各平台 ToS。
