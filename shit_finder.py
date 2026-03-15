#!/usr/bin/env python3
"""
找屎 Skill - 弱智内容推荐助手
Minimal helper script for scoring, formatting, and logging

Usage:
    python shit_finder.py score --input posts.json [--output scored.json] [--log]
    python shit_finder.py format --input results.json
    python shit_finder.py logs --show [N]
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

# Setup logging
LOGS_DIR = Path(__file__).parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)

def log_message(level: str, message: str, data: Dict = None):
    """Log a message to file"""
    timestamp = datetime.now().isoformat()
    log_entry = {
        "timestamp": timestamp,
        "level": level,
        "message": message,
        "data": data
    }
    
    log_file = LOGS_DIR / f"shit_finder_{datetime.now().strftime('%Y%m%d')}.log"
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")

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


def is_blacklisted(post: Dict) -> tuple[bool, str]:
    """Check if post contains blacklisted content"""
    text = f"{post.get('title', '')} {post.get('selftext', '')}".lower()
    for kw in BLACKLIST:
        if kw in text:
            return True, kw
    return False, ""


def score_post(post: Dict, verbose: bool = False) -> Dict[str, Any]:
    """
    Calculate shitpost score for a post
    Returns: {score, reasons, is_shitpost, debug_info}
    """
    debug_info = {
        "post_id": post.get("id", "unknown"),
        "title": post.get("title", ""),
        "steps": []
    }
    
    # Check blacklist
    blacklisted, matched_kw = is_blacklisted(post)
    if blacklisted:
        debug_info["steps"].append({
            "step": "blacklist_check",
            "result": "failed",
            "matched_keyword": matched_kw
        })
        log_message("INFO", f"Post blacklisted: {matched_kw}", debug_info)
        return {"score": 0, "reasons": ["黑名单"], "is_shitpost": False, "debug_info": debug_info}
    
    debug_info["steps"].append({"step": "blacklist_check", "result": "passed"})
    
    score = 4.0  # Base score
    reasons = []
    details = {"base_score": 4.0, "additions": []}
    title = post.get("title", "").lower()
    original_title = post.get("title", "")
    
    # Keywords
    keyword_matches = []
    for kw in KEYWORDS["en"]:
        if kw in title:
            score += 0.8
            keyword_matches.append(kw)
            if "关键词" not in str(reasons):
                reasons.append("关键词")
    for kw in KEYWORDS["zh"]:
        if kw in post.get("title", ""):
            score += 0.8
            keyword_matches.append(kw)
            if "关键词" not in str(reasons):
                reasons.append("关键词")
    
    if keyword_matches:
        details["additions"].append({"type": "keywords", "matches": keyword_matches, "points": len(keyword_matches) * 0.8})
        debug_info["steps"].append({"step": "keywords", "matches": keyword_matches, "score_added": len(keyword_matches) * 0.8})
    
    # Punctuation
    if "???" in original_title or "!!!" in original_title:
        score += 0.8
        reasons.append("情绪化标点")
        details["additions"].append({"type": "punctuation", "points": 0.8})
        debug_info["steps"].append({"step": "punctuation", "found": "??? or !!!", "score_added": 0.8})
    
    # Emoji check
    import re
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "]+", flags=re.UNICODE
    )
    emojis_found = emoji_pattern.findall(original_title)
    if emojis_found:
        score += 0.5
        reasons.append("表情符号")
        details["additions"].append({"type": "emoji", "emojis": emojis_found, "points": 0.5})
        debug_info["steps"].append({"step": "emoji", "found": emojis_found, "score_added": 0.5})
    
    # Source bonus
    subreddit = post.get("subreddit", "").lower()
    source_matched = None
    source_points = 0
    
    if any(s in subreddit for s in SHITPOST_SOURCES):
        score += 2.0
        source_points = 2.0
        source_matched = f"弱智板块: {subreddit}"
        reasons.append(source_matched)
    elif any(s in subreddit for s in COMEDY_SOURCES):
        score += 1.5
        source_points = 1.5
        source_matched = f"搞笑板块: {subreddit}"
        reasons.append(source_matched)
    
    if source_matched:
        details["additions"].append({"type": "source", "match": source_matched, "points": source_points})
        debug_info["steps"].append({"step": "source", "matched": source_matched, "score_added": source_points})
    
    # Engagement
    likes = post.get("score", 0)
    comments = post.get("num_comments", 0)
    
    if likes > 1000:
        score += 0.5
        reasons.append("高热度")
        details["additions"].append({"type": "likes", "count": likes, "points": 0.5})
        debug_info["steps"].append({"step": "engagement", "likes": likes, "score_added": 0.5})
    
    if comments > 50:
        score += 0.3
        if "高互动" not in reasons:
            reasons.append("高互动")
        details["additions"].append({"type": "comments", "count": comments, "points": 0.3})
        debug_info["steps"].append({"step": "comments", "count": comments, "score_added": 0.3})
    
    if comments > 100 and likes < 5000:
        score += 0.5
        reasons.append("争议性")
        details["additions"].append({"type": "controversial", "points": 0.5})
        debug_info["steps"].append({"step": "controversial", "score_added": 0.5})
    
    score = min(score, 10.0)
    
    if not reasons:
        reasons.append("热门内容")
    
    final_result = {
        "score": round(score, 1),
        "reasons": reasons[:3],
        "is_shitpost": score >= 6.0,
        "details": details,
        "debug_info": debug_info
    }
    
    log_message("DEBUG" if verbose else "INFO", f"Scored post: {final_result['score']}/10", debug_info)
    
    return final_result


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


def show_logs(n: int = 50):
    """Show recent log entries"""
    log_file = LOGS_DIR / f"shit_finder_{datetime.now().strftime('%Y%m%d')}.log"
    
    if not log_file.exists():
        print(f"No log file found for today: {log_file}")
        return
    
    lines = []
    with open(log_file, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    # Show last N entries
    for line in lines[-n:]:
        try:
            entry = json.loads(line.strip())
            ts = entry.get("timestamp", "")[11:19]  # Just time
            level = entry.get("level", "INFO")
            msg = entry.get("message", "")
            print(f"[{ts}] {level}: {msg}")
            if entry.get("data"):
                print(f"  Data: {json.dumps(entry['data'], ensure_ascii=False)[:200]}...")
        except:
            print(line.strip())


def main():
    parser = argparse.ArgumentParser(description="找屎 Skill - 弱智内容推荐")
    parser.add_argument("command", choices=["score", "format", "logs"], help="Command to run")
    parser.add_argument("--input", "-i", help="Input JSON file")
    parser.add_argument("--output", "-o", help="Output JSON file (for score command)")
    parser.add_argument("--log", action="store_true", help="Enable detailed logging")
    parser.add_argument("--show", type=int, default=50, help="Number of log entries to show")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output with debug info")
    
    args = parser.parse_args()
    
    if args.command == "logs":
        show_logs(args.show)
        return
    
    # Read input
    if not args.input:
        print("Error: --input is required for score/format commands", file=sys.stderr)
        sys.exit(1)
    
    try:
        if args.input == "-":
            data = json.load(sys.stdin)
        else:
            with open(args.input, "r", encoding="utf-8") as f:
                data = json.load(f)
    except Exception as e:
        log_message("ERROR", f"Failed to read input: {e}")
        print(f"Error reading input: {e}", file=sys.stderr)
        sys.exit(1)
    
    if args.command == "score":
        log_message("INFO", "Starting score command", {"input_type": type(data).__name__})
        
        # Score posts
        posts = data.get("posts", []) if isinstance(data, dict) else data
        log_message("INFO", f"Scoring {len(posts)} posts")
        
        results = []
        for post in posts:
            score_info = score_post(post, verbose=args.verbose)
            result = {
                "post": post,
                "score": {k: v for k, v in score_info.items() if k != "debug_info"}
            }
            if args.verbose:
                result["debug_info"] = score_info.get("debug_info")
            results.append(result)
        
        # Sort by score
        results.sort(key=lambda x: x["score"]["score"], reverse=True)
        
        # Count passing posts
        passing = sum(1 for r in results if r["score"]["is_shitpost"])
        log_message("INFO", f"Scoring complete: {passing}/{len(results)} posts passed threshold")
        
        output = {
            "results": results,
            "summary": {
                "total": len(results),
                "passing": passing,
                "timestamp": datetime.now().isoformat()
            }
        }
        
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(output, f, ensure_ascii=False, indent=2)
            log_message("INFO", f"Output written to {args.output}")
        else:
            print(json.dumps(output, ensure_ascii=False, indent=2))
    
    elif args.command == "format":
        log_message("INFO", "Starting format command")
        results = data.get("results", []) if isinstance(data, dict) else data
        output = format_output(results)
        print(output)
        log_message("INFO", "Format complete")


if __name__ == "__main__":
    main()
