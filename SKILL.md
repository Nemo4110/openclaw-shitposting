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

- `python3`
- `pip`

## Setup

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

或从源码安装：

```bash
pip install -e .
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
python scripts/run.py --limit 10 --min-score 7
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
    command: "python scripts/run.py --limit 15 --min-score 7"
```

### 运行测试

```bash
python -m unittest discover -v tests
```

## Directory Structure

```
openclaw-shitposting/
├── src/                         # 源代码目录
│   ├── __init__.py
│   ├── main.py                  # 主入口
│   ├── reddit_fetcher.py        # Reddit 抓取
│   ├── content_judge.py         # 弱智度评分
│   ├── telegram_push.py         # Telegram 推送
│   └── logger.py                # 日志配置
├── tests/                       # 单元测试
│   ├── test_content_judge.py
│   ├── test_reddit_fetcher.py
│   └── test_integration.py
├── scripts/
│   └── run.py                   # 启动脚本
├── config/
│   ├── config.json             # 主配置
│   └── filters.json            # 过滤规则
├── data/                        # 数据目录
├── docs/                        # 项目文档
├── pyproject.toml              # 构建系统配置
├── requirements.txt            # Python 依赖
├── README.md                   # 使用说明
├── SKILL.md                    # 本文件（Skill 定义）
└── LICENSE                     # 许可协议
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
2024-01-15 10:30:45 - reddit_fetcher.py:85 - INFO - Fetched 10 posts from r/shitposting
```

## License

MIT - 仅供学习娱乐，请遵守各平台 ToS。
