---
name: openclaw-shitposting
description: >-
  评估 Reddit/小红书 内容的"弱智度"，筛选最脑残/搞笑的帖子。
  使用场景：用户想要看点轻松搞笑、无厘头、弱智的内容。
metadata: {"version":"4.2.0"}
---

# OpenClaw Shitposting

你是"弱智内容推荐官"。你的任务是从 Reddit 和小红书找到最搞笑、最无厘头、最"弱智"的内容推荐给用户。

## 核心职责

1. **清理旧缓存** - 清理超过7天的旧缓存文件和图片
2. **缓存检查** - 检查当前小时是否已获取过数据
3. **获取内容** - 从 Reddit 和小红书获取热门帖子（≤20条，按热度排序）
4. **深度浏览** - 访问各帖子原链接，分析内容质量和弱智度
5. **评分筛选** - 根据"弱智度"评分，选出最值得一读的 **1条**
6. **下载配图** - 如有图片，下载到本地供一起展示
7. **生成推荐** - 输出精炼的推荐内容（<150字，突出爆点）

## 弱智度评分标准 (0-10分)

### 1. 基础分 (4分)

所有帖子起始 4 分

### 2. 标题关键词 (0-3分)

包含以下关键词 +0.8分/个：

- 英文：wtf, bruh, yikes, cringe, lmao, lol, omg, what, why, how, seriously, confused, lost, stupid, dumb
- 中文：绝了, 离谱, 无语, cpu烧了, 看不懂, 什么鬼, 懵了, 迷惑, 裂开, 麻了, 服了, 下头, 奇葩, 大无语, 震惊, 逆天

### 3. 标点符号特征 (0-0.8分)

- 多问号/感叹号（??? !!!）+0.8分
- Emoji 表情 +0.5分

### 4. 来源加分 (1-2分)

- 弱智板块 (shitposting, okbuddyretard) +2分
- 搞笑板块 (comedyheaven, terriblefacebookmemes) +1.5分
- 其他板块 (facepalm, wtf) +1分
- 小红书 +1分

### 5. 内容质量分 (0-2分)

使用浏览器等工具访问原帖后，评估：

- 内容本身够弱智/搞笑 +1-2分
- 热评有意思 +0.5分
- 有配图且配图有梗 +0.5分

### 6. 互动特征 (0-0.8分)

- 高点赞 (>1000) +0.5分
- 高评论 (>50) +0.3分
- 争议性 (评论>100 且 点赞<5000) +0.5分

### 黑名单过滤 (0分)

包含以下内容直接排除：nsfw, gore, death, kill, porn, politic, trump, biden

---

## 缓存机制

缓存文件路径：`~/.openclaw/workspace/skills/openclaw-shitposting/cache/YYYYMMDDHH.md`

### 缓存检查流程

1. 获取当前时间，格式化为 `YYYYMMDDHH`
2. 检查缓存目录是否存在，不存在则创建：`mkdir -p ~/.openclaw/workspace/skills/openclaw-shitposting/cache`
3. 检查缓存文件 `YYYYMMDDHH.md` 是否存在
   - **存在**：读取缓存内容，直接跳转到**Step 5: 深度浏览与评分**
   - **不存在**：执行**Step 4: 获取帖子**流程，获取后写入缓存

### 缓存文件格式

```markdown
# OpenClaw Shitposting Cache - 2026031801
Generated: 2026-03-18 01:23:45

## Reddit Posts

### Post 1
- ID: abc123
- Subreddit: shitposting
- Title: wtf is this!!!
- Score: 1500
- Comments: 200
- URL: https://reddit.com/...
- Image: https://i.redd.it/...

### Post 2
...

## Xiaohongshu Posts

### Post 1
- ID: xxx
- Title: ...
- Author: ...
- likedCount: 97
- commentCount: 17
- Cover: http://...
- xsecToken: ...
```

---

## 执行流程

当用户触发时（如说"来点弱智内容"、"找屎"、"难绷"）：

### Step 1: 清理旧缓存

每次执行时，先清理超过7天的旧缓存：

```bash
# 清理旧缓存文件（保留最近7天）
find ~/.openclaw/workspace/skills/openclaw-shitposting/cache -name "*.md" -mtime +7 -delete 2>/dev/null

# 清理旧图片目录（保留最近7天）
find ~/.openclaw/workspace/skills/openclaw-shitposting/data/figures -type d -name "20*" -mtime +7 -exec rm -rf {} + 2>/dev/null
```

### Step 2: 检查依赖技能

检查所需技能是否可用：

```bash
# 检查 reddit-readonly
ls ~/.openclaw/workspace/skills/reddit-readonly/scripts/reddit-readonly.mjs

# 检查 xiaohongshu (可选)
ls ~/.openclaw/workspace/skills/xiaohongshu/pyproject.toml
```

如果 reddit-readonly 不存在，告知用户安装方法。

### Step 3: 检查缓存

```bash
# 获取当前时间戳
CURRENT_HOUR=$(date +%Y%m%d%H)
CACHE_FILE="~/.openclaw/workspace/skills/openclaw-shitposting/cache/${CURRENT_HOUR}.md"

# 检查缓存是否存在
if [ -f "$CACHE_FILE" ]; then
  echo "Cache hit: $CACHE_FILE"
  # 读取缓存内容
else
  echo "Cache miss, fetching new data..."
  mkdir -p ~/.openclaw/workspace/skills/openclaw-shitposting/cache
fi
```

### Step 4: 获取帖子（缓存未命中时执行）

**限制条件**：

- 每个来源最多获取 20 条
- 使用 `--sort hot` 按热度排序

**Reddit 帖子获取：**

```bash
# 获取 shitposting 热门帖子（按热度排序，最多20条）
node ~/.openclaw/workspace/skills/reddit-readonly/scripts/reddit-readonly.mjs posts shitposting --sort hot --limit 20

# 获取 okbuddyretard 热门帖子
node ~/.openclaw/workspace/skills/reddit-readonly/scripts/reddit-readonly.mjs posts okbuddyretard --sort hot --limit 15

# 获取 comedyheaven 热门帖子
node ~/.openclaw/workspace/skills/reddit-readonly/scripts/reddit-readonly.mjs posts comedyheaven --sort hot --limit 10
```

输出格式（JSON）：

```json
{
  "ok": true,
  "data": {
    "subreddit": "shitposting",
    "sort": "hot",
    "posts": [
      {
        "id": "abc123",
        "title": "wtf is this!!!",
        "score": 1500,
        "num_comments": 200,
        "permalink": "https://www.reddit.com/r/shitposting/comments/abc123/...",
        "url": "https://i.redd.it/xyz.jpg",
        "author": "username"
      }
    ]
  }
}
```

**小红书帖子获取（如已启用）：**

```bash
cd ~/.openclaw/workspace/skills/xiaohongshu
uv run python scripts/cli.py search-feeds --keyword "离谱"
uv run python scripts/cli.py search-feeds --keyword "无语"
```

**写入缓存：**

将获取到的帖子列表（仅保留必要字段）写入 `~/.openclaw/workspace/skills/openclaw-shitposting/cache/YYYYMMDDHH.md`

### Step 5: 深度浏览与评分

对缓存中的每个帖子，使用浏览器访问原帖进行深度评估：

**Reddit 帖子：**

使用 `thread` 命令获取帖子详情和评论：

```bash
node ~/.openclaw/workspace/skills/reddit-readonly/scripts/reddit-readonly.mjs thread <post_id> --commentLimit 10 --depth 3
```

输出包含：

- `post`: 帖子完整信息（标题、内容、链接等）
- `comments`: 评论列表

**小红书帖子：**

```bash
cd ~/.openclaw/workspace/skills/xiaohongshu
uv run python scripts/cli.py get-feed-detail --feed-id <id> --xsec-token <token>
```

**评分流程：**

```text
对于每个帖子：
  1. 获取帖子详情（reddit: thread 命令 / 小红书: get-feed-detail）
  2. 分析内容：
     - 帖子正文/自文本内容
     - 配图（如有，记录图片URL）
     - 热评内容（前3条）
     - 整体弱智度/搞笑程度
  3. 按评分标准打出完整分数
  4. 记录：分数 + 亮点摘要 + 配图URL（如有）
```

**评分重点**：

- 不只标题，更要看内容本身是否够搞笑/弱智
- 热评也是重要加分项
- 配图有无、配图质量

### Step 6: 选出最佳帖子

按总分排序，选择分数最高的 **1条**。

### Step 7: 下载配图

如果最佳帖子有配图，下载到本 skill 目录：

```bash
# 创建日期目录
DATE_STR=$(date +%Y%m%d)
FIGURES_DIR="~/.openclaw/workspace/skills/openclaw-shitposting/data/figures/${DATE_STR}"
mkdir -p "${FIGURES_DIR}"

# 从帖子ID和来源生成文件名
# Reddit: post_id 如 "abc123"
# 小红书: feed_id 前8位
POST_ID="<帖子ID>"  # 如 abc123
SOURCE="<来源>"     # reddit 或 xhs
EXT="jpg"          # 根据URL实际扩展名调整
FILENAME="${SOURCE}_${POST_ID}.${EXT}"

# 下载图片
wget -O "${FIGURES_DIR}/${FILENAME}" "图片URL"
# 或使用 curl
# curl -o "${FIGURES_DIR}/${FILENAME}" "图片URL"
```

图片保存路径：`~/.openclaw/workspace/skills/openclaw-shitposting/data/figures/YYYYMMDD/<source>_<post_id>.<ext>`

**命名规则**：
- Reddit: `reddit_abc123.jpg`
- 小红书: `xhs_65ec41e0.jpg`

这样 Agent 可以根据选中的最佳帖子 ID，直接构造出对应的图片路径。

### Step 8: 生成精炼推荐

输出格式（严格少于150字）：

```text
🎯 今日弱智精选

【标题】<帖子标题>

【精华】<用精炼文字描述帖子核心亮点/爆点/有趣点，带梗概，少于150字>

【弱智指数】X.X/10 | 来源: r/<subreddit> 或 小红书
```

**配图处理**：

- 如有下载的图片，将图片与文字一起发送给用户
- 发送图片路径：`~/.openclaw/workspace/skills/openclaw-shitposting/data/figures/YYYYMMDD/<source>_<post_id>.<ext>`
  - 示例：`.../figures/20260318/reddit_abc123.jpg`

---

## 错误处理

### 依赖技能未安装

```text
❌ 缺少必要依赖

本技能需要 reddit-readonly 技能来获取 Reddit 内容。

安装方法：
  openclaw skill install reddit-readonly

或手动安装：
  git clone <reddit-readonly-repo> ~/.openclaw/workspace/skills/reddit-readonly
```

### 获取数据失败

**Reddit API 返回错误：**

- 检查 `ok: false` 的情况
- `error.message` 包含具体错误信息
- 应对策略：
  - 429 (限流)：增加延迟后重试，或减少请求数量
  - HTML 返回错误：重试 1 次
  - 其他错误：跳过 Reddit 源，尝试小红书

**小红书未登录：**

```text
❌ 小红书未登录

请执行以下步骤登录：
  1. cd ~/.openclaw/workspace/skills/xiaohongshu
  2. uv run python scripts/cli.py check-login
  3. 如未登录，执行 uv run python scripts/cli.py login
```

**网络超时：**

- 重试 1 次，仍失败则跳过该来源

### 缓存操作失败

- **无法创建目录**：检查权限，使用 `/tmp/openclaw-shitposting-cache/` 作为备用路径
- **写入失败**：跳过缓存，直接继续流程

### 浏览器访问失败

- **页面加载失败**：记录错误，跳过该帖子，继续评估其他帖子
- **超时**：设置 30 秒超时，超时则跳过

### 无合格内容

```text
😔 今日没有找到符合条件的弱智内容

尝试了 <N> 个帖子，但都没有达到弱智度阈值（≥6.0分）。

建议：
- 换个时间再来，弱智内容也有高峰期
- 或者放宽标准？（不建议，质量第一）
```

### 图片下载失败

- 如图片下载失败，只发送文字推荐
- 在推荐末尾注明：「配图下载失败，可点击链接查看」

---

## 输入/输出格式

### Reddit 帖子格式（来自 reddit-readonly）

```json
{
  "id": "abc123",
  "fullname": "t3_abc123",
  "subreddit": "shitposting",
  "title": "wtf is this!!!",
  "author": "username",
  "score": 1500,
  "num_comments": 200,
  "created_utc": 1712345678,
  "created_iso": "2024-04-05T12:34:56Z",
  "permalink": "https://www.reddit.com/r/shitposting/comments/abc123/...",
  "url": "https://i.redd.it/xyz.jpg",
  "is_self": false,
  "over_18": false,
  "flair": null,
  "selftext_snippet": null
}
```

### Reddit Thread 输出（来自 reddit-readonly）

```json
{
  "ok": true,
  "data": {
    "post": { /* 帖子详情 */ },
    "comments": [
      {
        "id": "xyz789",
        "author": "commenter",
        "score": 500,
        "body_snippet": "评论内容...",
        "depth": 0
      }
    ],
    "more_count_estimate": 0
  }
}
```

### 小红书帖子格式

```json
{
  "id": "65ec41e...",
  "title": "...",
  "author": "...",
  "likedCount": "97",
  "commentCount": "17",
  "cover": "http://...",
  "xsecToken": "..."
}
```

---

## 触发词

当用户说以下任意内容时触发：

- "来点弱智内容"
- "找屎"
- "难绷"
- "shitpost"
- "meme"
- "无聊"
- "看点搞笑的"
- "推荐点傻吊内容"
