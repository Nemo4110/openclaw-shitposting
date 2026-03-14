#!/usr/bin/env python3
"""
找屎 Skill - 弱智内容推荐助手
Minimal helper script for formatting and utility functions

Usage:
    python shit_finder.py format --input results.json
    python shit_finder.py score --input posts.json --output scored.json
"""

import argparse
import json
import sys
from datetime import datetime
from typing import List, Dict, Any

# Default scoring weights
KEYWORDS = {
    "en": ["wtf", "bruh", "yikes", "cringe", "lmao", "lol", "omg", "what", "why", "how", 
           "seriously", "confused", "lost", "stupid", "dumb", "crazy"],
    "zh": ["绝了", "离谱", "无语", "cpu烧了", "看不懂", "什么鬼", "懵了", "迷惑", 
           "裂开", "麻了", "服了", "下头", "奇葩", "大无语", "震惊", "逆天"]
}

BLACKLIST = ["nsfw", "gore", "death", "kill", "murder", "porn", "politic", "trump", "biden"]

SHITPOST_SOURCES = ["shitposting", "okbuddyretard"]
COMEDY_SOURCES = ["comedyheaven", "terriblefacebookmemes"]


def is_blacklisted(post: Dict) -> bool:
    """Check if post contains blacklisted content"""
    text = f"{post.get('title', '')} {post.get('selftext', '')}".lower()
    return any(kw in text for kw in BLACKLIST)


def score_post(post: Dict) -> Dict[str, Any]:
    """
    Calculate shitpost score for a post
    Returns: {score, reasons, is_shitpost}
    """
    if is_blacklisted(post):
        return {"score": 0, "reasons": ["黑名单"], "is_shitpost": False}
    
    score = 4.0  # Base score
    reasons = []
    title = post.get("title", "").lower()
    
    # Keywords
    for kw in KEYWORDS["en"]:
        if kw in title:
            score += 0.8
            if "关键词" not in str(reasons):
                reasons.append("关键词")
    for kw in KEYWORDS["zh"]:
        if kw in post.get("title", ""):
            score += 0.8
            if "关键词" not in str(reasons):
                reasons.append("关键词")
    
    # Punctuation
    if "???" in post.get("title", "") or "!!!" in post.get("title", ""):
        score += 0.8
        reasons.append("情绪化标点")
    
    # Emoji check
    if any(ord(c) > 127 for c in post.get("title", "")):
        import re
        if re.search(r'[\u{1F300}-\u{1F9FF}]', post.get("title", ""), re.UNICODE):
            score += 0.5
            reasons.append("表情符号")
    
    # Source bonus
    subreddit = post.get("subreddit", "").lower()
    if any(s in subreddit for s in SHITPOST_SOURCES):
        score += 2.0
        reasons.append(f"弱智板块: {subreddit}")
    elif any(s in subreddit for s in COMEDY_SOURCES):
        score += 1.5
        reasons.append(f"搞笑板块: {subreddit}")
    
    # Engagement
    likes = post.get("score", 0)
    comments = post.get("num_comments", 0)
    if likes > 1000:
        score += 0.5
        reasons.append("高热度")
    if comments > 50:
        score += 0.3
        reasons.append("高互动")
    if comments > 100 and likes < 5000:
        score += 0.5
        reasons.append("争议性")
    
    score = min(score, 10.0)
    
    if not reasons:
        reasons.append("热门内容")
    
    return {
        "score": round(score, 1),
        "reasons": reasons[:3],
        "is_shitpost": score >= 6.0
    }


def format_output(results: List[Dict]) -> str:
    """Format results as readable text"""
    if not results:
        return "今日没有找到符合条件的弱智内容"
    
    lines = [
        f"今日弱智内容精选 ({len(results)} 条)",
        ""
    ]
    
    for i, item in enumerate(results, 1):
        post = item.get("post", {})
        score_info = item.get("score", {})
        tldr = item.get("tldr", "")
        
        lines.append(f"[{i}] 评分: {score_info.get('score', 0)}/10")
        lines.append(f"标题: {post.get('title', 'N/A')}")
        if tldr:
            lines.append(f"摘要: {tldr}")
        
        # Source info
        source = post.get("subreddit", "")
        if source:
            lines.append(f"来源: r/{source} | 点赞: {post.get('score', 0)} | 评论: {post.get('num_comments', 0)} | 作者: u/{post.get('author', 'N/A')}")
        else:
            lines.append(f"来源: 小红书 | 点赞: {post.get('likedCount', 0)} | 评论: {post.get('commentCount', 0)} | 作者: {post.get('author', 'N/A')}")
        
        lines.append(f"推荐理由: {', '.join(score_info.get('reasons', []))}")
        
        if post.get("url") and "reddit.com" not in post.get("url", ""):
            lines.append(post["url"])
        
        permalink = post.get("permalink", "")
        if permalink:
            if not permalink.startswith("http"):
                permalink = f"https://www.reddit.com{permalink}"
            lines.append(f"讨论: {permalink}")
        
        if i < len(results):
            lines.append("")
            lines.append("---")
            lines.append("")
    
    lines.append("")
    lines.append(f"更新时间: {datetime.now().strftime('%m月%d日 %H:%M')}")
    
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="找屎 Skill - 弱智内容推荐")
    parser.add_argument("command", choices=["score", "format"], help="Command to run")
    parser.add_argument("--input", "-i", required=True, help="Input JSON file")
    parser.add_argument("--output", "-o", help="Output JSON file (for score command)")
    
    args = parser.parse_args()
    
    # Read input
    try:
        with open(args.input, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading input: {e}", file=sys.stderr)
        sys.exit(1)
    
    if args.command == "score":
        # Score posts
        posts = data.get("posts", []) if isinstance(data, dict) else data
        results = []
        for post in posts:
            score_info = score_post(post)
            results.append({
                "post": post,
                "score": score_info
            })
        
        # Sort by score
        results.sort(key=lambda x: x["score"]["score"], reverse=True)
        
        output = {"results": results}
        
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(output, f, ensure_ascii=False, indent=2)
        else:
            print(json.dumps(output, ensure_ascii=False, indent=2))
    
    elif args.command == "format":
        # Format results
        results = data.get("results", []) if isinstance(data, dict) else data
        output = format_output(results)
        print(output)


if __name__ == "__main__":
    main()
