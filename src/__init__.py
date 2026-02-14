"""
OpenClaw Shitpost Curator - Reddit 弱智内容自动采集与 Telegram 推送

一个自动从 Reddit 采集弱智/脑残/搞笑内容，
经 AI 筛选后推送到 Telegram 群的 OpenClaw Skill。
"""

__version__ = "1.0.0"
__author__ = "OpenClaw Community"
__package_name__ = "openclaw_shitposting"

from .reddit_fetcher import RedditFetcher, RedditPost
from .content_judge import ContentJudge, HistoryManager, JudgeResult
from .telegram_push import TelegramPusher, PushResult, push_posts_sync, push_post_sync
from .logger import setup_logger

__all__ = [
    "RedditFetcher",
    "RedditPost",
    "ContentJudge",
    "HistoryManager",
    "JudgeResult",
    "TelegramPusher",
    "PushResult",
    "push_posts_sync",
    "push_post_sync",
    "setup_logger",
]
