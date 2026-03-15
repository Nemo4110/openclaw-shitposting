# 找屎 Skill (Shit Finder)

OpenClaw Skill - 弱智内容推荐官，从 Reddit 和小红书找到最搞笑、最无厘头的内容。

## Philosophy

This skill follows the **"prompt + minimal code"** philosophy:

- **SKILL.md** contains detailed instructions for the AI agent
- **Agent orchestrates** the workflow by calling external skills
- **Minimal code** provides helper functions only

## How It Works

1. Agent reads SKILL.md instructions
2. Agent checks if `reddit-readonly` skill is available
3. Agent calls `reddit-readonly` to fetch posts from shitposting subreddits
4. Agent scores posts based on criteria in SKILL.md
5. Agent fetches details for top posts
6. Agent generates formatted recommendation with TL;DR

## Dependencies

### Required
- [reddit-readonly](https://clawhub.ai/buksan1950/reddit-readonly) - Reddit 内容获取

### Optional
- [xiaohongshu-skills](https://github.com/autoclaw-cc/xiaohongshu-skills) - 小红书内容获取

## Installation

```bash
# 1. Install this skill to your agent's skills directory
cd ~/.openclaw/workspace/skills/
git clone <this-repo> shit-finder

# 2. Install reddit-readonly (required)
# Follow: https://clawhub.ai/buksan1950/reddit-readonly

# 3. Install xiaohongshu-skills (optional)
# Follow: https://github.com/autoclaw-cc/xiaohongshu-skills
```

## Usage

### As an AI Skill

Simply tell your AI assistant:

```
"来点弱智内容"
"找点搞笑的"
"我想看点 shitpost"
"推荐点难绷的内容"
```

The agent will:
1. Check dependencies
2. Fetch posts from Reddit/Xiaohongshu
3. Score and filter content
4. Return formatted recommendations with TL;DR

### CLI Helper (Optional)

```bash
# Score posts
echo '{"posts": [...]}' | python3 shit_finder.py score -i /dev/stdin

# Format results
python3 shit_finder.py format -i results.json

# Check dependencies
node index.js check
```

## Output Format

```
今日弱智内容精选 (3 条)

[1] 评分: 8.9/10
标题: Something tells me this is how he got all his wins
摘要: 内容: A truck carrying wine bottles crashed... | 热评: "Finally, a vintage..."
来源: r/shitposting | 点赞: 5,897 | 评论: 84 | 作者: u/Stock-Discount7213
推荐理由: 弱智板块: shitposting, 高热度
https://i.redd.it/bf7htsf35og1.png
讨论: https://www.reddit.com/r/shitposting/comments/...

---

[2] 评分: 8.6/10
...

更新时间: 3月14日 11:30
```

## Project Structure

```
shit-finder/
├── SKILL.md           # Agent instructions (main entry point)
├── shit_finder.py     # Python helper for scoring/formatting
├── index.js           # Node.js wrapper (optional)
├── README.md          # This file
├── package.json       # NPM metadata
└── config/
    └── sources.json   # Source configuration
```

## Scoring Criteria

See [SKILL.md](SKILL.md) for detailed scoring rules:

| Dimension | Max Points | Description |
|-----------|------------|-------------|
| Base Score | 4.0 | Starting points |
| Keywords | +3.0 | wtf, bruh, 离谱, 无语... |
| Punctuation | +0.8 | ???, !!! |
| Source | +2.0 | shitposting, okbuddyretard |
| Engagement | +0.8 | High likes/comments |

**Blacklist:** Posts containing nsfw, gore, death, kill, porn, politic, trump, biden are excluded.

## Configuration

Agent reads `config/sources.json` (optional):

```json
{
  "sources": [
    {"subreddit": "shitposting", "weight": 1.2},
    {"subreddit": "okbuddyretard", "weight": 1.1}
  ],
  "xiaohongshu": {
    "enabled": false,
    "keywords": ["离谱", "无语", "奇葩"]
  }
}
```

## Trigger Words

The skill triggers when user says:
- "来点弱智内容"
- "找屎"
- "难绷"
- "shitpost"
- "meme"
- "无聊"
- "看点搞笑的"

## License

MIT - 仅供学习娱乐。
